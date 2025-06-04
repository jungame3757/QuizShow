import React, { useState, useEffect } from 'react';
import { Sparkle } from 'lucide-react';
import { Question } from '../../../types';
import { RoguelikeGameSession } from '../../../types/roguelike';
import QuizQuestion from '../QuizQuestion';

interface RoguelikeCampfireStageProps {
  question: Question;
  onAnswer: (answerIndex?: number, answerText?: string) => Promise<void>;
  onSkip: () => void;
  gameSession?: RoguelikeGameSession;
}

// 보상 박스 인터페이스 제거 (RoguelikeRewardBox에서 처리)

const RoguelikeCampfireStage: React.FC<RoguelikeCampfireStageProps> = ({
  question,
  onAnswer,
  onSkip,
  gameSession
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submittedOpinion, setSubmittedOpinion] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isSkipped, setIsSkipped] = useState(false);
  const [serverValidationResult, setServerValidationResult] = useState<{ isCorrect: boolean; points: number } | null>(null);
  
  // 게임 상태 정보 계산
  const gameStats = React.useMemo(() => {
    if (!gameSession) return null;
    
    return {
      currentScore: gameSession.baseScore || 0,
      correctAnswers: gameSession.correctAnswers || 0,
      totalQuestions: gameSession.totalQuestions || 0,
      currentStreak: gameSession.currentStreak || 0,
      maxStreak: gameSession.maxStreak || 0,
    };
  }, [gameSession]);

  const handleSelectAnswer = async (answer: string, index: number) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setSelectedAnswer(answer);
    setSubmittedOpinion(answer);
    setShowResult(true);

    // 의견 문제는 항상 정답으로 처리
    setServerValidationResult({ isCorrect: true, points: 25 }); // 의견 제출 보상 점수

    console.log('모닥불 스테이지 의견 제출:', {
      questionId: question?.id,
      answer,
    });

    // 의견 제출 완료 후 onAnswer 호출하여 보상 상자로 이동
    setTimeout(async () => {
      try {
        await onAnswer(undefined, answer);
      } catch (error) {
        console.error('의견 데이터 업로드 실패:', error);
        // 오류가 발생해도 onAnswer는 호출해서 다음 스테이지로 이동
        await onAnswer(undefined, '의견 제출 실패');
      }
    }, 1500); // 1.5초 후 스테이지 완료
  };

  const handleSkip = () => {
    setIsSkipped(true);
    
    console.log('모닥불 스테이지 건너뛰기:', {
      questionId: question?.id,
    });
    
    // 건너뛰기 시 데이터 저장 없이 바로 다음 스테이지로 이동
    setTimeout(() => {
      onSkip(); // onAnswer 대신 onSkip 호출
    }, 1000);
  };

  // CSS 애니메이션 스타일 추가
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      /* 모닥불 스테이지 배경 별 애니메이션 */
      .sparkle-animation-campfire-stage {
        opacity: 0;
        transform: scale(0);
        animation: sparkleCampfireStageEffect infinite;
      }
      
      @keyframes sparkleCampfireStageEffect {
        0% {
          opacity: 0;
          transform: scale(0) rotate(0deg);
        }
        30% {
          opacity: 0.9;
          transform: scale(1.1) rotate(108deg);
        }
        60% {
          opacity: 1;
          transform: scale(1.4) rotate(216deg);
        }
        85% {
          opacity: 0.7;
          transform: scale(0.9) rotate(306deg);
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

  if (isSkipped) {
    return (
      <div className="bg-gradient-to-br from-gray-800 via-purple-800 to-gray-900 rounded-3xl shadow-2xl p-8 border border-purple-500/30 backdrop-blur-sm relative overflow-hidden">
        {/* 네온 글로우 효과 */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-pink-500/10 rounded-3xl animate-pulse"></div>
        
        {/* 건너뛰기 배경 별빛 효과 */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          {Array.from({ length: 4 }).map((_, i) => {
            const skipStars = [
              { top: '20%', right: '20%', color: 'text-purple-400', size: 8, delay: 0 },
              { bottom: '25%', left: '25%', color: 'text-cyan-400', size: 6, delay: 1.5 },
              { top: '70%', right: '30%', color: 'text-pink-400', size: 7, delay: 3.0 },
              { bottom: '60%', left: '60%', color: 'text-indigo-300', size: 5, delay: 4.5 }
            ];
            const star = skipStars[i];
            return (
              <div 
                key={i}
                className="absolute sparkle-animation-campfire-stage"
                style={{
                  ...star,
                  animationDelay: `${star.delay}s`,
                  animationDuration: '3s'
                }}
              >
                <Sparkle 
                  size={star.size} 
                  className={`${star.color} opacity-30`}
                />
              </div>
            );
          })}
        </div>
        
        <div className="text-center relative z-10">
          <div className="text-8xl mb-4 drop-shadow-[0_0_25px_rgba(168,85,247,0.8)]">🚪</div>
          <h2 className="text-3xl font-bold text-purple-400 mb-4 drop-shadow-[0_0_15px_rgba(168,85,247,0.8)]">우주 정거장을 건너뛰었습니다</h2>
          <p className="text-cyan-300">다음 항성계로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 via-orange-800 to-gray-900 rounded-3xl shadow-2xl p-8 border border-orange-500/30 backdrop-blur-sm relative overflow-hidden">
      {/* 네온 글로우 효과 */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl"></div>
      
      {/* 고급 배경 별빛 효과 */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        {Array.from({ length: 7 }).map((_, i) => {
          const campfireStars = [
            { top: '15%', right: '15%', color: 'text-orange-400', size: 9, delay: 0 },
            { bottom: '20%', left: '18%', color: 'text-pink-400', size: 7, delay: 1.0 },
            { top: '30%', right: '35%', color: 'text-yellow-400', size: 6, delay: 2.0 },
            { bottom: '35%', right: '25%', color: 'text-orange-300', size: 8, delay: 3.0 },
            { top: '65%', left: '25%', color: 'text-amber-400', size: 5, delay: 4.0 },
            { top: '55%', right: '55%', color: 'text-red-400', size: 10, delay: 5.0 },
            { bottom: '70%', left: '70%', color: 'text-rose-300', size: 4, delay: 6.0 }
          ];
          const star = campfireStars[i];
          return (
            <div 
              key={i}
              className="absolute sparkle-animation-campfire-stage"
              style={{
                ...star,
                animationDelay: `${star.delay}s`,
                animationDuration: '5s'
              }}
            >
              <Sparkle 
                size={star.size} 
                className={`${star.color} opacity-45`}
              />
            </div>
          );
        })}
      </div>
      
      <div className="relative z-10">
      {/* 게임 상태 표시 바 */}
      {gameStats && (
          <div className="mb-6 bg-gradient-to-r from-gray-900/80 via-orange-900/80 to-gray-900/80 rounded-xl p-4 border border-orange-400/30 backdrop-blur-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {/* 현재 점수 */}
            <div className="text-center">
                <div className="text-xl font-bold text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.7)]">{gameStats.currentScore.toLocaleString()}</div>
                <div className="text-xs text-gray-300">⭐ 점수</div>
            </div>
            
            {/* 정답 수 */}
            <div className="text-center">
                <div className="text-xl font-bold text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.7)]">{gameStats.correctAnswers}</div>
                <div className="text-xs text-gray-300">✅ 정답</div>
            </div>
            
            {/* 현재 연속 */}
            <div className="text-center">
                <div className="text-xl font-bold text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.7)]">{gameStats.currentStreak}</div>
                <div className="text-xs text-gray-300">🔥 연속</div>
            </div>
            
            {/* 최대 연속 */}
            <div className="text-center">
                <div className="text-xl font-bold text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]">{gameStats.maxStreak}</div>
                <div className="text-xs text-gray-300">🏆 최대</div>
            </div>
          </div>
        </div>
      )}

      {/* 스테이지 헤더 */}
      <div className="text-center mb-8">
          <div className="text-6xl mb-4 drop-shadow-[0_0_25px_rgba(251,146,60,0.8)]">🛸</div>
          <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">우주 정거장 스테이지</h2>
          <p className="text-orange-300 text-lg">
            다른 우주 여행자들과 의견을 나누고 특별한 보상을 획득하세요!
        </p>
      </div>

      {/* QuizQuestion 컴포넌트 사용 */}
      <QuizQuestion
        question={question}
        selectedAnswer={selectedAnswer}
        selectedAnswerIndex={null}
        onSelectAnswer={handleSelectAnswer}
        showResult={showResult}
        disabled={isSubmitting}
        serverValidationResult={serverValidationResult}
      />

      {/* 버튼 영역 */}
        <div className="mt-8 text-center">
        <button
          onClick={handleSkip}
          disabled={isSubmitting || showResult}
            className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-2xl font-bold text-lg
                     hover:from-gray-500 hover:to-gray-600 transition-all transform hover:scale-105 
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                     border border-gray-400/30 backdrop-blur-sm
                     drop-shadow-[0_0_15px_rgba(75,85,99,0.5)] hover:drop-shadow-[0_0_20px_rgba(75,85,99,0.8)]"
        >
            🚀 정거장 건너뛰기
        </button>
      </div>

      {/* 안내 메시지 */}
      <div className="mt-6 text-center">
          <p className="text-sm text-orange-300">
            🌟 의견을 작성하면 우주 보상 상자에서 점수 증감 효과를 선택할 수 있습니다!
        </p>
      </div>

      {/* 의견 제출 완료 메시지 */}
      {showResult && (
          <div className="mt-6 text-center">
            <div className="text-green-400 font-medium mb-2 drop-shadow-[0_0_10px_rgba(34,197,94,0.7)]">
              ✅ 우주 통신이 전송되었습니다!
            </div>
            <div className="text-sm text-cyan-400 animate-pulse drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]">
              우주 보상 상자를 선택하러 이동 중...
          </div>
          </div>
        )}
        </div>
    </div>
  );
};

export default RoguelikeCampfireStage; 