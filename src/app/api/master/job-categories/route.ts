import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('job_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Fetch job categories error:', error);
      return NextResponse.json({ success: false, error: 'データの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      categories: data.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        parentCode: item.parent_code,
        sortOrder: item.sort_order,
      })),
    });
  } catch (error) {
    console.error('Job categories error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
