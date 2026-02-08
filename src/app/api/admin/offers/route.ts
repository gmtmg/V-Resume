import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSMS } from '@/lib/twilio';
import { randomBytes } from 'crypto';

interface CreateOfferRequest {
  companyId: string;
  profileId: string;
  interviewId?: string;
  positionTitle?: string;
  message?: string;
}

export async function GET(request: NextRequest) {
  try {
    const companyId = request.nextUrl.searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ success: false, error: '企業IDが必要です' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: offers, error } = await supabase
      .from('offers')
      .select(`
        *,
        profiles (
          job_category
        )
      `)
      .eq('company_id', companyId)
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('Fetch offers error:', error);
      return NextResponse.json({ success: false, error: 'データの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      offers: offers.map((offer) => ({
        id: offer.id,
        profileId: offer.profile_id,
        jobCategory: offer.profiles?.job_category,
        positionTitle: offer.position_title,
        message: offer.message,
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

export async function POST(request: NextRequest) {
  try {
    const body: CreateOfferRequest = await request.json();
    const { companyId, profileId, interviewId, positionTitle, message } = body;

    if (!companyId || !profileId) {
      return NextResponse.json({ success: false, error: '企業IDとプロフィールIDが必要です' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check for existing pending offer
    const { data: existingOffer } = await supabase
      .from('offers')
      .select('id')
      .eq('company_id', companyId)
      .eq('profile_id', profileId)
      .in('status', ['pending', 'viewed'])
      .single();

    if (existingOffer) {
      return NextResponse.json(
        { success: false, error: 'この候補者には既にオファーを送信済みです' },
        { status: 400 }
      );
    }

    // Get company name for notification
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single();

    // Get profile phone for notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', profileId)
      .single();

    // Generate tokens
    const acceptToken = randomBytes(32).toString('hex');
    const rejectToken = randomBytes(32).toString('hex');

    // Create offer
    const { data: offer, error: insertError } = await supabase
      .from('offers')
      .insert({
        company_id: companyId,
        profile_id: profileId,
        interview_id: interviewId,
        position_title: positionTitle,
        message,
        accept_token: acceptToken,
        reject_token: rejectToken,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert offer error:', insertError);
      return NextResponse.json({ success: false, error: 'オファーの作成に失敗しました' }, { status: 500 });
    }

    // Send SMS notification to candidate
    if (profile?.phone) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const smsBody = `【V-Resume】${company?.name || '企業'}からオファーが届きました！${positionTitle ? `\nポジション: ${positionTitle}` : ''}\n\n詳細を確認: ${appUrl}/offer-response/${offer.id}`;

      try {
        await sendSMS(profile.phone, smsBody);
      } catch (smsError) {
        console.error('SMS notification error:', smsError);
        // Continue even if SMS fails
      }
    }

    return NextResponse.json({
      success: true,
      offerId: offer.id,
      message: 'オファーを送信しました',
    });
  } catch (error) {
    console.error('Create offer error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
