import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { useAuth } from './AuthContext';
import { Quiz, Question, Participant } from '../types';
import {
  updateQuiz as updateQuizInFirebase,
  getUserQuizzes as getUserQuizzesFromFirebase,
  getQuizById as getQuizByIdFromFirebase,
  deleteQuiz as deleteQuizFromFirebase,
  createQuiz as createQuizInFirebase,
} from '../firebase/quizService';

interface QuizContextType {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  participants: Participant[];
  createQuiz: (quiz: Omit<Quiz, 'id'>) => Promise<string>;
  updateQuiz: (id: string, quiz: Partial<Quiz>) => Promise<void>;
  getQuiz: (id: string) => Promise<Quiz | null>;
  addQuestion: (quizId: string, question: Omit<Question, 'id'>) => Promise<void>;
  removeQuestion: (quizId: string, questionIndex: number) => Promise<void>;
  loadUserQuizzes: () => Promise<void>;
  deleteQuiz: (quizId: string) => Promise<void>;
  clearQuizData: () => void;
  loading: boolean;
  error: string | null;
}

const initialQuizContext: QuizContextType = {
  quizzes: [],
  currentQuiz: null,
  participants: [],
  createQuiz: async () => '',
  updateQuiz: async () => {},
  getQuiz: async () => null,
  addQuestion: async () => {},
  removeQuestion: async () => {},
  loadUserQuizzes: async () => {},
  deleteQuiz: async () => {},
  clearQuizData: () => {},
  loading: false,
  error: null,
};

const QuizContext = createContext<QuizContextType>(initialQuizContext);

export const useQuiz = () => useContext(QuizContext);

