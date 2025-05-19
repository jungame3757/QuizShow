import { 
  ref, 
  set, 
  push, 
  get, 
  update, 
  remove, 
  onValue, 
  off
} from 'firebase/database';
import { rtdb } from './config';
import { generateSessionCode } from '../utils/helpers';

// 세션 데이터 타입 정의
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
}

export interface Participant {
  id: string;
  name: string;
  joinedAt: number;
  isActive: boolean;
  score: number;
}

export interface QuestionStatus {
  revealed: boolean;
  startedAt: number | null;
  endedAt: number | null;
}

export interface Answer {
  answer: string;
  answeredAt: number;
  isCorrect: boolean;
  score: number;
}

// 세션 옵션 인터페이스 정의
export interface SessionOptions {
  expiresIn?: number; // 밀리초 단위의 세션 유효 기간
  randomizeQuestions?: boolean; // 문제 무작위 출제 여부
  singleAttempt?: boolean; // 참가자 시도 횟수 제한 (true: 한 번만, false: 여러 번 가능)
  questionTimeLimit?: number; // 문제 풀이 제한 시간 (초 단위)
}

// 세션 생성 함수
export const createSession = async (quizId: string, hostId: string, options?: SessionOptions): Promise<string> => {
  try {
    // 6자리 고유 세션 코드 생성
    const sessionCode = await generateSessionCode();
    
    // 세션 노드 참조 생성
    const sessionsRef = ref(rtdb, 'sessions');
    const newSessionRef = push(sessionsRef);
    const sessionId = newSessionRef.key;
    
    if (!sessionId) {
      throw new Error('세션 ID 생성에 실패했습니다.');
    }
    
    // 기본 만료 시간: 1일 (밀리초)
    const defaultExpiresIn = 24 * 60 * 60 * 1000;
    const expiresIn = options?.expiresIn || defaultExpiresIn;
    const expiresAt = Date.now() + expiresIn;
    
    // 세션 데이터 생성
    const sessionData: Omit<Session, 'id'> = {
      quizId,
      hostId,
      code: sessionCode,
      currentQuestion: 0,
      createdAt: Date.now(),
      startedAt: null,
      endedAt: null,
      participantCount: 0,
      expiresAt,
      randomizeQuestions: options?.randomizeQuestions || false,
      singleAttempt: options?.singleAttempt !== undefined ? options.singleAttempt : true,
      questionTimeLimit: options?.questionTimeLimit || 30
    };
    
    // 세션 데이터 저장
    await set(newSessionRef, sessionData);
    
    // 세션 코드 인덱스 생성
    await set(ref(rtdb, `sessionCodes/${sessionCode}`), sessionId);
    
    // 호스트 사용자의 활성 세션 업데이트
    await set(ref(rtdb, `userSessions/${hostId}/active/${sessionId}`), true);
    
    return sessionId;
  } catch (error) {
    console.error('세션 생성 오류:', error);
    throw error;
  }
};

