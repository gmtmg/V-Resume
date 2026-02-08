'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface CompanySession {
  companyId: string;
  companyName: string;
  email: string;
  loggedInAt: string;
}

const PUBLIC_PATHS = ['/admin/login', '/admin/register'];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<CompanySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionData = localStorage.getItem('v-resume-company-session');
    if (sessionData) {
      setSession(JSON.parse(sessionData));
    } else if (!PUBLIC_PATHS.includes(pathname)) {
      router.push('/admin/login');
    }
    setIsLoading(false);
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('v-resume-company-session');
    router.push('/admin/login');
  };

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (isPublicPath) {
    return <>{children}</>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/admin/dashboard" className="text-xl font-bold text-primary-600">
                V-Resume <span className="text-sm font-normal text-gray-500">企業管理</span>
              </Link>

              <div className="hidden md:flex items-center gap-6">
                <Link
                  href="/admin/dashboard"
                  className={`text-sm ${pathname === '/admin/dashboard' ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  ダッシュボード
                </Link>
                <Link
                  href="/admin/candidates"
                  className={`text-sm ${pathname.startsWith('/admin/candidates') ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  求職者検索
                </Link>
                <Link
                  href="/admin/offers"
                  className={`text-sm ${pathname === '/admin/offers' ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  オファー管理
                </Link>
                <Link
                  href="/admin/usage"
                  className={`text-sm ${pathname === '/admin/usage' ? 'text-primary-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  利用状況
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{session.companyName}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
