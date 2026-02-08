import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Fetch locations error:', error);
      return NextResponse.json({ success: false, error: 'データの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      locations: data.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        region: item.region,
        sortOrder: item.sort_order,
      })),
    });
  } catch (error) {
    console.error('Locations error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
