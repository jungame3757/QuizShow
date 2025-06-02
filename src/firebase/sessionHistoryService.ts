import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  Timestamp,
  getDoc,
  doc,
  deleteDoc,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from './config';
import { Session } from './sessionService';
import { Quiz } from '../types';

// 세션 기록용 Answer 타입 정의 - 새로운 문제 형식 지원
export interface Answer {
  questionIndex: number;
  answerIndex?: number; // 객관식용 (선택사항)
  answerText?: string; // 주관식/의견용 (선택사항)
  isCorrect: boolean;
  points: number;
  answeredAt: number;
}

// 시도 인터페이스 정의
export interface Attempt {
  answers: Record<string, Answer>;
  score: number;
  completedAt: number;
}

// 참가자 인터페이스 정의
export interface Participant {
  id: string;
  name: string;
  joinedAt: number;
  isActive: boolean;
  score: number;
  attempts?: Attempt[]; // 시도 기록 배열
}

// 세션 기록 인터페이스 정의
export interface SessionHistory {
  id?: string;
  hostId: string;
  title: string;
  startedAt: any;
  endedAt: any;
  participantCount: number;
  quiz: Quiz; // Quiz 전체 객체가 저장되도록 수정
  participants?: Record<string, Participant>; // 선택적 필드로 변경
}

// 세션 기록의 전체 개수와 결과를 함께 반환하는 인터페이스
export interface SessionHistoryResponse {
  histories: SessionHistory[];
  totalCount: number;
  lastVisible?: QueryDocumentSnapshot<DocumentData>;
}

// 유저별 세션 기록 컬렉션 경로
const getUserSessionHistoriesPath = (userId: string) => `users/${userId}/sessionHistories`;

