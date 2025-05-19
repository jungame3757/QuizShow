import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  deleteDoc, 
  serverTimestamp, 
  Timestamp,
  collectionGroup 
} from 'firebase/firestore';
import { db } from './config';
import { Quiz, Question } from '../types';

// 변경된 컬렉션 경로
const getUserQuizzesCollectionPath = (userId: string) => `users/${userId}/quizzes`;
const getQuizDocPath = (userId: string, quizId: string) => `users/${userId}/quizzes/${quizId}`;

// 타입스크립트를 위한 Firestore Quiz 타입 정의
interface FirestoreQuiz {
  title: string;
  description?: string;
  questions: Question[];
  createdAt: Timestamp;
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
    ? firestoreQuiz.questions.map(q => {
        const options = Array.isArray(q.options) ? q.options : [];
        let correctAnswerIndex = 0;
        
        if (typeof q.correctAnswer === 'number') {
          // 이미 숫자 형태라면 그대로 사용
          correctAnswerIndex = q.correctAnswer;
        } else if (q.correctAnswer !== undefined && options.length > 0) {
          // correctAnswer가 문자열이거나 다른 형태라면 문자열로 변환하여 비교
          const correctAnswerStr = String(q.correctAnswer);
          const index = options.findIndex(opt => String(opt) === correctAnswerStr);
          if (index !== -1) {
            correctAnswerIndex = index;
          }
        }
        
        return {
          text: q.text || '문제',
          options: options,
          correctAnswer: correctAnswerIndex,
        };
      })
    : [];

  // ID가 없는 경우를 대비한 안전 처리
  const id = firestoreQuiz.id || generateId();

  return {
    id,
    title: firestoreQuiz.title || '제목 없음',
    description: firestoreQuiz.description || '',
    questions,
    createdAt: safelyConvertTimestamp(firestoreQuiz.createdAt) || new Date().toISOString(),
    updatedAt: safelyConvertTimestamp(firestoreQuiz.updatedAt),
  };
};

// 랜덤 ID 생성 헬퍼 함수
const generateId = () => Math.random().toString(36).substring(2, 9);

// Quiz를 Firestore에 저장하기 위한 변환
const convertQuizToFirestoreQuiz = (quiz: Omit<Quiz, 'id'>): Omit<FirestoreQuiz, 'id'> => {
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
    ? quiz.questions.map(q => {
        const options = Array.isArray(q.options) ? q.options : [];
        let correctAnswerIndex = 0;
        
        if (typeof q.correctAnswer === 'number') {
          // 이미 숫자 형태라면 그대로 사용
          correctAnswerIndex = q.correctAnswer;
        } else if (q.correctAnswer !== undefined && options.length > 0) {
          // correctAnswer가 문자열이거나 다른 형태라면 문자열로 변환하여 비교
          const correctAnswerStr = String(q.correctAnswer);
          const index = options.findIndex(opt => String(opt) === correctAnswerStr);
          if (index !== -1) {
            correctAnswerIndex = index;
          }
        }
        
        return {
          text: q.text || '문제',
          options: options,
          correctAnswer: correctAnswerIndex,
        };
      })
    : [];

  // 기본 객체 생성
  const firestoreQuiz: any = {
    title: quiz.title || '제목 없음',
    description: quiz.description || '',
    questions: validQuestions,
    createdAt: safelyConvertToTimestamp(quiz.createdAt) || Timestamp.fromDate(new Date()),
    updatedAt: serverTimestamp(),
  };
  
  return firestoreQuiz;
};

// 페이지네이션과 함께 퀴즈 결과를 반환하는 인터페이스
export interface QuizListResponse {
  quizzes: Quiz[];
  totalCount: number;
}

// 사용자의 퀴즈 가져오기 (페이지네이션 지원)
export const getUserQuizzes = async (
  userId: string,
  pageSize: number = 10,
  offset: number = 0,
  countOnly: boolean = false
): Promise<Quiz[]> => {
  try {
    if (!userId) {
      throw new Error('사용자 ID가 없습니다.');
    }
    
    // 사용자 하위 컬렉션에서 퀴즈 가져오기
    const quizzesCollection = collection(db, getUserQuizzesCollectionPath(userId));
    
    // 개수만 필요한 경우
    if (countOnly) {
      return [];
    }
    
    // 모든 퀴즈 가져오기 (정렬 필요하므로, 페이지 크기와 상관없이 모든 데이터 가져옴)
    const querySnapshot = await getDocs(quizzesCollection);
    const allQuizzes: Quiz[] = [];
    
    // 모든 문서 데이터 가져오기
    querySnapshot.forEach((doc) => {
      try {
        const quizData = doc.data() as FirestoreQuiz;
        allQuizzes.push(convertFirestoreQuizToQuiz({ ...quizData, id: doc.id }));
      } catch (conversionError) {
        console.error('퀴즈 데이터 변환 오류:', conversionError, 'for document:', doc.id);
        // 오류가 있는 문서는 건너뛰고 계속 진행
      }
    });
    
    // 생성일 기준 내림차순 정렬
    const sortedQuizzes = allQuizzes.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    
    // 요청한 페이지에 해당하는 부분만 잘라내기
    const paginatedQuizzes = sortedQuizzes.slice(offset, offset + pageSize);
    
    // 항상 퀴즈 배열만 반환하도록 수정
    return paginatedQuizzes;
  } catch (error) {
    console.error('사용자 퀴즈 가져오기 오류:', error);
    throw error;
  }
};

