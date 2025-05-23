import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { Response } from "express";

// Firebase Admin 초기화
admin.initializeApp();

const db = admin.firestore();
const rtdb = admin.database();

// 세션 인터페이스
interface Session {
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

interface Participant {
  name: string;
  score: number;
  joinedAt: number;
}

interface QuizQuestion {
  text: string;
  options: string[];
  correctAnswer: number;
}

interface Quiz {
  id?: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
}

// 세션 기록 인터페이스
interface SessionHistory {
  hostId: string;
  title: string;
  startedAt: admin.firestore.Timestamp;
  endedAt: admin.firestore.Timestamp | null;
  participantCount: number;
  quiz: Quiz;
  participants?: Record<string, Participant>;
}

// 매 시간마다 실행되는 스케줄된 함수 (만료된 세션 정리)
export const cleanupExpiredSessions = functions.scheduler.onSchedule({
  // 매 시간마다 실행 (한국 시간 기준)
  schedule: "0 * * * *",
  timeZone: "Asia/Seoul",
  // 최대 실행 시간 5분
  timeoutSeconds: 300,
  // 메모리 256MB
  memory: "256MiB",
}, async () => {
  console.log("만료된 세션 정리 작업 시작...");
  
  try {
    const now = Date.now();
    const sessionsRef = rtdb.ref("sessions");
    const snapshot = await sessionsRef.once("value");
    
    if (!snapshot.exists()) {
      console.log("정리할 세션이 없습니다.");
      return;
    }
    
    const sessions = snapshot.val();
    const expiredSessionIds: string[] = [];
    
    // 만료된 세션 찾기
    Object.keys(sessions).forEach((sessionId) => {
      const session = sessions[sessionId];
      if (session.expiresAt && session.expiresAt < now) {
        expiredSessionIds.push(sessionId);
      }
    });
    
    if (expiredSessionIds.length === 0) {
      console.log("만료된 세션이 없습니다.");
      return;
    }
    
    console.log(`${expiredSessionIds.length}개의 만료된 세션을 찾았습니다.`);
    
    // 각 만료된 세션을 정리
    const cleanupPromises = expiredSessionIds.map(async (sessionId) => {
      try {
        await cleanupSingleSession(sessionId);
        console.log(`세션 ${sessionId} 정리 완료`);
      } catch (error) {
        console.error(`세션 ${sessionId} 정리 실패:`, error);
      }
    });
    
    await Promise.all(cleanupPromises);
    
    console.log(`만료된 세션 정리 작업 완료. 총 ${expiredSessionIds.length}개 세션 처리됨`);
  } catch (error) {
    console.error("만료된 세션 정리 작업 중 오류 발생:", error);
    throw error;
  }
});

// 단일 세션 정리 함수 (SessionContext.cleanupSession 로직과 동일)
async function cleanupSingleSession(sessionId: string): Promise<void> {
  try {
    // 1. 세션 정보 가져오기
    const sessionRef = rtdb.ref(`sessions/${sessionId}`);
    const sessionSnapshot = await sessionRef.once("value");
    
    if (!sessionSnapshot.exists()) {
      console.log(`세션 ${sessionId}을 찾을 수 없습니다.`);
      return;
    }
    
    const session: Session = {
      id: sessionId,
      ...sessionSnapshot.val()
    };
    
    // 2. 참가자 정보 가져오기
    const participantsRef = rtdb.ref(`participants/${sessionId}`);
    const participantsSnapshot = await participantsRef.once("value");
    const participants: Record<string, Participant> = participantsSnapshot.exists() 
      ? participantsSnapshot.val() 
      : {};
    
    // 3. 참가자가 0명이면 기록을 저장하지 않고 바로 삭제
    if (session.participantCount === 0 || Object.keys(participants).length === 0) {
      console.log(`세션 ${sessionId}: 참가자가 없는 세션입니다. 기록을 저장하지 않고 삭제합니다.`);
      await deleteSessionFromRTDB(sessionId, session);
      return;
    }
    
    // 4. 퀴즈 데이터 가져오기
    let quiz: Quiz | null = null;
    try {
      // RTDB에서 퀴즈 데이터와 정답 데이터 재구성
      const rtdbQuizData = await getQuizDataForClient(sessionId);
      const answersData = await getAnswersForClient(sessionId);
      
      if (rtdbQuizData && answersData) {
        // 클라이언트용 퀴즈 데이터에 정답 정보 추가
        console.log(`세션 ${sessionId}: RTDB에서 퀴즈 데이터와 정답 데이터를 모두 찾았습니다.`);
        quiz = {
          ...rtdbQuizData,
          questions: rtdbQuizData.questions.map((question: QuizQuestion, index: number) => {
            const answerData = answersData.find((a: { questionIndex: number; correctAnswer: number }) => a.questionIndex === index);
            return {
              ...question,
              correctAnswer: answerData ? answerData.correctAnswer : 0
            };
          })
        };
      } else if (rtdbQuizData) {
        // 정답 데이터가 없으면 클라이언트용 데이터만 사용 (백업)
        console.log(`세션 ${sessionId}: RTDB에서 퀴즈 데이터만 찾았습니다. 정답 정보가 누락될 수 있습니다.`);
        quiz = rtdbQuizData;
      } else {
        // 기존 방식으로 Firestore에서 가져오기 (정답 정보 포함)
        console.log(`세션 ${sessionId}: Firestore에서 퀴즈 데이터 로드 시도...`);
        quiz = await getQuizFromFirestore(session.quizId, session.hostId);
      }
    } catch (quizError) {
      console.error(`세션 ${sessionId} 퀴즈 데이터 로드 실패:`, quizError);
      // Firestore 폴백 (정답 정보 포함)
      quiz = await getQuizFromFirestore(session.quizId, session.hostId);
    }
    
    if (!quiz) {
      throw new Error(`세션 ${sessionId}: 퀴즈 정보를 찾을 수 없습니다.`);
    }
    
    // 5. 세션에 종료 시간 설정
    if (!session.endedAt) {
      session.endedAt = Date.now();
    }
    
    // 6. 세션 기록 저장 (Firestore - 사용자 하위 컬렉션)
    await saveSessionHistory(session, quiz.title, participants, quiz);
    console.log(`세션 ${sessionId}: 세션 기록이 저장되었습니다.`);
    
    // 7. 세션 삭제 (Realtime Database)
    await deleteSessionFromRTDB(sessionId, session);
    
  } catch (error) {
    console.error(`세션 ${sessionId} 정리 중 오류:`, error);
    throw error;
  }
}

// RTDB에서 퀴즈 데이터 가져오기 (클라이언트용)
async function getQuizDataForClient(sessionId: string): Promise<Quiz | null> {
  try {
    const quizDataRef = rtdb.ref(`quizData/${sessionId}/public`);
    const snapshot = await quizDataRef.once("value");
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return null;
  } catch (error) {
    console.error("퀴즈 데이터 조회 오류:", error);
    return null;
  }
}

// RTDB에서 정답 데이터 가져오기
async function getAnswersForClient(sessionId: string): Promise<{ questionIndex: number; correctAnswer: number }[] | null> {
  try {
    const answersRef = rtdb.ref(`quizData/${sessionId}/answers`);
    const snapshot = await answersRef.once("value");
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return null;
  } catch (error) {
    console.error("정답 데이터 조회 오류:", error);
    return null;
  }
}

// Firestore에서 퀴즈 가져오기
async function getQuizFromFirestore(quizId: string, hostId: string): Promise<Quiz | null> {
  try {
    // ID 유효성 검사
    if (!quizId) {
      console.error("유효하지 않은 퀴즈 ID:", quizId);
      return null;
    }
    
    // 호스트 ID로 직접 접근
    const directDocRef = db.doc(`users/${hostId}/quizzes/${quizId}`);
    const directDocSnapshot = await directDocRef.get();
    
    if (directDocSnapshot.exists) {
      const quizData = directDocSnapshot.data();
      if (quizData) {
        return {
          id: quizId,
          title: quizData.title,
          description: quizData.description,
          questions: quizData.questions || []
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error("퀴즈 데이터 가져오기 오류:", error);
    throw error;
  }
}

// 세션 기록 저장
async function saveSessionHistory(
  session: Session,
  title: string,
  participants: Record<string, Participant>,
  quiz: Quiz
): Promise<string> {
  try {
    // Firestore 타임스탬프로 변환
    const startedAt = session.startedAt 
      ? admin.firestore.Timestamp.fromMillis(session.startedAt)
      : admin.firestore.Timestamp.fromMillis(session.createdAt);
    const endedAt = session.endedAt 
      ? admin.firestore.Timestamp.fromMillis(session.endedAt) 
      : null;
    
    // session.quizId를 사용하여 quiz 객체에 id 추가
    const quizWithId = {
      ...quiz,
      id: session.quizId, // 항상 session.quizId 사용
      title: quiz.title || title // quiz.title이 없으면 전달받은 title 사용
    };
    
    // participants에서 불필요한 필드 제거
    const cleanedParticipants: Record<string, Participant> = {};
    Object.entries(participants).forEach(([key, participant]) => {
      // participant를 복사하고 불필요한 필드 제거
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { quizId, ...cleanedParticipant } = participant as Participant & { quizId?: string };
      cleanedParticipants[key] = cleanedParticipant;
    });
    
    // 세션 기록 데이터 생성
    const sessionHistory: SessionHistory = {
      hostId: session.hostId,
      title: quizWithId.title,
      participantCount: session.participantCount,
      startedAt,
      endedAt,
      participants: cleanedParticipants,
      quiz: quizWithId
    };
    
    // 사용자별 하위 컬렉션에 세션 기록 추가
    const sessionHistoriesRef = db.collection(`users/${session.hostId}/sessionHistories`);
    const docRef = await sessionHistoriesRef.add(sessionHistory);
    return docRef.id;
  } catch (error) {
    console.error("세션 기록 저장 오류:", error);
    throw error;
  }
}

// RTDB에서 세션 삭제
async function deleteSessionFromRTDB(sessionId: string, session: Session): Promise<void> {
  try {
    // 병렬 처리를 위한 Promise 배열
    const deletePromises = [
      // 세션 코드 인덱스 삭제
      rtdb.ref(`sessionCodes/${session.code}`).remove(),
      
      // 참가자 정보 삭제
      rtdb.ref(`participants/${sessionId}`).remove(),
      
      // 문제 상태 삭제
      rtdb.ref(`sessionQuestions/${sessionId}`).remove(),
      
      // 호스트의 활성 세션에서 제거
      rtdb.ref(`userSessions/${session.hostId}/active/${sessionId}`).remove(),
      
      // 퀴즈 데이터 삭제
      rtdb.ref(`quizData/${sessionId}`).remove()
    ];
    
    // 응답 데이터 삭제
    const sessionAnswersRef = rtdb.ref("sessionAnswers");
    const answersSnapshot = await sessionAnswersRef.once("value");
    
    if (answersSnapshot.exists()) {
      const answerData = answersSnapshot.val();
      const sessionAnswerPaths = Object.keys(answerData)
        .filter(path => path.startsWith(`${sessionId}_question_`));
      
      // 해당 세션의 응답 경로만 삭제 작업에 추가
      sessionAnswerPaths.forEach(path => {
        deletePromises.push(rtdb.ref(`sessionAnswers/${path}`).remove());
      });
    }
    
    // 먼저 모든 관련 데이터 삭제를 병렬로 처리
    await Promise.all(deletePromises);
    
    // 마지막으로 세션 자체 삭제
    await rtdb.ref(`sessions/${sessionId}`).remove();
    
    console.log(`세션 ${sessionId}이 RTDB에서 성공적으로 삭제되었습니다.`);
  } catch (error) {
    console.error(`세션 ${sessionId} RTDB 삭제 오류:`, error);
    throw error;
  }
}

// 수동으로 특정 세션을 정리하는 HTTP 함수 (테스트/관리 목적)
export const cleanupSessionManually = functions.https.onRequest({
  timeoutSeconds: 300,
  memory: "256MiB",
  cors: true,
}, async (req: functions.https.Request, res: Response) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }
  
  const { sessionId } = req.body;
  
  if (!sessionId) {
    res.status(400).send("세션 ID가 필요합니다.");
    return;
  }
  
  try {
    await cleanupSingleSession(sessionId);
    res.status(200).json({ 
      success: true, 
      message: `세션 ${sessionId}이 성공적으로 정리되었습니다.` 
    });
  } catch (error) {
    console.error(`수동 세션 정리 실패 (${sessionId}):`, error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "알 수 없는 오류" 
    });
  }
});