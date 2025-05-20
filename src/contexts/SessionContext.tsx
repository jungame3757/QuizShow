import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  getSession,
  getSessionIdByCode,
  updateCurrentQuestion,
  updateQuestionStatus,
  addParticipant,
  submitAnswer,
  deleteSession,
  subscribeToSession,
  subscribeToParticipants,
  subscribeToQuestionStatus,
  subscribeToAnswers,
  getSessionsByHostId,
  getSessionsByQuizId,
  Session,
  Participant,
  QuestionStatus,
  Answer,
  SessionOptions,
  createSessionWithQuizData,
  getQuizDataForClient
} from '../firebase/sessionService';
import { saveSessionHistory } from '../firebase/sessionHistoryService';
import { getQuizById } from '../firebase/quizService';

interface SessionContextType {
  // 세션 상태
  currentSession: Session | null;
  participants: Record<string, Participant>;
  questionStatus: Record<number, QuestionStatus>;
  answers: Record<number, Record<string, Answer>>;
  loading: boolean;
  error: string | null;
  
  // 세션 관리 함수
  createSessionForQuiz: (quizId: string, options?: SessionOptions, quizDataParam?: any) => Promise<string>;
  joinSession: (code: string, name: string) => Promise<string>;
  loadSessionById: (sessionId: string) => Promise<void>;
  
  // 문제 진행 함수
  goToNextQuestion: (sessionId: string) => Promise<void>;
  revealQuestion: (sessionId: string, questionIndex: number) => Promise<void>;
  finishQuestion: (sessionId: string, questionIndex: number) => Promise<void>;
  
  // 참가자 응답 함수
  submitParticipantAnswer: (
    sessionId: string, 
    questionIndex: number, 
    answer: string, 
    isCorrect: boolean
  ) => Promise<void>;
  
  // 정리 함수
  cleanupSession: (sessionId: string) => Promise<void>;
  resetSessionState: () => void;
  
  // 호스트 세션 관리
  loadSessionsForHost: () => Promise<Session[]>;
  getSessionsByQuizId: (quizId: string) => Promise<Session[]>;
}

const initialState: SessionContextType = {
  currentSession: null,
  participants: {},
  questionStatus: {},
  answers: {},
  loading: false,
  error: null,
  
  createSessionForQuiz: async () => '',
  joinSession: async () => '',
  loadSessionById: async () => {},
  
  goToNextQuestion: async () => {},
  revealQuestion: async () => {},
  finishQuestion: async () => {},
  
  submitParticipantAnswer: async () => {},
  
  cleanupSession: async () => {},
  resetSessionState: () => {},
  
  loadSessionsForHost: async () => [],
  getSessionsByQuizId: async () => []
};

const SessionContext = createContext<SessionContextType>(initialState);

