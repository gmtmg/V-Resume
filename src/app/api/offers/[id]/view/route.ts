import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: offerId } = await params;

    const supabase = createAdminClient();

    // Update status to viewed if pending
    const { error } = await supabase
      .from('offers')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      })
      .eq('id', offerId)
      .eq('status', 'pending');

    if (error) {
      console.error('Update offer view error:', error);
      // Don't return error - this is not critical
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('View offer error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
