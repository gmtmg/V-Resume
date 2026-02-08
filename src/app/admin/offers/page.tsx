'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CompanySession {
  companyId: string;
  companyName: string;
}

interface OfferData {
  id: string;
  profileId: string;
  jobCategory?: string;
  positionTitle?: string;
  message?: string;
  status: string;
  sentAt: string;
  viewedAt?: string;
  respondedAt?: string;
  expiresAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: '返答待ち', color: 'bg-yellow-100 text-yellow-700' },
  viewed: { label: '確認済み', color: 'bg-blue-100 text-blue-700' },
  accepted: { label: '承認', color: 'bg-green-100 text-green-700' },
  rejected: { label: '辞退', color: 'bg-gray-100 text-gray-600' },
  expired: { label: '期限切れ', color: 'bg-red-100 text-red-700' },
};

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

export default function AdminOffersPage() {
  const [session, setSession] = useState<CompanySession | null>(null);
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const sessionData = localStorage.getItem('v-resume-company-session');
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      setSession(parsed);
      loadOffers(parsed.companyId);
    }
  }, []);

  const loadOffers = async (companyId: string) => {
    try {
      const response = await fetch(`/api/admin/offers?companyId=${companyId}`);
      const data = await response.json();
      if (data.success) {
        setOffers(data.offers);
      }
    } catch (err) {
      console.error('Load offers error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string, status: string) => {
    return new Date(expiresAt) < new Date() && (status === 'pending' || status === 'viewed');
  };

  const getStatus = (offer: OfferData) => {
    if (isExpired(offer.expiresAt, offer.status)) {
      return 'expired';
    }
    return offer.status;
  };

  const filteredOffers = offers.filter((offer) => {
    if (filter === 'all') return true;
    return getStatus(offer) === filter;
  });

  const statusCounts = offers.reduce(
    (acc, offer) => {
      const status = getStatus(offer);
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">オファー管理</h1>
        <Link
          href="/admin/candidates"
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 text-sm"
        >
          候補者を検索
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: 'all', label: 'すべて', count: offers.length },
          { key: 'pending', label: '返答待ち', count: statusCounts.pending || 0 },
          { key: 'viewed', label: '確認済み', count: statusCounts.viewed || 0 },
          { key: 'accepted', label: '承認', count: statusCounts.accepted || 0 },
          { key: 'rejected', label: '辞退', count: statusCounts.rejected || 0 },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`p-4 rounded-lg text-left transition-colors ${
              filter === item.key
                ? 'bg-primary-100 border-2 border-primary-500'
                : 'bg-white border-2 border-transparent hover:border-gray-200'
            }`}
          >
            <div className="text-2xl font-bold text-gray-900">{item.count}</div>
            <div className="text-sm text-gray-500">{item.label}</div>
          </button>
        ))}
      </div>

      {/* Offers List */}
      {filteredOffers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-500">オファーがありません</p>
          <Link
            href="/admin/candidates"
            className="inline-block mt-4 text-primary-500 hover:text-primary-600"
          >
            候補者を検索してオファーを送信
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  候補者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ポジション
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  送信日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  期限
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOffers.map((offer) => {
                const status = getStatus(offer);
                const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

                return (
                  <tr key={offer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          候補者 #{offer.profileId.slice(0, 8)}
                        </span>
                        {offer.jobCategory && (
                          <p className="text-xs text-gray-500">
                            {JOB_CATEGORY_NAMES[offer.jobCategory] || offer.jobCategory}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {offer.positionTitle || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(offer.sentAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(offer.expiresAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">オファーについて</p>
            <ul className="list-disc list-inside space-y-1 text-blue-600">
              <li>候補者がオファーを承認すると、電話番号が開示されます</li>
              <li>オファーの有効期限は送信から14日間です</li>
              <li>同一候補者へのオファーは1件のみ送信可能です</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
