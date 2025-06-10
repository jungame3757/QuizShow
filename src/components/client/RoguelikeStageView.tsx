import React, { useState, useEffect } from 'react';
import { Sparkle } from 'lucide-react';
import { Quiz, Question, Session, RealtimeParticipant } from '../../types';
import { RoguelikeGameSession, RoguelikeStage, RouletteResult, RoguelikeStageType } from '../../types/roguelike';
import RoguelikeNormalStage from '../../components/client/stages/RoguelikeNormalStage';
import RoguelikeEliteStage from '../../components/client/stages/RoguelikeEliteStage';
import RoguelikeCampfireStage from '../../components/client/stages/RoguelikeCampfireStage';
import RoguelikeRouletteStage from '../../components/client/stages/RoguelikeRouletteStage';
import RoguelikeRewardBox from '../../components/client/stages/RoguelikeRewardBox';
import QuizTimer from './QuizTimer';

interface RoguelikeStageViewProps {
  quiz: Quiz;
  gameSession: RoguelikeGameSession;
  currentStage: RoguelikeStage | null;
  currentQuestionIndex: number;
  currentSession?: Session | null;
  participants?: Record<string, RealtimeParticipant>;
  totalStages: number;
  sessionId?: string; // RTDB 업데이트용
  userId?: string; // RTDB 업데이트용
  onSubmitAnswer: (answerIndex?: number, answerText?: string, timeSpent?: number, eliteAnswers?: Array<{questionIndex: number, answer: string | number, isCorrect: boolean, questionType: 'multiple-choice' | 'short-answer', timeSpent: number}>) => Promise<void>;
  onSelectBuff: (buffId: string) => void;
  onSpinRoulette: () => RouletteResult;
  onSelectRewardBox: (points: number) => void;
  onGameComplete?: () => void;
}

