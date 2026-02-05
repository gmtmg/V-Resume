'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileData } from '@/types';

export default function Home() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'お名前を入力してください';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = '2文字以上で入力してください';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!formData.email.includes('@')) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = '電話番号を入力してください';
    } else if (formData.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = '有効な電話番号を入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    // Store profile data
    const profileData: ProfileData = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
    };

    localStorage.setItem('v-resume-profile', JSON.stringify(profileData));

    // Navigate to system check
    router.push('/system-check');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-primary-600">V-Resume</h1>
          <p className="text-sm text-gray-500">プライバシー特化型スカウト登録</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              アバター面接で<br />あなたをアピール
            </h2>
            <p className="text-gray-500">
              素顔や生声を公開せずに、<br />スキルと人柄を企業に伝えられます
            </p>
          </div>

          {/* Registration Form */}
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label htmlFor="fullName" className="form-label">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="山田 太郎"
                  className={`form-input ${errors.fullName ? 'border-red-300 focus:ring-red-400' : ''}`}
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="form-label">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                  className={`form-input ${errors.email ? 'border-red-300 focus:ring-red-400' : ''}`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="form-label">
                  電話番号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="090-1234-5678"
                  className={`form-input ${errors.phone ? 'border-red-300 focus:ring-red-400' : ''}`}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary mt-6"
              >
                {isSubmitting ? '処理中...' : '次へ進む'}
              </button>
            </form>
          </div>

          {/* Privacy Note */}
          <div className="mt-6 flex items-start gap-3 text-sm text-gray-500">
            <svg className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p>
              入力された個人情報は厳重に管理されます。
              企業には、アバター映像と加工音声のみが公開されます。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