// 세션 기록 저장
export const saveSessionHistory = async (
  session: Session,
  title: string,
  participants: Record<string, Participant>,
  quiz: Quiz
): Promise<string> => {
  try {
    // Firestore 타임스탬프로 변환
    const startedAt = session.startedAt ? 
      Timestamp.fromMillis(session.startedAt) : 
      Timestamp.fromMillis(session.createdAt);
    const endedAt = session.endedAt ? Timestamp.fromMillis(session.endedAt) : null;

    // session.quizId를 사용하여 quiz 객체에 id 추가
    const quizWithId = { 
      ...quiz,
      id: session.quizId, // 항상 session.quizId 사용
      title: quiz.title || title // quiz.title이 없으면 전달받은 title 사용
    };

    // participants에서 undefined 필드 제거
    const cleanedParticipants: Record<string, Participant> = {};
    Object.entries(participants).forEach(([key, participant]) => {
      // participant를 복사하고 undefined 필드들을 제거
      const participantAny = participant as any; // 타입 확장을 위한 캐스팅
      const cleanedParticipant: any = {};
      
      // 기본 필드들만 복사하고 undefined 체크
      if (participant.id !== undefined) cleanedParticipant.id = participant.id;
      if (participant.name !== undefined) cleanedParticipant.name = participant.name;
      if (participant.joinedAt !== undefined) cleanedParticipant.joinedAt = participant.joinedAt;
      if (participant.isActive !== undefined) cleanedParticipant.isActive = participant.isActive;
      if (participant.score !== undefined) cleanedParticipant.score = participant.score;
      
      // answers가 있고 undefined가 아닌 경우에만 추가
      if (participantAny.answers && typeof participantAny.answers === 'object') {
        const cleanedAnswers: Record<string, any> = {};
        Object.entries(participantAny.answers).forEach(([answerKey, answer]) => {
          if (answer && typeof answer === 'object') {
            const answerAny = answer as any; // 타입 확장을 위한 캐스팅
            const cleanedAnswer: any = {};
            if (answerAny.questionIndex !== undefined) cleanedAnswer.questionIndex = answerAny.questionIndex;
            if (answerAny.answerIndex !== undefined) cleanedAnswer.answerIndex = answerAny.answerIndex;
            if (answerAny.answerText !== undefined) cleanedAnswer.answerText = answerAny.answerText;
            if (answerAny.isCorrect !== undefined) cleanedAnswer.isCorrect = answerAny.isCorrect;
            if (answerAny.points !== undefined) cleanedAnswer.points = answerAny.points;
            if (answerAny.answeredAt !== undefined) cleanedAnswer.answeredAt = answerAny.answeredAt;
            
            // 최소한의 필수 필드가 있는 경우에만 추가
            if (cleanedAnswer.questionIndex !== undefined && cleanedAnswer.isCorrect !== undefined) {
              cleanedAnswers[answerKey] = cleanedAnswer;
            }
          }
        });
        
        if (Object.keys(cleanedAnswers).length > 0) {
          cleanedParticipant.answers = cleanedAnswers;
        }
      }
      
      // attempts가 있고 undefined가 아닌 경우에만 추가
      if (participantAny.attempts && Array.isArray(participantAny.attempts)) {
        const cleanedAttempts = participantAny.attempts.filter((attempt: any) => {
          return attempt && 
                 attempt.answers && 
                 typeof attempt.answers === 'object' &&
                 attempt.score !== undefined &&
                 attempt.completedAt !== undefined;
        }).map((attempt: any) => {
          const cleanedAttemptAnswers: Record<string, any> = {};
          Object.entries(attempt.answers).forEach(([answerKey, answer]) => {
            if (answer && typeof answer === 'object') {
              const answerAny = answer as any; // 타입 확장을 위한 캐스팅
              const cleanedAnswer: any = {};
              if (answerAny.questionIndex !== undefined) cleanedAnswer.questionIndex = answerAny.questionIndex;
              if (answerAny.answerIndex !== undefined) cleanedAnswer.answerIndex = answerAny.answerIndex;
              if (answerAny.answerText !== undefined) cleanedAnswer.answerText = answerAny.answerText;
              if (answerAny.isCorrect !== undefined) cleanedAnswer.isCorrect = answerAny.isCorrect;
              if (answerAny.points !== undefined) cleanedAnswer.points = answerAny.points;
              if (answerAny.answeredAt !== undefined) cleanedAnswer.answeredAt = answerAny.answeredAt;
              
              if (cleanedAnswer.questionIndex !== undefined && cleanedAnswer.isCorrect !== undefined) {
                cleanedAttemptAnswers[answerKey] = cleanedAnswer;
              }
            }
          });
          
          return {
            answers: cleanedAttemptAnswers,
            score: attempt.score,
            completedAt: attempt.completedAt
          };
        });
        
        if (cleanedAttempts.length > 0) {
          cleanedParticipant.attempts = cleanedAttempts;
        }
      }
      
      cleanedParticipants[key] = cleanedParticipant;
    });

    // quiz 객체에서도 undefined 필드 제거
    const cleanedQuiz: any = {};
    if (quizWithId.id !== undefined) cleanedQuiz.id = quizWithId.id;
    if (quizWithId.title !== undefined) cleanedQuiz.title = quizWithId.title;
    if (quizWithId.description !== undefined) cleanedQuiz.description = quizWithId.description;
    if (quizWithId.questions && Array.isArray(quizWithId.questions)) {
      cleanedQuiz.questions = quizWithId.questions.filter(q => q && typeof q === 'object').map(question => {
        const questionAny = question as any; // 타입 확장을 위한 캐스팅
        const cleanedQuestion: any = {};
        if (question.text !== undefined) cleanedQuestion.text = question.text;
        if (question.type !== undefined) cleanedQuestion.type = question.type;
        if (question.options && Array.isArray(question.options)) {
          cleanedQuestion.options = question.options.filter(opt => opt !== undefined);
        }
        if (question.correctAnswer !== undefined) cleanedQuestion.correctAnswer = question.correctAnswer;
        if (question.correctAnswerText !== undefined) cleanedQuestion.correctAnswerText = question.correctAnswerText;
        if (question.additionalAnswers && Array.isArray(question.additionalAnswers)) {
          cleanedQuestion.additionalAnswers = question.additionalAnswers.filter(ans => ans !== undefined);
        }
        if (questionAny.points !== undefined) cleanedQuestion.points = questionAny.points;
        if (questionAny.timeLimit !== undefined) cleanedQuestion.timeLimit = questionAny.timeLimit;
        if (questionAny.answerMatchType !== undefined) cleanedQuestion.answerMatchType = questionAny.answerMatchType;
        return cleanedQuestion;
      });
    }
    if (quizWithId.createdAt !== undefined) cleanedQuiz.createdAt = quizWithId.createdAt;
    if (quizWithId.updatedAt !== undefined) cleanedQuiz.updatedAt = quizWithId.updatedAt;

    // 세션 기록 데이터 생성 (title은 quiz.title로 통일)
    const sessionHistory: any = {
      hostId: session.hostId,
      title: cleanedQuiz.title,
      participantCount: session.participantCount,
      startedAt,
      participants: cleanedParticipants,
      quiz: cleanedQuiz
    };

    // endedAt은 null이 아닌 경우에만 추가
    if (endedAt !== null) {
      sessionHistory.endedAt = endedAt;
    }

    // 사용자별 하위 컬렉션에 세션 기록 추가
    const sessionHistoriesRef = collection(db, getUserSessionHistoriesPath(session.hostId));
    const docRef = await addDoc(sessionHistoriesRef, sessionHistory);
    return docRef.id;
  } catch (error) {
    console.error('세션 기록 저장 오류:', error);
    throw error;
  }
};