export const QuizProvider = ({ children }: { children: ReactNode }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentUser } = useAuth();

  // 현재 사용자가 변경될 때마다 퀴즈 데이터 초기화
  useEffect(() => {
    if (!currentUser) {
      clearQuizData();
    }
  }, [currentUser]);

  // 퀴즈 데이터 초기화 함수
  const clearQuizData = () => {
    setQuizzes([]);
    setCurrentQuiz(null);
    setParticipants([]);
    setError(null);
  };

  // 현재 로그인한 사용자의 퀴즈 불러오기
  useEffect(() => {
    if (currentUser) {
      loadUserQuizzes();
    }
  }, [currentUser]);

  // 사용자의 퀴즈 목록 불러오기
  const loadUserQuizzes = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);
      
      // 기존 데이터 초기화 (다른 사용자의 데이터가 남아있지 않도록)
      setQuizzes([]);
      
      // getUserQuizzesFromFirebase는 항상 Quiz[] 배열을 반환
      const userQuizzes = await getUserQuizzesFromFirebase(currentUser.uid);
      setQuizzes(userQuizzes);
    } catch (error) {
      console.error('퀴즈 목록을 불러오는데 실패했습니다:', error);
      setError('퀴즈 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 랜덤 ID 생성
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // 퀴즈 생성
  const createQuiz = async (quiz: Omit<Quiz, 'id'>) => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }

    try {
      setLoading(true);
      setError(null);
      
      // Firebase에 퀴즈 저장 (모든 문제를 포함하여 한 번에 저장)
      const quizId = await createQuizInFirebase(quiz, currentUser.uid);
      
      // 생성된 퀴즈 정보 가져오기
      const createdQuiz = await getQuizByIdFromFirebase(quizId);
      
      if (createdQuiz) {
        // 로컬 상태 업데이트
        setQuizzes(prev => [...prev, createdQuiz]);
        setCurrentQuiz(createdQuiz);
      }
      
      return quizId;
    } catch (error) {
      console.error('퀴즈 생성 오류:', error);
      setError('퀴즈를 생성하는데 실패했습니다.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 퀴즈 업데이트
  const updateQuiz = async (id: string, updates: Partial<Quiz>) => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }

    try {
      setLoading(true);
      setError(null);
      
      // Firebase에서 업데이트
      await updateQuizInFirebase(id, updates, currentUser.uid);
      
      // 로컬 상태 업데이트
      setQuizzes(prev => 
        prev.map(quiz => quiz.id === id ? { ...quiz, ...updates } : quiz)
      );
      
      if (currentQuiz?.id === id) {
        setCurrentQuiz(prev => prev ? { ...prev, ...updates } : prev);
      }
    } catch (error) {
      console.error('퀴즈 업데이트 오류:', error);
      setError('퀴즈를 업데이트하는데 실패했습니다.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ID로 퀴즈 가져오기
  const getQuiz = async (id: string): Promise<Quiz | null> => {
    try {
      setLoading(true);
      setError(null);
      
      // 먼저 로컬 상태에서 확인
      const localQuiz = quizzes.find(quiz => quiz.id === id);
      
      if (localQuiz) {
        setCurrentQuiz(localQuiz);
        return localQuiz;
      }
      
      // Firebase에서 가져오기
      let quiz: Quiz | null = null;
      
      try {
        // ID로 검색
        quiz = await getQuizByIdFromFirebase(id);
      } catch (fetchError) {
        console.error('Firebase에서 퀴즈 가져오기 오류:', fetchError);
      }
      
      if (quiz) {
        // 퀴즈 데이터 유효성 검사 및 기본값 설정
        if (!Array.isArray(quiz.questions)) {
          quiz.questions = [];
        }
        
        setCurrentQuiz(quiz);
        // 로컬 상태에 없으면 추가
        if (!quizzes.some(q => q.id === quiz?.id)) {
          setQuizzes(prev => [...prev, quiz as Quiz]);
        }
      }
      
      return quiz;
    } catch (error) {
      console.error('퀴즈 가져오기 오류:', error);
      setError('퀴즈를 불러오는데 실패했습니다.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 문제 추가
  const addQuestion = async (quizId: string, question: Omit<Question, 'id'>) => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }

    if (!quizId || typeof quizId !== 'string') {
      throw new Error('유효하지 않은 퀴즈 ID입니다.');
    }

    if (!question || typeof question !== 'object') {
      throw new Error('유효하지 않은 문제 데이터입니다.');
    }

    // 필수 필드 검사
    if (!question.text || !question.options || question.correctAnswer === undefined) {
      throw new Error('문제, 선택지, 정답은 필수 항목입니다.');
    }

    try {
      setLoading(true);
      setError(null);
      console.log(`문제 추가 시작 - 퀴즈 ID: ${quizId}`);
      
      // 현재 퀴즈 가져오기 - 로컬에 없으면 Firebase에서 가져옴
      let quiz = quizzes.find(q => q.id === quizId);
      
      if (!quiz) {
        console.log('로컬에 퀴즈가 없어 Firebase에서 불러옵니다.');
        // Firebase에서 퀴즈 불러오기 시도
        try {
          const fetchedQuiz = await getQuizByIdFromFirebase(quizId);
          if (!fetchedQuiz) {
            console.error(`퀴즈를 찾을 수 없음: ${quizId}`);
            throw new Error(`퀴즈 ID(${quizId})에 해당하는 퀴즈를 찾을 수 없습니다.`);
          }
          quiz = fetchedQuiz;
          
          // 로컬 상태에 추가
          setQuizzes(prev => [...prev, quiz as Quiz]);
          console.log('Firebase에서 퀴즈를 불러와 로컬 상태에 추가했습니다.');
        } catch (fetchError) {
          console.error('Firebase에서 퀴즈 불러오기 실패:', fetchError);
          throw new Error('퀴즈 정보를 불러오는데 실패했습니다.');
        }
      }
      
      // 새 문제 만들기
      const newQuestion: Question = {
        text: question.text.trim(),
        options: Array.isArray(question.options) ? 
          question.options.map(opt => opt.trim()) : 
          [],
        correctAnswer: question.correctAnswer,
      };
      
      console.log('문제 객체 생성 완료:', newQuestion);
      
      // 기존 questions 배열이 유효한지 확인
      const existingQuestions = Array.isArray(quiz.questions) ? 
        quiz.questions : [];
        
      // 새 문제가 포함된 퀴즈 업데이트
      const updatedQuestions = [...existingQuestions, newQuestion];
      console.log(`Firebase 업데이트 시작 - 총 문제 수: ${updatedQuestions.length}`);
      
      await updateQuizInFirebase(
        quizId, 
        { questions: updatedQuestions }, 
        currentUser.uid
      );
      
      console.log('Firebase 업데이트 완료, 로컬 상태 업데이트 시작');
      
      // 로컬 상태 업데이트
      setQuizzes(prev => 
        prev.map(q => {
          if (q.id === quizId) {
            return {
              ...q,
              questions: Array.isArray(q.questions) ? 
                [...q.questions, newQuestion] : 
                [newQuestion],
            };
          }
          return q;
        })
      );
      
      if (currentQuiz?.id === quizId) {
        setCurrentQuiz(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            questions: Array.isArray(prev.questions) ? 
              [...prev.questions, newQuestion] : 
              [newQuestion],
          };
        });
      }
      
      console.log('문제 추가 완료');
    } catch (error) {
      console.error('문제 추가 오류:', error);
      setError(error instanceof Error ? error.message : '문제를 추가하는데 실패했습니다.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 문제 삭제
  const removeQuestion = async (quizId: string, questionIndex: number) => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }

    try {
      setLoading(true);
      setError(null);
      
      // 현재 퀴즈 가져오기 - 로컬에 없으면 Firebase에서 가져옴
      let quiz = quizzes.find(q => q.id === quizId);
      
      if (!quiz) {
        // Firebase에서 퀴즈 불러오기 시도
        const fetchedQuiz = await getQuizByIdFromFirebase(quizId);
        if (!fetchedQuiz) {
          throw new Error('퀴즈를 찾을 수 없습니다.');
        }
        quiz = fetchedQuiz;
        
        // 로컬 상태에 추가
        setQuizzes(prev => [...prev, quiz as Quiz]);
      }
      
      // 문제 제거된 배열
      const updatedQuestions = quiz.questions.filter((_, index) => index !== questionIndex);
      
      // Firebase 업데이트
      await updateQuizInFirebase(
        quizId, 
        { questions: updatedQuestions }, 
        currentUser.uid
      );
      
      // 로컬 상태 업데이트
      setQuizzes(prev => 
        prev.map(q => {
          if (q.id === quizId) {
            return {
              ...q,
              questions: q.questions.filter((_, index) => index !== questionIndex),
            };
          }
          return q;
        })
      );
      
      if (currentQuiz?.id === quizId) {
        setCurrentQuiz(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            questions: prev.questions.filter((_, index) => index !== questionIndex),
          };
        });
      }
    } catch (error) {
      console.error('문제 삭제 오류:', error);
      setError('문제를 삭제하는데 실패했습니다.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 퀴즈 삭제
  const deleteQuiz = async (quizId: string) => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }

    try {
      setLoading(true);
      setError(null);
      
      // Firebase에서 삭제
      await deleteQuizFromFirebase(quizId, currentUser.uid);
      
      // 로컬 상태 업데이트
      setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
      
      if (currentQuiz?.id === quizId) {
        setCurrentQuiz(null);
      }
    } catch (error) {
      console.error('퀴즈 삭제 오류:', error);
      setError('퀴즈를 삭제하는데 실패했습니다.');
      throw error;
    } finally {
      setLoading(false);
    }
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
    loadUserQuizzes,
    deleteQuiz,
    clearQuizData,
    loading,
    error,
  };

  return (
    <QuizContext.Provider value={value}>
      {children}
    </QuizContext.Provider>
  );
};