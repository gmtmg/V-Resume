'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CompanySession {
  companyId: string;
  companyName: string;
  email: string;
}

interface UsageData {
  monthlyViewLimit: number;
  viewsUsedThisMonth: number;
  pendingOffers: number;
  acceptedOffers: number;
}

export default function AdminDashboardPage() {
  const [session, setSession] = useState<CompanySession | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionData = localStorage.getItem('v-resume-company-session');
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      setSession(parsed);
      loadUsage(parsed.companyId);
    }
  }, []);

  const loadUsage = async (companyId: string) => {
    try {
      const response = await fetch(`/api/admin/usage?companyId=${companyId}`);
      const data = await response.json();
      if (data.success) {
        setUsage(data.usage);
      }
    } catch (err) {
      console.error('Load usage error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  const viewsRemaining = usage ? usage.monthlyViewLimit - usage.viewsUsedThisMonth : 0;
  const viewsPercentage = usage ? (usage.viewsUsedThisMonth / usage.monthlyViewLimit) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          ようこそ、{session?.companyName}
        </h1>
        <p className="text-gray-500">V-Resumeで優秀な人材を見つけましょう</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">今月の閲覧数</h3>
            <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {usage?.viewsUsedThisMonth || 0}
            <span className="text-lg font-normal text-gray-400">
              /{usage?.monthlyViewLimit || 10}
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: `${Math.min(viewsPercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">残り {viewsRemaining} 件</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">送信中のオファー</h3>
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900">{usage?.pendingOffers || 0}</div>
          <p className="text-xs text-gray-400 mt-1">返答待ち</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">承認されたオファー</h3>
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900">{usage?.acceptedOffers || 0}</div>
          <p className="text-xs text-gray-400 mt-1">マッチング成功</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500">プラン</h3>
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-gray-900">無料プラン</div>
          <p className="text-xs text-gray-400 mt-1">月10件まで閲覧可能</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/candidates"
          className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
              <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">求職者を検索</h3>
              <p className="text-sm text-gray-500">職種・勤務地で絞り込み</p>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/offers"
          className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">オファー管理</h3>
              <p className="text-sm text-gray-500">送信済みオファーを確認</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Getting Started */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
        <h2 className="text-lg font-bold mb-2">V-Resumeの使い方</h2>
        <ol className="space-y-2 text-primary-100">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
            <span>「求職者を検索」から条件に合う候補者を探す</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
            <span>アバター面接動画を閲覧してスキルと人柄を確認</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
            <span>気になる候補者にオファーを送信</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">4</span>
            <span>承認されると連絡先が開示されます</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
