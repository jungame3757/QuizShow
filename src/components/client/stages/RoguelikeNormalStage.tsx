import React, { useState, useEffect } from 'react';
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

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      {/* 게임 상태 표시 바 */}
      {gameStats && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {/* 현재 점수 */}
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">{gameStats.currentScore.toLocaleString()}</div>
              <div className="text-xs text-gray-600">점수</div>
            </div>
            
            {/* 정답 수 */}
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{gameStats.correctAnswers}</div>
              <div className="text-xs text-gray-600">정답 수</div>
            </div>
            
            {/* 현재 연속 */}
            <div className="text-center">
              <div className="text-xl font-bold text-orange-600">{gameStats.currentStreak}</div>
              <div className="text-xs text-gray-600">연속 🔥</div>
            </div>
            
            {/* 최대 연속 */}
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">{gameStats.maxStreak}</div>
              <div className="text-xs text-gray-600">최대 🏆</div>
            </div>
          </div>
        </div>
      )}

      {/* 스테이지 헤더 */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-4">🗡️</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">일반 문제 스테이지</h2>
        <p className="text-gray-600">
          문제 {questionNumber}/{totalQuestions}
        </p>
        
        {/* 타이머 */}
        {timeLeft !== null && (
          <div className="mt-4">
            <div className={`text-lg font-bold mb-2 ${getTimerColor()}`}>
              ⏰ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-1000 ${
                  timeLeft <= 10 ? 'bg-red-500' : 
                  timeLeft <= 30 ? 'bg-yellow-500' : 'bg-green-500'
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
        <p className="text-sm text-gray-500">
          💡 정답을 맞춰서 보상 상자를 획득하세요!
        </p>
        
        {/* 디버그 정보 (개발 모드에서만) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-gray-400">
            <p>현재 문제 ID: {question?.id || 'N/A'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoguelikeNormalStage; 