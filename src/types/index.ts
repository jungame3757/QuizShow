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