'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useMediaPipe } from '@/hooks/useMediaPipe';
import { VRMAvatar } from '@/lib/avatar/VRMAvatar';
import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';

interface AvatarRendererProps {
  vrmPath?: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onReady?: () => void;
  onFaceLost?: () => void;
  onFaceDetected?: () => void;
}

export function AvatarRenderer({
  vrmPath = '/assets/models/avatar.vrm',
  videoRef,
  canvasRef,
  onReady,
  onFaceLost,
  onFaceDetected,
}: AvatarRendererProps) {
  const avatarRef = useRef<VRMAvatar | null>(null);
  const [isAvatarLoading, setIsAvatarLoading] = useState(true);
  const [isAvatarReady, setIsAvatarReady] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const onReadyCalledRef = useRef(false);

  // Handle face landmark results
  const handleResults = useCallback((results: FaceLandmarkerResult) => {
    if (avatarRef.current) {
      avatarRef.current.applyFaceLandmarks(results);
    }
  }, []);

  // Handle face lost
  const handleFaceLost = useCallback(() => {
    if (avatarRef.current) {
      avatarRef.current.resetToNeutral();
    }
    onFaceLost?.();
  }, [onFaceLost]);

  // Initialize MediaPipe
  const {
    isLoading: isMediaPipeLoading,
    isReady: isMediaPipeReady,
    isFaceDetected,
    error: mediaPipeError,
    startDetection,
    stopDetection,
  } = useMediaPipe({
    onResults: handleResults,
    onFaceLost: handleFaceLost,
    onFaceDetected,
  });

  // Initialize VRM Avatar
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const initAvatar = async () => {
      try {
        console.log('[AvatarRenderer] Initializing VRM avatar...');
        const avatar = new VRMAvatar({
          canvas,
          vrmPath,
          backgroundColor: 0xe0f2fe, // Light sky blue background
        });

        await avatar.loadVRM(vrmPath);
        avatar.startRenderLoop();

        avatarRef.current = avatar;
        setIsAvatarLoading(false);
        setIsAvatarReady(true);
        console.log('[AvatarRenderer] VRM avatar ready');
      } catch (error) {
        console.error('[AvatarRenderer] Failed to initialize avatar:', error);
        setAvatarError('アバターの読み込みに失敗しました');
        setIsAvatarLoading(false);
      }
    };

    initAvatar();

    return () => {
      if (avatarRef.current) {
        avatarRef.current.dispose();
        avatarRef.current = null;
      }
    };
  }, [canvasRef, vrmPath]);

  // Call onReady when both avatar and MediaPipe are ready
  useEffect(() => {
    if (isAvatarReady && isMediaPipeReady && !onReadyCalledRef.current) {
      console.log('[AvatarRenderer] Both avatar and MediaPipe ready, calling onReady');
      onReadyCalledRef.current = true;
      onReady?.();
    }
  }, [isAvatarReady, isMediaPipeReady, onReady]);

  // Start face detection when video and MediaPipe are ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isMediaPipeReady) {
      console.log('[AvatarRenderer] Waiting for video or MediaPipe...', {
        hasVideo: !!video,
        isMediaPipeReady,
      });
      return;
    }

    const handleVideoPlay = () => {
      console.log('[AvatarRenderer] Starting face detection...');
      startDetection(video);
    };

    if (video.readyState >= 2) {
      handleVideoPlay();
    } else {
      video.addEventListener('loadeddata', handleVideoPlay);
    }

    return () => {
      video.removeEventListener('loadeddata', handleVideoPlay);
      stopDetection();
    };
  }, [videoRef, isMediaPipeReady, startDetection, stopDetection]);

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !avatarRef.current) return;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      avatarRef.current?.resize(rect.width, rect.height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasRef]);

  const isLoading = isAvatarLoading || isMediaPipeLoading;
  const error = avatarError || mediaPipeError;

  // Debug logging
  useEffect(() => {
    console.log('[AvatarRenderer] State:', {
      isAvatarLoading,
      isMediaPipeLoading,
      isMediaPipeReady,
      isFaceDetected,
      error,
    });
  }, [isAvatarLoading, isMediaPipeLoading, isMediaPipeReady, isFaceDetected, error]);

  return (
    <>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 text-sm">
              {isAvatarLoading ? 'アバターを読み込み中...' : '顔認識を初期化中...'}
            </p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-10">
          <div className="text-center p-4">
            <svg className="w-12 h-12 text-rose-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-gray-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Face Lost Warning - only show when fully initialized */}
      {!isLoading && !error && isMediaPipeReady && !isFaceDetected && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p className="text-gray-700">顔を中央に配置してください</p>
          </div>
        </div>
      )}
    </>
  );
}
