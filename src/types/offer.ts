export type OfferStatus = 'pending' | 'viewed' | 'accepted' | 'rejected' | 'expired';

export interface Offer {
  id: string;
  companyId: string;
  profileId: string;
  interviewId?: string;
  message?: string;
  positionTitle?: string;
  status: OfferStatus;
  acceptToken?: string;
  rejectToken?: string;
  sentAt: string;
  viewedAt?: string;
  respondedAt?: string;
  expiresAt: string;
  // Joined data
  company?: {
    name: string;
  };
  profile?: {
    fullName: string;
    jobCategory?: string;
  };
}

export interface OfferCreate {
  profileId: string;
  interviewId?: string;
  message?: string;
  positionTitle?: string;
}

export interface OfferResponse {
  action: 'accept' | 'reject';
  token: string;
}
