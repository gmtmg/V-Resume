'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { JobCategory, Location } from '@/types';

interface Candidate {
  id: string;
  jobCategory: string;
  availableLocations: string[];
  workConditions: {
    employmentType?: string[];
    remotePreference?: string;
  };
  interviewId: string;
  summaryText?: string;
  hasVideo: boolean;
  createdAt: string;
  isViewed: boolean;
}

interface CompanySession {
  companyId: string;
  companyName: string;
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

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<CompanySession | null>(null);

  const [filters, setFilters] = useState({
    jobCategory: '',
    location: '',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    const sessionData = localStorage.getItem('v-resume-company-session');
    if (sessionData) {
      setSession(JSON.parse(sessionData));
    }
    loadMasterData();
  }, []);

  useEffect(() => {
    if (session) {
      loadCandidates();
    }
  }, [session, filters, pagination.page]);

  const loadMasterData = async () => {
    try {
      const [categoriesRes, locationsRes] = await Promise.all([
        fetch('/api/master/job-categories'),
        fetch('/api/master/locations'),
      ]);

      const categoriesData = await categoriesRes.json();
      const locationsData = await locationsRes.json();

      if (categoriesData.success) {
        setCategories(categoriesData.categories);
      }
      if (locationsData.success) {
        setLocations(locationsData.locations);
      }
    } catch (err) {
      console.error('Load master data error:', err);
    }
  };

  const loadCandidates = async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        companyId: session.companyId,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.jobCategory) params.append('jobCategory', filters.jobCategory);
      if (filters.location) params.append('location', filters.location);

      const response = await fetch(`/api/admin/candidates?${params}`);
      const data = await response.json();

      if (data.success) {
        setCandidates(data.candidates);
        setPagination((prev) => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages,
        }));
      }
    } catch (err) {
      console.error('Load candidates error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getLocationNames = (codes: string[]) => {
    if (!codes || codes.length === 0) return '-';
    return codes
      .map((code) => locations.find((l) => l.code === code)?.name || code)
      .slice(0, 3)
      .join(', ') + (codes.length > 3 ? ` 他${codes.length - 3}件` : '');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">求職者検索</h1>
        <p className="text-sm text-gray-500">
          {pagination.total}件の候補者
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              職種カテゴリ
            </label>
            <select
              value={filters.jobCategory}
              onChange={(e) => handleFilterChange('jobCategory', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option value="">すべて</option>
              {categories.map((cat) => (
                <option key={cat.code} value={cat.code}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              勤務地
            </label>
            <select
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option value="">すべて</option>
              {locations.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({ jobCategory: '', location: '' });
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              フィルターをクリア
            </button>
          </div>
        </div>
      </div>

      {/* Candidates List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
        </div>
      ) : candidates.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-gray-500">条件に一致する候補者が見つかりません</p>
          <p className="text-sm text-gray-400 mt-1">フィルター条件を変更してみてください</p>
        </div>
      ) : (
        <div className="space-y-4">
          {candidates.map((candidate) => (
            <Link
              key={candidate.id}
              href={`/admin/candidates/${candidate.id}?interviewId=${candidate.interviewId}`}
              className="block bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-primary-100 text-primary-700 text-sm font-medium rounded-full">
                      {JOB_CATEGORY_NAMES[candidate.jobCategory] || candidate.jobCategory}
                    </span>
                    {candidate.isViewed && (
                      <span className="text-xs text-gray-400">閲覧済み</span>
                    )}
                    {!candidate.isViewed && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        NEW
                      </span>
                    )}
                  </div>

                  {candidate.summaryText && (
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                      {candidate.summaryText}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {getLocationNames(candidate.availableLocations)}
                    </span>

                    {candidate.workConditions?.remotePreference && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {REMOTE_LABELS[candidate.workConditions.remotePreference]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {candidate.hasVideo && (
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  )}
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          <span className="px-4 py-2 text-sm text-gray-600">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.totalPages}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
