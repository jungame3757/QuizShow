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

export type QuestionType = 'multiple-choice' | 'short-answer' | 'opinion';
export type AnswerMatchType = 'exact' | 'contains';

export interface Question {
  id?: string;
  type: QuestionType;
  text: string;
  image?: string;
  options?: string[]; // 객관식용
  correctAnswer?: number; // 객관식용 (인덱스)
  correctAnswerText?: string; // 주관식용
  additionalAnswers?: string[]; // 추가 정답들
  answerMatchType?: AnswerMatchType; // 정답 인정 방식
  isAnonymous?: boolean; // 익명 수집 여부
  points?: number; // 문제 배점 (추가)
}

export interface Participant {
  id: string;
  quizId: string;
  nickname: string;
  score: number;
  answers: Answer[];
  joinedAt: string;
}

export interface Answer {
  questionIndex: number;
  answer: string;
  isCorrect: boolean;
  points: number;
  answeredAt: string;
}

export interface RealtimeParticipant {
  id: string;
  name: string;
  joinedAt: number;
  isActive: boolean;
  score: number;
  answers?: Record<number, RealtimeAnswer>;
  attempts?: ParticipantAttempt[];
}

export interface RealtimeAnswer {
  questionIndex: number;
  answerIndex?: number;
  answerText?: string;
  isCorrect: boolean;
  points: number;
  answeredAt: number;
}

export interface ParticipantAttempt {
  answers: Record<number, RealtimeAnswer>;
  score: number;
  completedAt: number;
}

export interface Session {
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
  maxParticipants: number;
  gameMode?: 'normal' | 'roguelike';
}

export interface SessionOptions {
  expiresIn?: number;
  randomizeQuestions?: boolean;
  singleAttempt?: boolean;
  questionTimeLimit?: number;
  maxParticipants?: number;
  gameMode?: 'normal' | 'roguelike';
}