'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ProfileData } from '@/types';

interface SessionData {
  profileId: string;
  phone: string;
  loggedInAt: string;
}

interface OfferData {
  id: string;
  companyName: string;
  positionTitle?: string;
  message?: string;
  status: string;
  sentAt: string;
  expiresAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: '未確認', color: 'bg-yellow-100 text-yellow-700' },
  viewed: { label: '確認済', color: 'bg-blue-100 text-blue-700' },
  accepted: { label: '承認済', color: 'bg-green-100 text-green-700' },
  rejected: { label: '辞退', color: 'bg-gray-100 text-gray-700' },
  expired: { label: '期限切れ', color: 'bg-red-100 text-red-700' },
};

export default function MyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [session, setSession] = useState<SessionData | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Check session
      const sessionData = localStorage.getItem('v-resume-session');
      if (!sessionData) {
        // Try loading from profile
        const profileData = localStorage.getItem('v-resume-profile');
        if (profileData) {
          const parsedProfile = JSON.parse(profileData);
          setProfile(parsedProfile);
          await loadOffers(parsedProfile.phone);
        } else {
          router.push('/login');
          return;
        }
      } else {
        const parsedSession: SessionData = JSON.parse(sessionData);
        setSession(parsedSession);

        // Load profile from API
        const profileRes = await fetch(`/api/profile?phone=${encodeURIComponent(parsedSession.phone)}`);
        const profileData = await profileRes.json();
        if (profileData.success) {
          setProfile(profileData.profile);
        }

        await loadOffers(parsedSession.phone);
      }
    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOffers = async (phone: string) => {
    try {
      const res = await fetch(`/api/offers?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (data.success) {
        setOffers(data.offers);
      }
    } catch (err) {
      console.error('Load offers error:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('v-resume-session');
    router.push('/');
  };

  const handleRespond = async (offerId: string, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/offers/${offerId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (data.success) {
        // Reload offers
        if (session?.phone) {
          await loadOffers(session.phone);
        } else if (profile?.phone) {
          await loadOffers(profile.phone);
        }
      }
    } catch (err) {
      console.error('Respond error:', err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary-600">V-Resume</h1>
            <p className="text-sm text-gray-500">マイページ</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Profile Card */}
        <section className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">プロフィール</h2>
            <Link
              href="/profile/setup"
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              編集
            </Link>
          </div>

          {profile ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-500">
                    {profile.fullName?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{profile.fullName}</p>
                  <p className="text-sm text-gray-500">{profile.phone}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">職種カテゴリ</p>
                  <p className="text-sm font-medium text-gray-900">
                    {profile.jobCategory || '未設定'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">公開状態</p>
                  <p className="text-sm font-medium text-gray-900">
                    {profile.isSearchable ? (
                      <span className="text-green-600">公開中</span>
                    ) : (
                      <span className="text-gray-500">非公開</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">プロフィールが設定されていません</p>
          )}
        </section>

        {/* Offers Section */}
        <section className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            オファー
            {offers.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({offers.length}件)
              </span>
            )}
          </h2>

          {offers.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-500">まだオファーはありません</p>
              <p className="text-sm text-gray-400 mt-1">
                企業からのオファーがあるとここに表示されます
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="border border-gray-100 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{offer.companyName}</p>
                      {offer.positionTitle && (
                        <p className="text-sm text-primary-600">{offer.positionTitle}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        isExpired(offer.expiresAt) && offer.status === 'pending'
                          ? STATUS_LABELS.expired.color
                          : STATUS_LABELS[offer.status]?.color || 'bg-gray-100'
                      }`}
                    >
                      {isExpired(offer.expiresAt) && offer.status === 'pending'
                        ? STATUS_LABELS.expired.label
                        : STATUS_LABELS[offer.status]?.label || offer.status}
                    </span>
                  </div>

                  {offer.message && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {offer.message}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {formatDate(offer.sentAt)} 受信
                      {!isExpired(offer.expiresAt) && offer.status === 'pending' && (
                        <span className="ml-2">
                          (期限: {formatDate(offer.expiresAt)})
                        </span>
                      )}
                    </p>

                    {(offer.status === 'pending' || offer.status === 'viewed') &&
                      !isExpired(offer.expiresAt) && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespond(offer.id, 'reject')}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                          >
                            辞退
                          </button>
                          <button
                            onClick={() => handleRespond(offer.id, 'accept')}
                            className="px-3 py-1 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                          >
                            承認
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Quick Links */}
        <section className="grid grid-cols-2 gap-4">
          <Link
            href="/interview"
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">動画を撮り直す</p>
            <p className="text-xs text-gray-500">新しい面接動画を録画</p>
          </Link>

          <Link
            href="/profile/setup"
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">プロフィール編集</p>
            <p className="text-xs text-gray-500">条件や希望を変更</p>
          </Link>
        </section>
      </main>
    </div>
  );
}
