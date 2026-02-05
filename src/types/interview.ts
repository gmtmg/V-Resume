export interface InterviewQuestion {
  id: number;
  title: string;
  question: string;
  maxDuration: number; // seconds
}

export interface InterviewRecording {
  questionId: number;
  blob: Blob;
  duration: number;
  uploadedUrl?: string;
}

export interface InterviewSession {
  id: string;
  profileId: string;
  recordings: InterviewRecording[];
  status: 'in_progress' | 'completed' | 'submitted';
  summaryText?: string;
  createdAt: Date;
}

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: 1,
    title: '自己紹介',
    question: 'まずは簡単に自己紹介をお願いします。お名前と、これまでのキャリアについて教えてください。',
    maxDuration: 60,
  },
  {
    id: 2,
    title: '成功体験・プロジェクト',
    question: '過去の成功体験や、特に注力されたプロジェクトについて教えてください。',
    maxDuration: 60,
  },
  {
    id: 3,
    title: '強みと活かし方',
    question: 'ご自身の強みと、それを仕事にどう活かしているかを教えてください。',
    maxDuration: 60,
  },
  {
    id: 4,
    title: '希望条件・環境',
    question: '希望する勤務条件や、働きたい環境について教えてください。',
    maxDuration: 60,
  },
  {
    id: 5,
    title: '企業へのメッセージ',
    question: '最後に、企業の採用担当者に向けてメッセージをお願いします。',
    maxDuration: 60,
  },
];
