import React, { useState, useEffect } from 'react';
import { Quiz, Question, Session, RealtimeParticipant } from '../../types';
import { RoguelikeGameSession, RoguelikeStage, RouletteResult, RoguelikeStageType } from '../../types/roguelike';
import RoguelikeNormalStage from '../../components/client/stages/RoguelikeNormalStage';
import RoguelikeEliteStage from '../../components/client/stages/RoguelikeEliteStage';
import RoguelikeCampfireStage from '../../components/client/stages/RoguelikeCampfireStage';
import RoguelikeRouletteStage from '../../components/client/stages/RoguelikeRouletteStage';
import RoguelikeRewardBox from '../../components/client/stages/RoguelikeRewardBox';

interface RoguelikeStageViewProps {
  quiz: Quiz;
  gameSession: RoguelikeGameSession;
  currentStage: RoguelikeStage | null;
  currentQuestionIndex: number;
  currentSession?: Session | null;
  participants?: Record<string, RealtimeParticipant>;
  totalStages: number;
  onSubmitAnswer: (answerIndex?: number, answerText?: string, timeSpent?: number) => Promise<void>;
  onSelectBuff: (buffId: string) => void;
  onSpinRoulette: () => RouletteResult;
  onSelectRewardBox: (points: number) => void;
}

const RoguelikeStageView: React.FC<RoguelikeStageViewProps> = ({
  quiz,
  gameSession,
  currentStage,
  currentQuestionIndex,
  totalStages,
  onSubmitAnswer,
  onSelectBuff,
  onSpinRoulette,
  onSelectRewardBox,
}) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // 타이머 설정
  useEffect(() => {
    if (currentStage?.type === 'normal') {
      setTimeLeft(60); // 일반 문제는 60초
    } else if (currentStage?.type === 'elite') {
      setTimeLeft(120); // 엘리트 문제는 120초
    } else {
      setTimeLeft(null); // 모닥불, 룰렛 스테이지는 제한시간 없음
    }
    setStartTime(Date.now());
  }, [currentStage, currentQuestionIndex]);

  // 타이머 동작
  useEffect(() => {
    if (!timeLeft || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev && prev > 1) {
          return prev - 1;
        } else {
          // 시간 종료
          handleTimeUp();
          return 0;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleTimeUp = async () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    await onSubmitAnswer(undefined, undefined, timeSpent);
  };

  const handleAnswer = async (answerIndex?: number, answerText?: string) => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    await onSubmitAnswer(answerIndex, answerText, timeSpent);
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
  const handleEliteStageComplete = async (success: boolean, correctCount: number) => {
    // 엘리트 스테이지 완료 처리
    await onSubmitAnswer(success ? 1 : 0, `엘리트 스테이지 ${success ? '성공' : '실패'}: ${correctCount}문제 정답`);
  };

  // 모닥불 스테이지 건너뛰기 핸들러
  const handleCampfireSkip = async () => {
    await onSubmitAnswer(undefined, "건너뛰기");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* 문제 풀이 단계 - 항상 기본 화면으로 표시 */}
        {(gameSession.currentGameState === 'question' || gameSession.currentGameState === 'stage-active' || gameSession.currentGameState === 'reward-box') && currentStage && (
          <>
            {currentStage.type === 'normal' && currentQuestion && (
              <RoguelikeNormalStage
                question={currentQuestion}
                questionNumber={progressInfo.currentQuestionInStage}
                totalQuestions={progressInfo.totalQuestionsInStage}
                timeLeft={timeLeft}
                onAnswer={handleAnswer}
                gameSession={gameSession}
              />
            )}

            {currentStage.type === 'elite' && eliteQuestions.length > 0 && (
              <RoguelikeEliteStage
                questions={eliteQuestions}
                questionIndices={currentStage.questions.slice(0, 3)}
                timeLeft={timeLeft}
                onAnswer={onSubmitAnswer}
                onStageComplete={handleEliteStageComplete}
                gameSession={gameSession}
              />
            )}

            {currentStage.type === 'campfire' && currentQuestion && (
              <RoguelikeCampfireStage
                question={currentQuestion}
                onAnswer={handleAnswer}
                onSelectBuff={onSelectBuff}
                onSkip={handleCampfireSkip}
                onReward={(rewardType: 'health' | 'score' | 'streak') => {
                  console.log('Selected reward:', rewardType);
                  // 보상 타입에 따른 처리를 여기에 추가
                  handleAnswer(undefined, `보상 선택: ${rewardType}`);
                }}
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