// 퀴즈 삭제
export const deleteQuiz = async (quizId: string, userId: string): Promise<void> => {
  try {
    // 변경: 사용자 하위 컬렉션에서 퀴즈 삭제
    const quizRef = doc(db, getQuizDocPath(userId, quizId));
    const quizDoc = await getDoc(quizRef);
    
    if (!quizDoc.exists()) {
      throw new Error('Quiz not found');
    }
    
    await deleteDoc(quizRef);
  } catch (error) {
    console.error('Error deleting quiz:', error);
    throw error;
  }
};

// 퀴즈 생성 (모든 문제를 한번에 저장)
export const createQuiz = async (quiz: Omit<Quiz, 'id'>, userId: string): Promise<string> => {
  try {
    // Firestore 저장용 객체 생성
    const firestoreQuiz = {
      title: quiz.title || '제목 없음',
      description: quiz.description || '',
      questions: Array.isArray(quiz.questions) 
        ? quiz.questions.map(q => {
            const options = Array.isArray(q.options) ? q.options : [];
            let correctAnswerIndex = 0;

            if (typeof q.correctAnswer === 'number') {
              // 이미 숫자 형태라면 그대로 사용
              correctAnswerIndex = q.correctAnswer;
            } else if (q.correctAnswer !== undefined && options.length > 0) {
              // correctAnswer가 문자열이거나 다른 형태라면 문자열로 변환하여 비교
              const correctAnswerStr = String(q.correctAnswer);
              const index = options.findIndex(opt => String(opt) === correctAnswerStr);
              if (index !== -1) {
                correctAnswerIndex = index;
              }
            }
            
            return {
              text: q.text || '문제',
              options: options,
              correctAnswer: correctAnswerIndex,
            };
          })
        : [],
      createdAt: Timestamp.fromDate(new Date(quiz.createdAt || new Date())),
      updatedAt: serverTimestamp(),
    };
    
    // 변경: 사용자 하위 컬렉션에 퀴즈 저장
    const quizzesCollection = collection(db, getUserQuizzesCollectionPath(userId));
    const docRef = await addDoc(quizzesCollection, firestoreQuiz);
    return docRef.id;
  } catch (error) {
    console.error('퀴즈 생성 오류:', error);
    throw error;
  }
};

// 퀴즈 ID로 퀴즈 가져오기
export const getQuizById = async (quizId: string): Promise<Quiz | null> => {
  try {
    // 모든 사용자의 모든 퀴즈 컬렉션 그룹에서 검색
    const quizzesGroup = collectionGroup(db, 'quizzes');
    const querySnapshot = await getDocs(query(quizzesGroup));
    
    // 일치하는 ID 찾기
    const matchingDoc = querySnapshot.docs.find(doc => doc.id === quizId);
    
    if (!matchingDoc) {
      return null;
    }
    
    const quizData = matchingDoc.data() as FirestoreQuiz;
    return convertFirestoreQuizToQuiz({ ...quizData, id: matchingDoc.id });
  } catch (error) {
    console.error('Error getting quiz:', error);
    throw error;
  }
};

// 퀴즈 업데이트
export const updateQuiz = async (quizId: string, updates: Partial<Quiz>, userId: string): Promise<void> => {
  try {
    // 변경: 사용자 하위 컬렉션에서 퀴즈 업데이트
    const quizRef = doc(db, getQuizDocPath(userId, quizId));
    const quizDoc = await getDoc(quizRef);
    
    if (!quizDoc.exists()) {
      throw new Error('Quiz not found');
    }
    
    // Firestore에 저장할 수 있는 형태로 업데이트 데이터 변환
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };
    
    // 업데이트할 필드들 처리
    if (updates.title !== undefined) updateData.title = updates.title || '제목 없음';
    if (updates.description !== undefined) updateData.description = updates.description || '';
    
    // questions 필드 처리 - 항상 배열 형태로 저장
    if (updates.questions !== undefined) {
      updateData.questions = Array.isArray(updates.questions) ? updates.questions : [];
    }
    
    await updateDoc(quizRef, updateData);
  } catch (error) {
    console.error('Error updating quiz:', error);
    throw error;
  }
}; 