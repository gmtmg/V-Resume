export interface JobCategory {
  id: string;
  code: string;
  name: string;
  parentCode?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  region?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface WorkConditions {
  employmentType?: ('fulltime' | 'parttime' | 'contract' | 'freelance')[];
  salaryMin?: number;
  salaryMax?: number;
  remotePreference?: 'onsite' | 'hybrid' | 'remote';
  startDate?: string;
}
