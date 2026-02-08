'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface OfferDetail {
  id: string;
  companyName: string;
  positionTitle?: string;
  message?: string;
  status: string;
  sentAt: string;
  expiresAt: string;
}

export default function OfferResponsePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);
  const [error, setError] = useState('');
  const [responded, setResponded] = useState<'accepted' | 'rejected' | null>(null);

  useEffect(() => {
    loadOffer();
  }, []);

  const loadOffer = async () => {
    try {
      const response = await fetch(`/api/offers/${resolvedParams.id}`);
      const data = await response.json();

      if (data.success) {
        setOffer(data.offer);

        // Mark as viewed if pending
        if (data.offer.status === 'pending') {
          await fetch(`/api/offers/${resolvedParams.id}/view`, { method: 'POST' });
        }
      } else {
        setError(data.error || 'オファーが見つかりません');
      }
    } catch (err) {
      console.error('Load offer error:', err);
      setError('通信エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRespond = async (action: 'accept' | 'reject') => {
    if (!offer) return;

    setIsResponding(true);

    try {
      const response = await fetch(`/api/offers/${offer.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (data.success) {
        setResponded(action === 'accept' ? 'accepted' : 'rejected');
      } else {
        setError(data.error || '応答に失敗しました');
      }
    } catch (err) {
      console.error('Respond error:', err);
      setError('通信エラーが発生しました');
    } finally {
      setIsResponding(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isExpired = offer ? new Date(offer.expiresAt) < new Date() : false;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-xl p-8 shadow-sm max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">エラー</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            トップページへ
          </Link>
        </div>
      </div>
    );
  }

  if (responded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-xl p-8 shadow-sm max-w-md w-full text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            responded === 'accepted' ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            {responded === 'accepted' ? (
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {responded === 'accepted' ? 'オファーを承認しました' : 'オファーを辞退しました'}
          </h2>

          {responded === 'accepted' ? (
            <div className="text-gray-500 mb-6">
              <p className="mb-2">
                {offer?.companyName}に連絡先が開示されました。
              </p>
              <p className="text-sm">
                企業からの連絡をお待ちください。
              </p>
            </div>
          ) : (
            <p className="text-gray-500 mb-6">
              今後も他の企業からのオファーをお待ちしております。
            </p>
          )}

          <Link
            href="/mypage"
            className="inline-block px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            マイページへ
          </Link>
        </div>
      </div>
    );
  }

  if (offer?.status === 'accepted' || offer?.status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-xl p-8 shadow-sm max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">応答済みです</h2>
          <p className="text-gray-500 mb-6">
            このオファーには既に応答済みです。
          </p>
          <Link
            href="/mypage"
            className="inline-block px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            マイページへ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-primary-600 mb-1">V-Resume</h1>
          <p className="text-gray-500">オファー詳細</p>
        </div>

        {/* Offer Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Company Header */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">{offer?.companyName}</h2>
                {offer?.positionTitle && (
                  <p className="text-primary-100">{offer.positionTitle}</p>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {isExpired ? (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                <p className="font-medium">このオファーは有効期限が切れています</p>
                <p className="text-sm mt-1">
                  有効期限: {formatDate(offer?.expiresAt || '')}
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 text-blue-600 p-4 rounded-lg mb-6">
                <p className="text-sm">
                  有効期限: {formatDate(offer?.expiresAt || '')}
                </p>
              </div>
            )}

            {offer?.message && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">メッセージ</h3>
                <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                  {offer.message}
                </p>
              </div>
            )}

            <div className="text-sm text-gray-500 mb-6">
              <p>受信日: {formatDate(offer?.sentAt || '')}</p>
            </div>

            {/* Actions */}
            {!isExpired && (
              <div className="space-y-3">
                <button
                  onClick={() => handleRespond('accept')}
                  disabled={isResponding}
                  className="w-full py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {isResponding ? '処理中...' : 'オファーを承認する'}
                </button>
                <button
                  onClick={() => handleRespond('reject')}
                  disabled={isResponding}
                  className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  辞退する
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">承認すると</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600">
                <li>企業にあなたの電話番号が開示されます</li>
                <li>他の企業からの検索対象から外れます</li>
                <li>企業から直接連絡が届きます</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/mypage" className="text-primary-500 hover:text-primary-600 text-sm">
            マイページへ戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
