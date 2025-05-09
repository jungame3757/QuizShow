import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { useAuth } from './AuthContext';
import { Quiz, Question, Participant } from '../types';
import {
  saveQuiz as saveQuizToFirebase,
  updateQuiz as updateQuizInFirebase,
  getUserQuizzes as getUserQuizzesFromFirebase,
  getQuizById as getQuizByIdFromFirebase,
  getQuizByInviteCode as getQuizByInviteCodeFromFirebase,
  deleteQuiz as deleteQuizFromFirebase,
} from '../firebase/quizService';

interface QuizContextType {
  quizzes: Quiz[];
  currentQuiz: Quiz | null;
  participants: Participant[];
  createQuiz: (quiz: Omit<Quiz, 'id'>) => Promise<string>;
  updateQuiz: (id: string, quiz: Partial<Quiz>) => Promise<void>;
  getQuiz: (id: string) => Promise<Quiz | null>;
  addQuestion: (quizId: string, question: Omit<Question, 'id'>) => Promise<void>;
  removeQuestion: (quizId: string, questionId: string) => Promise<void>;
  joinQuiz: (quizId: string, nickname: string) => string;
  startQuiz: (quizId: string) => Promise<void>;
  submitAnswer: (participantId: string, questionId: string, answer: string) => void;
  loadUserQuizzes: () => Promise<void>;
  deleteQuiz: (quizId: string) => Promise<void>;
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
  joinQuiz: () => '',
  startQuiz: async () => {},
  submitAnswer: () => {},
  loadUserQuizzes: async () => {},
  deleteQuiz: async () => {},
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
      const userQuizzes = await getUserQuizzesFromFirebase(currentUser as User);
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

  // 초대 코드 생성
  const generateInviteCode = () => Math.random().toString(36).substring(2, 6).toUpperCase();

  // 퀴즈 생성
  const createQuiz = async (quiz: Omit<Quiz, 'id'>) => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }

    try {
      setLoading(true);
      setError(null);

      // 초대 코드 생성
      const inviteCode = quiz.inviteCode || generateInviteCode();
      
      // Firestore에 저장할 퀴즈 객체 생성 - 필드 안전하게 처리
      const newQuiz: Omit<Quiz, 'id'> = {
        title: quiz.title || '제목 없음',
        description: quiz.description || '',
        inviteCode,
        status: 'waiting',
        questions: Array.isArray(quiz.questions) ? [...quiz.questions] : [],
        createdAt: new Date().toISOString(),
      };
      
      // Firebase에 저장
      const quizId = await saveQuizToFirebase(newQuiz, currentUser as User);
      
      // 로컬 상태 업데이트
      const quizWithId: Quiz = {
        ...newQuiz,
        id: quizId,
      };
      
      setQuizzes(prev => [...prev, quizWithId]);
      setCurrentQuiz(quizWithId);
      
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
      await updateQuizInFirebase(id, updates, currentUser as User);
      
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
  const getQuiz = async (idOrCode: string): Promise<Quiz | null> => {
    try {
      setLoading(true);
      setError(null);
      
      // 유효한 ID 또는 코드인지 확인
      if (!idOrCode || typeof idOrCode !== 'string') {
        console.error('Invalid quiz ID or code:', idOrCode);
        setError('유효하지 않은 퀴즈 ID 또는 코드입니다.');
        return null;
      }
      
      // 먼저 로컬 상태에서 확인
      const localQuiz = quizzes.find(quiz => 
        quiz.id === idOrCode || quiz.inviteCode === idOrCode
      );
      
      if (localQuiz) {
        setCurrentQuiz(localQuiz);
        return localQuiz;
      }
      
      // Firebase에서 가져오기
      let quiz: Quiz | null = null;
      
      try {
        // ID로 검색
        quiz = await getQuizByIdFromFirebase(idOrCode);
        
        // 없으면 초대 코드로 검색
        if (!quiz) {
          quiz = await getQuizByInviteCodeFromFirebase(idOrCode);
        }
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
    if (!question.text || !question.options || !question.correctAnswer) {
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
      const questionId = generateId();
      const newQuestion: Question = {
        id: questionId,
        text: question.text.trim(),
        options: Array.isArray(question.options) ? 
          question.options.map(opt => opt.trim()) : 
          [],
        correctAnswer: question.correctAnswer.trim(),
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
        currentUser as User
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
  const removeQuestion = async (quizId: string, questionId: string) => {
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
      const updatedQuestions = quiz.questions.filter(q => q.id !== questionId);
      
      // Firebase 업데이트
      await updateQuizInFirebase(
        quizId, 
        { questions: updatedQuestions }, 
        currentUser as User
      );
      
      // 로컬 상태 업데이트
      setQuizzes(prev => 
        prev.map(q => {
          if (q.id === quizId) {
            return {
              ...q,
              questions: q.questions.filter(question => question.id !== questionId),
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
            questions: prev.questions.filter(question => question.id !== questionId),
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

  // 퀴즈 참여
  const joinQuiz = (quizCodeOrId: string, nickname: string) => {
    const quiz = quizzes.find(q => q.id === quizCodeOrId || q.inviteCode === quizCodeOrId);
    if (!quiz) throw new Error('퀴즈를 찾을 수 없습니다.');
    if (quiz.status !== 'waiting') throw new Error('이미 시작된 퀴즈입니다.');
    
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

  // 퀴즈 시작
  const startQuiz = async (quizId: string) => {
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
      
      const now = new Date().toISOString();
      
      // Firebase 업데이트
      await updateQuizInFirebase(
        quizId, 
        { 
          status: 'active', 
          startedAt: now 
        }, 
        currentUser as User
      );
      
      // 로컬 상태 업데이트
      updateQuizState(quizId, { status: 'active', startedAt: now });
    } catch (error) {
      console.error('퀴즈 시작 오류:', error);
      setError('퀴즈를 시작하는데 실패했습니다.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 답변 제출
  const submitAnswer = (participantId: string, questionId: string, answer: string) => {
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;
    
    const quiz = quizzes.find(q => q.id === participant.quizId);
    if (!quiz) return;
    
    const question = quiz.questions.find(q => q.id === questionId);
    if (!question) return;
    
    const isCorrect = question.correctAnswer === answer;
    const points = isCorrect ? 1 : 0;
    
    setParticipants(prev => 
      prev.map(p => {
        if (p.id === participantId) {
          // 이미 답변한 문제인지 확인
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

  // 퀴즈 삭제
  const deleteQuiz = async (quizId: string) => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }

    try {
      setLoading(true);
      setError(null);
      
      // Firebase에서 삭제
      await deleteQuizFromFirebase(quizId, currentUser as User);
      
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

  // 로컬 상태에서 퀴즈 업데이트 (헬퍼 함수)
  const updateQuizState = (quizId: string, updates: Partial<Quiz>) => {
    setQuizzes(prev => 
      prev.map(quiz => quiz.id === quizId ? { ...quiz, ...updates } : quiz)
    );
    
    if (currentQuiz?.id === quizId) {
      setCurrentQuiz(prev => prev ? { ...prev, ...updates } : prev);
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
    joinQuiz,
    startQuiz,
    submitAnswer,
    loadUserQuizzes,
    deleteQuiz,
    loading,
    error,
  };

  return (
    <QuizContext.Provider value={value}>
      {children}
    </QuizContext.Provider>
  );
};