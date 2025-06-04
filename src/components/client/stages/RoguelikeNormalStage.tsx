import React, { useState, useEffect } from 'react';
import { Sparkle } from 'lucide-react';
import { Question } from '../../../types';
import QuizQuestion from '../QuizQuestion';

interface RoguelikeNormalStageProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  timeLeft: number | null;
  onAnswer: (answerIndex?: number, answerText?: string) => Promise<void>;
  gameSession?: any; // 게임 세션 정보 추가
}

const RoguelikeNormalStage: React.FC<RoguelikeNormalStageProps> = ({
  question,
  questionNumber,
  totalQuestions,
  timeLeft,
  onAnswer,
  gameSession
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [serverValidationResult, setServerValidationResult] = useState<{ isCorrect: boolean; points: number } | null>(null);

  // 선택지 섞기 시스템 추가
  const [currentShuffledOptions, setCurrentShuffledOptions] = useState<{ options: string[], mapping: number[] } | null>(null);

  // 선택지 순서 섞기 함수 (Fisher-Yates 알고리즘)
  const shuffleCurrentQuestionOptions = (question: Question) => {
    if (question.type !== 'multiple-choice' || !question.options) {
      return null;
    }
    
    const indices = Array.from({ length: question.options.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    const shuffledOptions = indices.map(i => question.options![i]);
    return { options: shuffledOptions, mapping: indices };
  };

  // 현재 문제 가져오기 (섞인 선택지 적용)
  const getCurrentQuestion = () => {
    if (!question) return null;
    
    // 객관식이고 섞인 선택지가 있는 경우에만 적용
    if (question.type === 'multiple-choice' && currentShuffledOptions && question.options) {
      const currentQuestionOptions = currentShuffledOptions.options;
      const correctAnswerIndex = question.correctAnswer;
      
      // 원본 정답 인덱스를 섞인 UI 인덱스로 변환
      let currentQuestionCorrectAnswer = correctAnswerIndex;
      if (correctAnswerIndex !== undefined && currentShuffledOptions.mapping) {
        currentQuestionCorrectAnswer = currentShuffledOptions.mapping.indexOf(correctAnswerIndex);
      }
      
      return {
        ...question,
        options: currentQuestionOptions,
        correctAnswer: currentQuestionCorrectAnswer,
        // 원본 인덱스도 포함하여 참조 가능하도록
        originalCorrectAnswer: correctAnswerIndex
      };
    }
    
    // 다른 문제 형식이거나 섞인 선택지가 없으면 원본 그대로 반환
    return question;
  };

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

  // 문제가 바뀔 때마다 선택지 순서 섞기
  useEffect(() => {
    if (!question) return;
    
    const shuffledData = shuffleCurrentQuestionOptions(question);
    setCurrentShuffledOptions(shuffledData);
    
    // 선택 상태 초기화
    setSelectedAnswer(null);
    setSelectedIndex(null);
    setServerValidationResult(null);
    setIsSubmitting(false);
    setShowResult(false);
    
    console.log('일반 스테이지 - 선택지 섞기 완료:', {
      questionNumber,
      questionType: question.type,
      originalOptions: question.options,
      shuffledOptions: shuffledData?.options,
      mapping: shuffledData?.mapping
    });
  }, [question, questionNumber]);

  // 주관식 답안 검증 함수
  const validateShortAnswer = (userAnswer: string, question: Question): boolean => {
    if (question.type !== 'short-answer') return false;
    
    const userAnswerClean = userAnswer.toLowerCase().trim();
    const correctAnswer = question.correctAnswerText?.toLowerCase().trim();
    
    if (!correctAnswer) return false;
    
    // 정답 인정 방식에 따른 처리
    if (question.answerMatchType === 'contains') {
      // 정답 단어 포함 방식
      const isMainCorrect = userAnswerClean.includes(correctAnswer);
      const isAdditionalCorrect = question.additionalAnswers?.some(answer => 
        userAnswerClean.includes(answer.toLowerCase().trim())
      ) || false;
      return isMainCorrect || isAdditionalCorrect;
    } else {
      // 정확히 일치 방식 (기본값)
      const isMainCorrect = userAnswerClean === correctAnswer;
      const isAdditionalCorrect = question.additionalAnswers?.some(answer => 
        userAnswerClean === answer.toLowerCase().trim()
      ) || false;
      return isMainCorrect || isAdditionalCorrect;
    }
  };

  const handleSelectAnswer = async (answer: string, index: number) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);

    // 문제 타입에 따라 선택된 답안 저장
    if (question.type === 'multiple-choice') {
      // 원본 인덱스로 변환
      let originalAnswerIndex = index;
      if (currentShuffledOptions && currentShuffledOptions.mapping) {
        originalAnswerIndex = currentShuffledOptions.mapping[index];
      }
      
      setSelectedIndex(originalAnswerIndex);
      setSelectedAnswer(answer);
      setShowResult(true);
      
      // 클라이언트 검증 (임시로 결과 표시용) - 원본 인덱스 기준
      const isCorrect = originalAnswerIndex === question.correctAnswer;
      setServerValidationResult({ isCorrect, points: isCorrect ? 50 : 0 }); // 임시 점수
      
      console.log('일반 스테이지 - 객관식 답변 처리:', {
        questionNumber,
        questionId: question?.id,
        userSelectedDisplayIndex: index,
        originalAnswerIndex,
        correctAnswerIndex: question.correctAnswer,
        isCorrect,
        mapping: currentShuffledOptions?.mapping
      });
      
      // 피드백을 2초간 보여준 후 서버로 답안 전송 (원본 인덱스로)
      setTimeout(async () => {
        try {
          await onAnswer(originalAnswerIndex);
        } catch (error) {
          console.error('답변 제출 실패:', error);
          setIsSubmitting(false);
          setShowResult(false);
          setServerValidationResult(null);
        }
      }, 2000); // 2초 피드백 시간
    } else if (question.type === 'short-answer') {
      setSelectedAnswer(answer);
      setSelectedIndex(null);
      setShowResult(true);
      
      // 클라이언트 검증 (임시로 결과 표시용)
      const isCorrect = validateShortAnswer(answer, question);
      setServerValidationResult({ isCorrect, points: isCorrect ? 50 : 0 }); // 임시 점수
      
      console.log('일반 스테이지 주관식 답변:', {
        questionId: question?.id,
        answer,
        isCorrect,
      });
      
      // 피드백을 2초간 보여준 후 서버로 답안 전송
      setTimeout(async () => {
        try {
          await onAnswer(undefined, answer);
        } catch (error) {
          console.error('답변 제출 실패:', error);
          setIsSubmitting(false);
          setShowResult(false);
          setServerValidationResult(null);
        }
      }, 2000); // 2초 피드백 시간
    }
  };

  // 타이머 색상 계산
  const getTimerColor = () => {
    if (!timeLeft) return 'text-gray-500';
    if (timeLeft <= 10) return 'text-red-500';
    if (timeLeft <= 30) return 'text-yellow-500';
    return 'text-green-500';
  };

  // 타이머 진행도 계산
  const getTimerProgress = () => {
    if (!timeLeft) return 0;
    return (timeLeft / 60) * 100; // 60초 기준
  };

  // CSS 애니메이션 스타일 추가
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      /* 일반 스테이지 배경 별 애니메이션 */
      .sparkle-animation-normal-stage {
        opacity: 0;
        transform: scale(0);
        animation: sparkleNormalStageEffect infinite;
      }
      
      @keyframes sparkleNormalStageEffect {
        0% {
          opacity: 0;
          transform: scale(0) rotate(0deg);
        }
        25% {
          opacity: 0.8;
          transform: scale(1) rotate(90deg);
        }
        50% {
          opacity: 1;
          transform: scale(1.3) rotate(180deg);
        }
        75% {
          opacity: 0.6;
          transform: scale(0.8) rotate(270deg);
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
    <div className="bg-gradient-to-br from-gray-800 via-purple-800 to-gray-900 rounded-3xl shadow-2xl p-8 border border-cyan-500/30 backdrop-blur-sm relative overflow-hidden">
      {/* 네온 글로우 효과 */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl"></div>
      
      {/* 고급 배경 별빛 효과 */}
      <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
        {Array.from({ length: 6 }).map((_, i) => {
          const normalStageStars = [
            { top: '12%', right: '12%', color: 'text-cyan-400', size: 8, delay: 0 },
            { bottom: '15%', left: '15%', color: 'text-pink-400', size: 6, delay: 1.2 },
            { top: '25%', right: '30%', color: 'text-white', size: 5, delay: 2.4 },
            { bottom: '30%', right: '20%', color: 'text-purple-300', size: 7, delay: 3.6 },
            { top: '70%', left: '20%', color: 'text-cyan-300', size: 4, delay: 4.8 },
            { top: '60%', right: '60%', color: 'text-indigo-300', size: 9, delay: 6.0 }
          ];
          const star = normalStageStars[i];
          return (
            <div 
              key={i}
              className="absolute sparkle-animation-normal-stage"
              style={{
                ...star,
                animationDelay: `${star.delay}s`,
                animationDuration: '4s'
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
      
      <div className="relative z-10">
      {/* 게임 상태 표시 바 */}
      {gameStats && (
          <div className="mb-6 bg-gradient-to-r from-gray-900/80 via-purple-900/80 to-gray-900/80 rounded-xl p-4 border border-cyan-400/30 backdrop-blur-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {/* 현재 점수 */}
            <div className="text-center">
                <div className="text-xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]">{gameStats.currentScore.toLocaleString()}</div>
                <div className="text-xs text-gray-300">⭐ 점수</div>
            </div>
            
            {/* 정답 수 */}
            <div className="text-center">
                <div className="text-xl font-bold text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.7)]">{gameStats.correctAnswers}</div>
                <div className="text-xs text-gray-300">✅ 정답</div>
            </div>
            
            {/* 현재 연속 */}
            <div className="text-center">
                <div className="text-xl font-bold text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.7)]">{gameStats.currentStreak}</div>
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
          <div className="text-6xl mb-4 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]">🚀</div>
          <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">일반 문제 스테이지</h2>
          <p className="text-cyan-300 text-lg">
            미션 {questionNumber}/{totalQuestions}
        </p>
        
        {/* 타이머 */}
        {timeLeft !== null && (
            <div className="mt-6">
              <div className={`text-xl font-bold mb-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] ${getTimerColor()}`}>
              ⏰ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
              <div className="w-full bg-gray-700/50 rounded-full h-3 border border-gray-600/50">
              <div 
                  className={`h-3 rounded-full transition-all duration-1000 ${
                    timeLeft <= 10 ? 'bg-gradient-to-r from-red-500 to-pink-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 
                    timeLeft <= 30 ? 'bg-gradient-to-r from-yellow-500 to-orange-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 
                    'bg-gradient-to-r from-green-500 to-cyan-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]'
                }`}
                style={{ width: `${getTimerProgress()}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* QuizQuestion 컴포넌트 사용 */}
      <QuizQuestion
        question={getCurrentQuestion() || question}
        selectedAnswer={selectedAnswer}
        selectedAnswerIndex={selectedIndex}
        onSelectAnswer={handleSelectAnswer}
        showResult={showResult}
        disabled={isSubmitting}
        serverValidationResult={serverValidationResult}
        currentShuffledOptions={currentShuffledOptions}
      />

      {/* 안내 메시지 */}
      <div className="mt-6 text-center">
          <p className="text-sm text-cyan-300">
            💫 정답을 맞춰서 우주 보상을 획득하세요!
        </p>
        
        {/* 디버그 정보 (개발 모드에서만) */}
        {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-xs text-gray-500">
              <p>현재 미션 ID: {question?.id || 'N/A'}</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default RoguelikeNormalStage; 