/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { adminRtdb, adminFirestore } from './config';
import {
  RtdbSession,
  RtdbParticipant,
  Quiz,
  SessionHistory,
  HistoryParticipant,
} from './types';

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

/**
 * RTDB의 세션 데이터를 기반으로 Firestore에 저장할 SessionHistory 객체를 생성합니다.
 */
async function createSessionHistoryData(
  rtdbSessionData: RtdbSession,
  sessionId: string,
  quiz: Quiz,
  participantsData: Record<string, RtdbParticipant>
): Promise<Omit<SessionHistory, 'id'>> {
  const endedAtTimestamp = rtdbSessionData.endedAt 
    ? admin.firestore.Timestamp.fromMillis(rtdbSessionData.endedAt)
    : admin.firestore.Timestamp.now(); // 만료 시점을 종료 시점으로

  const historyParticipants: Record<string, HistoryParticipant> = {};
  for (const pId in participantsData) {
    const rtdbPart = participantsData[pId];
    // TODO: RTDB 참가자 답변/시도 정보를 가져와서 HistoryParticipant 내부의 attempts 배열을 채워야 함
    // 이 예시에서는 간단히 score만 매핑합니다.
    historyParticipants[pId] = {
      id: pId,
      name: rtdbPart.name,
      joinedAt: rtdbPart.joinedAt,
      isActive: rtdbPart.isActive, // 세션 종료 시점의 활성 상태
      score: rtdbPart.score,
      attempts: [], // 상세 답변/시도 기록은 추가 구현 필요
    };
  }

  return {
    hostId: rtdbSessionData.hostId,
    title: quiz.title || '제목 없음',
    startedAt: rtdbSessionData.startedAt 
      ? admin.firestore.Timestamp.fromMillis(rtdbSessionData.startedAt) 
      : admin.firestore.Timestamp.fromMillis(rtdbSessionData.createdAt),
    endedAt: endedAtTimestamp,
    participantCount: rtdbSessionData.participantCount || Object.keys(participantsData).length,
    quiz: quiz, // Quiz 객체 전체 저장
    participants: historyParticipants,
  };
}

/**
 * RTDB에서 세션 관련 데이터를 삭제합니다.
 */
async function deleteSessionFromRtdb(sessionId: string, sessionCode: string, hostId: string): Promise<void> {
  const pathsToDelete = [
    `/sessionCodes/${sessionCode}`,
    `/participants/${sessionId}`,
    `/sessionQuestions/${sessionId}`, // sessionService.ts 내의 deleteSession 참조
    `/userSessions/${hostId}/active/${sessionId}`,
    `/quizData/${sessionId}` // 퀴즈 내용/정답 데이터
  ];

  const deletePromises: Promise<void>[] = pathsToDelete.map(path => adminRtdb.ref(path).remove() as Promise<void>);
  
  // sessionAnswers 하위의 특정 세션 응답 삭제 로직
  const sessionAnswersRef = adminRtdb.ref('sessionAnswers');
  const answersSnapshot = await sessionAnswersRef.once('value');
  if (answersSnapshot.exists()) {
    answersSnapshot.forEach(childSnapshot => {
      if (childSnapshot.key?.startsWith(`${sessionId}_question_`)) {
        deletePromises.push(childSnapshot.ref.remove() as Promise<void>);
      }
    });
  }

  // 마지막으로 세션 자체 삭제
  deletePromises.push(adminRtdb.ref(`/sessions/${sessionId}`).remove() as Promise<void>);

  await Promise.all(deletePromises);
}

/**
 * 퀴즈 ID와 호스트 ID로 Firestore에서 퀴즈 데이터를 가져옵니다.
 */
async function getQuizById(quizId: string, hostId: string): Promise<Quiz | null> {
  try {
    // 호스트 ID가 제공된 경우 직접 경로를 통해 접근
    const directDocRef = adminFirestore.doc(`users/${hostId}/quizzes/${quizId}`);
    const directDocSnapshot = await directDocRef.get();
    
    if (directDocSnapshot.exists) {
      const data = directDocSnapshot.data();
      if (!data) return null;
      
      // Firestore 타임스탬프를 ISO 문자열로 변환
      const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' 
        ? data.createdAt.toDate().toISOString() 
        : new Date().toISOString();
      
      const updatedAt = data.updatedAt && typeof data.updatedAt.toDate === 'function'
        ? data.updatedAt.toDate().toISOString()
        : undefined;
      
      // 질문 배열 처리 및 정답 인덱스 확인
      const questions = Array.isArray(data.questions)
        ? data.questions.map(q => ({
            text: q.text || '문제',
            options: Array.isArray(q.options) ? q.options : [],
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0
          }))
        : [];
      
      return {
        id: quizId,
        title: data.title || '제목 없음',
        description: data.description || '',
        questions,
        createdAt,
        updatedAt,
      };
    }
    
    // Collection Group 쿼리로 시도
    try {
      const quizzesQuery = adminFirestore.collectionGroup('quizzes').where(admin.firestore.FieldPath.documentId(), '==', quizId);
      const querySnapshot = await quizzesQuery.get();
      
      if (!querySnapshot.empty) {
        const quizDoc = querySnapshot.docs[0];
        const data = quizDoc.data();
        
        const createdAt = data.createdAt && typeof data.createdAt.toDate === 'function' 
          ? data.createdAt.toDate().toISOString() 
          : new Date().toISOString();
        
        const updatedAt = data.updatedAt && typeof data.updatedAt.toDate === 'function'
          ? data.updatedAt.toDate().toISOString()
          : undefined;
        
        const questions = Array.isArray(data.questions)
          ? data.questions.map(q => ({
              text: q.text || '문제',
              options: Array.isArray(q.options) ? q.options : [],
              correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0
            }))
          : [];
        
        return {
          id: quizId,
          title: data.title || '제목 없음',
          description: data.description || '',
          questions,
          createdAt,
          updatedAt,
        };
      }
    } catch (collectionGroupError) {
      console.error('Collection group 쿼리 오류:', collectionGroupError);
    }
    
    console.warn(`퀴즈를 찾을 수 없습니다: 퀴즈 ID ${quizId}, 호스트 ID ${hostId}`);
    return null;
  } catch (error) {
    console.error('퀴즈 정보 가져오기 오류:', error);
    return null;
  }
}

