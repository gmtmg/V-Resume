import { WorkConditions } from './master';

export interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  // These will be collected later (during/after interview)
  desiredJobType?: string;
  experience?: string;
  // Phase 2 extensions
  phoneVerified?: boolean;
  jobCategory?: string;
  availableLocations?: string[];
  workConditions?: WorkConditions;
  isSearchable?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

export type ProfileField = keyof ProfileData;

export interface ProfileQuestion {
  field: ProfileField;
  question: string;
  placeholder: string;
  validation?: (value: string) => string | null;
}
