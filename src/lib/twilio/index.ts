import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials are not configured');
  }
  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If it starts with 0, assume Japanese number and add +81
  if (digits.startsWith('0')) {
    return '+81' + digits.slice(1);
  }

  // If it doesn't have +, add it
  if (!phone.startsWith('+')) {
    return '+' + digits;
  }

  return '+' + digits;
}

export async function sendSMS(to: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!twilioPhoneNumber) {
    throw new Error('Twilio phone number is not configured');
  }

  try {
    const client = getClient();
    const normalizedPhone = normalizePhoneNumber(to);

    const message = await client.messages.create({
      body,
      from: twilioPhoneNumber,
      to: normalizedPhone,
    });

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
    };
  }
}

export async function sendVerificationCode(
  phone: string,
  code: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const body = `【V-Resume】認証コード: ${code}\nこのコードは10分間有効です。`;
  return sendSMS(phone, body);
}
