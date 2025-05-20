import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { ref, remove } from 'firebase/database';
import { db, rtdb } from './config';
import { getSessionsByHostId, deleteSession } from './sessionService';

// 유저 데이터 관련 경로
const getUserDocPath = (userId: string) => `users/${userId}`;
const getUserQuizzesCollectionPath = (userId: string) => `users/${userId}/quizzes`;
const getUserSessionHistoriesPath = (userId: string) => `users/${userId}/sessionHistories`;

/**
 * 사용자 계정 삭제 시 모든 사용자 데이터를 삭제합니다.
 * - Firestore: 퀴즈, 세션 히스토리, 사용자 문서
 * - Realtime Database: 활성 세션, 참여자 데이터
 */
export const deleteAllUserData = async (userId: string): Promise<void> => {
  if (!userId) throw new Error('사용자 ID가 필요합니다.');
  
  try {
    console.log(`사용자 ${userId}의 모든 데이터 삭제 시작...`);
    
    // 1. 활성 세션 삭제 (Realtime Database)
    await deleteUserActiveSessions(userId);
    
    // 2. 사용자의 Firestore 데이터 삭제
    await deleteUserFirestoreData(userId);

    console.log(`사용자 ${userId}의 모든 데이터가 성공적으로 삭제되었습니다.`);
  } catch (error) {
    console.error('사용자 데이터 삭제 오류:', error);
    throw error;
  }
};

/**
 * 사용자의 Realtime Database 데이터 삭제
 * - 활성 세션 및 관련 데이터
 */
const deleteUserActiveSessions = async (userId: string): Promise<void> => {
  try {
    console.log(`사용자 ${userId}의 Realtime Database 데이터 삭제 시작...`);
    
    // 1. 사용자의 활성 세션 목록 가져오기
    const userSessions = await getSessionsByHostId(userId);
    
    // 2. 각 세션을 개별적으로 삭제 (관련 데이터도 함께 삭제됨)
    for (const session of userSessions) {
      console.log(`세션 삭제 중: ${session.id}`);
      await deleteSession(session.id);
    }
    
    // 3. userSessions 노드에서 사용자 데이터 삭제
    await remove(ref(rtdb, `userSessions/${userId}`));
    
    console.log(`사용자 ${userId}의 Realtime Database 데이터 삭제 완료`);
  } catch (error) {
    console.error('Realtime Database 사용자 데이터 삭제 오류:', error);
    throw error;
  }
};

/**
 * 사용자의 Firestore 데이터 삭제
 * - 퀴즈, 세션 히스토리, 사용자 문서
 */
const deleteUserFirestoreData = async (userId: string): Promise<void> => {
  try {
    console.log(`사용자 ${userId}의 Firestore 데이터 삭제 시작...`);
    
    // 배치 작업 시작
    const batch = writeBatch(db);
    let operationCount = 0;
    const MAX_BATCH_SIZE = 500; // Firestore 배치 작업 제한
    
    // 1. 퀴즈 삭제
    const quizzesSnapshot = await getDocs(collection(db, getUserQuizzesCollectionPath(userId)));
    console.log(`삭제할 퀴즈 수: ${quizzesSnapshot.size}`);
    
    for (const quizDoc of quizzesSnapshot.docs) {
      batch.delete(quizDoc.ref);
      operationCount++;
      
      // 배치 크기 제한에 도달하면 커밋하고 새 배치 시작
      if (operationCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        console.log(`${operationCount}개의 문서 삭제 완료`);
        operationCount = 0;
      }
    }
    
    // 2. 세션 히스토리 삭제
    const historiesSnapshot = await getDocs(collection(db, getUserSessionHistoriesPath(userId)));
    console.log(`삭제할 세션 히스토리 수: ${historiesSnapshot.size}`);
    
    for (const historyDoc of historiesSnapshot.docs) {
      batch.delete(historyDoc.ref);
      operationCount++;
      
      if (operationCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        console.log(`${operationCount}개의 문서 삭제 완료`);
        operationCount = 0;
      }
    }
    
    // 3. 사용자 문서 삭제
    const userDocRef = doc(db, getUserDocPath(userId));
    batch.delete(userDocRef);
    operationCount++;
    
    // 남은 배치 작업 커밋
    if (operationCount > 0) {
      await batch.commit();
      console.log(`${operationCount}개의 문서 삭제 완료`);
    }
    
    console.log(`사용자 ${userId}의 Firestore 데이터 삭제 완료`);
  } catch (error) {
    console.error('Firestore 사용자 데이터 삭제 오류:', error);
    throw error;
  }
}; 