'use client';

import { useRef, useState, useCallback } from 'react';
import { CompositeRecorder, RecordingResult } from '@/lib/audio';

interface UseRecorderOptions {
  pitchRatio?: number;
}

interface UseRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  isInitialized: boolean;
  error: string | null;
  initialize: (canvas: HTMLCanvasElement, audioStream: MediaStream) => Promise<void>;
  start: () => void;
  stop: () => Promise<RecordingResult | null>;
  pause: () => void;
  resume: () => void;
  cleanup: () => Promise<void>;
}

export function useRecorder(options: UseRecorderOptions = {}): UseRecorderReturn {
  const recorderRef = useRef<CompositeRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(
    async (canvas: HTMLCanvasElement, audioStream: MediaStream) => {
      try {
        setError(null);

        // Cleanup existing recorder
        if (recorderRef.current) {
          await recorderRef.current.dispose();
        }

        // Create new recorder
        const recorder = new CompositeRecorder({
          canvas,
          audioStream,
          pitchRatio: options.pitchRatio ?? 0.75,
        });

        await recorder.initialize();
        recorderRef.current = recorder;
        setIsInitialized(true);
      } catch (err) {
        console.error('Recorder initialization error:', err);
        setError('録画の初期化に失敗しました');
        setIsInitialized(false);
      }
    },
    [options.pitchRatio]
  );

  const start = useCallback(() => {
    if (!recorderRef.current) {
      setError('レコーダーが初期化されていません');
      return;
    }

    try {
      recorderRef.current.start();
      setIsRecording(true);
      setIsPaused(false);
      setError(null);
    } catch (err) {
      console.error('Recording start error:', err);
      setError('録画の開始に失敗しました');
    }
  }, []);

  const stop = useCallback(async (): Promise<RecordingResult | null> => {
    if (!recorderRef.current) {
      setError('レコーダーが初期化されていません');
      return null;
    }

    try {
      const result = await recorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      return result;
    } catch (err) {
      console.error('Recording stop error:', err);
      setError('録画の停止に失敗しました');
      return null;
    }
  }, []);

  const pause = useCallback(() => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.pause();
      setIsPaused(true);
    }
  }, [isRecording]);

  const resume = useCallback(() => {
    if (recorderRef.current && isPaused) {
      recorderRef.current.resume();
      setIsPaused(false);
    }
  }, [isPaused]);

  const cleanup = useCallback(async () => {
    if (recorderRef.current) {
      await recorderRef.current.dispose();
      recorderRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    setIsInitialized(false);
  }, []);

  return {
    isRecording,
    isPaused,
    isInitialized,
    error,
    initialize,
    start,
    stop,
    pause,
    resume,
    cleanup,
  };
}