// 세션 기록 삭제
export const deleteSessionHistory = async (historyId: string, hostId: string): Promise<void> => {
  try {
    const docRef = doc(db, getUserSessionHistoriesPath(hostId), historyId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('세션 기록 삭제 오류:', error);
    throw error;
  }
};

// 호스트 ID로 세션 기록을 가져오는 함수 (확장된 페이지네이션 지원)
export const getSessionHistoriesByHostId = async (
  hostId: string, 
  pageSize: number = 10, 
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null,
  offset: number = 0,
  countOnly: boolean = false
): Promise<SessionHistoryResponse | SessionHistory[]> => {
  try {
    const collectionPath = getUserSessionHistoriesPath(hostId);
    const collectionRef = collection(db, collectionPath);

    // 개수만 필요한 경우
    if (countOnly) {
      const countSnapshot = await getDocs(query(collectionRef));
      return {
        histories: [],
        totalCount: countSnapshot.size
      };
    }

    // 오프셋 기반 페이지네이션 (페이지 번호 기반)
    if (offset > 0 && !lastDoc) {
      // 전체 개수 조회와 함께 병렬 실행
      const [countSnapshot, allDocsSnapshot] = await Promise.all([
        getDocs(query(collectionRef)),
        getDocs(query(
          collectionRef,
          orderBy('endedAt', 'desc'),
          limit(offset + pageSize)
        ))
      ]);

      const histories: SessionHistory[] = [];
      
      // offset부터 필요한 만큼의 문서만 처리
      const docsSlice = allDocsSnapshot.docs.slice(offset, offset + pageSize);
      
      docsSlice.forEach((doc) => {
        const data = doc.data();
        let quizData = data.quiz || { id: 'unknown', title: '제목 없음' };
        
        histories.push({
          id: doc.id,
          ...data,
          quiz: quizData
        } as SessionHistory);
      });
      
      // 응답 반환
      const lastVisible = docsSlice.length > 0 ? docsSlice[docsSlice.length - 1] : undefined;
      
      // 이전 버전과의 호환성
      if (lastVisible && histories.length > 0) {
        (histories[histories.length - 1] as any)._lastVisible = lastVisible;
      }
      
      return {
        histories,
        totalCount: countSnapshot.size,
        lastVisible
      };
    }
    
    // 커서 기반 페이지네이션 (lastDoc 사용)
    let historyQuery = query(
      collectionRef,
      orderBy('endedAt', 'desc'),
      limit(pageSize)
    );
    
    if (lastDoc) {
      historyQuery = query(
        collectionRef,
        orderBy('endedAt', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }
    
    // 데이터와 전체 개수 병렬로 조회
    const [querySnapshot, countSnapshot] = await Promise.all([
      getDocs(historyQuery),
      getDocs(query(collectionRef))
    ]);
    
    const histories: SessionHistory[] = [];
    const lastVisible = querySnapshot.docs.length > 0 
      ? querySnapshot.docs[querySnapshot.docs.length - 1] 
      : undefined;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let quizData = data.quiz || { id: 'unknown', title: '제목 없음' };
      
      histories.push({
        id: doc.id,
        ...data,
        quiz: quizData
      } as SessionHistory);
    });
    
    // 이전 버전과의 호환성
    if (lastVisible && histories.length > 0) {
      (histories[histories.length - 1] as any)._lastVisible = lastVisible;
    }
    
    // 응답 형식으로 반환
    return {
      histories,
      totalCount: countSnapshot.size,
      lastVisible
    };
  } catch (error) {
    console.error('세션 기록 가져오기 오류:', error);
    throw error;
  }
};

// 세션 기록 ID로 세션 기록 조회
export const getSessionHistoryById = async (historyId: string, hostId: string): Promise<SessionHistory | null> => {
  try {
    const docRef = doc(db, getUserSessionHistoriesPath(hostId), historyId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return {
      id: historyId,
      ...docSnap.data()
    } as SessionHistory;
  } catch (error) {
    console.error('세션 기록 조회 오류:', error);
    throw error;
  }
}; 