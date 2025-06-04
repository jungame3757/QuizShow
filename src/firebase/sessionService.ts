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
import { QuestionType, AnswerMatchType } from '../types';

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
  maxParticipants: number;
  gameMode?: 'normal' | 'roguelike'; // 게임 모드 추가
}

export interface Participant {
  id: string;
  name: string;
  joinedAt: number;
  isActive: boolean;
  score: number;
  answers?: Record<string, Answer>; // 순차적 인덱스를 키로 사용
  attempts?: Attempt[];
}

export interface QuestionStatus {
  revealed: boolean;
  startedAt: number | null;
  endedAt: number | null;
}

export interface Answer {
  questionIndex: number; // 질문 인덱스 추가
  answerIndex?: number; // 객관식용
  answerText?: string; // 주관식/의견용
  answer: string; // 기존 호환성 유지
  answeredAt: number;
  isCorrect: boolean;
  points: number; // score를 points로 변경
  timeSpent?: number;
  stageType?: string;
  mode?: string;
}

// sessionAnswers용 기존 Answer 인터페이스 (호환성 유지)
export interface SessionAnswer {
  answer: string;
  answeredAt: number;
  isCorrect: boolean;
  score: number;
}

// Attempt 인터페이스 추가
export interface Attempt {
  answers: Record<string, Answer>;
  score: number;
  completedAt: number;
}

// 새로운 문제 형식을 지원하는 퀴즈 데이터 인터페이스
export interface QuizQuestion {
  id?: string;
  type: QuestionType;
  text: string;
  // 객관식용 필드
  options?: string[];
  correctAnswer?: number;
  // 주관식용 필드
  correctAnswerText?: string;
  additionalAnswers?: string[];
  answerMatchType?: AnswerMatchType;
  // 의견 수집용 필드
  isAnonymous?: boolean;
}

export interface Quiz {
  title: string;
  description?: string;
  questions: QuizQuestion[];
}

// 세션 옵션 인터페이스 정의
export interface SessionOptions {
  expiresIn?: number; // 밀리초 단위의 세션 유효 기간
  randomizeQuestions?: boolean; // 문제 무작위 출제 여부
  singleAttempt?: boolean; // 참가자 시도 횟수 제한 (true: 한 번만, false: 여러 번 가능)
  questionTimeLimit?: number; // 문제 풀이 제한 시간 (초 단위)
  maxParticipants?: number; // 최대 참가자 수
  gameMode?: 'normal' | 'roguelike'; // 게임 모드
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
      questionTimeLimit: options?.questionTimeLimit || 30,
      maxParticipants: options?.maxParticipants || 50,
      gameMode: options?.gameMode || 'normal'
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

// 퀴즈 데이터를 포함한 세션 생성 함수 - 새로운 문제 형식 지원
export const createSessionWithQuizData = async (
  quizId: string, 
  hostId: string, 
  quizData: Quiz, 
  options?: SessionOptions
): Promise<string> => {
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
      quizId, // 원래 ID도 유지 (기존 호환성)
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
      questionTimeLimit: options?.questionTimeLimit || 30,
      maxParticipants: options?.maxParticipants || 50,
      gameMode: options?.gameMode || 'normal'
    };
    
