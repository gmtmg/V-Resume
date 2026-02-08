import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const jobCategory = searchParams.get('jobCategory');
    const location = searchParams.get('location');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!companyId) {
      return NextResponse.json({ success: false, error: '企業IDが必要です' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Build query for profiles with approved interviews
    let query = supabase
      .from('profiles')
      .select(`
        id,
        job_category,
        available_locations,
        work_conditions,
        created_at,
        interviews!inner (
          id,
          video_url,
          summary_text,
          status,
          created_at
        )
      `, { count: 'exact' })
      .eq('is_searchable', true)
      .eq('phone_verified', true)
      .eq('interviews.status', 'approved');

    // Apply filters
    if (jobCategory) {
      query = query.eq('job_category', jobCategory);
    }

    if (location) {
      query = query.contains('available_locations', [location]);
    }

    // Pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    // Order by newest first
    query = query.order('created_at', { ascending: false });

    const { data: profiles, error, count } = await query;

    if (error) {
      console.error('Search candidates error:', error);
      return NextResponse.json({ success: false, error: 'データの取得に失敗しました' }, { status: 500 });
    }

    // Get view history for this company
    const profileIds = profiles?.map((p) => p.id) || [];
    const { data: viewedProfiles } = await supabase
      .from('video_views')
      .select('profile_id')
      .eq('company_id', companyId)
      .in('profile_id', profileIds);

    const viewedProfileIds = new Set(viewedProfiles?.map((v) => v.profile_id) || []);

    // Format response
    const candidates = profiles?.map((profile) => {
      const interview = Array.isArray(profile.interviews) ? profile.interviews[0] : profile.interviews;
      return {
        id: profile.id,
        jobCategory: profile.job_category,
        availableLocations: profile.available_locations,
        workConditions: profile.work_conditions,
        interviewId: interview?.id,
        summaryText: interview?.summary_text,
        hasVideo: !!interview?.video_url,
        createdAt: profile.created_at,
        isViewed: viewedProfileIds.has(profile.id),
      };
    }) || [];

    return NextResponse.json({
      success: true,
      candidates,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Candidates API error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
