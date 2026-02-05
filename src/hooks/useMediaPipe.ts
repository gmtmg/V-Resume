'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  FaceLandmarker,
  FilesetResolver,
  FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';

interface UseMediaPipeOptions {
  onResults?: (results: FaceLandmarkerResult) => void;
  onFaceLost?: () => void;
  onFaceDetected?: () => void;
  // Debounce time in ms before reporting face lost
  faceLostDebounceMs?: number;
}

interface UseMediaPipeReturn {
  isLoading: boolean;
  isReady: boolean;
  isFaceDetected: boolean;
  error: string | null;
  startDetection: (video: HTMLVideoElement) => void;
  stopDetection: () => void;
  latestResults: FaceLandmarkerResult | null;
}

export function useMediaPipe(options: UseMediaPipeOptions = {}): UseMediaPipeReturn {
  const {
    onResults,
    onFaceLost,
    onFaceDetected,
    faceLostDebounceMs = 500, // Default 500ms debounce
  } = options;

  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const latestResultsRef = useRef<FaceLandmarkerResult | null>(null);
  const lastFaceDetectedRef = useRef(false);
  const faceLostTimerRef = useRef<NodeJS.Timeout | null>(null);
  const consecutiveDetectionsRef = useRef(0);

  // Initialize FaceLandmarker
  useEffect(() => {
    let isMounted = true;

    const initFaceLandmarker = async () => {
      try {
        console.log('[MediaPipe] Starting initialization...');

        // Use specific version instead of @latest for better caching on mobile
        const wasmUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm';

        // Add timeout for slow mobile connections
        const visionPromise = FilesetResolver.forVisionTasks(wasmUrl);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('WASM load timeout')), 30000)
        );

        const vision = await Promise.race([visionPromise, timeoutPromise]);
        console.log('[MediaPipe] FilesetResolver loaded');

        // Try GPU first, fall back to CPU if not available
        let faceLandmarker: FaceLandmarker;
        try {
          faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
          });
          console.log('[MediaPipe] FaceLandmarker created with GPU');
        } catch (gpuError) {
          console.warn('[MediaPipe] GPU not available, falling back to CPU:', gpuError);
          faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: true,
            outputFacialTransformationMatrixes: true,
          });
          console.log('[MediaPipe] FaceLandmarker created with CPU');
        }

        if (isMounted) {
          faceLandmarkerRef.current = faceLandmarker;
          setIsReady(true);
          setIsLoading(false);
          console.log('[MediaPipe] Initialization complete, ready for detection');
        }
      } catch (err) {
        console.error('[MediaPipe] Failed to initialize FaceLandmarker:', err);
        if (isMounted) {
          setError('顔認識の初期化に失敗しました');
          setIsLoading(false);
        }
      }
    };

    initFaceLandmarker();

    return () => {
      isMounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (faceLostTimerRef.current) {
        clearTimeout(faceLostTimerRef.current);
      }
      if (faceLandmarkerRef.current) {
        faceLandmarkerRef.current.close();
      }
    };
  }, []);

  // Detection loop with debounce for face lost
  const detect = useCallback(() => {
    if (!faceLandmarkerRef.current || !videoRef.current) return;

    const video = videoRef.current;

    // Check if video is ready and has valid dimensions (important for mobile)
    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      try {
        const startTimeMs = performance.now();
        const results = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);

        latestResultsRef.current = results;
        onResults?.(results);

        // Check face detection status
        const hasFace = results.faceLandmarks && results.faceLandmarks.length > 0;

        if (hasFace) {
          // Face detected - immediately update state
          consecutiveDetectionsRef.current++;

          // Clear any pending "face lost" timer
          if (faceLostTimerRef.current) {
            clearTimeout(faceLostTimerRef.current);
            faceLostTimerRef.current = null;
          }

          // Only trigger state change after a few consecutive detections (reduces flapping)
          if (!lastFaceDetectedRef.current && consecutiveDetectionsRef.current >= 3) {
            lastFaceDetectedRef.current = true;
            setIsFaceDetected(true);
            console.log('[MediaPipe] Face detected (stable)');
            onFaceDetected?.();
          }
        } else {
          // Face not detected - use debounce before reporting lost
          consecutiveDetectionsRef.current = 0;

          if (lastFaceDetectedRef.current && !faceLostTimerRef.current) {
            // Start a timer - only report face lost after debounce period
            faceLostTimerRef.current = setTimeout(() => {
              lastFaceDetectedRef.current = false;
              setIsFaceDetected(false);
              console.log('[MediaPipe] Face lost (after debounce)');
              onFaceLost?.();
              faceLostTimerRef.current = null;
            }, faceLostDebounceMs);
          }
        }
      } catch (detectError) {
        console.error('[MediaPipe] Detection error:', detectError);
      }
    }

    animationFrameRef.current = requestAnimationFrame(detect);
  }, [onResults, onFaceLost, onFaceDetected, faceLostDebounceMs]);

  const startDetection = useCallback(
    (video: HTMLVideoElement) => {
      console.log('[MediaPipe] startDetection called', {
        hasFaceLandmarker: !!faceLandmarkerRef.current,
        videoReadyState: video.readyState,
      });

      videoRef.current = video;
      consecutiveDetectionsRef.current = 0;

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(detect);
    },
    [detect]
  );

  const stopDetection = useCallback(() => {
    console.log('[MediaPipe] stopDetection called');
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (faceLostTimerRef.current) {
      clearTimeout(faceLostTimerRef.current);
      faceLostTimerRef.current = null;
    }
    videoRef.current = null;
  }, []);

  return {
    isLoading,
    isReady,
    isFaceDetected,
    error,
    startDetection,
    stopDetection,
    latestResults: latestResultsRef.current,
  };
}

