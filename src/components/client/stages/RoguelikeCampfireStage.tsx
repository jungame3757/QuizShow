import React, { useState } from 'react';
import { Question } from '../../../types';
import { RoguelikeGameSession } from '../../../types/roguelike';
import QuizQuestion from '../QuizQuestion';

interface RoguelikeCampfireStageProps {
  question: Question;
  onAnswer: (answerIndex?: number, answerText?: string) => Promise<void>;
  onSelectBuff: (buffId: string) => void;
  onSkip: () => void;
  onReward: (rewardType: 'health' | 'score' | 'streak') => void;
  gameSession?: RoguelikeGameSession;
}

const RoguelikeCampfireStage: React.FC<RoguelikeCampfireStageProps> = ({
  question,
  onAnswer,
  onSelectBuff,
  onSkip,
  onReward,
  gameSession
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submittedOpinion, setSubmittedOpinion] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [selectedBuff, setSelectedBuff] = useState<string | null>(null);
  const [showBuffSelection, setShowBuffSelection] = useState(false);
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

  const handleSelectAnswer = async (answer: string, index: number) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setSelectedAnswer(answer);
    setSubmittedOpinion(answer);
    setShowResult(true);

    // 의견 문제는 항상 정답으로 처리
    setServerValidationResult({ isCorrect: true, points: 25 }); // 의견 제출 보상 점수

    // 의견 제출 완료 후 즉시 버프 선택 화면으로 이동 (onAnswer 호출하지 않음)
    setTimeout(() => {
      setShowBuffSelection(true);
      setIsSubmitting(false); // 제출 상태 해제
    }, 1500); // 1.5초로 단축하여 더 빠르게 버프 선택으로 이동
  };

  const handleBuffSelect = async (buffId: string) => {
    setSelectedBuff(buffId);
    
    try {
      // 버프 선택 처리
      onSelectBuff(buffId);
      
      // 버프 선택 완료 후 스테이지 완료 처리 (실제 의견 내용만 전송)
      setTimeout(async () => {
        try {
          await onAnswer(undefined, submittedOpinion || '');
        } catch (error) {
          console.error('의견 데이터 업로드 실패:', error);
          // 오류가 발생해도 onAnswer는 호출해서 다음 스테이지로 이동
          await onAnswer(undefined, submittedOpinion || '의견 제출 실패');
        }
      }, 1500); // 1.5초 후 스테이지 완료
    } catch (error) {
      console.error('버프 선택 처리 실패:', error);
      // 오류 발생 시에도 스테이지 완료 처리
      setTimeout(async () => {
        try {
          await onAnswer(undefined, submittedOpinion || '의견 제출 실패');
        } catch (answerError) {
          console.error('답안 제출 실패:', answerError);
        }
      }, 1000);
    }
  };

  const handleSkip = () => {
    setIsSkipped(true);
    onSkip();
  };

  // 사용 가능한 버프들
  const availableBuffs = [
    {
      id: 'PASSION_BUFF',
      name: '🔥 열정 버프',
      description: '연속 정답 보너스가 2배로 증가합니다',
      effect: '연속 정답 보너스 × 2'
    },
    {
      id: 'WISDOM_BUFF',
      name: '🧠 지혜 버프',
      description: '최종 룰렛에서 추가 보너스를 받습니다',
      effect: '룰렛 완료 보너스 추가'
    },
    {
      id: 'LUCK_BUFF',
      name: '🍀 행운 버프',
      description: '최종 룰렛에서 높은 배수가 나올 확률이 증가합니다',
      effect: '룰렛 고배수 확률 상승'
    }
  ];

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

  if (showBuffSelection) {
    return (
      <>
        {/* 기존 캠프파이어 화면 (흐리게 배경으로) */}
        <div className="bg-white rounded-2xl shadow-lg p-8 relative">
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

              {/* 보유 아이템/버프 표시 */}
              {activeBuffs.length > 0 && (
                <div className="border-t border-orange-200 pt-3">
                  <div className="text-xs text-gray-600 mb-2">🎒 보유 아이템</div>
                  <div className="flex flex-wrap gap-2">
                    {activeBuffs.map((buff, index) => (
                      <div 
                        key={index}
                        className="bg-white px-2 py-1 rounded-full text-xs border border-orange-300"
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
            <div className="text-4xl mb-4">🔥</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">모닥불 스테이지</h2>
            <p className="text-gray-600">
              의견을 나누고 특별한 버프를 획득하세요!
            </p>
          </div>

          {/* 의견 제출 완료 메시지 */}
          <div className="text-center">
            <div className="text-green-600 font-medium mb-4">
              ✅ 의견이 제출되었습니다!
            </div>
            <p className="text-gray-600">특별한 버프를 선택해주세요...</p>
          </div>
        </div>

        {/* 버프 선택 오버레이 팝업 */}
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            style={{
              animation: 'modalSlideIn 0.3s ease-out'
            }}
          >
            {/* 팝업 헤더 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
              <div className="text-center">
                <div className="text-4xl mb-2">🎁</div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">버프 선택</h2>
                <p className="text-sm text-gray-600">
                  모닥불에서 얻을 수 있는 특별한 능력을 선택하세요!
                </p>
              </div>
            </div>

            {/* 팝업 본문 */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availableBuffs.map((buff) => (
                  <button
                    key={buff.id}
                    onClick={() => handleBuffSelect(buff.id)}
                    disabled={selectedBuff !== null}
                    className={`p-6 rounded-xl border-2 transition-all transform hover:scale-105 ${
                      selectedBuff === buff.id
                        ? 'border-purple-500 bg-purple-50 ring-4 ring-purple-200'
                        : selectedBuff
                        ? 'border-gray-200 bg-gray-50 opacity-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <div className="text-2xl mb-2">{buff.name}</div>
                    <p className="text-sm text-gray-600 mb-2">{buff.description}</p>
                    <div className="text-xs text-purple-600 font-medium">{buff.effect}</div>
                  </button>
                ))}
              </div>

              {selectedBuff && (
                <div className="mt-6 text-center">
                  <div className="text-green-600 font-medium mb-4">
                    ✅ {availableBuffs.find(b => b.id === selectedBuff)?.name} 선택됨!
                  </div>
                  <div className="text-sm text-blue-600 animate-pulse">
                    모닥불 스테이지를 완료하는 중...
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

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

          {/* 보유 아이템/버프 표시 */}
          {activeBuffs.length > 0 && (
            <div className="border-t border-orange-200 pt-3">
              <div className="text-xs text-gray-600 mb-2">🎒 보유 아이템</div>
              <div className="flex flex-wrap gap-2">
                {activeBuffs.map((buff, index) => (
                  <div 
                    key={index}
                    className="bg-white px-2 py-1 rounded-full text-xs border border-orange-300"
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
        <div className="text-4xl mb-4">🔥</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">모닥불 스테이지</h2>
        <p className="text-gray-600">
          의견을 나누고 특별한 버프를 획득하세요!
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
          🔥 의견을 작성하면 게임에 도움이 되는 특별한 버프를 선택할 수 있습니다!
        </p>
      </div>
    </div>
  );
};

export default RoguelikeCampfireStage; 