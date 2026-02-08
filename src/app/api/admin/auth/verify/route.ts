import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: 'メールアドレスが必要です' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get company info
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !company) {
      return NextResponse.json({ success: false, error: '企業アカウントが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        email: company.email,
        planType: company.plan_type,
        monthlyViewLimit: company.monthly_view_limit,
        viewsUsedThisMonth: company.views_used_this_month,
      },
    });
  } catch (error) {
    console.error('Verify company error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
