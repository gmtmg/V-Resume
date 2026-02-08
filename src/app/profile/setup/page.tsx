'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { ProfileData, JobCategory, Location, WorkConditions, EmploymentType } from '@/types';

const EMPLOYMENT_TYPES = [
  { value: 'fulltime', label: '正社員' },
  { value: 'parttime', label: 'パート・アルバイト' },
  { value: 'contract', label: '契約社員' },
  { value: 'freelance', label: 'フリーランス・業務委託' },
] as const;

const REMOTE_OPTIONS = [
  { value: 'onsite', label: 'オフィス勤務' },
  { value: 'hybrid', label: 'ハイブリッド' },
  { value: 'remote', label: 'フルリモート' },
] as const;

export default function ProfileSetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [workConditions, setWorkConditions] = useState<WorkConditions>({
    employmentType: [],
    remotePreference: undefined,
  });

  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load profile from localStorage
      const stored = localStorage.getItem('v-resume-profile');
      if (!stored) {
        router.push('/');
        return;
      }
      const profileData: ProfileData = JSON.parse(stored);
      setProfile(profileData);

      // Fetch master data
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

      // Auto-detect job category from interview summary
      const summaryStored = localStorage.getItem('v-resume-summary');
      if (summaryStored) {
        await detectCategory(summaryStored, profileData.desiredJobType, profileData.experience);
      }
    } catch (err) {
      console.error('Load data error:', err);
      setError('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const detectCategory = async (summary: string, desiredJobType?: string, experience?: string) => {
    setIsDetecting(true);
    try {
      const response = await fetch('/api/profile/detect-category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summaryText: summary,
          desiredJobType,
          experience,
        }),
      });

      const data = await response.json();
      if (data.success && data.category) {
        setSelectedCategory(data.category);
      }
    } catch (err) {
      console.error('Detect category error:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleLocationToggle = (code: string) => {
    setSelectedLocations((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleEmploymentTypeToggle = (type: EmploymentType) => {
    setWorkConditions((prev) => ({
      ...prev,
      employmentType: prev.employmentType?.includes(type)
        ? prev.employmentType.filter((t) => t !== type)
        : [...(prev.employmentType || []), type],
    }));
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      setError('職種カテゴリを選択してください');
      return;
    }
    if (selectedLocations.length === 0) {
      setError('勤務可能地を1つ以上選択してください');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: profile?.phone,
          profile: {
            fullName: profile?.fullName,
            email: profile?.email,
            phoneVerified: true,
            jobCategory: selectedCategory,
            availableLocations: selectedLocations,
            workConditions,
            isSearchable: true,
          },
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Update localStorage
        const updatedProfile: ProfileData = {
          ...profile!,
          jobCategory: selectedCategory,
          availableLocations: selectedLocations,
          workConditions,
          isSearchable: true,
        };
        localStorage.setItem('v-resume-profile', JSON.stringify(updatedProfile));
        router.push('/complete');
      } else {
        setError(data.error || '保存に失敗しました');
      }
    } catch (err) {
      console.error('Save error:', err);
      setError('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // Group locations by region
  const locationsByRegion = locations.reduce(
    (acc, loc) => {
      const region = loc.region || 'その他';
      if (!acc[region]) acc[region] = [];
      acc[region].push(loc);
      return acc;
    },
    {} as Record<string, Location[]>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-primary-600">V-Resume</h1>
          <p className="text-sm text-gray-500">プロフィール設定</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Job Category */}
          <section className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              職種カテゴリ
              {isDetecting && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (AI判定中...)
                </span>
              )}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.code}
                  onClick={() => setSelectedCategory(cat.code)}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === cat.code
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </section>

          {/* Locations */}
          <section className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              勤務可能地
              <span className="ml-2 text-sm font-normal text-gray-500">
                (複数選択可)
              </span>
            </h2>
            {Object.entries(locationsByRegion).map(([region, locs]) => (
              <div key={region} className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">{region}</h3>
                <div className="flex flex-wrap gap-2">
                  {locs.map((loc) => (
                    <button
                      key={loc.code}
                      onClick={() => handleLocationToggle(loc.code)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedLocations.includes(loc.code)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {loc.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* Work Conditions */}
          <section className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4">勤務条件</h2>

            <div className="space-y-4">
              {/* Employment Type */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  希望雇用形態
                  <span className="ml-1 text-gray-400">(複数選択可)</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {EMPLOYMENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => handleEmploymentTypeToggle(type.value)}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        workConditions.employmentType?.includes(type.value)
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remote Preference */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  リモート勤務
                </h3>
                <div className="flex flex-wrap gap-2">
                  {REMOTE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setWorkConditions((prev) => ({
                          ...prev,
                          remotePreference: option.value,
                        }))
                      }
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        workConditions.remotePreference === option.value
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="btn-primary"
          >
            {isSaving ? '保存中...' : 'プロフィールを保存して完了'}
          </button>
        </div>
      </main>
    </div>
  );
}