    // 클라이언트용 퀴즈 데이터 - 정답 정보 제외, 문제 형식별로 적절한 필드만 포함
    const clientQuizData = {
      title: quizData.title,
      description: quizData.description,
      questions: quizData.questions.map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        // 객관식인 경우에만 선택지 포함
        ...(q.type === 'multiple-choice' && q.options && {
          options: q.options
        }),
        // 의견 수집인 경우 설정 정보 포함
        ...(q.type === 'opinion' && {
          isAnonymous: q.isAnonymous || false
        })
      }))
    };
    
    // 호스트용 정답 데이터 - 문제 형식별로 적절한 정답 정보 저장
    const hostAnswersData = quizData.questions.map((q, index) => ({
      questionIndex: index,
      type: q.type,
      // 객관식 정답 정보
      ...(q.type === 'multiple-choice' && {
        correctAnswer: q.correctAnswer
      }),
      // 주관식 정답 정보
      ...(q.type === 'short-answer' && {
        correctAnswerText: q.correctAnswerText,
        additionalAnswers: q.additionalAnswers || [],
        answerMatchType: q.answerMatchType || 'exact'
      }),
      // 의견 수집 설정 정보
      ...(q.type === 'opinion' && {
        isAnonymous: q.isAnonymous || false
      })
    }));
    
    // 세션 데이터 저장
    await set(newSessionRef, sessionData);
    
    // 세션 코드 인덱스 생성
    await set(ref(rtdb, `sessionCodes/${sessionCode}`), sessionId);
    
    // 퀴즈 데이터 저장 (클라이언트용)
    await set(ref(rtdb, `quizData/${sessionId}/public`), clientQuizData);
    
    // 정답 데이터 저장 (호스트 전용)
    await set(ref(rtdb, `quizData/${sessionId}/answers`), hostAnswersData);
    
    // 호스트 사용자의 활성 세션 업데이트
    await set(ref(rtdb, `userSessions/${hostId}/active/${sessionId}`), true);
    
    return sessionId;
  } catch (error) {
    console.error('세션 생성 오류:', error);
    throw error;
  }
};