// 매 시간 실행되는 스케줄링 함수
export const autoEndExpiredSessions = functions
  .region('asia-northeast3') // 서울 리전
  .pubsub.schedule('every 60 minutes')
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    console.log('만료된 세션 정리 작업 시작 - Timestamp:', context.timestamp);

    const now = Date.now();
    const sessionsQuery = adminRtdb.ref('/sessions')
                                  .orderByChild('expiresAt')
                                  .endAt(now); // expiresAt <= now

    try {
      const expiredSessionsSnapshot = await sessionsQuery.once('value');

      if (!expiredSessionsSnapshot.exists()) {
        console.log('처리할 만료된 세션이 없습니다.');
        return null;
      }

      const sessionsToProcess: { sessionId: string, data: RtdbSession }[] = [];
      expiredSessionsSnapshot.forEach(sessionSnap => {
        const sessionData = sessionSnap.val();
        // sessionSnap.key는 null이 아님을 확신 (exists() 이후)
        sessionsToProcess.push({ 
          sessionId: sessionSnap.key!, 
          data: {
            ...sessionData,
            id: sessionSnap.key!
          } 
        });
      });

      console.log(`총 ${sessionsToProcess.length}개의 만료된 세션 발견.`);

      for (const { sessionId, data: rtdbSessionData } of sessionsToProcess) {
        if (!rtdbSessionData.quizId || !rtdbSessionData.hostId || !rtdbSessionData.code) {
          console.warn(`세션 ${sessionId}에 필수 정보(quizId, hostId, code)가 부족하여 건너뜁니다.`);
          continue;
        }
        
        console.log(`세션 처리 시작: ${sessionId} (퀴즈 ID: ${rtdbSessionData.quizId}, 호스트 ID: ${rtdbSessionData.hostId})`);

        try {
          // 1. 퀴즈 정보 가져오기
          const quizData = await getQuizById(rtdbSessionData.quizId, rtdbSessionData.hostId);
          if (!quizData) {
            console.error(`[세션 ${sessionId}] 퀴즈 정보를 찾을 수 없습니다 (Quiz ID: ${rtdbSessionData.quizId}, Host ID: ${rtdbSessionData.hostId}). 세션 기록 저장 및 삭제를 건너뜁니다.`);
            // 퀴즈 정보가 없으면 기록 저장도, 세션 삭제도 의미가 없을 수 있으므로 여기서 중단하고 로그를 남김.
            continue; 
          }

          // 2. 참가자 정보 가져오기 (RTDB)
          const participantsSnapshot = await adminRtdb.ref(`/participants/${sessionId}`).once('value');
          const participantsData: Record<string, RtdbParticipant> = participantsSnapshot.exists() ? participantsSnapshot.val() : {};
          
          // 3. 세션 결과 보고서 데이터 생성
          const sessionHistoryPayload = await createSessionHistoryData(rtdbSessionData, sessionId, quizData, participantsData);

          // 4. Firestore에 결과 보고서 저장
          const historyCollectionRef = adminFirestore.collection(`users/${rtdbSessionData.hostId}/sessionHistories`);
          await historyCollectionRef.add(sessionHistoryPayload);
          console.log(`[세션 ${sessionId}] 결과 보고서 Firestore에 저장 완료.`);

          // 5. RTDB에서 활동 세션 및 관련 데이터 제거
          await deleteSessionFromRtdb(sessionId, rtdbSessionData.code, rtdbSessionData.hostId);
          console.log(`[세션 ${sessionId}] RTDB에서 세션 데이터 삭제 완료.`);

        } catch (error: any) {
          console.error(`세션 ${sessionId} 처리 중 오류 발생:`, error.message, error.stack);
          // 개별 세션 처리 실패 시 다음 세션으로 계속 진행
        }
      }

      console.log('만료된 세션 정리 작업 완료.');
      return null;

    } catch (error: any) {
      console.error('만료된 세션 정리 함수 실행 중 전역 오류:', error.message, error.stack);
      return null;
    }
  });
