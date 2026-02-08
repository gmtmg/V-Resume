export interface Company {
  id: string;
  name: string;
  email: string;
  authUserId?: string;
  planType: 'free' | 'basic' | 'premium';
  monthlyViewLimit: number;
  viewsUsedThisMonth: number;
  billingResetDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyCreate {
  name: string;
  email: string;
}

export interface VideoView {
  id: string;
  companyId: string;
  interviewId: string;
  profileId: string;
  viewToken?: string;
  viewedAt: string;
  billingPeriod: string;
}

export interface ViewRecordResult {
  success: boolean;
  isNewView?: boolean;
  viewId?: string;
  viewToken?: string;
  remainingViews?: number;
  error?: string;
  limit?: number;
  used?: number;
}
