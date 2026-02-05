'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { INTERVIEW_QUESTIONS } from '@/types';

interface RecordingInfo {
  questionId: number;
  duration: number;
}

export default function CompletePage() {
  const [showConfetti, setShowConfetti] = useState(true);
  const [recordings, setRecordings] = useState<RecordingInfo[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);

    // Load recording info from localStorage
    const stored = localStorage.getItem('v-resume-recordings');
    if (stored) {
      try {
        setRecordings(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recordings:', e);
      }
    }

    return () => clearTimeout(timer);
  }, []);

  // Simulate summary generation (in production, this would use actual transcripts)
  const generateSummary = async () => {
    setIsGeneratingSummary(true);

    try {
      // For MVP demo: Use mock transcripts
      // In production: Use Whisper to transcribe actual recordings
      const mockTranscripts = [
        {
          question: '自己紹介',
          answer:
            '山田太郎と申します。Webエンジニアとして5年間の経験があり、特にフロントエンド開発を専門としています。',
        },
        {
          question: '成功体験・プロジェクト',
          answer:
            '前職では新規サービスの立ち上げに参画し、ユーザー数を半年で10倍に成長させることに貢献しました。',
        },
        {
          question: '強みと活かし方',
          answer:
            '私の強みは問題解決能力とコミュニケーション力です。技術的な課題を分かりやすく説明し、チームで解決策を見つけることを心がけています。',
        },
        {
          question: '希望条件・環境',
          answer:
            'リモートワーク可能な環境を希望しています。また、新しい技術にチャレンジできる会社で働きたいと考えています。',
        },
        {
          question: '企業へのメッセージ',
          answer:
            '御社の掲げるミッションに共感しております。ぜひ一緒に良いプロダクトを作っていきたいです。',
        },
      ];

      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcripts: mockTranscripts }),
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      } else {
        // Fallback summary if API fails
        setSummary(
          '【要約生成に失敗しました】\n\nOpenAI APIキーが設定されていないか、エラーが発生しました。本番環境ではAPIキーを設定してください。'
        );
      }
    } catch (error) {
      console.error('Summary generation error:', error);
      setSummary(
        '【要約生成エラー】\n\n要約の生成中にエラーが発生しました。ネットワーク接続を確認してください。'
      );
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const totalDuration = recordings.reduce((sum, r) => sum + r.duration, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-12 h-12 text-green-500"
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

            {/* Confetti */}
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none overflow-visible">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full animate-bounce"
                    style={{
                      backgroundColor: ['#f87171', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa'][
                        i % 5
                      ],
                      left: `${-20 + i * 12}%`,
                      top: `${Math.random() * 50}%`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: `${0.5 + Math.random() * 0.5}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            登録が完了しました!
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            アバター面接の録画が正常に保存されました。
            <br />
            企業からのスカウトをお待ちください。
          </p>
        </div>

        {/* Recording Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            録画内容
          </h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-primary-600">{recordings.length}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">回答数</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-primary-600">
                {Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, '0')}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">総録画時間</div>
            </div>
          </div>

          <ul className="space-y-2">
            {recordings.map((r, i) => (
              <li
                key={r.questionId}
                className="flex items-center gap-3 text-gray-700 dark:text-gray-300 text-sm"
              >
                <svg
                  className="w-5 h-5 text-green-500 flex-shrink-0"
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
                <span>{INTERVIEW_QUESTIONS[i]?.title || `質問${i + 1}`}</span>
                <span className="text-gray-400 ml-auto">{r.duration}秒</span>
              </li>
            ))}
          </ul>
        </div>

        {/* AI Summary Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              AI要約
            </h3>
            {!summary && !isGeneratingSummary && (
              <button
                onClick={generateSummary}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                要約を生成
              </button>
            )}
          </div>

          {isGeneratingSummary ? (
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span>AI が要約を生成中...</span>
            </div>
          ) : summary ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{summary}</p>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">
              「要約を生成」をクリックすると、AIがあなたの回答内容を要約します。
            </p>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              あなたの素顔や生声は一切保存されていません。
              企業が閲覧できるのはアバター映像と加工音声のみです。
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="block w-full py-3 px-6 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-full transition-colors text-center"
          >
            トップページへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
