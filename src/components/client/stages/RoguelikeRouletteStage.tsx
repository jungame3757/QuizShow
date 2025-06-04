import React, { useState, useEffect } from 'react';
import { RoguelikeGameSession, RouletteResult } from '../../../types/roguelike';
import { updateParticipantScore } from '../../../firebase/sessionService';

interface RoguelikeRouletteStageProps {
  gameSession: RoguelikeGameSession;
  onSpinRoulette: () => RouletteResult;
  onComplete?: () => void;
  sessionId?: string; // RTDB 업데이트용
  userId?: string; // RTDB 업데이트용
}

interface RouletteBox {
  id: number;
  type: 'multiply' | 'add' | 'subtract';
  value: number;
  color: string;
  label: string;
  description: string;
}

const RoguelikeRouletteStage: React.FC<RoguelikeRouletteStageProps> = ({
  gameSession,
  onSpinRoulette,
  onComplete,
  sessionId,
  userId
}) => {
  const [showActivityBonus, setShowActivityBonus] = useState(true);
  const [availableTickets, setAvailableTickets] = useState(0);
  const [usedTickets, setUsedTickets] = useState(0);
  const [boxResults, setBoxResults] = useState<{ round: number; result: RouletteBox; points: number }[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentBoxIndex, setCurrentBoxIndex] = useState<number | null>(null);
  const [currentRoundBoxes, setCurrentRoundBoxes] = useState<RouletteBox[]>([]);
  const [finalScoreUpdated, setFinalScoreUpdated] = useState(false); // RTDB 업데이트 중복 방지

  // 룰렛 상자 설정 (전체 6가지 옵션)
  const getAllRouletteBoxes = (): RouletteBox[] => [
    {
      id: 1,
      type: 'multiply',
      value: 1.5,
      color: 'bg-green-100 border-green-300',
      label: '상자 1',
      description: '현재 점수 × 1.5배'
    },
    {
      id: 2,
      type: 'multiply',
      value: 0.8,
      color: 'bg-red-100 border-red-300',
      label: '상자 2',
      description: '현재 점수 × 0.8배'
    },
    {
      id: 3,
      type: 'add',
      value: 500,
      color: 'bg-blue-100 border-blue-300',
      label: '상자 3',
      description: '현재 점수 + 500점'
    },
    {
      id: 4,
      type: 'subtract',
      value: 300,
      color: 'bg-orange-100 border-orange-300',
      label: '상자 4',
      description: '현재 점수 - 300점'
    },
    {
      id: 5,
      type: 'multiply',
      value: 2.0,
      color: 'bg-purple-100 border-purple-300',
      label: '상자 5',
      description: '현재 점수 × 2.0배'
    },
    {
      id: 6,
      type: 'multiply',
      value: 0.5,
      color: 'bg-gray-100 border-gray-300',
      label: '상자 6',
      description: '현재 점수 × 0.5배'
    }
  ];

  // 매번 3가지 랜덤 상자 선택
  const generateRandomBoxes = (): RouletteBox[] => {
    const allBoxes = getAllRouletteBoxes();
    const shuffled = [...allBoxes].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).map((box, index) => ({
      ...box,
      id: index + 1, // 표시용 ID는 1, 2, 3으로 재설정
      label: `상자 ${index + 1}`,
      color: `bg-gray-100 border-gray-300` // 모든 상자를 동일한 색상으로
    }));
  };

  const calculateActivityBonus = () => {
    const bonus = {
      correctAnswerBonus: gameSession.correctAnswers * 50,
      streakBonus: gameSession.maxStreak * 30,
      speedBonus: gameSession.averageAnswerTime < 30 ? 200 : 0,
      participationBonus: gameSession.participatedInOpinion ? 150 : 0,
      completionBonus: 300
    };

    const total = bonus.correctAnswerBonus + bonus.streakBonus + 
                  bonus.speedBonus + bonus.participationBonus + bonus.completionBonus;

    return { ...bonus, total };
  };

  // 티켓 개수 계산 (500점당 1티켓)
  const calculateTickets = () => {
    const activityBonus = calculateActivityBonus();
    return Math.floor(activityBonus.total / 500);
  };

  // RTDB에 최종 점수 업데이트
  const updateFinalScoreToRTDB = async (finalScore: number) => {
    if (!sessionId || !userId || finalScoreUpdated) return;

    try {
      await updateParticipantScore(sessionId, userId, finalScore);
      setFinalScoreUpdated(true);
      console.log(`RTDB에 최종 점수 ${finalScore}점이 업데이트되었습니다.`);
    } catch (error) {
      console.error('RTDB 점수 업데이트 실패:', error);
    }
  };

  useEffect(() => {
    if (showActivityBonus) {
      setAvailableTickets(calculateTickets());
    }
  }, [showActivityBonus]);

  // 모든 티켓 사용 완료 시 최종 점수 RTDB 업데이트 및 게임 완료 처리
  useEffect(() => {
    if (usedTickets === availableTickets && availableTickets > 0 && boxResults.length > 0) {
      const finalScore = boxResults[boxResults.length - 1].points;
      updateFinalScoreToRTDB(finalScore);
      
      // 3초 후 자동으로 게임 완료 처리
      const gameCompletionTimer = setTimeout(() => {
        console.log('모든 룰렛 티켓 사용 완료 - 게임 완료 처리');
        try {
          if (onComplete && typeof onComplete === 'function') {
            onComplete(); // 게임 완료 콜백 호출
          } else {
            console.log('onComplete 콜백이 제공되지 않았습니다.');
          }
        } catch (error) {
          console.error('게임 완료 처리 중 오류 발생:', error);
        }
      }, 3000);
      
      return () => clearTimeout(gameCompletionTimer);
    }
  }, [usedTickets, availableTickets, boxResults, onComplete]);

  const handleStartRoulette = () => {
    setShowActivityBonus(false);
    // 첫 번째 라운드 상자 생성
    setCurrentRoundBoxes(generateRandomBoxes());
  };

  const handleBoxSelect = (boxIndex: number) => {
    if (usedTickets >= availableTickets || isAnimating) return;

    setIsAnimating(true);
    setCurrentBoxIndex(boxIndex);

    // 현재 라운드 상자에서 선택한 상자의 실제 보상 가져오기
    const selectedBox = currentRoundBoxes[boxIndex - 1]; // boxIndex는 1부터 시작하므로 -1
    
    // 현재 점수에 효과 적용 계산
    const currentScore = boxResults.length > 0 ? boxResults[boxResults.length - 1].points : gameSession.baseScore;
    let resultPoints = currentScore;
    
    if (selectedBox.type === 'multiply') {
      resultPoints = Math.floor(currentScore * selectedBox.value);
    } else if (selectedBox.type === 'add') {
      resultPoints = currentScore + selectedBox.value;
    } else if (selectedBox.type === 'subtract') {
      resultPoints = Math.max(0, currentScore - selectedBox.value); // 최소 0점
    }

    setTimeout(() => {
      const newUsedTickets = usedTickets + 1;
      setBoxResults([...boxResults, { round: newUsedTickets, result: selectedBox, points: resultPoints }]);
      setUsedTickets(newUsedTickets);
      setCurrentBoxIndex(null);
      setIsAnimating(false);
      
      // 다음 라운드를 위한 새로운 상자 생성 (아직 티켓이 남아있다면)
      if (newUsedTickets < availableTickets) {
        setCurrentRoundBoxes(generateRandomBoxes());
        console.log(`라운드 ${newUsedTickets + 1}: 새로운 상자 3개 생성`);
      }
    }, 2000);
  };

  const activityBonus = calculateActivityBonus();

  if (showActivityBonus) {
    const ticketsToShow = calculateTickets();
    
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* 스테이지 헤더 */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🎫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">룰렛 티켓 - 활동 보너스 계산!</h2>
          <p className="text-gray-600">
            모험을 완주하신 것을 축하합니다! 활동 보너스를 티켓으로 교환합니다.
          </p>
        </div>

        {/* 활동 보너스 상세 내역 */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-6">📊 활동 보너스 내역</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <span>✅</span>
                <span>정답 개수 보너스</span>
                <span className="text-sm text-gray-500">({gameSession.correctAnswers}개 × 50점)</span>
              </div>
              <span className="font-bold text-indigo-600">+{activityBonus.correctAnswerBonus}점</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <span>🔥</span>
                <span>연속 정답 보너스</span>
                <span className="text-sm text-gray-500">({gameSession.maxStreak}연속 × 30점)</span>
              </div>
              <span className="font-bold text-orange-600">+{activityBonus.streakBonus}점</span>
            </div>
            
            {activityBonus.speedBonus > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <span>⚡</span>
                  <span>빠른 답변 보너스</span>
                  <span className="text-sm text-gray-500">(평균 {Math.round(gameSession.averageAnswerTime)}초)</span>
                </div>
                <span className="font-bold text-yellow-600">+{activityBonus.speedBonus}점</span>
              </div>
            )}
            
            {activityBonus.participationBonus > 0 && (
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <span>💬</span>
                  <span>의견 참여 보너스</span>
                </div>
                <span className="font-bold text-green-600">+{activityBonus.participationBonus}점</span>
              </div>
            )}
            
            <div className="flex items-center justify-between py-2 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <span>🏆</span>
                <span>완주 보너스</span>
              </div>
              <span className="font-bold text-purple-600">+{activityBonus.completionBonus}점</span>
            </div>
          </div>
          
          <div className="border-t-2 border-gray-400 pt-4 mt-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-gray-800">💰 활동 보너스 총합</span>
              <span className="text-2xl font-bold text-indigo-600">{activityBonus.total.toLocaleString()}점</span>
            </div>
          </div>
        </div>

        {/* 티켓 교환 안내 */}
        <div className="bg-yellow-50 rounded-lg p-4 mb-8">
          <div className="flex items-start space-x-2">
            <div className="text-yellow-600">🎫</div>
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">
                룰렛 티켓 {ticketsToShow}장을 획득했습니다!
              </h4>
              <p className="text-sm text-yellow-700">
                활동 보너스 {activityBonus.total.toLocaleString()}점 ÷ 500점 = {ticketsToShow}장의 티켓
                <br />각 티켓마다 새로운 3개의 상자가 제공되며, 현재 점수에 다양한 효과를 적용할 수 있습니다.
                <br />※ 보너스 점수는 실제 점수에 반영되지 않으며, 티켓 계산용입니다.
              </p>
            </div>
          </div>
        </div>

        {/* 룰렛 시작 버튼 */}
        <div className="text-center">
          <button
            onClick={handleStartRoulette}
            disabled={ticketsToShow === 0}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {ticketsToShow > 0 ? `🎫 룰렛 상자 선택하기 (${ticketsToShow}장)` : '🎫 티켓이 부족합니다'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      {/* 스테이지 헤더 */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-4">🎰</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">룰렛 상자 선택</h2>
        <p className="text-gray-600">
          매 라운드마다 새로운 3개의 상자가 제공됩니다!
        </p>
        <div className="mt-4 text-lg font-bold text-purple-600">
          🎫 라운드: {usedTickets + 1} / {availableTickets} (남은 티켓: {availableTickets - usedTickets}장)
        </div>
        <div className="mt-2 text-sm text-gray-600">
          현재 점수: {boxResults.length > 0 ? boxResults[boxResults.length - 1].points.toLocaleString() : gameSession.baseScore.toLocaleString()}점
        </div>
      </div>

      {/* 상자 선택 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {currentRoundBoxes.map((box, index) => {
          const boxId = index + 1;
          const isCurrentlyAnimating = currentBoxIndex === boxId;
          
          return (
            <button
              key={`round-${usedTickets + 1}-box-${index}`} // 라운드별로 고유한 key
              onClick={() => handleBoxSelect(boxId)}
              disabled={usedTickets >= availableTickets || isAnimating}
              className={`relative p-6 rounded-xl border-2 transition-all transform hover:scale-105 ${
                isCurrentlyAnimating
                  ? `${box.color} scale-105 ring-4 ring-purple-300`
                  : usedTickets >= availableTickets
                  ? 'opacity-50 scale-95 cursor-not-allowed'
                  : `${box.color} hover:scale-110 hover:shadow-lg`
              }`}
            >
              {/* 상자 아이콘 */}
              <div className="text-4xl mb-3">
                {isCurrentlyAnimating ? '✨' : '📦'}
              </div>
              
              {/* 상자 정보 */}
              <div className="text-lg font-bold text-gray-800 mb-2">
                상자 {boxId}
              </div>
              
              {/* 보상 내용은 가림 - 선택 전에는 보여주지 않음 */}
              {!isCurrentlyAnimating && (
                <div className="text-sm text-gray-600">
                  🎲 신비한 보상
                </div>
              )}
              
              {/* 애니메이션 중 표시 */}
              {isCurrentlyAnimating && (
                <div className="mt-3 p-3 bg-white rounded-lg border">
                  <div className="text-xs text-gray-600 animate-pulse">
                    보상 확인 중...
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 사용한 티켓이 있을 때 결과 요약 */}
      {boxResults.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🎯 선택 결과</h3>
          <div className="space-y-3">
            {boxResults.map((result, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200">
                <div>
                  <span className="font-medium">라운드 {result.round}: </span>
                  <span className="text-sm text-gray-600">{result.result.description}</span>
                </div>
                <span className="font-bold text-purple-600">
                  → {result.points.toLocaleString()}점
                </span>
              </div>
            ))}
          </div>
          
          {usedTickets === availableTickets && (
            <div className="border-t-2 border-gray-400 pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold text-gray-800">🏆 최종 점수</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {boxResults.length > 0 ? boxResults[boxResults.length - 1].points.toLocaleString() : gameSession.baseScore.toLocaleString()}점
                </span>
              </div>
              <div className="text-center mt-4">
                <div className="text-sm text-green-600 font-medium">
                  ✅ 점수가 데이터베이스에 저장되었습니다!
                </div>
                {onComplete ? (
                  <div className="text-xs text-gray-500 mt-1">
                    모든 티켓을 사용했습니다. 3초 후 최종 결과 화면으로 이동합니다...
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 mt-1">
                    모든 티켓을 사용했습니다. 룰렛이 완료되었습니다!
                  </div>
                )}
                <div className="flex justify-center mt-2">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                    <div className="text-xs text-gray-500">
                      게임을 완료하는 중...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 안내 메시지 */}
      {usedTickets < availableTickets && (
        <div className="text-center">
          <p className="text-sm text-gray-500">
            🎯 상자를 선택하여 신비한 보상을 받아보세요! (라운드 {usedTickets + 1}/{availableTickets})
          </p>
          <p className="text-xs text-gray-400 mt-1">
            매 라운드마다 완전히 새로운 3가지 보상이 준비되어 있습니다
          </p>
        </div>
      )}
    </div>
  );
};

export default RoguelikeRouletteStage; 