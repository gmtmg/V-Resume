'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { ProfileData, SendSMSResponse, VerifySMSResponse } from '@/types';

export default function VerifyPhonePage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Load profile data
    const stored = localStorage.getItem('v-resume-profile');
    if (stored) {
      const profile: ProfileData = JSON.parse(stored);
      if (profile.phone) {
        setPhone(profile.phone);
      }
    } else {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'registration' }),
      });

      const data: SendSMSResponse = await response.json();

      if (data.success) {
        setStep('verify');
        setCountdown(60);
        inputRefs.current[0]?.focus();
      } else {
        setError(data.error || 'SMSの送信に失敗しました');
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newCode.every((d) => d) && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (verificationCode: string) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: verificationCode, purpose: 'registration' }),
      });

      const data: VerifySMSResponse = await response.json();

      if (data.success && data.verified) {
        // Update profile with verified status
        const stored = localStorage.getItem('v-resume-profile');
        if (stored) {
          const profile: ProfileData = JSON.parse(stored);
          profile.phoneVerified = true;
          localStorage.setItem('v-resume-profile', JSON.stringify(profile));
        }
        router.push('/system-check');
      } else {
        setError(data.error || '認証に失敗しました');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-primary-200/40 rounded-full blur-3xl" />
        <div className="absolute top-20 -right-40 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-primary-600">V-Resume</h1>
          <p className="text-sm text-gray-500">電話番号認証</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="card">
            {step === 'send' ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">SMS認証</h2>
                  <p className="text-gray-500 text-sm">
                    以下の電話番号に認証コードを送信します
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-center mb-6">
                  <p className="text-lg font-mono font-semibold text-gray-900">{phone}</p>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSendCode}
                  disabled={isLoading}
                  className="btn-primary"
                >
                  {isLoading ? '送信中...' : '認証コードを送信'}
                </button>

                <button
                  onClick={() => router.push('/')}
                  className="mt-3 w-full py-2 text-gray-500 text-sm hover:text-gray-700"
                >
                  電話番号を変更する
                </button>
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">認証コードを入力</h2>
                  <p className="text-gray-500 text-sm">
                    {phone} に送信された<br />6桁のコードを入力してください
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">
                    {error}
                  </div>
                )}

                <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-lg focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none transition-colors"
                      disabled={isLoading}
                    />
                  ))}
                </div>

                <div className="text-center text-sm text-gray-500 mb-4">
                  {countdown > 0 ? (
                    <p>再送信まで {countdown} 秒</p>
                  ) : (
                    <button
                      onClick={handleSendCode}
                      disabled={isLoading}
                      className="text-primary-500 hover:text-primary-600 font-medium"
                    >
                      コードを再送信
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setStep('send')}
                  className="w-full py-2 text-gray-500 text-sm hover:text-gray-700"
                >
                  電話番号を変更する
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
