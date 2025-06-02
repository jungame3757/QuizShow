import React, { useState, useEffect } from 'react';
import { Question } from '../../../types';
import QuizQuestion from '../QuizQuestion';

interface RoguelikeEliteStageProps {
  questions: Question[]; // 3개의 문제 배열
  timeLeft: number | null;
  onAnswer?: (answerIndex?: number, answerText?: string) => Promise<void>;
  onStageComplete: (success: boolean, correctCount: number) => void;
  gameSession?: any; // 게임 세션 정보 추가
}

const RoguelikeEliteStage: React.FC<RoguelikeEliteStageProps> = ({
  questions,
  timeLeft,
  onAnswer,
  onStageComplete,
  gameSession
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Array<{answer: string | null, index: number | null}>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [serverValidationResult, setServerValidationResult] = useState<{ isCorrect: boolean; points: number } | null>(null);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [orbs, setOrbs] = useState<boolean[]>([false, false, false]); // 구슬 상태 배열

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

  // 보유 아이템/버프 정보 계산
  const activeBuffs = React.useMemo(() => {
    if (!gameSession?.temporaryBuffs) return [];
    
    return gameSession.temporaryBuffs
      .filter((buff: any) => buff.active)
      .map((buff: any, index: number) => {
        const stackCount = buff.stackCount || 1;
        const stackText = stackCount > 1 ? ` x${stackCount}` : '';
        
        switch (buff.id) {
          case 'PASSION_BUFF':
            return { 
              name: `🔥 열정${stackText}`, 
              description: `연속 정답 보너스 × ${2 * stackCount}`,
              stackCount 
            };
          case 'WISDOM_BUFF':
            return { 
              name: `🧠 지혜${stackText}`, 
              description: `룰렛 완료 보너스 +${50 * stackCount}% 추가`,
              stackCount 
            };
          case 'LUCK_BUFF':
            return { 
              name: `🍀 행운${stackText}`, 
              description: `룰렛 고배수 확률 ${stackCount > 1 ? '크게 ' : ''}증가`,
              stackCount 
            };
          default:
            return { 
              name: `${buff.name || '알 수 없음'}${stackText}`, 
              description: buff.description || '',
              stackCount 
            };
        }
      });
  }, [gameSession]);

  useEffect(() => {
    // 선택한 답변 배열 초기화
    setSelectedAnswers(new Array(questions.length).fill({ answer: null, index: null }));
  }, [questions.length]);

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

  const currentQuestion = questions[currentQuestionIndex];

  // 정답 확인
  const validateAnswer = (question: Question, answerIndex?: number, answerText?: string): boolean => {
    if (question.type === 'multiple-choice') {
      return question.correctAnswer === answerIndex;
    } else if (question.type === 'short-answer') {
      const correctAnswer = question.correctAnswerText?.trim().toLowerCase();
      const userAnswer = answerText?.trim().toLowerCase();
      if (userAnswer === correctAnswer) return true;
      return question.additionalAnswers?.some(ans => ans.trim().toLowerCase() === userAnswer) || false;
    }
    return false;
  };

  const handleSelectAnswer = async (answer: string, index: number) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    const currentQuestion = questions[currentQuestionIndex];
    
    // 선택한 답변 저장
    const updatedAnswers = [...selectedAnswers];
    updatedAnswers[currentQuestionIndex] = { answer, index };
    setSelectedAnswers(updatedAnswers);
    
    try {
      // 클라이언트 검증
      const isCorrect = validateAnswer(currentQuestion, index, answer);
      
      // 엘리트 스테이지에서 각 문제별 활동 데이터 전송
      // 첫 번째, 두 번째는 0점, 마지막(세 번째)만 보상 점수
      if (onAnswer) {
        const questionNumber = currentQuestionIndex + 1;
        const isLastQuestion = currentQuestionIndex === questions.length - 1;
        
        // 답안 텍스트에 문제 번호와 정답 여부 포함
        const answerText = `엘리트 문제 ${questionNumber}/${questions.length}: ${isCorrect ? '정답' : '오답'} (${answer})`;
        
        if (currentQuestion.type === 'multiple-choice') {
          await onAnswer(index, answerText);
        } else if (currentQuestion.type === 'short-answer') {
          await onAnswer(undefined, answerText);
        }
      }
      
      // 클라이언트 검증 결과 표시 (임시 점수)
      const displayPoints = isCorrect ? (currentQuestionIndex === questions.length - 1 ? 100 : 0) : 0;
      setServerValidationResult({ isCorrect, points: displayPoints });
      setShowResult(true);

      if (isCorrect) {
        // 구슬 채우기 애니메이션
        setTimeout(() => {
          setOrbs(prev => {
            const newOrbs = [...prev];
            newOrbs[currentQuestionIndex] = true;
            return newOrbs;
          });
        }, 1000);

        const newCorrectCount = correctCount + 1;
        setCorrectCount(newCorrectCount);

        setTimeout(() => {
          if (currentQuestionIndex < questions.length - 1) {
            // 다음 문제로 이동
            setCurrentQuestionIndex(prev => prev + 1);
            setShowResult(false);
            setIsSubmitting(false);
            setServerValidationResult(null); // 서버 검증 결과 초기화
          } else {
            // 모든 문제 완료 - 성공!
            setIsCompleted(true);
            // 성공시 팝업 없이 바로 보상 화면으로 이동
            setTimeout(() => {
              onStageComplete(true, newCorrectCount);
            }, 1000); // 구슬 애니메이션 시간만 대기
          }
        }, 2000);
      } else {
        // 틀림 - 실패!
        setIsFailed(true);
        setShowCompletionPopup(true);
        setTimeout(() => {
          onStageComplete(false, correctCount);
        }, 3000);
      }
    } catch (error) {
      console.error('답안 제출 실패:', error);
      setIsSubmitting(false);
      setShowResult(false);
      setServerValidationResult(null);
    }
  };

  // 타이머 색상 계산
  const getTimerColor = () => {
    if (!timeLeft) return 'text-gray-500';
    if (timeLeft <= 20) return 'text-red-500';
    if (timeLeft <= 60) return 'text-yellow-500';
    return 'text-green-500';
  };

  // 타이머 진행도 계산
  const getTimerProgress = () => {
    if (!timeLeft) return 0;
    const maxTime = 120; // 엘리트 문제 제한시간 2분
    return Math.max(0, (timeLeft / maxTime) * 100);
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* 게임 상태 표시 바 */}
        {gameStats && (
          <div className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-3 border border-red-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {/* 현재 점수 */}
              <div className="text-center">
                <div className="text-xl font-bold text-red-600">{gameStats.currentScore.toLocaleString()}</div>
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

            {/* 보유 아이템/버프 표시 */}
            {activeBuffs.length > 0 && (
              <div className="border-t border-red-200 pt-3">
                <div className="text-xs text-gray-600 mb-2">🎒 보유 아이템</div>
                <div className="flex flex-wrap gap-2">
                  {activeBuffs.map((buff: any, index: number) => (
                    <div 
                      key={index}
                      className="bg-white px-2 py-1 rounded-full text-xs border border-red-300"
                      title={buff.description}
                    >
                      {buff.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 스테이지 헤더 */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">⚔️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">엘리트 문제 스테이지</h2>
          <p className="text-gray-600">
            문제 {currentQuestionIndex + 1}/{questions.length} | 연속 정답: {correctCount}
          </p>
          
          {/* 구슬 진행도 표시 */}
          <div className="mt-4 mb-4">
            <div className="flex justify-center space-x-4">
              {orbs.map((isFilled, index) => (
                <div
                  key={index}
                  className={`w-8 h-8 rounded-full border-2 transition-all duration-1000 ${
                    isFilled 
                      ? 'bg-gradient-to-r from-blue-400 to-purple-500 border-purple-500 shadow-lg animate-bounce' 
                      : index === currentQuestionIndex 
                      ? 'bg-gradient-to-r from-yellow-200 to-orange-300 border-orange-400 animate-pulse' 
                      : 'bg-gray-200 border-gray-300'
                  }`}
                  style={{
                    boxShadow: isFilled ? '0 0 20px rgba(168, 85, 247, 0.5)' : 'none'
                  }}
                >
                  {isFilled && (
                    <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                      ✨
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">⚠️ 한 문제라도 틀리면 실패!</p>
          </div>
          
          {/* 타이머 */}
          {timeLeft !== null && (
            <div className="mt-4">
              <div className={`text-lg font-bold mb-2 ${getTimerColor()}`}>
                ⏰ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-1000 ${
                    timeLeft <= 20 ? 'bg-red-500' : 
                    timeLeft <= 60 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${getTimerProgress()}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* QuizQuestion 컴포넌트 사용 */}
        <QuizQuestion
          key={`elite-question-${currentQuestionIndex}`}
          question={currentQuestion}
          selectedAnswer={selectedAnswers[currentQuestionIndex]?.answer || null}
          selectedAnswerIndex={selectedAnswers[currentQuestionIndex]?.index || null}
          onSelectAnswer={handleSelectAnswer}
          showResult={showResult}
          disabled={isSubmitting}
          serverValidationResult={serverValidationResult}
        />

        {/* 안내 메시지 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            🎯 3문제 연속 정답 시 고급 보상 상자를 획득할 수 있습니다!
          </p>
        </div>
      </div>

      {/* 완료 팝업 - 실패시에만 표시 */}
      {showCompletionPopup && isFailed && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
            style={{
              animation: 'modalSlideIn 0.3s ease-out'
            }}
          >
            <div className="text-6xl mb-4">💔</div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">엘리트 스테이지 실패</h2>
            <p className="text-gray-600 mb-4">
              문제를 틀렸습니다. {correctCount}개 문제를 맞혔습니다.
            </p>
            <div className="flex justify-center space-x-2 mb-4">
              {orbs.map((isFilled, index) => (
                <div
                  key={index}
                  className={`w-6 h-6 rounded-full ${
                    isFilled 
                      ? 'bg-gradient-to-r from-blue-400 to-purple-500' 
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500">다음에 다시 도전해보세요!</p>
          </div>
        </div>
      )}

      {/* 애니메이션 CSS */}
      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-50px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
};

export default RoguelikeEliteStage; 