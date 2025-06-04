import React, { useState, useEffect } from 'react';
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

  if (isSkipped) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🚪</div>
          <h2 className="text-2xl font-bold text-gray-600 mb-4">모닥불을 건너뛰었습니다</h2>
          <p className="text-gray-500">다음 스테이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      {/* 게임 상태 표시 바 */}
      {gameStats && (
        <div className="mb-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-3 border border-orange-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {/* 현재 점수 */}
            <div className="text-center">
              <div className="text-xl font-bold text-orange-600">{gameStats.currentScore.toLocaleString()}</div>
              <div className="text-xs text-gray-600">점수</div>
            </div>
            
            {/* 정답 수 */}
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{gameStats.correctAnswers}</div>
              <div className="text-xs text-gray-600">정답 수</div>
            </div>
            
            {/* 현재 연속 */}
            <div className="text-center">
              <div className="text-xl font-bold text-red-600">{gameStats.currentStreak}</div>
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
        <div className="text-4xl mb-4">🔥</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">모닥불 스테이지</h2>
        <p className="text-gray-600">
          의견을 나누고 특별한 보상을 획득하세요!
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
      <div className="mt-6 text-center">
        <button
          onClick={handleSkip}
          disabled={isSubmitting || showResult}
          className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          건너뛰기
        </button>
      </div>

      {/* 안내 메시지 */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          🔥 의견을 작성하면 보상 상자에서 점수 추가/차감 보상을 선택할 수 있습니다!
        </p>
      </div>

      {/* 의견 제출 완료 메시지 */}
      {showResult && (
        <div className="mt-4 text-center">
          <div className="text-green-600 font-medium mb-2">
            ✅ 의견이 제출되었습니다!
          </div>
          <div className="text-sm text-blue-600 animate-pulse">
            보상 상자를 선택하러 이동 중...
          </div>
        </div>
      )}
    </div>
  );
};

export default RoguelikeCampfireStage; 