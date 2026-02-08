'use client';

import { useState, useEffect } from 'react';

interface CompanySession {
  companyId: string;
  companyName: string;
}

interface UsageData {
  monthlyViewLimit: number;
  viewsUsedThisMonth: number;
  pendingOffers: number;
  acceptedOffers: number;
  planType: string;
  billingResetDate: string;
}

const PLAN_DETAILS: Record<string, { name: string; viewLimit: number; price: string }> = {
  free: { name: '無料プラン', viewLimit: 10, price: '¥0/月' },
  basic: { name: 'ベーシック', viewLimit: 50, price: '¥9,800/月' },
  premium: { name: 'プレミアム', viewLimit: 200, price: '¥29,800/月' },
};

export default function AdminUsagePage() {
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  const currentPlan = PLAN_DETAILS[usage?.planType || 'free'];
  const viewsRemaining = usage ? usage.monthlyViewLimit - usage.viewsUsedThisMonth : 0;
  const viewsPercentage = usage ? (usage.viewsUsedThisMonth / usage.monthlyViewLimit) * 100 : 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">利用状況</h1>

      {/* Current Plan */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">現在のプラン</h2>
            <p className="text-gray-500">{session?.companyName}</p>
          </div>
          <span className="px-4 py-2 bg-primary-100 text-primary-700 font-medium rounded-full">
            {currentPlan.name}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">今月の動画閲覧</h3>
            <div className="text-3xl font-bold text-gray-900">
              {usage?.viewsUsedThisMonth || 0}
              <span className="text-lg font-normal text-gray-400">
                /{usage?.monthlyViewLimit || 10}
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  viewsPercentage >= 90 ? 'bg-red-500' : viewsPercentage >= 70 ? 'bg-yellow-500' : 'bg-primary-500'
                }`}
                style={{ width: `${Math.min(viewsPercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">残り {viewsRemaining} 件</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">送信中のオファー</h3>
            <div className="text-3xl font-bold text-gray-900">{usage?.pendingOffers || 0}</div>
            <p className="text-xs text-gray-400 mt-1">返答待ち</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-1">承認済みオファー</h3>
            <div className="text-3xl font-bold text-green-600">{usage?.acceptedOffers || 0}</div>
            <p className="text-xs text-gray-400 mt-1">マッチング成功</p>
          </div>
        </div>

        {usage?.billingResetDate && (
          <p className="text-sm text-gray-500 mt-4">
            次回リセット日: {formatDate(usage.billingResetDate)}
          </p>
        )}
      </div>

      {/* Plan Comparison */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-6">プラン比較</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(PLAN_DETAILS).map(([key, plan]) => (
            <div
              key={key}
              className={`border-2 rounded-xl p-6 ${
                usage?.planType === key
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">{plan.name}</h3>
                {usage?.planType === key && (
                  <span className="text-xs bg-primary-500 text-white px-2 py-1 rounded-full">
                    現在のプラン
                  </span>
                )}
              </div>

              <div className="text-2xl font-bold text-gray-900 mb-4">{plan.price}</div>

              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  月{plan.viewLimit}件まで動画閲覧
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  求職者検索・フィルター
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  オファー送信機能
                </li>
                {key !== 'free' && (
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    優先サポート
                  </li>
                )}
              </ul>

              {usage?.planType !== key && (
                <button
                  className="w-full mt-6 py-2 border border-primary-500 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors text-sm font-medium"
                  onClick={() => alert('プラン変更機能は後日実装予定です')}
                >
                  {key === 'free' ? 'ダウングレード' : 'アップグレード'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Usage History Placeholder */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4">利用履歴</h2>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-500">詳細な利用履歴は後日実装予定です</p>
        </div>
      </div>
    </div>
  );
}
