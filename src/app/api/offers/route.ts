import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePhoneNumber } from '@/lib/twilio';

export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get('phone');
    const profileId = request.nextUrl.searchParams.get('profileId');

    if (!phone && !profileId) {
      return NextResponse.json({ success: false, error: '電話番号またはプロフィールIDが必要です' }, { status: 400 });
    }

    const supabase = createAdminClient();

    let targetProfileId = profileId;

    if (!targetProfileId && phone) {
      const normalizedPhone = normalizePhoneNumber(phone);
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .single();

      if (!profile) {
        return NextResponse.json({ success: false, error: 'プロフィールが見つかりません' }, { status: 404 });
      }
      targetProfileId = profile.id;
    }

    const { data: offers, error } = await supabase
      .from('offers')
      .select(`
        *,
        companies (
          name
        )
      `)
      .eq('profile_id', targetProfileId)
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('Fetch offers error:', error);
      return NextResponse.json({ success: false, error: 'データの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      offers: offers.map((offer) => ({
        id: offer.id,
        companyId: offer.company_id,
        companyName: offer.companies?.name,
        message: offer.message,
        positionTitle: offer.position_title,
        status: offer.status,
        sentAt: offer.sent_at,
        viewedAt: offer.viewed_at,
        respondedAt: offer.responded_at,
        expiresAt: offer.expires_at,
      })),
    });
  } catch (error) {
    console.error('Offers API error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
