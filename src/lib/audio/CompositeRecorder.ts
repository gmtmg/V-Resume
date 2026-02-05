/**
 * CompositeRecorder - Canvas映像と加工音声を合成して録画
 *
 * 【重要】プライバシー保護:
 * - 録画される映像はアバターが描画されたCanvasのみ
 * - 録画される音声はピッチ加工済みの音声のみ
 * - ユーザーの素顔・生声は一切含まれない
 */

import { PitchShifter } from './PitchShifter';

export interface CompositeRecorderOptions {
  canvas: HTMLCanvasElement;
  audioStream: MediaStream;
  pitchRatio?: number;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  mimeType?: string;
}

export interface RecordingResult {
  blob: Blob;
  duration: number;
}

export class CompositeRecorder {
  private canvas: HTMLCanvasElement;
  private mediaRecorder: MediaRecorder | null = null;
  private pitchShifter: PitchShifter | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private options: CompositeRecorderOptions;
  private combinedStream: MediaStream | null = null;

  constructor(options: CompositeRecorderOptions) {
    this.options = options;
    this.canvas = options.canvas;
  }

  // Initialize and prepare for recording
  async initialize(): Promise<void> {
    // Create pitch shifter for audio
    this.pitchShifter = new PitchShifter({
      pitchRatio: this.options.pitchRatio ?? 0.75,
    });
    await this.pitchShifter.connectSource(this.options.audioStream);

    // Get canvas stream (avatar video)
    // Check if captureStream is supported (not available on older iOS versions)
    if (!this.canvas.captureStream) {
      throw new Error('Canvas captureStream is not supported on this browser');
    }

    // Use lower framerate on mobile for better performance
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const frameRate = isMobile ? 24 : 30;
    const canvasStream = this.canvas.captureStream(frameRate);

    // Get pitch-shifted audio stream
    const audioStream = this.pitchShifter.getOutputStream();

    // Combine video and audio tracks
    const videoTrack = canvasStream.getVideoTracks()[0];
    const audioTrack = audioStream.getAudioTracks()[0];

    if (!videoTrack) {
      throw new Error('Canvas video track not available');
    }

    this.combinedStream = new MediaStream();
    this.combinedStream.addTrack(videoTrack);

    if (audioTrack) {
      this.combinedStream.addTrack(audioTrack);
    }

    // Determine supported MIME type
    const mimeType = this.getSupportedMimeType();

    // Create MediaRecorder with appropriate options
    const recorderOptions: MediaRecorderOptions = {
      videoBitsPerSecond: this.options.videoBitsPerSecond ?? 2500000,
      audioBitsPerSecond: this.options.audioBitsPerSecond ?? 128000,
    };

    // Only set mimeType if we found a supported one
    if (mimeType) {
      recorderOptions.mimeType = mimeType;
    }

    try {
      this.mediaRecorder = new MediaRecorder(this.combinedStream, recorderOptions);
    } catch (err) {
      console.warn('[CompositeRecorder] Failed with options, trying without mimeType:', err);
      // Fallback: let browser choose format
      this.mediaRecorder = new MediaRecorder(this.combinedStream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };
  }

  // Get supported MIME type
  private getSupportedMimeType(): string {
    // Check if we're on iOS Safari (which has limited MediaRecorder support)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // iOS Safari prefers MP4/H.264
    const types = isIOS || isSafari
      ? [
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4;codecs=h264,aac',
          'video/mp4',
          'video/webm;codecs=h264,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
        ]
      : [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=h264,opus',
          'video/webm',
          'video/mp4',
        ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('[CompositeRecorder] Using MIME type:', type);
        return type;
      }
    }

    // Fallback - let browser decide
    console.warn('[CompositeRecorder] No preferred MIME type supported, using default');
    return '';
  }

  // Start recording
  start(): void {
    if (!this.mediaRecorder) {
      throw new Error('Recorder not initialized. Call initialize() first.');
    }

    this.recordedChunks = [];
    this.startTime = Date.now();
    this.mediaRecorder.start(1000); // Collect data every second
  }

  // Stop recording and return result
  async stop(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const duration = (Date.now() - this.startTime) / 1000;
        const blob = new Blob(this.recordedChunks, {
          type: this.mediaRecorder?.mimeType || 'video/webm',
        });
        resolve({ blob, duration });
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error(`Recording error: ${event}`));
      };

      this.mediaRecorder.stop();
    });
  }

  // Pause recording
  pause(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  // Resume recording
  resume(): void {
    if (this.mediaRecorder?.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  // Get current recording state
  getState(): RecordingState | 'uninitialized' {
    return this.mediaRecorder?.state ?? 'uninitialized';
  }

  // Update pitch ratio during recording
  setPitchRatio(ratio: number): void {
    this.pitchShifter?.setPitchRatio(ratio);
  }

  // Cleanup
  async dispose(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;

    if (this.pitchShifter) {
      await this.pitchShifter.dispose();
      this.pitchShifter = null;
    }

    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach((track) => track.stop());
      this.combinedStream = null;
    }

    this.recordedChunks = [];
  }
}

// Hook for using CompositeRecorder in React components
export function useCompositeRecorder() {
  let recorder: CompositeRecorder | null = null;

  const initialize = async (options: CompositeRecorderOptions) => {
    recorder = new CompositeRecorder(options);
    await recorder.initialize();
    return recorder;
  };

  const cleanup = async () => {
    if (recorder) {
      await recorder.dispose();
      recorder = null;
    }
  };

  return { initialize, cleanup };
}