// Helper to extract blendshapes for VRM
export function extractBlendshapes(results: FaceLandmarkerResult) {
  if (!results.faceBlendshapes || results.faceBlendshapes.length === 0) {
    return null;
  }

  const blendshapes = results.faceBlendshapes[0].categories;
  const blendshapeMap: Record<string, number> = {};

  for (const shape of blendshapes) {
    blendshapeMap[shape.categoryName] = shape.score;
  }

  return blendshapeMap;
}

// Map MediaPipe blendshapes to VRM blendshape names
export function mapToVRMBlendshapes(mediapipeShapes: Record<string, number>) {
  return {
    // Eyes
    blinkLeft: mediapipeShapes['eyeBlinkLeft'] || 0,
    blinkRight: mediapipeShapes['eyeBlinkRight'] || 0,
    lookUpLeft: mediapipeShapes['eyeLookUpLeft'] || 0,
    lookUpRight: mediapipeShapes['eyeLookUpRight'] || 0,
    lookDownLeft: mediapipeShapes['eyeLookDownLeft'] || 0,
    lookDownRight: mediapipeShapes['eyeLookDownRight'] || 0,
    lookInLeft: mediapipeShapes['eyeLookInLeft'] || 0,
    lookInRight: mediapipeShapes['eyeLookInRight'] || 0,
    lookOutLeft: mediapipeShapes['eyeLookOutLeft'] || 0,
    lookOutRight: mediapipeShapes['eyeLookOutRight'] || 0,

    // Mouth / Lips
    mouthOpen: mediapipeShapes['jawOpen'] || 0,
    mouthSmileLeft: mediapipeShapes['mouthSmileLeft'] || 0,
    mouthSmileRight: mediapipeShapes['mouthSmileRight'] || 0,
    mouthFrownLeft: mediapipeShapes['mouthFrownLeft'] || 0,
    mouthFrownRight: mediapipeShapes['mouthFrownRight'] || 0,
    mouthPucker: mediapipeShapes['mouthPucker'] || 0,

    // Brows
    browDownLeft: mediapipeShapes['browDownLeft'] || 0,
    browDownRight: mediapipeShapes['browDownRight'] || 0,
    browInnerUp: mediapipeShapes['browInnerUp'] || 0,
    browOuterUpLeft: mediapipeShapes['browOuterUpLeft'] || 0,
    browOuterUpRight: mediapipeShapes['browOuterUpRight'] || 0,

    // Cheeks
    cheekPuff: mediapipeShapes['cheekPuff'] || 0,
    cheekSquintLeft: mediapipeShapes['cheekSquintLeft'] || 0,
    cheekSquintRight: mediapipeShapes['cheekSquintRight'] || 0,

    // Nose
    noseSneerLeft: mediapipeShapes['noseSneerLeft'] || 0,
    noseSneerRight: mediapipeShapes['noseSneerRight'] || 0,

    // Jaw
    jawOpen: mediapipeShapes['jawOpen'] || 0,
    jawLeft: mediapipeShapes['jawLeft'] || 0,
    jawRight: mediapipeShapes['jawRight'] || 0,
  };
}
