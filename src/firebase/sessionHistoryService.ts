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

    // participants에서 quizId 필드 제거
    const cleanedParticipants: Record<string, Participant> = {};
    Object.entries(participants).forEach(([key, participant]) => {
      // participant를 복사하고 quizId 필드 제거
      const { quizId, ...cleanedParticipant } = participant as any;
      cleanedParticipants[key] = cleanedParticipant;
    });

    // 세션 기록 데이터 생성 (title은 quiz.title로 통일)
    const sessionHistory: Omit<SessionHistory, 'id'> = {
      hostId: session.hostId,
      title: quizWithId.title,
      participantCount: session.participantCount,
      startedAt,
      endedAt,
      participants: cleanedParticipants,
      quiz: quizWithId
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