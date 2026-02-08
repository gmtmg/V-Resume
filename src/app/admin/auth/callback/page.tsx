'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      // Get the email from the URL hash or query params
      // Supabase magic link includes token in hash
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', ''));

      // Get access token from hash
      const accessToken = params.get('access_token');
      const errorDescription = searchParams.get('error_description');

      if (errorDescription) {
        setError(decodeURIComponent(errorDescription));
        return;
      }

      if (!accessToken) {
        setError('認証トークンが見つかりません');
        return;
      }

      try {
        // Decode the JWT to get email
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        const email = payload.email;

        if (!email) {
          setError('メールアドレスを取得できませんでした');
          return;
        }

        // Verify company and get info
        const response = await fetch('/api/admin/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (data.success) {
          // Store session
          localStorage.setItem('v-resume-company-session', JSON.stringify({
            companyId: data.company.id,
            companyName: data.company.name,
            email: data.company.email,
            loggedInAt: new Date().toISOString(),
          }));

          router.push('/admin/dashboard');
        } else {
          setError(data.error || '認証に失敗しました');
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError('認証処理中にエラーが発生しました');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-xl shadow-sm p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">認証エラー</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => router.push('/admin/login')}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            ログインページへ戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
        <p className="text-gray-600">認証中...</p>
      </div>
    </div>
  );
}

export default function AdminAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
