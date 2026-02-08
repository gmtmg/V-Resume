'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'ログインに失敗しました');
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-lg mx-auto px-4">
          <h1 className="text-xl font-bold text-primary-600">
            V-Resume <span className="text-gray-500 font-normal">企業管理</span>
          </h1>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-sm p-8">
            {success ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">メールを送信しました</h2>
                <p className="text-gray-500 mb-6">
                  {email} にログインリンクを送信しました。<br />
                  メールをご確認ください。
                </p>
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  className="text-primary-500 hover:text-primary-600 text-sm"
                >
                  別のメールアドレスでログイン
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">企業ログイン</h2>
                  <p className="text-gray-500 text-sm mt-1">
                    登録済みのメールアドレスを入力してください
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      メールアドレス
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="company@example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                      disabled={isLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isLoading ? '送信中...' : 'ログインリンクを送信'}
                  </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                  <p>
                    アカウントをお持ちでない方は
                    <Link href="/admin/register" className="text-primary-500 hover:text-primary-600 font-medium ml-1">
                      新規登録
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
