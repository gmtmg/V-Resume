export interface SMSVerification {
  id: string;
  phone: string;
  code: string;
  purpose: 'registration' | 'login';
  isUsed: boolean;
  attempts: number;
  expiresAt: string;
  createdAt: string;
}

export interface SendSMSRequest {
  phone: string;
  purpose: 'registration' | 'login';
}

export interface SendSMSResponse {
  success: boolean;
  message?: string;
  error?: string;
  expiresAt?: string;
}

export interface VerifySMSRequest {
  phone: string;
  code: string;
  purpose: 'registration' | 'login';
}

export interface VerifySMSResponse {
  success: boolean;
  verified?: boolean;
  error?: string;
  profileId?: string;
  token?: string;
}
