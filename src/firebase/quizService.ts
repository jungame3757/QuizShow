import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { db } from './config';
import { User } from 'firebase/auth';
import { Quiz, Question } from '../types';

const QUIZZES_COLLECTION = 'quizzes';

// 타입스크립트를 위한 Firestore Quiz 타입 정의
interface FirestoreQuiz extends Omit<Quiz, 'createdAt' | 'startedAt' | 'completedAt'> {
  userId: string;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  updatedAt: Timestamp;
}

// Firestore Quiz를 앱에서 사용하는 Quiz 타입으로 변환
const convertFirestoreQuizToQuiz = (firestoreQuiz: FirestoreQuiz & { id: string }): Quiz => {
  // Firestore에서 가져온 날짜 데이터 안전하게 처리
  const safelyConvertTimestamp = (timestamp: any): string | undefined => {
    if (!timestamp) return undefined;
    
    try {
      // Timestamp 객체인 경우
      if (timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
      }
      // 이미 문자열인 경우
      else if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        // 유효한 날짜 문자열인지 확인
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        } else {
          console.warn('유효하지 않은 날짜 문자열:', timestamp);
          return new Date().toISOString();
        }
      }
      // 숫자인 경우 (유닉스 타임스탬프)
      else if (typeof timestamp === 'number') {
        return new Date(timestamp).toISOString();
      }
      // 다른 형식인 경우 현재 시간으로 대체
      else {
        console.warn('알 수 없는 타임스탬프 형식:', timestamp);
        return new Date().toISOString();
      }
    } catch (error) {
      console.error('타임스탬프 변환 오류:', error, 'original value:', timestamp);
      return new Date().toISOString();
    }
  };

  // 질문 배열이 없는 경우 빈 배열로 초기화
  const questions = Array.isArray(firestoreQuiz.questions) 
    ? firestoreQuiz.questions.map(q => ({
        id: q.id || generateId(),
        text: q.text || '문제',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer || '',
      }))
    : [];

  // ID가 없는 경우를 대비한 안전 처리
  const id = firestoreQuiz.id || generateId();

  return {
    id,
    title: firestoreQuiz.title || '제목 없음',
    description: firestoreQuiz.description || '',
    inviteCode: firestoreQuiz.inviteCode || '',
    status: firestoreQuiz.status || 'waiting',
    questions,
    createdAt: safelyConvertTimestamp(firestoreQuiz.createdAt) || new Date().toISOString(),
    startedAt: safelyConvertTimestamp(firestoreQuiz.startedAt),
    completedAt: safelyConvertTimestamp(firestoreQuiz.completedAt),
  };
};

// 랜덤 ID 생성 헬퍼 함수
const generateId = () => Math.random().toString(36).substring(2, 9);

// Quiz를 Firestore에 저장하기 위한 변환
const convertQuizToFirestoreQuiz = (quiz: Omit<Quiz, 'id'>, user: User): Omit<FirestoreQuiz, 'id'> => {
  // 날짜를 안전하게 Timestamp로 변환
  const safelyConvertToTimestamp = (dateString: string | undefined) => {
    if (!dateString) return null;
    
    try {
      // 유효한 날짜 문자열인지 확인
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('유효하지 않은 날짜 문자열:', dateString);
        return Timestamp.fromDate(new Date());
      }
      return Timestamp.fromDate(date);
    } catch (error) {
      console.error('날짜 변환 오류:', error, 'original value:', dateString);
      return Timestamp.fromDate(new Date());
    }
  };

  // 질문 데이터 유효성 검사
  const validQuestions = Array.isArray(quiz.questions) 
    ? quiz.questions.map(q => ({
        id: q.id || generateId(),
        text: q.text || '문제',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswer: q.correctAnswer || ''
      }))
    : [];

  // 기본 객체 생성
  const firestoreQuiz: any = {
    title: quiz.title || '제목 없음',
    description: quiz.description || '',
    inviteCode: quiz.inviteCode || '',
    status: quiz.status || 'waiting',
    questions: validQuestions,
    userId: user.uid,
    createdAt: safelyConvertToTimestamp(quiz.createdAt) || Timestamp.fromDate(new Date()),
    updatedAt: serverTimestamp(),
  };
  
  // startedAt이 존재하고 유효한 경우에만 추가
  if (quiz.startedAt) {
    const startedAtTimestamp = safelyConvertToTimestamp(quiz.startedAt);
    if (startedAtTimestamp) {
      firestoreQuiz.startedAt = startedAtTimestamp;
    }
  }
  
  // completedAt이 존재하고 유효한 경우에만 추가
  if (quiz.completedAt) {
    const completedAtTimestamp = safelyConvertToTimestamp(quiz.completedAt);
    if (completedAtTimestamp) {
      firestoreQuiz.completedAt = completedAtTimestamp;
    }
  }
  
  return firestoreQuiz;
};

// 새 퀴즈 저장
export const saveQuiz = async (quiz: Omit<Quiz, 'id'>, user: User): Promise<string> => {
  try {
    const firestoreQuiz = convertQuizToFirestoreQuiz(quiz, user);
    const docRef = await addDoc(collection(db, QUIZZES_COLLECTION), firestoreQuiz);
    return docRef.id;
  } catch (error) {
    console.error('Error saving quiz:', error);
    throw error;
  }
};