// 세션 코드로 세션 ID 찾기
export const getSessionIdByCode = async (code: string): Promise<string | null> => {
  try {
    const sessionCodeRef = ref(rtdb, `sessionCodes/${code}`);
    const snapshot = await get(sessionCodeRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return null;
  } catch (error) {
    console.error('세션 코드 조회 오류:', error);
    throw error;
  }
};

// 세션 가져오기
export const getSession = async (sessionId: string): Promise<Session | null> => {
  try {
    const sessionRef = ref(rtdb, `sessions/${sessionId}`);
    const snapshot = await get(sessionRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return {
        id: sessionId,
        ...data
      };
    }
    
    return null;
  } catch (error) {
    console.error('세션 조회 오류:', error);
    throw error;
  }
};

// 현재 문제 인덱스 업데이트
export const updateCurrentQuestion = async (
  sessionId: string, 
  questionIndex: number
): Promise<void> => {
  try {
    const sessionRef = ref(rtdb, `sessions/${sessionId}`);
    await update(sessionRef, { currentQuestion: questionIndex });
    
    // 문제 상태 초기화
    const questionStatusRef = ref(rtdb, `sessionQuestions/${sessionId}/${questionIndex}`);
    await set(questionStatusRef, {
      revealed: false,
      startedAt: null,
      endedAt: null
    });
  } catch (error) {
    console.error('현재 문제 업데이트 오류:', error);
    throw error;
  }
};

// 문제 상태 업데이트
export const updateQuestionStatus = async (
  sessionId: string, 
  questionIndex: number,
  revealed: boolean
): Promise<void> => {
  try {
    const updates: Partial<QuestionStatus> = { revealed };
    
    if (revealed) {
      updates.startedAt = Date.now();
    } else {
      updates.endedAt = Date.now();
    }
    
    const questionStatusRef = ref(rtdb, `sessionQuestions/${sessionId}/${questionIndex}`);
    await update(questionStatusRef, updates);
  } catch (error) {
    console.error('문제 상태 업데이트 오류:', error);
    throw error;
  }
};

// 참가자 추가
export const addParticipant = async (
  sessionId: string, 
  userId: string, 
  name: string
): Promise<void> => {
  try {
    const participant: Omit<Participant, 'id'> = {
      name,
      joinedAt: Date.now(),
      isActive: true,
      score: 0
    };
    
    // 참가자 정보 저장
    await set(ref(rtdb, `participants/${sessionId}/${userId}`), participant);
    
    // 참가자 수 업데이트
    const sessionRef = ref(rtdb, `sessions/${sessionId}`);
    const sessionSnapshot = await get(sessionRef);
    
    if (sessionSnapshot.exists()) {
      const session = sessionSnapshot.val();
      await update(sessionRef, {
        participantCount: (session.participantCount || 0) + 1
      });
    }
    
    // 사용자의 활성 세션 업데이트
    await set(ref(rtdb, `userSessions/${userId}/active/${sessionId}`), true);
  } catch (error) {
    console.error('참가자 추가 오류:', error);
    throw error;
  }
};

// 참가자 응답 제출
export const submitAnswer = async (
  sessionId: string,
  questionIndex: number, 
  userId: string,
  answer: string,
  isCorrect: boolean,
  score: number
): Promise<void> => {
  try {
    const answerData: Answer = {
      answer,
      answeredAt: Date.now(),
      isCorrect,
      score
    };
    
    // 응답 저장
    await set(
      ref(rtdb, `sessionAnswers/${sessionId}_question_${questionIndex}/${userId}`), 
      answerData
    );
    
    // 참가자 점수 업데이트
    const participantRef = ref(rtdb, `participants/${sessionId}/${userId}`);
    const participantSnapshot = await get(participantRef);
    
    if (participantSnapshot.exists()) {
      const participant = participantSnapshot.val();
      await update(participantRef, {
        score: (participant.score || 0) + score
      });
    }
  } catch (error) {
    console.error('응답 제출 오류:', error);
    throw error;
  }
};

// 세션 삭제
export const deleteSession = async (sessionId: string): Promise<void> => {
  try {
    // 세션 정보 가져오기
    const session = await getSession(sessionId);
    
    if (!session) {
      throw new Error('세션을 찾을 수 없습니다.');
    }
    
    // 병렬 처리를 위한 Promise 배열
    const deletePromises = [
      // 세션 코드 인덱스 삭제
      remove(ref(rtdb, `sessionCodes/${session.code}`)),
      
      // 참가자 정보 삭제
      remove(ref(rtdb, `participants/${sessionId}`)),
      
      // 문제 상태 삭제
      remove(ref(rtdb, `sessionQuestions/${sessionId}`)),
      
      // 호스트의 활성 세션에서 제거
      remove(ref(rtdb, `userSessions/${session.hostId}/active/${sessionId}`))
    ];
    
    // 응답 데이터 삭제 (개별 접근 대신 상위 경로에서 한 번에 삭제)
    // 세션에 연결된 모든 응답 데이터의 접두사를 사용하는 경로 체크
    const sessionAnswersRef = ref(rtdb, 'sessionAnswers');
    const answersSnapshot = await get(sessionAnswersRef);
    
    if (answersSnapshot.exists()) {
      const answerData = answersSnapshot.val();
      const sessionAnswerPaths = Object.keys(answerData)
        .filter(path => path.startsWith(`${sessionId}_question_`));
      
      // 해당 세션의 응답 경로만 삭제 작업에 추가
      sessionAnswerPaths.forEach(path => {
        deletePromises.push(remove(ref(rtdb, `sessionAnswers/${path}`)));
      });
    }
    
    // 먼저 모든 관련 데이터 삭제를 병렬로 처리
    await Promise.all(deletePromises);
    
    // 마지막으로 세션 자체 삭제
    await remove(ref(rtdb, `sessions/${sessionId}`));
  } catch (error) {
    console.error('세션 삭제 오류:', error);
    throw error;
  }
};

// 세션 실시간 리스너 설정
export const subscribeToSession = (
  sessionId: string, 
  callback: (session: Session | null) => void
) => {
  const sessionRef = ref(rtdb, `sessions/${sessionId}`);
  
  const handleSnapshot = (snapshot: any) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      callback({
        id: sessionId,
        ...data
      });
    } else {
      callback(null);
    }
  };
  
  onValue(sessionRef, handleSnapshot);
  
  // 구독 취소 함수 반환
  return () => off(sessionRef, 'value', handleSnapshot);
};

