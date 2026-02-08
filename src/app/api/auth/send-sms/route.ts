import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendVerificationCode, generateVerificationCode, normalizePhoneNumber } from '@/lib/twilio';
import type { SendSMSRequest, SendSMSResponse } from '@/types';

export async function POST(request: NextRequest): Promise<NextResponse<SendSMSResponse>> {
  try {
    const body: SendSMSRequest = await request.json();
    const { phone, purpose } = body;

    if (!phone) {
      return NextResponse.json({ success: false, error: '電話番号が必要です' }, { status: 400 });
    }

    if (!purpose || !['registration', 'login'].includes(purpose)) {
      return NextResponse.json({ success: false, error: '無効な目的です' }, { status: 400 });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const supabase = createAdminClient();

    // Check rate limiting - max 5 SMS per phone per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('sms_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('phone', normalizedPhone)
      .gte('created_at', oneHourAgo);

    if (count && count >= 5) {
      return NextResponse.json(
        { success: false, error: '送信回数の上限に達しました。1時間後に再試行してください。' },
        { status: 429 }
      );
    }

    // For login, check if profile exists
    if (purpose === 'login') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', normalizedPhone)
        .eq('phone_verified', true)
        .single();

      if (!profile) {
        return NextResponse.json(
          { success: false, error: 'この電話番号は登録されていません' },
          { status: 404 }
        );
      }
    }

    // Generate code and expiration
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Save to database
    const { error: dbError } = await supabase.from('sms_verifications').insert({
      phone: normalizedPhone,
      code,
      purpose,
      expires_at: expiresAt,
    });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ success: false, error: 'データベースエラー' }, { status: 500 });
    }

    // Send SMS
    const result = await sendVerificationCode(normalizedPhone, code);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'SMS送信に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '認証コードを送信しました',
      expiresAt,
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 });
  }
}