// 퀴즈 업데이트
export const updateQuiz = async (quizId: string, updates: Partial<Quiz>, user: User): Promise<void> => {
  try {
    const quizRef = doc(db, QUIZZES_COLLECTION, quizId);
    const quizDoc = await getDoc(quizRef);
    
    if (!quizDoc.exists()) {
      throw new Error('Quiz not found');
    }
    
    const quizData = quizDoc.data() as FirestoreQuiz;
    
    // 권한 확인 - 자신의 퀴즈만 수정 가능
    if (quizData.userId !== user.uid) {
      throw new Error('Permission denied');
    }
    
    // Firestore에 저장할 수 있는 형태로 업데이트 데이터 변환
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };
    
    // 업데이트할 필드들 처리
    if (updates.title !== undefined) updateData.title = updates.title || '제목 없음';
    if (updates.description !== undefined) updateData.description = updates.description || '';
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.inviteCode !== undefined) updateData.inviteCode = updates.inviteCode;
    
    // questions 필드 처리 - 항상 배열 형태로 저장
    if (updates.questions !== undefined) {
      updateData.questions = Array.isArray(updates.questions) ? updates.questions : [];
    }
    
    // 날짜 필드 안전하게 변환
    const safelyConvertToTimestamp = (dateString: string | undefined) => {
      if (!dateString) return null;
      
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          console.warn('Invalid date string in update:', dateString);
          return null;
        }
        return Timestamp.fromDate(date);
      } catch (error) {
        console.error('Error converting date in update:', error);
        return null;
      }
    };
    
    // 날짜 필드 변환 - undefined거나 변환 실패시 추가하지 않음
    if (updates.startedAt) {
      const startedAtTimestamp = safelyConvertToTimestamp(updates.startedAt);
      if (startedAtTimestamp) {
        updateData.startedAt = startedAtTimestamp;
      }
    }
    
    if (updates.completedAt) {
      const completedAtTimestamp = safelyConvertToTimestamp(updates.completedAt);
      if (completedAtTimestamp) {
        updateData.completedAt = completedAtTimestamp;
      }
    }
    
    await updateDoc(quizRef, updateData);
  } catch (error) {
    console.error('Error updating quiz:', error);
    throw error;
  }
};

// 퀴즈 ID로 퀴즈 가져오기
export const getQuizById = async (quizId: string): Promise<Quiz | null> => {
  try {
    const quizRef = doc(db, QUIZZES_COLLECTION, quizId);
    const quizDoc = await getDoc(quizRef);
    
    if (!quizDoc.exists()) {
      return null;
    }
    
    const quizData = quizDoc.data() as FirestoreQuiz;
    return convertFirestoreQuizToQuiz({ ...quizData, id: quizDoc.id });
  } catch (error) {
    console.error('Error getting quiz:', error);
    throw error;
  }
};

// 초대 코드로 퀴즈 가져오기
export const getQuizByInviteCode = async (inviteCode: string): Promise<Quiz | null> => {
  try {
    const q = query(
      collection(db, QUIZZES_COLLECTION),
      where('inviteCode', '==', inviteCode)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const quizDoc = querySnapshot.docs[0];
    const quizData = quizDoc.data() as FirestoreQuiz;
    
    return convertFirestoreQuizToQuiz({ ...quizData, id: quizDoc.id });
  } catch (error) {
    console.error('Error getting quiz by invite code:', error);
    throw error;
  }
};

// 사용자의 모든 퀴즈 가져오기
export const getUserQuizzes = async (user: User): Promise<Quiz[]> => {
  try {
    if (!user || !user.uid) {
      throw new Error('사용자 인증 정보가 없습니다.');
    }
    
    // 단순 쿼리로 변경 - 인덱스 필요 없도록
    const q = query(
      collection(db, QUIZZES_COLLECTION),
      where('userId', '==', user.uid)
    );
    
    const querySnapshot = await getDocs(q);
    const quizzes: Quiz[] = [];
    
    querySnapshot.forEach((doc) => {
      try {
        const quizData = doc.data() as FirestoreQuiz;
        quizzes.push(convertFirestoreQuizToQuiz({ ...quizData, id: doc.id }));
      } catch (conversionError) {
        console.error('퀴즈 데이터 변환 오류:', conversionError, 'for document:', doc.id);
        // 오류가 있는 문서는 건너뛰고 계속 진행
      }
    });
    
    // 클라이언트 측에서 정렬하도록 변경
    return quizzes.sort((a, b) => {
      // null, undefined 체크
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  } catch (error) {
    console.error('사용자 퀴즈 가져오기 오류:', error);
    throw error;
  }
};

// 퀴즈 삭제
export const deleteQuiz = async (quizId: string, user: User): Promise<void> => {
  try {
    const quizRef = doc(db, QUIZZES_COLLECTION, quizId);
    const quizDoc = await getDoc(quizRef);
    
    if (!quizDoc.exists()) {
      throw new Error('Quiz not found');
    }
    
    const quizData = quizDoc.data() as FirestoreQuiz;
    
    // 권한 확인 - 자신의 퀴즈만 삭제 가능
    if (quizData.userId !== user.uid) {
      throw new Error('Permission denied');
    }
    
    await deleteDoc(quizRef);
  } catch (error) {
    console.error('Error deleting quiz:', error);
    throw error;
  }
}; 