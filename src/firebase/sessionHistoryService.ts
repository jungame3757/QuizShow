import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
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

// 세션 기록용 Answer 타입 정의
export interface Answer {
  questionIndex: number;
  answerIndex: number;
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

    // 세션 기록 데이터 생성
    const sessionHistory: Omit<SessionHistory, 'id'> = {
      hostId: session.hostId,
      title: title,
      participantCount: session.participantCount,
      startedAt,
      endedAt,
      participants,
      quiz: quiz // 퀴즈 전체 객체를 저장
    };

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

// 호스트 ID로 세션 기록을 가져오는 함수 (페이지네이션 지원)
export const getSessionHistoriesByHostId = async (
  hostId: string, 
  pageSize: number = 10, 
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<SessionHistory[]> => {
  try {
    // 기본 쿼리: 호스트 ID로 필터링 및 종료 시간 기준 내림차순 정렬
    let historyQuery = query(
      collection(db, getUserSessionHistoriesPath(hostId)),
      orderBy('endedAt', 'desc'),
      limit(pageSize)
    );
    
    // 마지막 문서가 제공된 경우 (페이지네이션)
    if (lastDoc) {
      historyQuery = query(
        collection(db, getUserSessionHistoriesPath(hostId)),
        orderBy('endedAt', 'desc'),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }
    
    const querySnapshot = await getDocs(historyQuery);
    const histories: SessionHistory[] = [];
    let lastVisible = null;
    
    // lastVisible을 별도로 추적
    if (!querySnapshot.empty) {
      lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    }
    
    querySnapshot.forEach((doc) => {
      // 문서 데이터 읽기
      const data = doc.data();
      
      // 안전하게 quiz 필드 처리
      let quizData = data.quiz;
      if (!quizData) {
        quizData = { id: 'unknown', title: '제목 없음' };
      }
      
      histories.push({
        id: doc.id,
        ...data,
        // quiz 필드가 없거나 형식이 맞지 않는 경우 처리
        quiz: quizData
      } as SessionHistory);
    });
    
    // 마지막 문서를 수동으로 설정
    if (lastVisible && histories.length > 0) {
      (histories[histories.length - 1] as any)._lastVisible = lastVisible;
    }
    
    return histories;
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