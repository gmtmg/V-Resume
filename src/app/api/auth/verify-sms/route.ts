import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePhoneNumber } from '@/lib/twilio';
import type { VerifySMSRequest, VerifySMSResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<VerifySMSResponse>> {
  try {
    const body: VerifySMSRequest = await request.json();
    const { phone, code, purpose } = body;

    if (!phone || !code) {
      return NextResponse.json({ success: false, error: '電話番号と認証コードが必要です' }, { status: 400 });
    }

    if (!purpose || !['registration', 'login'].includes(purpose)) {
      return NextResponse.json({ success: false, error: '無効な目的です' }, { status: 400 });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const supabase = createAdminClient();

    // Find the most recent unused verification code
    const { data: verification, error: findError } = await supabase
      .from('sms_verifications')
      .select('*')
      .eq('phone', normalizedPhone)
      .eq('purpose', purpose)
      .eq('is_used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (findError || !verification) {
      return NextResponse.json(
        { success: false, error: '有効な認証コードが見つかりません' },
        { status: 400 }
      );
    }

    // Check attempts
    if (verification.attempts >= 5) {
      return NextResponse.json(
        { success: false, error: '試行回数の上限に達しました。新しいコードを送信してください。' },
        { status: 429 }
      );
    }

    // Verify code
    if (verification.code !== code) {
      // Increment attempts
      await supabase
        .from('sms_verifications')
        .update({ attempts: verification.attempts + 1 })
        .eq('id', verification.id);

      return NextResponse.json(
        { success: false, verified: false, error: '認証コードが正しくありません' },
        { status: 400 }
      );
    }

    // Mark as used
    await supabase
      .from('sms_verifications')
      .update({ is_used: true })
      .eq('id', verification.id);

    // Handle based on purpose
    if (purpose === 'registration') {
      // Mark phone as verified in profile (will be created later)
      return NextResponse.json({
        success: true,
        verified: true,
      });
    } else {
      // Login - find profile and create session
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, auth_user_id')
        .eq('phone', normalizedPhone)
        .eq('phone_verified', true)
        .single();

      if (profileError || !profile) {
        return NextResponse.json(
          { success: false, error: 'プロフィールが見つかりません' },
          { status: 404 }
        );
      }

      // Generate a magic link token for the user
      if (profile.auth_user_id) {
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: `${profile.id}@v-resume.local`, // Placeholder email
        });

        if (linkError) {
          console.error('Magic link error:', linkError);
          // Fall back to returning profile ID
          return NextResponse.json({
            success: true,
            verified: true,
            profileId: profile.id,
          });
        }

        return NextResponse.json({
          success: true,
          verified: true,
          profileId: profile.id,
          token: linkData.properties?.hashed_token,
        });
      }

      return NextResponse.json({
        success: true,
        verified: true,
        profileId: profile.id,
      });
    }
  } catch (error) {
    console.error('Verify SMS error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
