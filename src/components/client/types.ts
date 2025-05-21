export interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
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