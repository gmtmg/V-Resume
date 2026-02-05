import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'V-Resume | プライバシー特化型スカウト登録',
  description: 'アバターと加工音声で、あなたのスキルと人柄を企業にアピール。素顔や生声を出さずにAI面接を体験できます。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
