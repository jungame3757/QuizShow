// 공통 타입 정의
export interface Quiz {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  createdAt: string;
  updatedAt?: string;
  status?: 'waiting' | 'active' | 'completed';
  inviteCode?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
}

// Firebase Realtime Database 타입 정의
export interface RtdbSession {
  id: string;
  quizId: string;
  hostId: string;
  code: string;
  currentQuestion: number;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  participantCount: number;
  expiresAt: number;
  randomizeQuestions: boolean;
  singleAttempt: boolean;
  questionTimeLimit: number;
}

export interface RtdbParticipant {
  id: string;
  name: string;
  joinedAt: number;
  isActive: boolean;
  score: number;
}

export interface RtdbQuestionStatus {
  revealed: boolean;
  startedAt: number | null;
  endedAt: number | null;
}

export interface RtdbAnswer {
  answer: string;
  answeredAt: number;
  isCorrect: boolean;
  score: number;
}

// Firestore 세션 기록 타입 정의
export interface HistoryAnswer {
  questionIndex: number;
  answerIndex: number;
  isCorrect: boolean;
  points: number;
  answeredAt: number;
}

export interface HistoryAttempt {
  answers: Record<string, HistoryAnswer>;
  score: number;
  completedAt: number;
}

export interface HistoryParticipant {
  id: string;
  name: string;
  joinedAt: number;
  isActive: boolean;
  score: number;
  attempts?: HistoryAttempt[]; // 시도 기록 배열
}

export interface SessionHistory {
  id?: string;
  hostId: string;
  title: string;
  startedAt: any; // Firestore Timestamp
  endedAt: any;   // Firestore Timestamp
  participantCount: number;
  quiz: Quiz;                              // Quiz 전체 객체
  participants?: Record<string, HistoryParticipant>; // 참가자 정보
} 