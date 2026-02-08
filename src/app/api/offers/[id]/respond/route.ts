import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RespondRequest {
  action: 'accept' | 'reject';
  token?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offerId } = await params;
    const body: RespondRequest = await request.json();
    const { action, token } = body;

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: '無効なアクションです' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find the offer
    let query = supabase.from('offers').select('*, profiles(*)').eq('id', offerId);

    // If token is provided, also verify by token
    if (token) {
      if (action === 'accept') {
        query = query.eq('accept_token', token);
      } else {
        query = query.eq('reject_token', token);
      }
    }

    const { data: offer, error: findError } = await query.single();

    if (findError || !offer) {
      return NextResponse.json({ success: false, error: 'オファーが見つかりません' }, { status: 404 });
    }

    // Check if already responded
    if (offer.status !== 'pending' && offer.status !== 'viewed') {
      return NextResponse.json({ success: false, error: 'このオファーは既に応答済みです' }, { status: 400 });
    }

    // Check if expired
    if (new Date(offer.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: 'このオファーは有効期限切れです' }, { status: 400 });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    // Update offer status
    const { error: updateError } = await supabase
      .from('offers')
      .update({
        status: newStatus,
        responded_at: new Date().toISOString(),
      })
      .eq('id', offerId);

    if (updateError) {
      console.error('Update offer error:', updateError);
      return NextResponse.json({ success: false, error: '更新に失敗しました' }, { status: 500 });
    }

    // If accepted, make profile unsearchable
    if (action === 'accept') {
      await supabase
        .from('profiles')
        .update({ is_searchable: false })
        .eq('id', offer.profile_id);
    }

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: action === 'accept' ? 'オファーを承認しました' : 'オファーを辞退しました',
    });
  } catch (error) {
    console.error('Respond to offer error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
