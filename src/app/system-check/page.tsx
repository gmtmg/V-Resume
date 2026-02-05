'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type PermissionStatus = 'pending' | 'granted' | 'denied' | 'error' | 'unsupported';

interface CheckStatus {
  camera: PermissionStatus;
  microphone: PermissionStatus;
  faceDetection: PermissionStatus;
  browserSupport: PermissionStatus;
}

export default function SystemCheckPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<CheckStatus>({
    camera: 'pending',
    microphone: 'pending',
    faceDetection: 'pending',
    browserSupport: 'pending',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const allGranted = status.camera === 'granted' &&
                     status.microphone === 'granted' &&
                     status.faceDetection === 'granted' &&
                     status.browserSupport === 'granted';

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

    // Check HTTPS requirement (required for getUserMedia on mobile)
    const isSecureContext = window.isSecureContext;
    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

    if (!isSecureContext && !isLocalhost) {
      setErrorMessage('セキュリティ上の理由から、HTTPS接続が必要です。URLが「https://」で始まっていることを確認してください。');
      setStatus(prev => ({
        ...prev,
        browserSupport: 'unsupported',
      }));
      return;
    }

    // Check browser compatibility first
    const checkBrowserSupport = () => {
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      const hasAudioContext = typeof AudioContext !== 'undefined' || typeof (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext !== 'undefined';

      // Check for canvas captureStream support
      const testCanvas = document.createElement('canvas');
      const hasCaptureStream = typeof testCanvas.captureStream === 'function';

      return hasGetUserMedia && hasMediaRecorder && hasAudioContext && hasCaptureStream;
    };

    if (!checkBrowserSupport()) {
      setErrorMessage('このブラウザはサポートされていません。Safari、Chrome、またはFirefoxの最新版をお使いください。');
      setStatus(prev => ({
        ...prev,
        browserSupport: 'unsupported',
      }));
      return;
    }

    setStatus(prev => ({
      ...prev,
      browserSupport: 'granted',
    }));

    try {
      // Start with simple constraints for maximum mobile compatibility
      // iOS Safari especially needs simple constraints first
      let stream: MediaStream;

      try {
        // First try: simple constraints (most compatible)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true,
        });
      } catch (simpleError) {
        console.warn('Simple constraints failed, trying with specific constraints:', simpleError);
        // Second try: with specific constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
            facingMode: 'user',
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
      }

      streamRef.current = stream;

      // Display video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready before playing (important for mobile)
        await new Promise<void>((resolve) => {
          const video = videoRef.current!;
          video.onloadedmetadata = () => {
            video.play()
              .then(() => resolve())
              .catch((playError) => {
                console.warn('Video play error (may need user interaction):', playError);
                resolve(); // Continue anyway
              });
          };
          // Timeout fallback
          setTimeout(resolve, 2000);
        });
      }

      // Check tracks
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      console.log('Camera track:', videoTrack?.label, videoTrack?.getSettings());
      console.log('Audio track:', audioTrack?.label, audioTrack?.getSettings());

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

      // Set debug info
      const errorDetails = error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
      setDebugInfo(`エラー詳細: ${errorDetails}\nUserAgent: ${navigator.userAgent.substring(0, 100)}`);

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          // Detect device type for specific instructions
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          const isAndroid = /Android/.test(navigator.userAgent);

          let helpMessage = 'カメラ・マイクへのアクセスが拒否されました。';

          if (isIOS) {
            helpMessage += '\n\n【iPhoneの場合】\n1. 「設定」アプリを開く\n2. 「Safari」（または使用中のブラウザ）を選択\n3. 「カメラ」と「マイク」を「許可」に設定\n4. このページを再読み込み';
          } else if (isAndroid) {
            helpMessage += '\n\n【Androidの場合 - Chromeアプリの権限確認】\n1. 「設定」アプリを開く\n2. 「アプリ」→「Chrome」を選択\n3. 「権限」をタップ\n4. 「カメラ」と「マイク」を「許可」に変更\n5. このページを再読み込み\n\n【それでも解決しない場合】\nChromeのアドレスバー左の鍵アイコン→「権限」から許可してください。';
          } else {
            helpMessage += '\n\nブラウザのアドレスバー付近にあるカメラアイコンをクリックして許可してください。';
          }

          setErrorMessage(helpMessage);
          setStatus(prev => ({
            ...prev,
            camera: 'denied',
            microphone: 'denied',
            faceDetection: 'denied',
          }));
        } else if (error.name === 'NotFoundError') {
          setErrorMessage('カメラまたはマイクが見つかりません。デバイスが接続されているか確認してください。');
          setStatus(prev => ({
            ...prev,
            camera: 'error',
            microphone: 'error',
            faceDetection: 'error',
          }));
        } else if (error.name === 'OverconstrainedError') {
          setErrorMessage('カメラの設定に対応できませんでした。最小限の設定で再試行します...');
          // Retry with minimal constraints for mobile devices
          console.warn('Overconstrained, retrying with minimal constraints');
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: true,
            });
            streamRef.current = fallbackStream;
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              await videoRef.current.play();
            }
            const videoTrack = fallbackStream.getVideoTracks()[0];
            const audioTrack = fallbackStream.getAudioTracks()[0];
            setStatus(prev => ({
              ...prev,
              camera: videoTrack ? 'granted' : 'denied',
              microphone: audioTrack ? 'granted' : 'denied',
            }));
            setErrorMessage(null);
            setTimeout(() => {
              setStatus(prev => ({ ...prev, faceDetection: 'granted' }));
            }, 1500);
            return;
          } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            const fallbackDetails = fallbackError instanceof Error
              ? `${fallbackError.name}: ${fallbackError.message}`
              : String(fallbackError);
            setDebugInfo(prev => `${prev}\n\nフォールバックエラー: ${fallbackDetails}`);
            setErrorMessage('カメラの解像度に対応できません。別のブラウザをお試しください。');
            setStatus(prev => ({
              ...prev,
              camera: 'error',
              microphone: 'error',
              faceDetection: 'error',
            }));
          }
        } else if (error.name === 'NotReadableError') {
          setErrorMessage('カメラまたはマイクが他のアプリで使用中です。他のアプリを閉じてからお試しください。');
          setStatus(prev => ({
            ...prev,
            camera: 'error',
            microphone: 'error',
            faceDetection: 'error',
          }));
        } else {
          setErrorMessage(`エラーが発生しました: ${error.message}`);
          setStatus(prev => ({
            ...prev,
            camera: 'error',
            microphone: 'error',
            faceDetection: 'error',
          }));
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
      case 'unsupported':
        return (
          <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
            autoPlay
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
              <span className="text-gray-700 dark:text-gray-300">ブラウザ互換性</span>
              <StatusIcon status={status.browserSupport} />
            </div>
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
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg space-y-3">
              <p className="text-red-600 dark:text-red-400 text-sm whitespace-pre-line">{errorMessage}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-primary-600 dark:text-primary-400 underline"
              >
                ページを再読み込み
              </button>
              {debugInfo && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">技術的な詳細</summary>
                  <pre className="text-xs text-gray-400 mt-1 whitespace-pre-wrap break-all">{debugInfo}</pre>
                </details>
              )}
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
