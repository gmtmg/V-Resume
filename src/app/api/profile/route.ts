import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePhoneNumber } from '@/lib/twilio';
import type { ProfileData } from '@/types';

interface ProfileAPIRequest {
  phone: string;
  profile: Partial<ProfileData>;
}

export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get('phone');
    if (!phone) {
      return NextResponse.json({ success: false, error: '電話番号が必要です' }, { status: 400 });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', normalizedPhone)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'プロフィールが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: data.id,
        fullName: data.full_name,
        email: data.email,
        phone: data.phone,
        desiredJobType: data.desired_job_type,
        experience: data.experience,
        phoneVerified: data.phone_verified,
        jobCategory: data.job_category,
        availableLocations: data.available_locations,
        workConditions: data.work_conditions,
        isSearchable: data.is_searchable,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ProfileAPIRequest = await request.json();
    const { phone, profile } = body;

    if (!phone) {
      return NextResponse.json({ success: false, error: '電話番号が必要です' }, { status: 400 });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const supabase = createAdminClient();

    // Check if profile exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('phone', normalizedPhone)
      .single();

    const profileData: Record<string, unknown> = {
      phone: normalizedPhone,
    };

    if (profile.fullName) profileData.full_name = profile.fullName;
    if (profile.email) profileData.email = profile.email;
    if (profile.desiredJobType !== undefined) profileData.desired_job_type = profile.desiredJobType;
    if (profile.experience !== undefined) profileData.experience = profile.experience;
    if (profile.phoneVerified !== undefined) profileData.phone_verified = profile.phoneVerified;
    if (profile.jobCategory !== undefined) profileData.job_category = profile.jobCategory;
    if (profile.availableLocations !== undefined) profileData.available_locations = profile.availableLocations;
    if (profile.workConditions !== undefined) profileData.work_conditions = profile.workConditions;
    if (profile.isSearchable !== undefined) profileData.is_searchable = profile.isSearchable;

    let result;
    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert
      if (!profile.fullName || !profile.email) {
        return NextResponse.json({ success: false, error: '名前とメールアドレスが必要です' }, { status: 400 });
      }
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      success: true,
      profileId: result.id,
    });
  } catch (error) {
    console.error('Save profile error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  return POST(request);
}
