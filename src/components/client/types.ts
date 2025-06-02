export type QuestionType = 'multiple-choice' | 'short-answer' | 'opinion';
export type AnswerMatchType = 'exact' | 'contains';

export interface Question {
  id?: string;
  type: QuestionType;
  text: string;
  options?: string[]; // 객관식용
  correctAnswer?: number; // 객관식용 (인덱스)
  correctAnswerText?: string; // 주관식용
  additionalAnswers?: string[]; // 추가 정답들
  answerMatchType?: AnswerMatchType; // 정답 인정 방식
  isAnonymous?: boolean; // 익명 수집 여부
}

export interface Quiz {
  title: string;
  description?: string;
  questions: Question[];
}

export interface Answer {
  questionIndex: number;
  answerIndex: number;
  isCorrect: boolean;
  points: number;
  answeredAt: number;
}

export interface Attempt {
  answers: Record<string, Answer>;
  score: number;
  completedAt: number;
}

export interface RealtimeParticipant {
  id: string;
  name: string;
  score: number;
  isActive: boolean;
  joinedAt: number;
  quizId: string;
  answers?: Record<string, Answer>;
  attempts?: Attempt[];
}

export interface Session {
  id: string;
  code: string;
  quizId: string;
  hostId: string;
  createdAt: number;
  participantCount: number;
  currentQuestion: number;
  randomizeQuestions: boolean;
  singleAttempt: boolean;
  questionTimeLimit: number;
  expiresAt: number;
}

export interface RankingParticipant {
  id: string;
  name: string;
  score: number;
  isCurrentUser: boolean;
} 