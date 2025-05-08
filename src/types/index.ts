export interface Quiz {
  id: string;
  title: string;
  description?: string;
  inviteCode: string;
  status: 'waiting' | 'active' | 'completed';
  questions: Question[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
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
  questionId: string;
  answer: string;
  isCorrect: boolean;
  points: number;
  answeredAt: string;
}