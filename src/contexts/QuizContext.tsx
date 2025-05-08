import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Quiz, Question, Participant } from '../types';

interface QuizContextType {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  participants: Participant[];
  createQuiz: (quiz: Omit<Quiz, 'id'>) => string;
  updateQuiz: (id: string, quiz: Partial<Quiz>) => void;
  getQuiz: (id: string) => Quiz | null;
  addQuestion: (quizId: string, question: Omit<Question, 'id'>) => void;
  removeQuestion: (quizId: string, questionId: string) => void;
  joinQuiz: (quizId: string, nickname: string) => string;
  startQuiz: (quizId: string) => void;
  submitAnswer: (participantId: string, questionId: string, answer: string) => void;
}

const initialQuizContext: QuizContextType = {
  quizzes: [],
  currentQuiz: null,
  participants: [],
  createQuiz: () => '',
  updateQuiz: () => {},
  getQuiz: () => null,
  addQuestion: () => {},
  removeQuestion: () => {},
  joinQuiz: () => '',
  startQuiz: () => {},
  submitAnswer: () => {},
};

const QuizContext = createContext<QuizContextType>(initialQuizContext);

export const useQuiz = () => useContext(QuizContext);

export const QuizProvider = ({ children }: { children: ReactNode }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Generate a random string of letters and numbers
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Generate a simple 4-character invitation code
  const generateInviteCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();

  const createQuiz = (quiz: Omit<Quiz, 'id'>) => {
    const id = generateId();
    const inviteCode = generateInviteCode();
    const newQuiz: Quiz = {
      ...quiz,
      id,
      inviteCode,
      status: 'waiting',
      questions: [],
      createdAt: new Date().toISOString(),
    };
    
    setQuizzes(prev => [...prev, newQuiz]);
    return id;
  };

  const updateQuiz = (id: string, updates: Partial<Quiz>) => {
    setQuizzes(prev => 
      prev.map(quiz => quiz.id === id ? { ...quiz, ...updates } : quiz)
    );
    
    if (currentQuiz?.id === id) {
      setCurrentQuiz(prev => prev ? { ...prev, ...updates } : prev);
    }
  };

  const getQuiz = (id: string) => {
    return quizzes.find(quiz => quiz.id === id || quiz.inviteCode === id) || null;
  };

  const addQuestion = (quizId: string, question: Omit<Question, 'id'>) => {
    const questionId = generateId();
    const newQuestion: Question = {
      ...question,
      id: questionId,
    };
    
    setQuizzes(prev => 
      prev.map(quiz => {
        if (quiz.id === quizId) {
          return {
            ...quiz,
            questions: [...quiz.questions, newQuestion],
          };
        }
        return quiz;
      })
    );
    
    if (currentQuiz?.id === quizId) {
      setCurrentQuiz(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: [...prev.questions, newQuestion],
        };
      });
    }
  };

  const removeQuestion = (quizId: string, questionId: string) => {
    setQuizzes(prev => 
      prev.map(quiz => {
        if (quiz.id === quizId) {
          return {
            ...quiz,
            questions: quiz.questions.filter(q => q.id !== questionId),
          };
        }
        return quiz;
      })
    );
    
    if (currentQuiz?.id === quizId) {
      setCurrentQuiz(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          questions: prev.questions.filter(q => q.id !== questionId),
        };
      });
    }
  };

  const joinQuiz = (quizCodeOrId: string, nickname: string) => {
    const quiz = getQuiz(quizCodeOrId);
    if (!quiz) throw new Error('Quiz not found');
    if (quiz.status !== 'waiting') throw new Error('Quiz has already started');
    
    const participantId = generateId();
    const participant: Participant = {
      id: participantId,
      quizId: quiz.id,
      nickname,
      score: 0,
      answers: [],
      joinedAt: new Date().toISOString(),
    };
    
    setParticipants(prev => [...prev, participant]);
    setCurrentQuiz(quiz);
    
    return participantId;
  };

  const startQuiz = (quizId: string) => {
    updateQuiz(quizId, { status: 'active', startedAt: new Date().toISOString() });
  };

  const submitAnswer = (participantId: string, questionId: string, answer: string) => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;
    
    const quiz = getQuiz(participant.quizId);
    if (!quiz) return;
    
    const question = quiz.questions.find(q => q.id === questionId);
    if (!question) return;
    
    const isCorrect = question.correctAnswer === answer;
    const points = isCorrect ? 1 : 0;
    
    setParticipants(prev => 
      prev.map(p => {
        if (p.id === participantId) {
          // Check if already answered this question
          const alreadyAnswered = p.answers.some(a => a.questionId === questionId);
          if (alreadyAnswered) return p;
          
          return {
            ...p,
            score: p.score + points,
            answers: [
              ...p.answers,
              {
                questionId,
                answer,
                isCorrect,
                points,
                answeredAt: new Date().toISOString(),
              }
            ],
          };
        }
        return p;
      })
    );
  };

  const value = {
    quizzes,
    currentQuiz,
    participants,
    createQuiz,
    updateQuiz,
    getQuiz,
    addQuestion,
    removeQuestion,
    joinQuiz,
    startQuiz,
    submitAnswer,
  };

  return (
    <QuizContext.Provider value={value}>
      {children}
    </QuizContext.Provider>
  );
};