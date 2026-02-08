import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: profileId } = await params;
    const { companyId, interviewId } = await request.json();

    if (!companyId) {
      return NextResponse.json({ success: false, error: '企業IDが必要です' }, { status: 400 });
    }

    if (!interviewId) {
      return NextResponse.json({ success: false, error: '面接IDが必要です' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Use the database function to record view
    const { data, error } = await supabase.rpc('record_video_view', {
      p_company_id: companyId,
      p_interview_id: interviewId,
      p_profile_id: profileId,
    });

    if (error) {
      console.error('Record view error:', error);
      return NextResponse.json({ success: false, error: 'データベースエラー' }, { status: 500 });
    }

    const result = data as {
      success: boolean;
      is_new_view?: boolean;
      view_token?: string;
      remaining_views?: number;
      error?: string;
    };

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || '閲覧の記録に失敗しました',
      }, { status: 400 });
    }

    // Get the video URL
    const { data: interview } = await supabase
      .from('interviews')
      .select('video_url, summary_text')
      .eq('id', interviewId)
      .single();

    return NextResponse.json({
      success: true,
      isNewView: result.is_new_view,
      remainingViews: result.remaining_views,
      videoUrl: interview?.video_url,
      summaryText: interview?.summary_text,
    });
  } catch (error) {
    console.error('View API error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
