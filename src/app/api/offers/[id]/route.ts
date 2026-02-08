import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offerId } = await params;

    const supabase = createAdminClient();

    const { data: offer, error } = await supabase
      .from('offers')
      .select(`
        *,
        companies (
          name
        )
      `)
      .eq('id', offerId)
      .single();

    if (error || !offer) {
      return NextResponse.json({ success: false, error: 'オファーが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      offer: {
        id: offer.id,
        companyName: offer.companies?.name,
        positionTitle: offer.position_title,
        message: offer.message,
        status: offer.status,
        sentAt: offer.sent_at,
        viewedAt: offer.viewed_at,
        respondedAt: offer.responded_at,
        expiresAt: offer.expires_at,
      },
    });
  } catch (error) {
    console.error('Get offer error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
