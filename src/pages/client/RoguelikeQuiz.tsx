import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import copy from 'clipboard-copy';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';
import { getQuizById } from '../../firebase/quizService';
import { getQuizDataForClient, getAnswersForClient } from '../../firebase/sessionService';
import { ref, get, onValue, off } from 'firebase/database';
import { rtdb } from '../../firebase/config';
import { Quiz } from '../../types';
import { useRoguelikeQuiz } from '../../hooks/useRoguelikeQuiz';
import RoguelikeStageView from '../../components/client/RoguelikeStageView';
import RoguelikeGameStart from '../../components/client/RoguelikeGameStart';
import QuizResults from '../../components/client/QuizResults';
import RoguelikeMapSelection from '../../components/client/stages/RoguelikeMapSelection';

const RoguelikeQuiz: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { 
    createSessionForQuiz, 
    currentSession, 
    participants, 
    cleanupSession,
    resetSessionState 
  } = useSession();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [sessionCreated, setSessionCreated] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // 세션 ID 상태 추가
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const {
    gameSession,
    currentStage,
    currentQuestionIndex,
    gameStarted,
    gameCompleted,
    answers,
    totalStages,
    initializeGame,
    submitAnswer,
    selectTemporaryBuff,
    spinRoulette,
    resetGame,
    calculateActivityBonus,
    selectMapPath,
    selectRewardBox,
    mapNodes,
    mapEdges,
    mapStageConnections,
    initialPlayerPosition,
    currentPlayerNodeId
  } = useRoguelikeQuiz(quiz, currentUser?.uid || '', sessionId || undefined);

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
          setSessionCreated(true);
          
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

  // 세션 생성 핸들러
  const handleCreateSession = async () => {
    if (!quizId || !currentUser || !quiz) return;
    
    try {
      setCreatingSession(true);
      setError(null);
      
      const sessionOptions = {
        expiresIn: 24 * 60 * 60 * 1000, // 24시간
        randomizeQuestions: false,
        singleAttempt: false, // 로그라이크는 여러 번 시도 가능
        questionTimeLimit: 60, // 로그라이크는 시간 제한 여유롭게
        gameMode: 'roguelike' as const
      };
      
      const sessionId = await createSessionForQuiz(quizId, sessionOptions, quiz);
      console.log('로그라이크 세션 생성 완료:', sessionId);
      
      setSessionCreated(true);
    } catch (err) {
      console.error('세션 생성 실패:', err);
      setError(err instanceof Error ? err.message : '세션 생성에 실패했습니다.');
    } finally {
      setCreatingSession(false);
    }
  };

  // 게임 시작 핸들러
  const handleStartGame = async () => {
    if (!sessionCreated) {
      await handleCreateSession();
    }
    initializeGame();
  };

  // 게임 종료 시 세션 정리
  const handleGameEnd = async () => {
    if (currentSession) {
      try {
        await cleanupSession(currentSession.id);
        resetSessionState();
      } catch (err) {
        console.error('세션 정리 실패:', err);
      }
    }
    setSessionCreated(false);
  };

  // 초대 코드 복사
  const copyInviteCode = () => {
    if (currentSession?.code) {
      copy(currentSession.code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // 초대 URL 복사
  const copyInviteUrl = () => {
    if (currentSession?.code) {
      const baseUrl = window.location.origin;
      const joinUrl = `${baseUrl}/join?code=${currentSession.code}`;
      copy(joinUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // 로그라이크 게임 세션을 QuizResults 형식으로 변환하는 함수
  const convertRoguelikeToQuizResults = () => {
    if (!gameSession || !userId) return null;

    // 참가자 정보 생성 (로그라이크는 개인 게임이므로 본인만)
    const participant = {
      id: userId,
      quizId: quiz?.id || '',
      nickname: '나', // 기본 닉네임, 실제로는 로컬스토리지에서 가져올 수 있음
      score: gameSession.finalScore,
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
      joinedAt: new Date(gameSession.startedAt).toISOString()
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

    // 랭킹 정보 생성 (로그라이크는 개인 게임이므로 본인만 포함)
    const rankings = [{
      id: userId,
      name: participant.nickname,
      score: gameSession.finalScore,
      isCurrentUser: true
    }];

    return {
      participant,
      rankings
    };
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">퀴즈를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 오류 상태
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">오류가 발생했습니다</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 퀴즈가 없는 경우
  if (!quiz) {
    return null;
  }

  // 게임 시작 전
  if (!gameStarted) {
    return (
      <RoguelikeGameStart
        quiz={quiz}
        onStartGame={handleStartGame}
        onBack={() => navigate('/')}
        currentSession={currentSession}
        participants={participants}
        creatingSession={creatingSession}
        sessionCreated={sessionCreated}
        isCopied={isCopied}
        onCopyInviteCode={copyInviteCode}
        onCopyInviteUrl={copyInviteUrl}
      />
    );
  }

  // 게임 완료 후
  if (gameCompleted && gameSession) {
    const resultsData = convertRoguelikeToQuizResults();
    
    if (resultsData && quiz) {
      return (
        <QuizResults
          quiz={quiz}
          participant={resultsData.participant}
          rankings={resultsData.rankings}
          isLoadingRankings={false}
          onResetQuiz={() => {
            resetGame();
            initializeGame();
          }}
          inviteCode={currentSession?.code}
          canRetry={true}
        />
      );
    }
    
    // resultsData가 없는 경우 오류 처리
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">결과 처리 오류</h2>
            <p className="text-gray-600 mb-6">게임 결과를 처리하는 중 오류가 발생했습니다.</p>
            <button
              onClick={() => navigate('/')}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 게임 진행 중
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
              onSubmitAnswer={submitAnswer}
              onSelectBuff={selectTemporaryBuff}
              onSpinRoulette={spinRoulette}
              onSelectRewardBox={selectRewardBox}
            />
          )}
        </>
      )}
    </div>
  );
};

export default RoguelikeQuiz; 