const RoguelikeStageView: React.FC<RoguelikeStageViewProps> = ({
  quiz,
  gameSession,
  currentStage,
  currentQuestionIndex,
  totalStages,
  sessionId,
  userId,
  onSubmitAnswer,
  onSelectBuff,
  onSpinRoulette,
  onSelectRewardBox,
  onGameComplete,
}) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerPercentage, setTimerPercentage] = useState(100);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [isTimerPaused, setIsTimerPaused] = useState(false); // 타이머 일시정지 상태 추가

  // 타이머 설정
  useEffect(() => {
    if (currentStage?.type === 'normal') {
      setTimeLeft(60); // 일반 문제는 60초
      setTimerPercentage(100);
    } else if (currentStage?.type === 'elite') {
      setTimeLeft(60); // 엘리트 문제는 60초
      setTimerPercentage(100);
    } else {
      setTimeLeft(null); // 모닥불, 룰렛 스테이지는 제한시간 없음
      setTimerPercentage(100);
    }
    setStartTime(Date.now());
  }, [currentStage, currentQuestionIndex]);

  // 타이머 동작 - 일시정지 기능 추가
  useEffect(() => {
    if (!timeLeft || timeLeft <= 0 || isTimerPaused) return; // 일시정지 상태에서는 타이머 동작 안함

    const initialTimeLimit = currentStage?.type === 'normal' ? 60 : 60;
    const updateInterval = 100; // 100ms마다 업데이트
    const decrementPerUpdate = 100 / (initialTimeLimit * 1000 / updateInterval);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0.1) {
          // 시간 종료
          handleTimeUp();
          return 0;
        }
        return prev - (updateInterval / 1000);
      });
      
      setTimerPercentage(prev => {
        const newValue = prev - decrementPerUpdate;
        return newValue < 0 ? 0 : newValue;
      });
    }, updateInterval);

    return () => clearInterval(timer);
  }, [timeLeft, currentStage, isTimerPaused]); // isTimerPaused 의존성 추가

  const handleTimeUp = async () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    await onSubmitAnswer(undefined, undefined, timeSpent);
  };

  const handleAnswer = async (answerIndex?: number, answerText?: string) => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    await onSubmitAnswer(answerIndex, answerText, timeSpent);
  };

  // 타이머 제어 함수들
  const pauseTimer = () => {
    console.log('타이머 일시정지');
    setIsTimerPaused(true);
  };

  const resumeTimer = () => {
    console.log('타이머 재개');
    setIsTimerPaused(false);
  };

  const getCurrentQuestion = (): Question | null => {
    if (!currentStage || currentStage.questions.length === 0 || currentQuestionIndex < 0 || currentQuestionIndex >= currentStage.questions.length) {
        // currentStage.questions 배열에서 실제 문제 인덱스를 가져오도록 수정
        return null;
    }
    const actualQuestionIndex = currentStage.questions[currentQuestionIndex];
    return quiz.questions[actualQuestionIndex] || null;
  };

  // 엘리트 스테이지용 3개 문제 가져오기
  const getEliteQuestions = (): Question[] => {
    if (!currentStage || currentStage.type !== 'elite') return [];
    return currentStage.questions.slice(0, 3).map(qIndex => quiz.questions[qIndex]).filter(Boolean);
  };

  const currentQuestion = getCurrentQuestion();
  const eliteQuestions = getEliteQuestions();

  // 엘리트 스테이지 완료 핸들러
  const handleEliteStageComplete = async (
    success: boolean, 
    correctCount: number, 
    lastQuestionAnswerData?: {
      questionIndex: number;
      answer: string | number;
      isCorrect: boolean;
      questionType: 'multiple-choice' | 'short-answer';
      timeSpent: number;
    } | null
  ) => {
    // 엘리트 스테이지 완료 처리 - 마지막 문제 답변 데이터도 함께 전달
    const eliteAnswers = lastQuestionAnswerData ? [lastQuestionAnswerData] : undefined;
    
    await onSubmitAnswer(
      success ? 1 : 0, 
      `엘리트 스테이지 ${success ? '성공' : '실패'}: ${correctCount}문제 정답`,
      0,
      eliteAnswers
    );
  };

  // 모닥불 스테이지 건너뛰기 핸들러
  const handleCampfireSkip = () => {
    // 데이터 저장 없이 바로 다음 스테이지(맵 선택)로 이동
    onSubmitAnswer(-1, "CAMPFIRE_SKIP", 0); // 특별한 식별자로 건너뛰기 표시
  };

  // 진행률 계산
  const getProgressInfo = () => {
    const currentMapNodeId = gameSession.currentPlayerNodeId;
    
    const currentStageIndexInGame = gameSession.stages.findIndex(s => s === currentStage); 
    const totalStagesInGame = gameSession.stages.length;
    
    let questionProgress = { currentQuestionInStage: 0, totalQuestionsInStage: 0 };
    if (currentStage) {
        const qIdx = currentStage.questions.indexOf(currentQuestionIndex); 
        questionProgress.currentQuestionInStage = qIdx >= 0 ? qIdx + 1 : 1;
        questionProgress.totalQuestionsInStage = currentStage.questions.length;
    }

    const displayStageNumber = currentStageIndexInGame >= 0 ? currentStageIndexInGame + 1 : 
                               (typeof currentMapNodeId === 'string' ? parseInt(currentMapNodeId.replace('node-', '')) : 0) +1;

    return {
      currentStageDisplay: displayStageNumber,
      totalStagesDisplay: totalStagesInGame > 0 ? totalStagesInGame : totalStages, 
      ...questionProgress,
      overallProgress: totalStagesInGame > 0 ? Math.round(((currentStageIndexInGame + (questionProgress.currentQuestionInStage / Math.max(questionProgress.totalQuestionsInStage, 1))) / Math.max(totalStagesInGame, 1)) * 100) : 0
    };
  };

  const progressInfo = getProgressInfo();

  // CSS 애니메이션 스타일 추가
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      /* 페이지 배경 별 애니메이션 */
      .sparkle-animation-stage-view {
        opacity: 0;
        transform: scale(0);
        animation: sparkleStageViewEffect infinite;
      }
      
      @keyframes sparkleStageViewEffect {
        0% {
          opacity: 0;
          transform: scale(0) rotate(0deg);
        }
        15% {
          opacity: 0.4;
          transform: scale(0.7) rotate(30deg);
        }
        35% {
          opacity: 0.8;
          transform: scale(1.1) rotate(90deg);
        }
        55% {
          opacity: 1;
          transform: scale(1.3) rotate(150deg);
        }
        75% {
          opacity: 0.7;
          transform: scale(1) rotate(210deg);
        }
        90% {
          opacity: 0.3;
          transform: scale(0.6) rotate(270deg);
        }
        100% {
          opacity: 0;
          transform: scale(0) rotate(360deg);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-start justify-center p-4 pt-8 relative overflow-hidden">
      {/* 고급 우주 배경 효과 */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
      
      {/* 고급 배경 별빛 효과 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => {
          const stageViewStars = [
            { top: '8%', left: '12%', color: 'text-white', size: 10, delay: 0 },
            { top: '20%', right: '15%', color: 'text-cyan-400', size: 7, delay: 0.8 },
            { bottom: '25%', left: '18%', color: 'text-pink-400', size: 9, delay: 1.6 },
            { top: '45%', left: '30%', color: 'text-yellow-400', size: 5, delay: 2.4 },
            { bottom: '30%', right: '20%', color: 'text-purple-400', size: 12, delay: 3.2 },
            { top: '15%', left: '60%', color: 'text-indigo-300', size: 6, delay: 4.0 },
            { bottom: '50%', left: '10%', color: 'text-emerald-400', size: 8, delay: 4.8 },
            { top: '70%', right: '30%', color: 'text-rose-400', size: 4, delay: 5.6 },
            { bottom: '15%', left: '50%', color: 'text-orange-400', size: 7, delay: 6.4 },
            { top: '35%', right: '50%', color: 'text-violet-300', size: 10, delay: 7.2 },
            { bottom: '40%', left: '75%', color: 'text-teal-400', size: 5, delay: 8.0 },
            { top: '80%', left: '25%', color: 'text-amber-300', size: 9, delay: 8.8 },
            { top: '55%', right: '10%', color: 'text-lime-400', size: 6, delay: 9.6 },
            { bottom: '65%', left: '55%', color: 'text-sky-300', size: 8, delay: 10.4 },
            { top: '10%', right: '80%', color: 'text-fuchsia-400', size: 7, delay: 11.2 },
            { bottom: '10%', right: '60%', color: 'text-blue-300', size: 5, delay: 12.0 },
            { top: '60%', left: '8%', color: 'text-red-300', size: 4, delay: 12.8 },
            { bottom: '75%', right: '12%', color: 'text-green-400', size: 10, delay: 13.6 },
            { top: '85%', left: '70%', color: 'text-yellow-300', size: 7, delay: 14.4 },
            { top: '25%', left: '85%', color: 'text-cyan-300', size: 6, delay: 15.2 }
          ];
          const star = stageViewStars[i];
          return (
            <div 
              key={i}
              className="absolute sparkle-animation-stage-view"
              style={{
                ...star,
                animationDelay: `${star.delay}s`,
                animationDuration: '5s'
              }}
            >
              <Sparkle 
                size={star.size} 
                className={`${star.color} opacity-50`}
              />
            </div>
          );
        })}
      </div>
      
      <div className="max-w-4xl w-full relative z-10">
        {/* 문제 풀이 단계 - 항상 기본 화면으로 표시 */}
        {(gameSession.currentGameState === 'question' || gameSession.currentGameState === 'stage-active' || gameSession.currentGameState === 'reward-box') && currentStage && (
          <>
            {currentStage.type === 'normal' && currentQuestion && (
              <RoguelikeNormalStage
                question={currentQuestion}
                questionNumber={progressInfo.currentQuestionInStage}
                totalQuestions={progressInfo.totalQuestionsInStage}
                timeLeft={timeLeft}
                timerPercentage={timerPercentage}
                onAnswer={handleAnswer}
                gameSession={gameSession}
                onPauseTimer={pauseTimer}
                onResumeTimer={resumeTimer}
              />
            )}

            {currentStage.type === 'elite' && eliteQuestions.length > 0 && (
              <RoguelikeEliteStage
                questions={eliteQuestions}
                questionIndices={currentStage.questions.slice(0, 3)}
                timeLeft={timeLeft}
                timerPercentage={timerPercentage}
                onAnswer={onSubmitAnswer}
                onStageComplete={handleEliteStageComplete}
                gameSession={gameSession}
                onPauseTimer={pauseTimer}
                onResumeTimer={resumeTimer}
              />
            )}

            {currentStage.type === 'campfire' && currentQuestion && (
              <RoguelikeCampfireStage
                question={currentQuestion}
                onAnswer={handleAnswer}
                onSkip={handleCampfireSkip}
                gameSession={gameSession}
              />
            )}
          </>
        )}

        {/* 룰렛 스테이지 */}
        {currentStage?.type === 'roulette' && (
          <RoguelikeRouletteStage
            gameSession={gameSession}
            onSpinRoulette={onSpinRoulette}
            sessionId={sessionId}
            userId={userId}
            onComplete={onGameComplete}
          />
        )}
      </div>

      {/* 보상 상자 오버레이 - 기존 화면 위에 표시 */}
      {gameSession.currentGameState === 'reward-box' && gameSession.waitingForReward && currentStage && currentStage.type !== 'start' && (
        <RoguelikeRewardBox
          stageType={currentStage.type as Exclude<RoguelikeStageType, 'start'>}
          onBoxSelect={onSelectRewardBox}
          gameSession={gameSession}
          isOpen={true}
        />
      )}
    </div>
  );
};

export default RoguelikeStageView; 