// 참가자 리스트 실시간 리스너 설정
export const subscribeToParticipants = (
  sessionId: string, 
  callback: (participants: Record<string, Participant>) => void
) => {
  const participantsRef = ref(rtdb, `participants/${sessionId}`);
  
  const handleSnapshot = (snapshot: any) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback({});
    }
  };
  
  onValue(participantsRef, handleSnapshot);
  
  // 구독 취소 함수 반환
  return () => off(participantsRef, 'value', handleSnapshot);
};

// 현재 문제 상태 실시간 리스너 설정
export const subscribeToQuestionStatus = (
  sessionId: string,
  questionIndex: number,
  callback: (status: QuestionStatus | null) => void
) => {
  const questionStatusRef = ref(rtdb, `sessionQuestions/${sessionId}/${questionIndex}`);
  
  const handleSnapshot = (snapshot: any) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  };
  
  onValue(questionStatusRef, handleSnapshot);
  
  // 구독 취소 함수 반환
  return () => off(questionStatusRef, 'value', handleSnapshot);
};

// 문제별 응답 실시간 리스너 설정
export const subscribeToAnswers = (
  sessionId: string,
  questionIndex: number,
  callback: (answers: Record<string, Answer>) => void
) => {
  const answersRef = ref(rtdb, `sessionAnswers/${sessionId}_question_${questionIndex}`);
  
  const handleSnapshot = (snapshot: any) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback({});
    }
  };
  
  onValue(answersRef, handleSnapshot);
  
  // 구독 취소 함수 반환
  return () => off(answersRef, 'value', handleSnapshot);
};

// 호스트 ID로 세션 목록 가져오기
export const getSessionsByHostId = async (hostId: string): Promise<Session[]> => {
  try {
    const sessionsRef = ref(rtdb, 'sessions');
    const snapshot = await get(sessionsRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const sessions: Session[] = [];
    const data = snapshot.val();
    
    // 객체를 배열로 변환하고 필터링
    Object.keys(data).forEach(sessionId => {
      const session = data[sessionId];
      if (session.hostId === hostId) {
        sessions.push({
          id: sessionId,
          ...session
        });
      }
    });
    
    // 생성 시간 기준 내림차순 정렬(최신순)
    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('호스트 세션 조회 오류:', error);
    throw error;
  }
};

// 퀴즈 ID로 세션 목록 가져오기
export const getSessionsByQuizId = async (quizId: string): Promise<Session[]> => {
  try {
    const sessionsRef = ref(rtdb, 'sessions');
    const snapshot = await get(sessionsRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const sessions: Session[] = [];
    const data = snapshot.val();
    
    // 객체를 배열로 변환하고 필터링
    Object.keys(data).forEach(sessionId => {
      const session = data[sessionId];
      if (session.quizId === quizId) {
        sessions.push({
          id: sessionId,
          ...session
        });
      }
    });
    
    // 생성 시간 기준 내림차순 정렬(최신순)
    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('퀴즈 세션 조회 오류:', error);
    throw error;
  }
}; 