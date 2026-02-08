import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, error: '企業IDが必要です' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get company info
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return NextResponse.json({ success: false, error: '企業が見つかりません' }, { status: 404 });
    }

    // Get pending offers count
    const { count: pendingOffers } = await supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', ['pending', 'viewed']);

    // Get accepted offers count
    const { count: acceptedOffers } = await supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'accepted');

    return NextResponse.json({
      success: true,
      usage: {
        monthlyViewLimit: company.monthly_view_limit,
        viewsUsedThisMonth: company.views_used_this_month,
        pendingOffers: pendingOffers || 0,
        acceptedOffers: acceptedOffers || 0,
        planType: company.plan_type,
        billingResetDate: company.billing_reset_date,
      },
    });
  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
