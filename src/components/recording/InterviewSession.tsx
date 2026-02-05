'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { InterviewQuestion, InterviewRecording } from '@/types';
import { AvatarRenderer } from '@/components/avatar';
import { useRecorder } from '@/hooks/useRecorder';

interface InterviewSessionProps {
  question: InterviewQuestion;
  onComplete: (recording: InterviewRecording) => void;
}

type SessionState = 'loading' | 'preview' | 'countdown' | 'recording' | 'review';

export function InterviewSession({ question, onComplete }: InterviewSessionProps) {
  const [state, setState] = useState<SessionState>('loading');
  const [countdown, setCountdown] = useState(3);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [shouldStop, setShouldStop] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupRef = useRef<() => Promise<void>>();

  const { isInitialized, initialize, start, stop, cleanup } = useRecorder({
    pitchRatio: 0.75, // Voice pitch adjustment
  });

  // Keep cleanup function in ref to avoid dependency issues
  cleanupRef.current = cleanup;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      cleanupRef.current?.();
    };
  }, []);

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
          audio: true,
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        console.error('Camera init error:', error);
      }
    };
    initCamera();
  }, []);

  // Initialize recorder when canvas and stream are ready
  useEffect(() => {
    const initRecorder = async () => {
      if (canvasRef.current && streamRef.current && state === 'preview' && !isInitialized) {
        await initialize(canvasRef.current, streamRef.current);
      }
    };
    initRecorder();
  }, [state, isInitialized, initialize]);

  // Handle avatar ready
  const handleAvatarReady = useCallback(() => {
    setState('preview');
  }, []);

  // Handle face detection
  const handleFaceDetected = useCallback(() => {
    setIsFaceDetected(true);
  }, []);

  const handleFaceLost = useCallback(() => {
    setIsFaceDetected(false);
  }, []);

  const startCountdown = () => {
    setCountdown(3);
    setState('countdown');
  };

  // Stop recording function
  const stopRecording = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const result = await stop();
    if (result) {
      setRecordedBlob(result.blob);
      setState('review');
    }
  }, [stop]);

  // Start recording function
  const startRecording = useCallback(() => {
    start();
    setState('recording');
    setRecordingTime(0);
    setShouldStop(false);

    // Start recording timer
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        const newTime = prev + 1;
        if (newTime >= question.maxDuration) {
          setShouldStop(true);
        }
        return newTime;
      });
    }, 1000);
  }, [start, question.maxDuration]);

  // Countdown effect
  useEffect(() => {
    if (state === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        startRecording();
      }
    }
  }, [state, countdown, startRecording]);

  // Auto-stop when max duration reached
  useEffect(() => {
    if (shouldStop && state === 'recording') {
      stopRecording();
    }
  }, [shouldStop, state, stopRecording]);

  const handleRetry = async () => {
    setRecordedBlob(null);
    setState('preview');
    setRecordingTime(0);

    // Re-initialize recorder
    if (canvasRef.current && streamRef.current) {
      await initialize(canvasRef.current, streamRef.current);
    }
  };

  const handleSubmit = () => {
    if (recordedBlob) {
      onComplete({
        questionId: question.id,
        blob: recordedBlob,
        duration: recordingTime,
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Question Card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">{question.id}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{question.title}</h3>
            <p className="text-gray-600">{question.question}</p>
          </div>
        </div>
      </div>

      {/* Video/Avatar Area */}
      <div className="relative aspect-video bg-gradient-to-br from-sky-100 to-cyan-50 rounded-xl overflow-hidden shadow-lg border border-gray-100">
        {/* Hidden video element for camera input (MediaPipe source) */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
          style={{ transform: 'scaleX(-1)' }}
          playsInline
          muted
        />

        {/* Canvas for avatar rendering */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          width={1280}
          height={720}
        />

        {/* Avatar Renderer (handles MediaPipe + VRM) */}
        <AvatarRenderer
          videoRef={videoRef}
          canvasRef={canvasRef}
          onReady={handleAvatarReady}
          onFaceDetected={handleFaceDetected}
          onFaceLost={handleFaceLost}
        />

        {/* Countdown Overlay */}
        {state === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-30">
            <div className="text-center">
              <span className="text-8xl font-bold text-primary-500 animate-pulse">{countdown}</span>
              <p className="text-gray-600 mt-2">準備してください</p>
            </div>
          </div>
        )}

        {/* Recording Indicator */}
        {state === 'recording' && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-rose-500/90 text-white px-4 py-2 rounded-full text-sm font-medium z-30 shadow-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span>
              {formatTime(recordingTime)} / {formatTime(question.maxDuration)}
            </span>
          </div>
        )}

        {/* Review Mode - Play recorded video */}
        {state === 'review' && recordedBlob && (
          <video
            src={URL.createObjectURL(recordedBlob)}
            className="absolute inset-0 w-full h-full object-cover z-30"
            controls
            playsInline
          />
        )}

        {/* Recording disabled warning when face not detected */}
        {state === 'preview' && !isFaceDetected && (
          <div className="absolute bottom-4 left-4 right-4 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg text-sm font-medium z-30 shadow-sm">
            顔が検出されていません。カメラに顔を向けてください。
          </div>
        )}
      </div>

      {/* Time Progress Bar */}
      {state === 'recording' && (
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-1000"
            style={{ width: `${(recordingTime / question.maxDuration) * 100}%` }}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        {state === 'loading' && (
          <div className="text-gray-500">アバターを準備中...</div>
        )}

        {state === 'preview' && (
          <button
            onClick={startCountdown}
            disabled={!isInitialized}
            className="py-3 px-8 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-full transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {question.title}を開始
          </button>
        )}

        {state === 'recording' && (
          <button
            onClick={stopRecording}
            className="py-3 px-8 bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-full transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            {question.title}を終了
          </button>
        )}

        {state === 'review' && (
          <>
            <button
              onClick={handleRetry}
              className="py-3 px-8 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-full transition-colors border border-gray-200"
            >
              撮り直す
            </button>
            <button
              onClick={handleSubmit}
              className="py-3 px-8 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-full transition-colors"
            >
              次の質問へ
            </button>
          </>
        )}
      </div>

      {/* Privacy Notice */}
      <p className="text-center text-xs text-gray-400">
        アバター映像のみが保存されます。あなたの素顔は保存されません。
      </p>
    </div>
  );
}
