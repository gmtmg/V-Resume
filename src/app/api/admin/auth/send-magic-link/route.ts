import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'メールアドレスが必要です' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if company exists
    const { data: company } = await supabase
      .from('companies')
      .select('id, name')
      .eq('email', email)
      .single();

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'この企業アカウントは登録されていません' },
        { status: 404 }
      );
    }

    // Send magic link via Supabase Auth
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appUrl}/admin/auth/callback`,
      },
    });

    if (error) {
      console.error('Magic link error:', error);
      return NextResponse.json(
        { success: false, error: 'メールの送信に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ログインリンクをメールで送信しました',
    });
  } catch (error) {
    console.error('Send magic link error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
