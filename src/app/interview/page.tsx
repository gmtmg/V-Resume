'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { INTERVIEW_QUESTIONS, InterviewRecording } from '@/types';
import { InterviewSession } from '@/components/recording/InterviewSession';

// For MVP: Store recordings in memory, upload on complete
// In production: Use a proper state management solution
const recordingsStore: InterviewRecording[] = [];

export default function InterviewPage() {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [recordings, setRecordings] = useState<InterviewRecording[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const currentQuestion = INTERVIEW_QUESTIONS[currentQuestionIndex];
  const isComplete = currentQuestionIndex >= INTERVIEW_QUESTIONS.length;

  useEffect(() => {
    // Check if we have camera/mic permissions
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then(() => setIsReady(true))
      .catch(() => {
        // Redirect to system check if no permissions
        router.push('/system-check');
      });

    // Clear any previous recordings on mount
    recordingsStore.length = 0;
  }, [router]);

  const handleRecordingComplete = useCallback((recording: InterviewRecording) => {
    setRecordings((prev) => [...prev, recording]);
    recordingsStore.push(recording);
    setCurrentQuestionIndex((prev) => prev + 1);
  }, []);

  const handleAllComplete = async () => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // For MVP: Simulate upload progress
      // In production: Use actual Supabase upload
      const totalRecordings = recordings.length;

      for (let i = 0; i < totalRecordings; i++) {
        // Simulate upload delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        setUploadProgress(((i + 1) / totalRecordings) * 100);
      }

      // Store recording info for complete page
      const recordingInfo = recordings.map((r) => ({
        questionId: r.questionId,
        duration: r.duration,
        // In production: Store uploaded URLs here
      }));

      localStorage.setItem('v-resume-recordings', JSON.stringify(recordingInfo));

      // Navigate to complete page
      router.push('/complete');
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">準備中...</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center space-y-6 p-8 max-w-md">
          {isUploading ? (
            <>
              <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <h2 className="text-2xl font-bold text-white">アップロード中...</h2>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-gray-400 text-sm">
                録画データを安全にアップロードしています
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white">面接が完了しました</h2>
              <p className="text-gray-400">全ての質問への回答が録画されました。</p>

              {/* Recording Summary */}
              <div className="bg-gray-800 rounded-lg p-4 text-left">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">録画内容</h3>
                <ul className="space-y-2">
                  {recordings.map((r, i) => (
                    <li key={r.questionId} className="flex items-center gap-3 text-gray-300 text-sm">
                      <span className="w-6 h-6 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-400 text-xs">
                        {i + 1}
                      </span>
                      <span>{INTERVIEW_QUESTIONS[i].title}</span>
                      <span className="text-gray-500 ml-auto">{r.duration}秒</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleAllComplete}
                className="w-full py-3 px-6 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-full transition-colors"
              >
                送信して完了
              </button>

              <p className="text-xs text-gray-500">
                送信される動画はアバター映像のみです。素顔は含まれません。
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">V-Resume</h1>
            <p className="text-sm text-gray-400">アバター面接</p>
          </div>
          <div className="text-sm text-gray-400">
            質問 {currentQuestionIndex + 1} / {INTERVIEW_QUESTIONS.length}
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-gray-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-1 bg-gray-700 rounded-full">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{
                width: `${(currentQuestionIndex / INTERVIEW_QUESTIONS.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-4">
        <InterviewSession
          key={currentQuestionIndex} // Force remount on question change
          question={currentQuestion}
          onComplete={handleRecordingComplete}
        />
      </main>
    </div>
  );
}
