import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RegisterRequest {
  name: string;
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json({ success: false, error: '会社名とメールアドレスが必要です' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if email already exists
    const { data: existing } = await supabase
      .from('companies')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // Create company record
    const { data: company, error: insertError } = await supabase
      .from('companies')
      .insert({
        name,
        email,
        plan_type: 'free',
        monthly_view_limit: 10,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert company error:', insertError);
      return NextResponse.json({ success: false, error: '登録に失敗しました' }, { status: 500 });
    }

    // Send magic link for email verification
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appUrl}/admin/auth/callback`,
      },
    });

    if (authError) {
      console.error('Auth error:', authError);
      // Company created but email failed - still return success
      return NextResponse.json({
        success: true,
        companyId: company.id,
        message: '企業アカウントを作成しました。メール送信に失敗したため、ログインページからログインしてください。',
      });
    }

    return NextResponse.json({
      success: true,
      companyId: company.id,
      message: '企業アカウントを作成しました。メールをご確認ください。',
    });
  } catch (error) {
    console.error('Register company error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