// 퀴즈 데이터 가져오기 (클라이언트용)
export const getQuizDataForClient = async (sessionId: string): Promise<any | null> => {
  try {
    const quizDataRef = ref(rtdb, `quizData/${sessionId}/public`);
    const snapshot = await get(quizDataRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return null;
  } catch (error) {
    console.error('퀴즈 데이터 조회 오류:', error);
    throw error;
  }
};

// 정답 확인 함수 - 새로운 문제 형식 지원
export const validateAnswer = async (
  sessionId: string,
  questionIndex: number,
  answerData: any, // answerIndex(객관식) 또는 answerText(주관식/의견) 등을 포함하는 객체
  timeLeft?: number // 남은 시간 (초 단위)
): Promise<{ isCorrect: boolean; points: number }> => {
  try {
    const answersRef = ref(rtdb, `quizData/${sessionId}/answers`);
    const snapshot = await get(answersRef);
    
    if (!snapshot.exists()) {
      return { isCorrect: false, points: 0 };
    }
    
    const answers = snapshot.val();
    const questionAnswer = answers.find((a: any) => a.questionIndex === questionIndex);
    
    if (!questionAnswer) {
      return { isCorrect: false, points: 0 };
    }
    
    // 세션 정보를 가져와서 문제 제한 시간 확인
    const sessionRef = ref(rtdb, `sessions/${sessionId}`);
    const sessionSnapshot = await get(sessionRef);
    const questionTimeLimit = sessionSnapshot.exists() ? (sessionSnapshot.val().questionTimeLimit || 30) : 30;
    
    let isCorrect = false;
    let points = 0;
    
    // 시간에 따른 점수 계산 함수
    const calculateTimeBasedPoints = (basePoints: number, timeLeft: number = 0) => {
      if (timeLeft <= 0) return Math.floor(basePoints * 0.3); // 시간 초과 시 30%
      
      // 0.1초 단위로 정밀한 계산
      const timeLeftRounded = Math.round(timeLeft * 10) / 10; // 0.1초 단위로 반올림
      const timeRatio = timeLeftRounded / questionTimeLimit;
      
      // 더 세밀한 점수 계산 (0.1초마다 점수 변화)
      // 최대 100점에서 시작하여 시간이 줄어들수록 점수 감소
      const timeBonus = Math.max(0, timeRatio); // 0~1 사이의 비율
      const finalPoints = Math.floor(basePoints * (0.5 + (timeBonus * 0.5))); // 50%~100% 범위
      
      return Math.max(Math.floor(basePoints * 0.3), finalPoints); // 최소 30% 보장
    };
    
    switch (questionAnswer.type) {
      case 'multiple-choice':
        // 객관식: answerIndex와 correctAnswer 비교
        if (answerData.answerIndex !== undefined && answerData.answerIndex >= 0) {
          isCorrect = answerData.answerIndex === questionAnswer.correctAnswer;
          points = isCorrect ? calculateTimeBasedPoints(100, timeLeft) : 0;
        }
        break;
        
      case 'short-answer':
        // 주관식: 텍스트 답변 검증
        if (answerData.answerText && typeof answerData.answerText === 'string') {
          const userAnswer = answerData.answerText.toLowerCase().trim();
          const correctAnswer = questionAnswer.correctAnswerText?.toLowerCase().trim();
          
          if (correctAnswer) {
            if (questionAnswer.answerMatchType === 'contains') {
              // 정답 단어 포함 방식
              isCorrect = userAnswer.includes(correctAnswer);
              
              // 추가 정답들도 확인
              if (!isCorrect && questionAnswer.additionalAnswers) {
                isCorrect = questionAnswer.additionalAnswers.some((answer: string) => 
                  userAnswer.includes(answer.toLowerCase().trim())
                );
              }
            } else {
              // 정확히 일치 방식 (기본값)
              isCorrect = userAnswer === correctAnswer;
              
              // 추가 정답들도 확인
              if (!isCorrect && questionAnswer.additionalAnswers) {
                isCorrect = questionAnswer.additionalAnswers.some((answer: string) => 
                  userAnswer === answer.toLowerCase().trim()
                );
              }
            }
          }
          
          points = isCorrect ? calculateTimeBasedPoints(100, timeLeft) : 0;
        }
        break;
        
      case 'opinion':
        // 의견 수집: 항상 일정한 점수 부여 (답변을 제출했다면)
        if (answerData.answerText && typeof answerData.answerText === 'string' && answerData.answerText.trim()) {
          isCorrect = true; // 의견 수집은 정답/오답 개념이 없음
          points = 50; // 고정 점수 (시간과 무관)
        }
        break;
        
      default:
        // 알 수 없는 문제 형식
        break;
    }
    
    return { isCorrect, points };
    
  } catch (error) {
    console.error('답변 검증 오류:', error);
    return { isCorrect: false, points: 0 };
  }
};

// 정답 데이터 가져오기 (클라이언트용)
export const getAnswersForClient = async (sessionId: string): Promise<any[] | null> => {
  try {
    const answersRef = ref(rtdb, `quizData/${sessionId}/answers`);
    const snapshot = await get(answersRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return null;
  } catch (error) {
    console.error('정답 데이터 조회 오류:', error);
    return null;
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
  } catch (error) {
    console.error('참가자 추가 오류:', error);
    throw error;
  }
};

// 다음 답변 시퀀스 인덱스를 가져오는 헬퍼 함수
const getNextAnswerSequenceIndex = async (sessionId: string, userId: string): Promise<number> => {
  try {
    const participantRef = ref(rtdb, `participants/${sessionId}/${userId}/answers`);
    const snapshot = await get(participantRef);
    
    if (!snapshot.exists()) {
      return 0; // 첫 번째 답변
    }
    
    const answers = snapshot.val();
    const indices = Object.keys(answers).map(key => parseInt(key)).filter(num => !isNaN(num));
    return indices.length > 0 ? Math.max(...indices) + 1 : 0;
  } catch (error) {
    console.error('답변 시퀀스 인덱스 조회 오류:', error);
    return 0;
  }
};

// 참가자 응답 제출 - 순차적 인덱스 기반으로 개선
export const submitAnswer = async (
  sessionId: string,
  questionIndex: number, 
  userId: string,
  answerData: {
    answerIndex?: number; // 객관식용
    answerText?: string; // 주관식/의견용
  },
  isCorrect: boolean,
  score: number,
  timeSpent?: number,
  stageType?: string,
  mode?: string
): Promise<void> => {
  try {
    // 답변 형식에 따라 적절한 답변 데이터 구성
    const answer = answerData.answerIndex !== undefined 
      ? answerData.answerIndex.toString() 
      : answerData.answerText || '';
    
    const submitData: SessionAnswer = {
      answer,
      answeredAt: Date.now(),
      isCorrect,
      score
    };
    
    // 응답 저장 (기존 sessionAnswers 구조 유지)
    await set(
      ref(rtdb, `sessionAnswers/${sessionId}_question_${questionIndex}/${userId}`), 
      submitData
    );
    
    // 다음 답변 시퀀스 인덱스 가져오기
    const nextSequenceIndex = await getNextAnswerSequenceIndex(sessionId, userId);
    
    // 참가자의 개별 답변 기록 저장 (순차적 인덱스 사용)
    const participantAnswerRef = ref(rtdb, `participants/${sessionId}/${userId}/answers/${nextSequenceIndex}`);
    await set(participantAnswerRef, {
      questionIndex: questionIndex,
      ...(answerData.answerIndex !== undefined && { answerIndex: answerData.answerIndex }),
      ...(answerData.answerText !== undefined && { answerText: answerData.answerText }),
      answer: answer, // 호환성을 위해 유지
      answeredAt: Date.now(),
      isCorrect,
      points: score,
      ...(timeSpent !== undefined && { timeSpent }),
      ...(stageType && { stageType }),
      ...(mode && { mode })
    });
    
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

// 특정 문제에 대한 참가자의 모든 답변 가져오기
export const getParticipantAnswersForQuestion = async (
  sessionId: string,
  userId: string,
  questionIndex: number
): Promise<Answer[]> => {
  try {
    const answersRef = ref(rtdb, `participants/${sessionId}/${userId}/answers`);
    const snapshot = await get(answersRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const allAnswers = snapshot.val();
    const questionAnswers: Answer[] = [];
    
    // 해당 문제에 대한 모든 답변 필터링
    Object.entries(allAnswers).forEach(([sequenceIndex, answer]: [string, any]) => {
      if (answer.questionIndex === questionIndex) {
        questionAnswers.push({
          ...answer,
          sequenceIndex: parseInt(sequenceIndex)
        } as Answer & { sequenceIndex: number });
      }
    });
    
    // 시간순으로 정렬
    return questionAnswers.sort((a, b) => a.answeredAt - b.answeredAt);
  } catch (error) {
    console.error('참가자 답변 조회 오류:', error);
    return [];
  }
};

// 참가자의 최신 답변만 가져오기 (문제별로 가장 최근 답변)
export const getParticipantLatestAnswers = async (
  sessionId: string,
  userId: string
): Promise<Record<number, Answer>> => {
  try {
    const answersRef = ref(rtdb, `participants/${sessionId}/${userId}/answers`);
    const snapshot = await get(answersRef);
    
    if (!snapshot.exists()) {
      return {};
    }
    
    const allAnswers = snapshot.val();
    const latestAnswers: Record<number, Answer> = {};
    
    // 각 문제별로 가장 최근 답변 찾기
    Object.entries(allAnswers).forEach(([sequenceIndex, answer]: [string, any]) => {
      const questionIndex = answer.questionIndex;
      
      if (!latestAnswers[questionIndex] || 
          answer.answeredAt > latestAnswers[questionIndex].answeredAt) {
        latestAnswers[questionIndex] = {
          ...answer,
          sequenceIndex: parseInt(sequenceIndex)
        } as Answer & { sequenceIndex: number };
      }
    });
    
    return latestAnswers;
  } catch (error) {
    console.error('최신 답변 조회 오류:', error);
    return {};
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
      remove(ref(rtdb, `userSessions/${session.hostId}/active/${sessionId}`)),
      
      // 퀴즈 데이터 삭제 추가
      remove(ref(rtdb, `quizData/${sessionId}`))
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
      const participantsData = snapshot.val();
      // 각 참가자에 id 필드 추가
      const participantsWithId: Record<string, Participant> = {};
      Object.entries(participantsData).forEach(([userId, participant]: [string, any]) => {
        participantsWithId[userId] = {
          ...participant,
          id: userId
        };
      });
      callback(participantsWithId);
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

// 호스트 ID로 세션 목록 가져오기 - userSessions 활용으로 효율화
export const getSessionsByHostId = async (hostId: string): Promise<Session[]> => {
  try {
    // 1. userSessions에서 호스트의 활성 세션 ID 목록을 먼저 가져오기
    const userSessionsRef = ref(rtdb, `userSessions/${hostId}/active`);
    const userSessionsSnapshot = await get(userSessionsRef);
    
    if (!userSessionsSnapshot.exists()) {
      return [];
    }
    
    const activeSessionIds = Object.keys(userSessionsSnapshot.val());
    
    // 2. 각 세션 ID에 대해 세션 데이터 가져오기
    const sessions: Session[] = [];
    const sessionPromises = activeSessionIds.map(async (sessionId) => {
      try {
        const session = await getSession(sessionId);
        if (session && session.hostId === hostId) {
          sessions.push(session);
        } else if (!session) {
          // 세션이 존재하지 않으면 userSessions에서 제거
          await remove(ref(rtdb, `userSessions/${hostId}/active/${sessionId}`));
        }
      } catch (error) {
        console.warn(`세션 ${sessionId} 조회 실패:`, error);
        // 오류 발생한 세션은 userSessions에서 제거
        await remove(ref(rtdb, `userSessions/${hostId}/active/${sessionId}`));
      }
    });
    
    await Promise.all(sessionPromises);
    
    // 생성 시간 기준 내림차순 정렬(최신순)
    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('호스트 세션 조회 오류:', error);
    // userSessions 조회 실패 시 기존 방식으로 fallback
    return await getSessionsByHostIdFallback(hostId);
  }
};

// 기존 방식으로 호스트 세션 조회 (userSessions 조회 실패 시 fallback)
const getSessionsByHostIdFallback = async (hostId: string): Promise<Session[]> => {
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
    console.error('호스트 세션 fallback 조회 오류:', error);
    throw error;
  }
};

// 호스트의 활성 세션 개수 조회
export const getActiveSessionCountByHostId = async (hostId: string): Promise<number> => {
  try {
    const userSessionsRef = ref(rtdb, `userSessions/${hostId}/active`);
    const snapshot = await get(userSessionsRef);
    
    if (!snapshot.exists()) {
      return 0;
    }
    
    return Object.keys(snapshot.val()).length;
  } catch (error) {
    console.error('활성 세션 개수 조회 오류:', error);
    return 0;
  }
};

// 호스트가 특정 퀴즈에 대한 활성 세션을 가지고 있는지 확인
export const hasActiveSessionForQuiz = async (hostId: string, quizId: string): Promise<string | null> => {
  try {
    const sessions = await getSessionsByHostId(hostId);
    const activeSession = sessions.find(session => session.quizId === quizId);
    return activeSession ? activeSession.id : null;
  } catch (error) {
    console.error('퀴즈 활성 세션 확인 오류:', error);
    return null;
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

// 참가자 점수 업데이트 함수 (룰렛 스테이지용)
export const updateParticipantScore = async (
  sessionId: string,
  participantId: string,
  newScore: number
): Promise<void> => {
  try {
    const participantScoreRef = ref(rtdb, `participants/${sessionId}/${participantId}/score`);
    await set(participantScoreRef, newScore);
    console.log(`참가자 ${participantId}의 점수가 ${newScore}점으로 업데이트되었습니다.`);
  } catch (error) {
    console.error('참가자 점수 업데이트 오류:', error);
    throw error;
  }
}; 