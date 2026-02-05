'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type PermissionStatus = 'pending' | 'granted' | 'denied' | 'error';

interface CheckStatus {
  camera: PermissionStatus;
  microphone: PermissionStatus;
  faceDetection: PermissionStatus;
}

export default function SystemCheckPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CheckStatus>({
    camera: 'pending',
    microphone: 'pending',
    faceDetection: 'pending',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allGranted = status.camera === 'granted' &&
                     status.microphone === 'granted' &&
                     status.faceDetection === 'granted';

  useEffect(() => {
    return () => {
      // Cleanup: stop stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const requestPermissions = async () => {
    setErrorMessage(null);

    try {
      // Request camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: true,
      });

      streamRef.current = stream;

      // Display video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check tracks
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      setStatus(prev => ({
        ...prev,
        camera: videoTrack ? 'granted' : 'denied',
        microphone: audioTrack ? 'granted' : 'denied',
      }));

      // Simulate face detection check (in real app, use MediaPipe)
      // For now, we just mark it as granted after camera works
      setTimeout(() => {
        setStatus(prev => ({
          ...prev,
          faceDetection: 'granted',
        }));
      }, 1500);

    } catch (error) {
      console.error('Permission error:', error);

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          setErrorMessage('カメラ・マイクへのアクセスが拒否されました。ブラウザの設定から許可してください。');
          setStatus({
            camera: 'denied',
            microphone: 'denied',
            faceDetection: 'denied',
          });
        } else if (error.name === 'NotFoundError') {
          setErrorMessage('カメラまたはマイクが見つかりません。デバイスが接続されているか確認してください。');
          setStatus({
            camera: 'error',
            microphone: 'error',
            faceDetection: 'error',
          });
        } else {
          setErrorMessage(`エラーが発生しました: ${error.message}`);
          setStatus({
            camera: 'error',
            microphone: 'error',
            faceDetection: 'error',
          });
        }
      }
    }
  };

  const handleContinue = () => {
    router.push('/interview');
  };

  const StatusIcon = ({ status: s }: { status: PermissionStatus }) => {
    switch (s) {
      case 'granted':
        return (
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'denied':
      case 'error':
        return (
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-gray-300 rounded-full" />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-primary-600">V-Resume</h1>
          <p className="text-sm text-gray-500">システムチェック</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Video Preview */}
        <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
          <video
            ref={videoRef}
            className="w-full h-full object-cover mirror"
            style={{ transform: 'scaleX(-1)' }}
            playsInline
            muted
          />
          {status.camera === 'pending' && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <p className="text-gray-400">カメラプレビュー</p>
            </div>
          )}
        </div>

        {/* Status Checklist */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            システム要件の確認
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-700 dark:text-gray-300">カメラ</span>
              <StatusIcon status={status.camera} />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-700 dark:text-gray-300">マイク</span>
              <StatusIcon status={status.microphone} />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-700 dark:text-gray-300">顔認識</span>
              <StatusIcon status={status.faceDetection} />
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!allGranted ? (
            <button
              onClick={requestPermissions}
              className="w-full py-3 px-6 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-full transition-colors"
            >
              カメラ・マイクを許可する
            </button>
          ) : (
            <button
              onClick={handleContinue}
              className="w-full py-3 px-6 bg-green-500 hover:bg-green-600 text-white font-medium rounded-full transition-colors"
            >
              面接を開始する
            </button>
          )}

          <p className="text-center text-sm text-gray-500">
            ※ カメラ・マイクの許可が必要です。あなたの素顔や生声はサーバーに送信されません。
          </p>
        </div>
      </main>
    </div>
  );
}
