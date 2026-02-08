'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface CompanySession {
  companyId: string;
  companyName: string;
}

interface CandidateDetail {
  jobCategory: string;
  availableLocations: string[];
  workConditions: {
    employmentType?: string[];
    remotePreference?: string;
  };
  summaryText?: string;
  videoUrl?: string;
}

const JOB_CATEGORY_NAMES: Record<string, string> = {
  engineering: 'エンジニア・技術職',
  sales: '営業',
  marketing: 'マーケティング・広報',
  design: 'デザイン・クリエイティブ',
  hr: '人事・総務',
  finance: '経理・財務',
  consulting: 'コンサルティング',
  management: '経営・管理職',
  service: 'サービス・接客',
  medical: '医療・福祉',
  education: '教育',
  legal: '法務',
  other: 'その他',
};

const REMOTE_LABELS: Record<string, string> = {
  onsite: 'オフィス勤務',
  hybrid: 'ハイブリッド',
  remote: 'フルリモート',
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  fulltime: '正社員',
  parttime: 'パート・アルバイト',
  contract: '契約社員',
  freelance: 'フリーランス・業務委託',
};

export default function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewId = searchParams.get('interviewId');

  const [session, setSession] = useState<CompanySession | null>(null);
  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewing, setIsViewing] = useState(false);
  const [viewError, setViewError] = useState('');
  const [remainingViews, setRemainingViews] = useState<number | null>(null);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState({
    positionTitle: '',
    message: '',
  });
  const [isSendingOffer, setIsSendingOffer] = useState(false);

  useEffect(() => {
    const sessionData = localStorage.getItem('v-resume-company-session');
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      setSession(parsed);
    }
  }, []);

  useEffect(() => {
    if (session && interviewId) {
      viewCandidate();
    } else if (session) {
      setIsLoading(false);
    }
  }, [session, interviewId]);

  const viewCandidate = async () => {
    if (!session || !interviewId) return;

    setIsViewing(true);
    setViewError('');

    try {
      const response = await fetch(`/api/admin/candidates/${resolvedParams.id}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: session.companyId,
          interviewId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCandidate({
          jobCategory: '',
          availableLocations: [],
          workConditions: {},
          summaryText: data.summaryText,
          videoUrl: data.videoUrl,
        });
        setRemainingViews(data.remainingViews);
      } else {
        setViewError(data.error || '閲覧に失敗しました');
      }
    } catch (err) {
      console.error('View candidate error:', err);
      setViewError('通信エラーが発生しました');
    } finally {
      setIsLoading(false);
      setIsViewing(false);
    }
  };

  const handleSendOffer = async () => {
    if (!session) return;

    setIsSendingOffer(true);

    try {
      const response = await fetch('/api/admin/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: session.companyId,
          profileId: resolvedParams.id,
          interviewId,
          positionTitle: offerForm.positionTitle,
          message: offerForm.message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowOfferModal(false);
        alert('オファーを送信しました');
        router.push('/admin/offers');
      } else {
        alert(data.error || 'オファーの送信に失敗しました');
      }
    } catch (err) {
      console.error('Send offer error:', err);
      alert('通信エラーが発生しました');
    } finally {
      setIsSendingOffer(false);
    }
  };

  if (isLoading || isViewing) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-gray-500">
            {isViewing ? '動画を読み込み中...' : '読み込み中...'}
          </p>
        </div>
      </div>
    );
  }

  if (viewError) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white rounded-xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">閲覧できません</h2>
          <p className="text-gray-500 mb-6">{viewError}</p>
          <Link
            href="/admin/candidates"
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            候補者一覧へ戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/candidates"
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          候補者一覧へ戻る
        </Link>

        {remainingViews !== null && (
          <span className="text-sm text-gray-500">
            残り閲覧可能数: {remainingViews}件
          </span>
        )}
      </div>

      {/* Video Section */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {candidate?.videoUrl ? (
          <div className="aspect-video bg-black">
            <video
              src={candidate.videoUrl}
              controls
              className="w-full h-full"
              poster="/video-poster.png"
            >
              お使いのブラウザは動画再生に対応していません
            </video>
          </div>
        ) : (
          <div className="aspect-video bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-400">動画がありません</p>
            </div>
          </div>
        )}

        <div className="p-6">
          {candidate?.jobCategory && (
            <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 text-sm font-medium rounded-full mb-4">
              {JOB_CATEGORY_NAMES[candidate.jobCategory] || candidate.jobCategory}
            </span>
          )}

          {candidate?.summaryText && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">AI要約</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{candidate.summaryText}</p>
            </div>
          )}

          {candidate?.workConditions && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {candidate.workConditions.employmentType && candidate.workConditions.employmentType.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">希望雇用形態</h3>
                  <p className="text-gray-700">
                    {candidate.workConditions.employmentType
                      .map((t) => EMPLOYMENT_TYPE_LABELS[t] || t)
                      .join(', ')}
                  </p>
                </div>
              )}
              {candidate.workConditions.remotePreference && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">リモート勤務</h3>
                  <p className="text-gray-700">
                    {REMOTE_LABELS[candidate.workConditions.remotePreference]}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => setShowOfferModal(true)}
              className="flex-1 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
            >
              オファーを送る
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-700">
            この動画はアバター映像と加工音声です。候補者の素顔・生声は含まれていません。
            連絡先は、オファーが承認された後に開示されます。
          </p>
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">オファーを送信</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ポジション名
                </label>
                <input
                  type="text"
                  value={offerForm.positionTitle}
                  onChange={(e) => setOfferForm((prev) => ({ ...prev, positionTitle: e.target.value }))}
                  placeholder="例: フロントエンドエンジニア"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メッセージ
                </label>
                <textarea
                  value={offerForm.message}
                  onChange={(e) => setOfferForm((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="候補者へのメッセージを入力してください"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowOfferModal(false)}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSendOffer}
                disabled={isSendingOffer}
                className="flex-1 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
              >
                {isSendingOffer ? '送信中...' : '送信'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