export const useSession = () => useContext(SessionContext);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Record<string, Participant>>({});
  const [questionStatus, setQuestionStatus] = useState<Record<number, QuestionStatus>>({});
  const [answers, setAnswers] = useState<Record<number, Record<string, Answer>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 현재 세션 구독 취소 함수
  const [unsubscribeSession, setUnsubscribeSession] = useState<(() => void) | null>(null);
  const [unsubscribeParticipants, setUnsubscribeParticipants] = useState<(() => void) | null>(null);
  
  // 세션이 변경될 때 구독 관리
  useEffect(() => {
    // 이전 구독 정리
    return () => {
      if (unsubscribeSession) unsubscribeSession();
      if (unsubscribeParticipants) unsubscribeParticipants();
    };
  }, [unsubscribeSession, unsubscribeParticipants]);
  
  // 새 세션 생성
  const createSessionForQuiz = async (quizId: string, options?: SessionOptions, quizDataParam?: any): Promise<string> => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`퀴즈 ID ${quizId}에 대한 세션 생성/확인 중...`);
      
      // 1. 현재 세션이 이미 이 퀴즈에 대한 세션인지 확인
      if (currentSession && currentSession.quizId === quizId) {
        console.log('현재 이미 활성화된 세션이 있습니다:', currentSession.id);
        return currentSession.id;
      }
      
      // 2. 동일한 퀴즈에 대한 활성 세션이 이미 있는지 확인
      const hostSessions = await getSessionsByHostId(currentUser.uid);
      const existingSession = hostSessions.find(session => 
        session.quizId === quizId
      );
      
      // 이미 활성 세션이 있으면 해당 세션 ID 반환
      if (existingSession) {
        console.log('이미 이 퀴즈에 대한 세션이 존재합니다:', existingSession.id);
        
        // 세션 데이터 구독
        subscribeToSessionData(existingSession.id);
        
        return existingSession.id;
      }
      
      console.log('새 세션 생성 시작...');
      
      // 퀴즈 데이터 가져오기
      let quizData = quizDataParam;
      
      // 매개변수로 전달된 퀴즈 데이터가 없으면 세션 스토리지에서 찾기
      if (!quizData) {
        try {
          // 세션 스토리지에서 캐시된 퀴즈 데이터 확인
          const cachedQuiz = sessionStorage.getItem(`quiz_${quizId}`);
          if (cachedQuiz) {
            quizData = JSON.parse(cachedQuiz);
            console.log('세션 스토리지에서 퀴즈 데이터를 로드했습니다:', quizData);
          } else {
            // 캐시된 데이터가 없으면 Firestore에서 로드 시도
            quizData = await getQuizById(quizId, currentUser.uid);
          }
        } catch (error) {
          console.error('퀴즈 데이터 로드 오류:', error);
          throw new Error('퀴즈 데이터를 가져오는데 실패했습니다.');
        }
      }
      
      if (!quizData) {
        throw new Error('퀴즈 데이터를 찾을 수 없습니다.');
      }
      
      // 퀴즈 데이터와 함께 세션 생성
      const sessionId = await createSessionWithQuizData(quizId, currentUser.uid, quizData, options);
      console.log('새 세션 생성 완료:', sessionId);
      
      // 세션 데이터 구독
      subscribeToSessionData(sessionId);
      
      return sessionId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '세션 생성에 실패했습니다.';
      setError(errorMessage);
      console.error('세션 생성 실패:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 세션 참가
  const joinSession = async (code: string, name: string): Promise<string> => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 코드로 세션 ID 찾기
      const sessionId = await getSessionIdByCode(code);
      
      if (!sessionId) {
        throw new Error('유효하지 않은 세션 코드입니다.');
      }
      
      // 참가자 추가
      await addParticipant(sessionId, currentUser.uid, name);
      
      // 세션 데이터 구독
      subscribeToSessionData(sessionId);
      
      return sessionId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '세션 참가에 실패했습니다.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 호스트의 모든 세션 로드
  const loadSessionsForHost = async (): Promise<Session[]> => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }
    
    try {
      setError(null);
      return await getSessionsByHostId(currentUser.uid);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '세션 목록을 불러오는데 실패했습니다.';
      setError(errorMessage);
      throw err;
    }
  };
  
  // 퀴즈 ID로 세션 목록 가져오기
  const getQuizSessions = async (quizId: string): Promise<Session[]> => {
    try {
      setError(null);
      return await getSessionsByQuizId(quizId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '퀴즈 세션 목록을 불러오는데 실패했습니다.';
      setError(errorMessage);
      throw err;
    }
  };
  
  // 세션 ID로 세션 로드
  const loadSessionById = async (sessionId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('세션 ID로 세션 로드 중:', sessionId);
      const sessionData = await getSession(sessionId);
      
      if (sessionData) {
        // 세션 데이터 구독
        subscribeToSessionData(sessionId);
        console.log('세션 로드 완료:', sessionData);
      } else {
        throw new Error('세션을 찾을 수 없습니다.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '세션 로드에 실패했습니다.';
      setError(errorMessage);
      console.error('세션 로드 실패:', errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 세션 데이터 구독
  const subscribeToSessionData = (sessionId: string) => {
    // 기존 구독 취소
    if (unsubscribeSession) unsubscribeSession();
    if (unsubscribeParticipants) unsubscribeParticipants();
    
    // 세션 정보 구독
    const unsubSession = subscribeToSession(sessionId, (session) => {
      console.log('세션 업데이트:', session);
      setCurrentSession(session);
      
      // 현재 문제 상태도 구독
      if (session) {
        subscribeToQuestionStatusData(sessionId, session.currentQuestion);
        subscribeToAnswersData(sessionId, session.currentQuestion);
      } else {
        setCurrentSession(null);
      }
    });
    
    // 참가자 정보 구독
    const unsubParticipants = subscribeToParticipants(sessionId, (participantsData) => {
      console.log('참가자 업데이트:', participantsData);
      
      // 참가자 데이터 가공 및 저장
      if (participantsData) {
        setParticipants(participantsData);
      } else {
        setParticipants({});
      }
    });
    
    // 구독 취소 함수 저장
    setUnsubscribeSession(() => unsubSession);
    setUnsubscribeParticipants(() => unsubParticipants);
  };
  
  // 문제 상태 구독
  const subscribeToQuestionStatusData = (sessionId: string, questionIndex: number) => {
    subscribeToQuestionStatus(sessionId, questionIndex, (status) => {
      if (status) {
        setQuestionStatus(prev => ({
          ...prev,
          [questionIndex]: status
        }));
      }
    });
  };
  
  // 응답 구독
  const subscribeToAnswersData = (sessionId: string, questionIndex: number) => {
    subscribeToAnswers(sessionId, questionIndex, (answersData) => {
      setAnswers(prev => ({
        ...prev,
        [questionIndex]: answersData
      }));
    });
  };
  
  // 다음 문제로 이동
  const goToNextQuestion = async (sessionId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      if (!currentSession) {
        throw new Error('활성화된 세션이 없습니다.');
      }
      
      const nextQuestionIndex = currentSession.currentQuestion + 1;
      await updateCurrentQuestion(sessionId, nextQuestionIndex);
      
      // 새 문제의 상태 구독
      subscribeToQuestionStatusData(sessionId, nextQuestionIndex);
      subscribeToAnswersData(sessionId, nextQuestionIndex);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '다음 문제로 이동하는데 실패했습니다.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 문제 공개
  const revealQuestion = async (sessionId: string, questionIndex: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await updateQuestionStatus(sessionId, questionIndex, true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '문제 공개에 실패했습니다.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 문제 종료
  const finishQuestion = async (sessionId: string, questionIndex: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await updateQuestionStatus(sessionId, questionIndex, false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '문제 종료에 실패했습니다.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 참가자 응답 제출
  const submitParticipantAnswer = async (
    sessionId: string,
    questionIndex: number,
    answer: string,
    isCorrect: boolean
  ): Promise<void> => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 정답 여부에 따른 점수 계산 (간단한 로직)
      const score = isCorrect ? 100 : 0;
      
      await submitAnswer(
        sessionId,
        questionIndex,
        currentUser.uid,
        answer,
        isCorrect,
        score
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '응답 제출에 실패했습니다.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 세션 정리
  const cleanupSession = async (sessionId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // 현재 세션 정보가 없으면 서버에서 가져오기
      const session = currentSession || await getSession(sessionId);
      
      if (!session) {
        throw new Error('세션을 찾을 수 없습니다.');
      }

      // 참가자가 0명이면 기록을 저장하지 않고 바로 삭제
      if (session.participantCount === 0 || Object.keys(participants).length === 0) {
        console.log('참가자가 없는 세션입니다. 기록을 저장하지 않고 삭제합니다.');
        // 세션 삭제 (Realtime Database)
        await deleteSession(sessionId);
        
        // 로컬 상태 정리
        setCurrentSession(null);
        setParticipants({});
        setQuestionStatus({});
        setAnswers({});
        
        // 구독 취소
        if (unsubscribeSession) {
          unsubscribeSession();
          setUnsubscribeSession(null);
        }
        
        if (unsubscribeParticipants) {
          unsubscribeParticipants();
          setUnsubscribeParticipants(null);
        }
        
        return;
      }

      // 퀴즈 데이터를 RTDB에서 가져오기 시도
      let quiz;
      try {
        // 먼저 RTDB에서 세션에 저장된 퀴즈 데이터 확인
        const rtdbQuizData = await getQuizDataForClient(sessionId);
        
        if (rtdbQuizData) {
          // RTDB에 저장된 퀴즈 데이터 사용
          console.log('RTDB에서 퀴즈 데이터를 찾았습니다.');
          quiz = rtdbQuizData;
        } else {
          // 기존 방식으로 Firestore에서 가져오기
          console.log('Firestore에서 퀴즈 데이터 로드 시도...');
          quiz = await getQuizById(session.quizId);
        }
      } catch (quizError) {
        console.error('RTDB에서 퀴즈 데이터 로드 실패:', quizError);
        // Firestore 폴백
        quiz = await getQuizById(session.quizId);
      }
      
      if (!quiz) {
        throw new Error('퀴즈 정보를 찾을 수 없습니다.');
      }

      // 세션에 종료 시간 설정
      if (!session.endedAt) {
        session.endedAt = Date.now();
      }
      
      // 세션 기록 저장 (Firestore - 사용자 하위 컬렉션)
      // 퀴즈 데이터 자체를 저장하고, 불필요한 answers 데이터는 전달하지 않음
      await saveSessionHistory(
        session,
        quiz.title,
        participants,
        quiz
      );
      
      console.log('세션 기록이 저장되었습니다.');
      
      // 세션 삭제 (Realtime Database)
      await deleteSession(sessionId);
      
      // 로컬 상태 정리
      setCurrentSession(null);
      setParticipants({});
      setQuestionStatus({});
      setAnswers({});
      
      // 구독 취소
      if (unsubscribeSession) {
        unsubscribeSession();
        setUnsubscribeSession(null);
      }
      
      if (unsubscribeParticipants) {
        unsubscribeParticipants();
        setUnsubscribeParticipants(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '세션 정리에 실패했습니다.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // 세션 상태 초기화 (페이지 전환이나 퀴즈 변경 시 사용)
  const resetSessionState = () => {
    // 세션 관련 상태 초기화
    setCurrentSession(null);
    setParticipants({});
    setQuestionStatus({});
    setAnswers({});
    
    // 구독 취소
    if (unsubscribeSession) {
      unsubscribeSession();
      setUnsubscribeSession(null);
    }
    
    if (unsubscribeParticipants) {
      unsubscribeParticipants();
      setUnsubscribeParticipants(null);
    }
    
    console.log('세션 상태가 초기화되었습니다.');
  };
  
  return (
    <SessionContext.Provider
      value={{
        currentSession,
        participants,
        questionStatus,
        answers,
        loading,
        error,
        createSessionForQuiz,
        joinSession,
        goToNextQuestion,
        revealQuestion,
        finishQuestion,
        submitParticipantAnswer,
        cleanupSession,
        resetSessionState,
        loadSessionsForHost,
        loadSessionById,
        getSessionsByQuizId: getQuizSessions
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}; 