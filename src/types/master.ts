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

export type EmploymentType = 'fulltime' | 'parttime' | 'contract' | 'freelance';
export type RemotePreference = 'onsite' | 'hybrid' | 'remote';

export interface WorkConditions {
  employmentType?: EmploymentType[];
  salaryMin?: number;
  salaryMax?: number;
  remotePreference?: RemotePreference;
  startDate?: string;
}
