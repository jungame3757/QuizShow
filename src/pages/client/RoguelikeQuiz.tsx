import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Sparkle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';
import { getQuizById } from '../../firebase/quizService';
import { getQuizDataForClient, getAnswersForClient } from '../../firebase/sessionService';
import { ref, get, onValue, off } from 'firebase/database';
import { rtdb } from '../../firebase/config';
import { Quiz } from '../../types';
import { useRoguelikeQuiz } from '../../hooks/useRoguelikeQuiz';
import RoguelikeStageView from '../../components/client/RoguelikeStageView';
import QuizResults from '../../components/client/QuizResults';
import RoguelikeMapSelection from '../../components/client/stages/RoguelikeMapSelection';

const RoguelikeQuiz: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { 
    currentSession, 
    participants
  } = useSession();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 세션 ID 상태 추가
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const {
    gameSession,
    currentStage,
    currentQuestionIndex,
    gameStarted,
    gameCompleted,
    hasExistingData,
    answers,
    totalStages,
    initializeGame,
    submitAnswer,
    selectMapPath,
    selectRewardBox,
    mapNodes,
    mapEdges,
    mapStageConnections,
    initialPlayerPosition,
    currentPlayerNodeId,
    checkExistingData,
    resetGameWithAttemptSave,
    handleGameComplete
  } = useRoguelikeQuiz(quiz, currentUser?.uid || '', sessionId || undefined);

  // CSS 애니메이션 스타일 추가
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      /* 로그라이크 퀴즈 페이지 배경 별 애니메이션 */
      .sparkle-animation-roguelike-quiz {
        opacity: 0;
        transform: scale(0);
        animation: sparkleRoguelikeQuizEffect infinite;
      }
      
      @keyframes sparkleRoguelikeQuizEffect {
        0% {
          opacity: 0;
          transform: scale(0) rotate(0deg);
        }
        20% {
          opacity: 0.5;
          transform: scale(0.8) rotate(45deg);
        }
        40% {
          opacity: 0.9;
          transform: scale(1.2) rotate(90deg);
        }
        60% {
          opacity: 1;
          transform: scale(1.4) rotate(135deg);
        }
        80% {
          opacity: 0.6;
          transform: scale(0.9) rotate(180deg);
        }
        100% {
          opacity: 0;
          transform: scale(0) rotate(225deg);
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // 로컬 스토리지에서 참가자 정보 확인
  useEffect(() => {
    const storedParticipation = localStorage.getItem('quizParticipation');
    if (storedParticipation) {
      try {
        const participation = JSON.parse(storedParticipation);
        console.log('로컬스토리지 참가자 정보:', participation);
        
        if (participation.quizId === quizId) {
          setUserId(participation.participantId);
          // 세션 ID도 함께 저장
          if (participation.sessionId) {
            console.log('세션 ID 확인:', participation.sessionId);
            setSessionId(participation.sessionId); // 세션 ID 설정
          }
        } else {
          console.log('퀴즈 ID 불일치:', participation.quizId, quizId);
          navigate('/join');
        }
      } catch (err) {
        console.error('참가자 정보 파싱 오류:', err);
        navigate('/join');
      }
    } else {
      console.log('참가자 정보 없음');
      navigate('/join');
    }
  }, [quizId, navigate]);

  // 퀴즈 및 세션 데이터 로드
  useEffect(() => {
    if (!quizId || !userId) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 로컬스토리지에서 세션 ID 가져오기
        const storedParticipation = localStorage.getItem('quizParticipation');
        let sessionId = null;
        
        if (storedParticipation) {
          try {
            const participation = JSON.parse(storedParticipation);
            sessionId = participation.sessionId;
            console.log('로컬스토리지에서 가져온 세션 ID:', sessionId);
          } catch (err) {
            console.error('로컬스토리지 파싱 오류:', err);
          }
        }
        
        if (!sessionId) {
          setError('세션 정보가 없습니다. 다시 참여해주세요.');
          setLoading(false);
          navigate('/join');
          return;
        }
        
        // 1. 실제 세션 ID로 세션 정보 가져오기
        const sessionRef = ref(rtdb, `sessions/${sessionId}`);
        const sessionSnapshot = await get(sessionRef);
        
        if (!sessionSnapshot.exists()) {
          setError('존재하지 않는 세션입니다');
          setLoading(false);
          return;
        }
        
        const sessionInfo = sessionSnapshot.val();
        sessionInfo.id = sessionId;
        setSessionData(sessionInfo);
        
        // 세션 만료 확인
        if (sessionInfo.expiresAt && sessionInfo.expiresAt < Date.now()) {
          setError('세션이 만료되었습니다');
          setLoading(false);
          return;
        }
        
        // 2. 세션에 저장된 퀴즈 데이터 불러오기
        try {
          let quizData: Quiz | null = null;
          let answersData: any[] | null = null;
          
          // 먼저 RTDB에서 퀴즈 데이터 가져오기 시도
          try {
            quizData = await getQuizDataForClient(sessionId);
            if (quizData) {
              console.log('RTDB에서 퀴즈 데이터 로드 성공:', quizData);
              
              // 정답 데이터도 함께 가져오기
              try {
                answersData = await getAnswersForClient(sessionId);
                if (answersData) {
                  console.log('정답 데이터 로드 성공:', answersData);
                } else {
                  console.warn('정답 데이터를 찾을 수 없습니다');
                }
              } catch (answersError) {
                console.error('정답 데이터 로드 실패:', answersError);
              }
            }
          } catch (rtdbError) {
            console.error('RTDB에서 퀴즈 데이터 로드 실패:', rtdbError);
          }
          
          // RTDB에서 데이터를 찾지 못하면 Firestore에서 가져오기
          if (!quizData && sessionInfo.quizId && sessionInfo.hostId) {
            console.log('Firestore에서 퀴즈 데이터 로드 시도...');
            quizData = await getQuizById(sessionInfo.quizId, sessionInfo.hostId);
            console.log('Firestore에서 퀴즈 데이터 로드 성공:', quizData);
          }
          
          if (!quizData) {
            setError('퀴즈 정보를 찾을 수 없습니다');
            setLoading(false);
            return;
          }
          
          // 정답 데이터를 퀴즈 데이터에 통합
          if (answersData && Array.isArray(answersData)) {
            answersData.forEach((answer: any) => {
              if (quizData && quizData.questions[answer.questionIndex]) {
                const question = quizData.questions[answer.questionIndex];
                
                // 문제 형식별로 정답 정보 추가
                if (answer.type === 'multiple-choice') {
                  question.correctAnswer = answer.correctAnswer;
                } else if (answer.type === 'short-answer') {
                  question.correctAnswerText = answer.correctAnswerText;
                  question.additionalAnswers = answer.additionalAnswers || [];
                  question.answerMatchType = answer.answerMatchType || 'exact';
                } else if (answer.type === 'opinion') {
                  question.isAnonymous = answer.isAnonymous || false;
                }
              }
            });
          }
          
          // 로그라이크 모드에 적합한 퀴즈인지 확인
          const hasMultipleChoice = quizData.questions.some(q => q.type === 'multiple-choice');
          const hasShortAnswer = quizData.questions.some(q => q.type === 'short-answer');
          
          if (!hasMultipleChoice && !hasShortAnswer) {
            setError('이 퀴즈는 로그라이크 모드에 적합하지 않습니다. 객관식 또는 주관식 문제가 필요합니다.');
            setLoading(false);
            return;
          }
                  
        setQuiz(quizData);
          
        } catch (quizError) {
          console.error('퀴즈 데이터 로드 오류:', quizError);
          setError('퀴즈 정보를 불러오는데 실패했습니다');
          setLoading(false);
          return;
        }
        
        setTimeout(() => {
          setLoading(false);
        }, 500);
        
      } catch (err: any) {
        console.error('데이터 로딩 오류:', err);
        setError('데이터를 불러오는데 실패했습니다');
        setLoading(false);
      }
    };

    fetchData();
    
    // 실시간 세션 감시도 올바른 sessionId 사용
    const storedParticipation = localStorage.getItem('quizParticipation');
    let sessionId = null;
    
    if (storedParticipation) {
      try {
        const participation = JSON.parse(storedParticipation);
        sessionId = participation.sessionId;
      } catch (err) {
        console.error('로컬스토리지 파싱 오류:', err);
      }
    }
    
    if (sessionId) {
      // 세션 실시간 감시
      const sessionRef = ref(rtdb, `sessions/${sessionId}`);
      onValue(sessionRef, (snapshot) => {
        if (snapshot.exists()) {
          const sessionInfo = snapshot.val();
          sessionInfo.id = sessionId;
          setSessionData(sessionInfo);
          
          if (sessionInfo.expiresAt && sessionInfo.expiresAt < Date.now()) {
            setError('세션이 만료되었습니다');
            setTimeout(() => navigate('/join'), 3000);
          }
        } else {
          setError('세션이 종료되었습니다');
          setTimeout(() => navigate('/join'), 3000);
        }
      });
      
      return () => {
        off(sessionRef);
      };
    }
  }, [quizId, userId, navigate]);

  // 퀴즈 로드 후 기존 데이터 확인
  useEffect(() => {
    if (quiz && sessionId && userId) {
      checkExistingData().then(hasData => {
        if (hasData) {
          console.log('기존 완료된 게임 데이터가 발견되어 결과화면으로 이동합니다.');
        } else {
          console.log('새로운 게임을 시작합니다.');
        }
      });
    }
  }, [quiz, sessionId, userId, checkExistingData]);

  // 퀴즈 로드 완료 후 자동으로 게임 시작 또는 기존 데이터 처리
  useEffect(() => {
    if (quiz && sessionId && userId && !gameStarted && !gameCompleted) {
      if (hasExistingData) {
        console.log('기존 완료된 게임 데이터 감지 - 결과 화면으로 자동 이동');
        // 기존 데이터가 있는 경우, gameCompleted를 true로 설정하여 결과 화면으로 이동
        // 이는 useRoguelikeQuiz 훅에서 자동으로 처리됩니다.
      } else {
        console.log('퀴즈 로드 완료 - 자동으로 게임 시작');
        initializeGame();
      }
    }
  }, [quiz, sessionId, userId, gameStarted, gameCompleted, hasExistingData, initializeGame]);

  // 페이지 나가기/새로고침 경고 메시지
  useEffect(() => {
    // 게임이 진행 중일 때만 경고 표시
    const shouldShowWarning = gameStarted && !gameCompleted && !loading && !error;
    
    if (shouldShowWarning) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '우주 탐험이 진행 중입니다. 페이지를 나가면 진행 상황이 저장되지 않을 수 있습니다. 정말 나가시겠습니까?';
        return e.returnValue;
      };

      // beforeunload 이벤트 리스너 등록
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        // 컴포넌트 언마운트 시 이벤트 리스너 제거
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [gameStarted, gameCompleted, loading, error]);



  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center relative overflow-hidden">
        {/* 고급 우주 배경 효과 */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
        
        {/* 고급 배경 별빛 효과 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 15 }).map((_, i) => {
            const loadingStars = [
              { top: '10%', left: '15%', color: 'text-white', size: 8, delay: 0 },
              { top: '25%', right: '20%', color: 'text-cyan-400', size: 6, delay: 1 },
              { bottom: '30%', left: '25%', color: 'text-pink-400', size: 10, delay: 2 },
              { top: '50%', left: '40%', color: 'text-purple-400', size: 5, delay: 3 },
              { bottom: '20%', right: '30%', color: 'text-yellow-400', size: 9, delay: 4 },
              { top: '70%', left: '20%', color: 'text-indigo-300', size: 7, delay: 5 },
              { bottom: '50%', right: '15%', color: 'text-emerald-400', size: 4, delay: 6 },
              { top: '30%', right: '40%', color: 'text-rose-400', size: 8, delay: 7 },
              { bottom: '10%', left: '60%', color: 'text-orange-400', size: 6, delay: 8 },
              { top: '80%', right: '50%', color: 'text-violet-300', size: 11, delay: 9 },
              { top: '15%', left: '80%', color: 'text-teal-400', size: 5, delay: 10 },
              { bottom: '60%', left: '10%', color: 'text-amber-300', size: 7, delay: 11 },
              { top: '60%', right: '10%', color: 'text-lime-400', size: 9, delay: 12 },
              { bottom: '80%', right: '70%', color: 'text-sky-300', size: 6, delay: 13 },
              { top: '40%', left: '70%', color: 'text-fuchsia-400', size: 8, delay: 14 }
            ];
            const star = loadingStars[i];
            return (
              <div 
                key={i}
                className="absolute sparkle-animation-roguelike-quiz"
                style={{
                  ...star,
                  animationDelay: `${star.delay * 0.3}s`,
                  animationDuration: '4s'
                }}
              >
                <Sparkle 
                  size={star.size} 
                  className={`${star.color} opacity-60`}
                />
              </div>
            );
          })}
        </div>
        
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-6 drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]"></div>
          <div className="text-6xl mb-4 animate-pulse">🚀</div>
          <p className="text-cyan-300 text-xl font-bold drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]">우주 퀴즈를 불러오는 중...</p>
          <p className="text-purple-300 text-sm mt-2">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  // 오류 상태
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center relative overflow-hidden">
        {/* 고급 우주 배경 효과 */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
        
        {/* 고급 배경 별빛 효과 - 에러 테마 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => {
            const errorStars = [
              { top: '15%', left: '20%', color: 'text-red-400', size: 9, delay: 0 },
              { top: '30%', right: '25%', color: 'text-pink-400', size: 7, delay: 1.2 },
              { bottom: '35%', left: '30%', color: 'text-orange-400', size: 8, delay: 2.4 },
              { top: '60%', left: '45%', color: 'text-red-300', size: 6, delay: 3.6 },
              { bottom: '25%', right: '35%', color: 'text-rose-400', size: 10, delay: 4.8 },
              { top: '75%', left: '25%', color: 'text-amber-400', size: 5, delay: 6.0 },
              { bottom: '55%', right: '20%', color: 'text-yellow-400', size: 8, delay: 7.2 },
              { top: '40%', right: '45%', color: 'text-orange-300', size: 7, delay: 8.4 },
              { bottom: '15%', left: '65%', color: 'text-red-300', size: 6, delay: 9.6 },
              { top: '85%', right: '55%', color: 'text-pink-300', size: 9, delay: 10.8 },
              { top: '20%', left: '85%', color: 'text-rose-300', size: 5, delay: 12.0 },
              { bottom: '70%', left: '15%', color: 'text-amber-300', size: 8, delay: 13.2 }
            ];
            const star = errorStars[i];
            return (
              <div 
                key={i}
                className="absolute sparkle-animation-roguelike-quiz"
                style={{
                  ...star,
                  animationDelay: `${star.delay * 0.5}s`,
                  animationDuration: '5s'
                }}
              >
                <Sparkle 
                  size={star.size} 
                  className={`${star.color} opacity-40`}
                />
              </div>
            );
          })}
        </div>
        
        <div className="bg-gradient-to-br from-gray-800 via-red-800 to-gray-900 rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 border border-red-500/30 backdrop-blur-sm relative overflow-hidden">
          {/* 네온 글로우 효과 */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl animate-pulse"></div>
          
          <div className="text-center relative z-10">
            <div className="text-8xl mb-4 drop-shadow-[0_0_25px_rgba(239,68,68,0.8)]">❌</div>
            <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">우주 통신 오류</h2>
            <p className="text-red-300 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold text-lg
                       hover:from-purple-500 hover:to-pink-500 transition-all transform hover:scale-105
                       border border-purple-400/30 backdrop-blur-sm
                       drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]"
            >
              🚀 우주 기지로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 로그라이크 게임 세션을 QuizResults 형식으로 변환하는 함수
  const convertRoguelikeToQuizResults = () => {
    if (!userId) return null;

    // 기존 데이터가 있는 경우 별도 처리
    if (hasExistingData && !gameSession) {
      // 로컬스토리지에서 참가자 정보 가져오기
      let nickname = '나';
      let score = 0;
      
      try {
        const storedParticipation = localStorage.getItem('quizParticipation');
        if (storedParticipation) {
          const participation = JSON.parse(storedParticipation);
          if (participation.nickname) {
            nickname = participation.nickname;
          }
        }
      } catch (err) {
        console.error('닉네임 가져오기 실패:', err);
      }

      // 답변 데이터에서 점수 계산
      if (answers && answers.length > 0) {
        score = answers.reduce((total, answer) => total + (answer.points || 0), 0);
      }

      const participant = {
        id: userId,
        quizId: quiz?.id || '',
        nickname,
        score,
        answers: answers.map(answer => ({
          questionIndex: answer.questionIndex,
          answer: answer.answerIndex?.toString() || answer.answerText || '',
          isCorrect: answer.isCorrect,
          points: answer.points,
          answeredAt: new Date(answer.answeredAt).toISOString()
        })),
        joinedAt: new Date().toISOString()
      };

      const rankings = [{
        id: userId,
        name: nickname,
        score,
        isCurrentUser: true
      }];

      return { participant, rankings };
    }

    // 기존 gameSession이 있는 경우 처리
    if (!gameSession) return null;

    // 세션에서 현재 사용자의 실제 참가자 데이터 가져오기
    const currentParticipant = participants && participants[userId];
    const actualScore = currentParticipant?.score || 0; // 세션에 저장된 실제 점수 사용

    // 참가자 정보 생성
    const participant = {
      id: userId,
      quizId: quiz?.id || '',
      nickname: '나', // 기본 닉네임, 실제로는 로컬스토리지에서 가져올 수 있음
      score: actualScore, // 실제 참가자 점수 사용
      answers: gameSession.stages.flatMap(stage => 
        // 각 스테이지의 문제들에 대한 답변을 변환
        stage.questions.map(questionIndex => {
          // 해당 문제에 대한 답변 찾기
          const answer = answers.find((a: any) => a.questionIndex === questionIndex);
          return answer ? {
            questionIndex: answer.questionIndex,
            answer: answer.answerIndex?.toString() || answer.answerText || '',
            isCorrect: answer.isCorrect,
            points: answer.points,
            answeredAt: new Date(answer.answeredAt).toISOString()
          } : null;
        }).filter((item): item is NonNullable<typeof item> => item !== null)
      ),
      joinedAt: new Date(gameSession.startedAt || Date.now()).toISOString()
    };

    // 닉네임을 로컬스토리지에서 가져오기
    try {
      const storedParticipation = localStorage.getItem('quizParticipation');
      if (storedParticipation) {
        const participation = JSON.parse(storedParticipation);
        if (participation.nickname) {
          participant.nickname = participation.nickname;
        }
      }
    } catch (err) {
      console.error('닉네임 가져오기 실패:', err);
    }

    // 세션의 모든 참가자를 랭킹에 포함 (세션이 있는 경우)
    let rankings = [];
    
    if (currentSession && participants && Object.keys(participants).length > 0) {
      // 세션 참가자들이 있는 경우 모든 참가자 포함
      rankings = Object.entries(participants).map(([id, participant]: [string, any]) => ({
        id,
        name: participant.name || '익명',
        score: participant.score || 0,
        isCurrentUser: id === userId
      }));
    } else {
      // 개인 플레이인 경우 본인만 포함
      rankings = [{
        id: userId,
        name: participant.nickname,
        score: actualScore, // 실제 점수 사용
        isCurrentUser: true
      }];
    }

    return {
      participant,
      rankings
    };
  };

  // 퀴즈가 없는 경우
  if (!quiz) {
    return null;
  }

  // 게임 시작 전 - 자동으로 시작되거나 기존 데이터 처리 중
  if (!gameStarted && !gameCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center relative overflow-hidden">
        {/* 고급 우주 배경 효과 */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
        
        {/* 고급 배경 별빛 효과 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 18 }).map((_, i) => {
            const prepStars = [
              { top: '8%', left: '12%', color: 'text-white', size: 10, delay: 0 },
              { top: '22%', right: '18%', color: 'text-cyan-400', size: 8, delay: 0.7 },
              { bottom: '28%', left: '22%', color: 'text-purple-400', size: 9, delay: 1.4 },
              { top: '48%', left: '38%', color: 'text-indigo-400', size: 6, delay: 2.1 },
              { bottom: '22%', right: '28%', color: 'text-blue-400', size: 11, delay: 2.8 },
              { top: '68%', left: '18%', color: 'text-violet-300', size: 7, delay: 3.5 },
              { bottom: '48%', right: '12%', color: 'text-pink-400', size: 5, delay: 4.2 },
              { top: '32%', right: '38%', color: 'text-rose-400', size: 8, delay: 4.9 },
              { bottom: '12%', left: '58%', color: 'text-teal-400', size: 6, delay: 5.6 },
              { top: '78%', right: '48%', color: 'text-emerald-300', size: 10, delay: 6.3 },
              { top: '18%', left: '78%', color: 'text-cyan-300', size: 5, delay: 7.0 },
              { bottom: '58%', left: '8%', color: 'text-sky-400', size: 9, delay: 7.7 },
              { top: '58%', right: '8%', color: 'text-indigo-300', size: 7, delay: 8.4 },
              { bottom: '78%', right: '68%', color: 'text-purple-300', size: 6, delay: 9.1 },
              { top: '38%', left: '68%', color: 'text-blue-300', size: 8, delay: 9.8 },
              { bottom: '38%', left: '48%', color: 'text-violet-400', size: 4, delay: 10.5 },
              { top: '88%', left: '38%', color: 'text-cyan-200', size: 9, delay: 11.2 },
              { bottom: '8%', right: '8%', color: 'text-indigo-200', size: 7, delay: 11.9 }
            ];
            const star = prepStars[i];
            return (
              <div 
                key={i}
                className="absolute sparkle-animation-roguelike-quiz"
                style={{
                  ...star,
                  animationDelay: `${star.delay}s`,
                  animationDuration: '6s'
                }}
              >
                <Sparkle 
                  size={star.size} 
                  className={`${star.color} opacity-65`}
                />
              </div>
            );
          })}
        </div>
        
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-6 drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]"></div>
          {hasExistingData ? (
            <>
              <div className="text-6xl mb-4 animate-pulse">📊</div>
              <p className="text-cyan-300 text-xl font-bold drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]">우주 탐험 기록을 불러오는 중...</p>
              <p className="text-purple-300 text-sm mt-2">이전 탐험 결과를 확인하고 있습니다</p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4 animate-pulse">🗺️</div>
              <p className="text-cyan-300 text-xl font-bold drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]">우주 탐험 맵을 준비하는 중...</p>
              <p className="text-purple-300 text-sm mt-2">잠시만 기다려주세요</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // 게임 완료 후
  if (gameCompleted && (gameSession || hasExistingData)) {
    const resultsData = convertRoguelikeToQuizResults();
    
    if (resultsData && quiz) {
      return (
        <QuizResults
          quiz={quiz}
          participant={resultsData.participant}
          rankings={resultsData.rankings}
          isLoadingRankings={false}
          onResetQuiz={() => {
            resetGameWithAttemptSave();
          }}
          inviteCode={currentSession?.code || undefined}
          canRetry={true}
          sessionId={sessionId || undefined}
          currentUserId={userId || undefined}
        />
      );
    }
    
    // resultsData가 없는 경우 오류 처리
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center relative overflow-hidden">
        {/* 고급 우주 배경 효과 */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
        
        {/* 고급 배경 별빛 효과 - 결과 오류 테마 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 10 }).map((_, i) => {
            const resultErrorStars = [
              { top: '20%', left: '25%', color: 'text-red-400', size: 8, delay: 0 },
              { top: '40%', right: '30%', color: 'text-orange-400', size: 6, delay: 1.5 },
              { bottom: '40%', left: '35%', color: 'text-pink-400', size: 9, delay: 3.0 },
              { top: '70%', left: '50%', color: 'text-red-300', size: 5, delay: 4.5 },
              { bottom: '30%', right: '40%', color: 'text-rose-400', size: 10, delay: 6.0 },
              { top: '80%', left: '30%', color: 'text-amber-400', size: 7, delay: 7.5 },
              { bottom: '60%', right: '25%', color: 'text-yellow-400', size: 4, delay: 9.0 },
              { top: '50%', right: '50%', color: 'text-orange-300', size: 8, delay: 10.5 },
              { bottom: '20%', left: '70%', color: 'text-red-300', size: 6, delay: 12.0 },
              { top: '90%', right: '60%', color: 'text-pink-300', size: 7, delay: 13.5 }
            ];
            const star = resultErrorStars[i];
            return (
              <div 
                key={i}
                className="absolute sparkle-animation-roguelike-quiz"
                style={{
                  ...star,
                  animationDelay: `${star.delay * 0.4}s`,
                  animationDuration: '4.5s'
                }}
              >
                <Sparkle 
                  size={star.size} 
                  className={`${star.color} opacity-35`}
                />
              </div>
            );
          })}
        </div>
        
        <div className="bg-gradient-to-br from-gray-800 via-red-800 to-gray-900 rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 border border-red-500/30 backdrop-blur-sm relative overflow-hidden">
          {/* 네온 글로우 효과 */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl animate-pulse"></div>
          
          <div className="text-center relative z-10">
            <div className="text-8xl mb-4 drop-shadow-[0_0_25px_rgba(239,68,68,0.8)]">❌</div>
            <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">결과 처리 오류</h2>
            <p className="text-red-300 mb-6">우주 게임 결과를 처리하는 중 오류가 발생했습니다.</p>
            <button
              onClick={() => navigate('/')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold text-lg
                       hover:from-purple-500 hover:to-pink-500 transition-all transform hover:scale-105
                       border border-purple-400/30 backdrop-blur-sm
                       drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] hover:drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]"
            >
              🚀 우주 기지로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 게임 진행 중
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black">
      {gameSession && mapNodes && mapEdges && mapStageConnections && (
        <>
          {gameSession.currentGameState === 'map-selection' && (
            <RoguelikeMapSelection
              pathType={mapStageConnections[gameSession.currentPlayerNodeId || initialPlayerPosition]?.length > 1 ? 'fork' : 'single'}
              availablePaths={[]}
              onPathSelect={(nodeId: string) => {
                  selectMapPath(nodeId);
              }}
              mapNodes={mapNodes}
              mapEdges={mapEdges}
              mapStageConnections={mapStageConnections}
              initialPlayerPosition={gameSession.currentPlayerNodeId || initialPlayerPosition}
              gameSession={gameSession}
            />
          )}

          {(gameSession.currentGameState === 'question' || 
            gameSession.currentGameState === 'reward-box' || 
            gameSession.currentGameState === 'stage-active') && currentStage && quiz && (
            <RoguelikeStageView
              quiz={quiz}
              gameSession={gameSession}
              currentStage={currentStage}
              currentQuestionIndex={currentQuestionIndex}
              currentSession={currentSession}
              participants={participants}
              totalStages={totalStages}
              sessionId={currentSession?.id || undefined}
              userId={userId || undefined}
              onSubmitAnswer={submitAnswer}
              onSelectBuff={() => {}}
              onSpinRoulette={() => ({ multiplier: 1.0, bonusPoints: 0, message: 'Default' })}
              onSelectRewardBox={selectRewardBox}
              onGameComplete={handleGameComplete}
            />
          )}
        </>
      )}
    </div>
  );
};

export default RoguelikeQuiz; 