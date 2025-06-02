import React, { useState, useEffect } from 'react';
import { RoguelikeGameSession, RouletteResult } from '../../../types/roguelike';

interface RoguelikeRouletteStageProps {
  gameSession: RoguelikeGameSession;
  onSpinRoulette: () => RouletteResult;
}

const RoguelikeRouletteStage: React.FC<RoguelikeRouletteStageProps> = ({
  gameSession,
  onSpinRoulette
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [results, setResults] = useState<RouletteResult[]>([]);
  const [showActivityBonus, setShowActivityBonus] = useState(true);
  const [currentSpinIndex, setCurrentSpinIndex] = useState(0);
  const [totalSpins, setTotalSpins] = useState(0);

  const handleSpinRoulette = () => {
    if (isSpinning || results.length > 0) return;
    
    setIsSpinning(true);
    setShowActivityBonus(false);
    
    // [규칙 4] 보너스 점수에 따라 룰렛 횟수 결정
    const spins = calculateRouletteSpins();
    setTotalSpins(spins);
    
    performRouletteSpins(spins);
  };

  // [규칙 4] 보너스 점수에 따라 룰렛 돌릴 횟수 계산
  const calculateRouletteSpins = () => {
    const activityBonus = calculateActivityBonus();
    const totalBonusPoints = activityBonus.total;
    
    // 보너스 점수에 따른 룰렛 횟수 결정
    if (totalBonusPoints >= 2000) return 5;      // 2000점 이상: 5회
    if (totalBonusPoints >= 1500) return 4;      // 1500점 이상: 4회
    if (totalBonusPoints >= 1000) return 3;      // 1000점 이상: 3회
    if (totalBonusPoints >= 500) return 2;       // 500점 이상: 2회
    return 1;                                    // 기본: 1회
  };

  const performRouletteSpins = async (spins: number) => {
    const spinResults: RouletteResult[] = [];
    
    for (let i = 0; i < spins; i++) {
      setCurrentSpinIndex(i + 1);
      
      // 각 스핀마다 3초 대기
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // [규칙 4] 엘리트와 같은 다양한 보상 시스템
      const result = generateEliteStyleReward(i === spins - 1); // 마지막 스핀에는 특별 보상 가능
      spinResults.push(result);
    }
    
    setResults(spinResults);
    setCurrentSpinIndex(0);
    setIsSpinning(false);
  };

  // [규칙 4] 엘리트 스테이지와 같은 다양한 보상 생성
  const generateEliteStyleReward = (isLastSpin: boolean): RouletteResult => {
    const activityBonus = calculateActivityBonus();
    const basePoints = activityBonus.total;
    
    // 마지막 스핀에는 더 좋은 보상 확률 증가
    const specialChance = isLastSpin ? 0.4 : 0.2;
    
    const rewardType = Math.random();
    
    if (rewardType < specialChance * 0.3) {
      // 점수 2배 (매우 희귀)
      const multiplier = 2.0;
      const bonusPoints = gameSession.baseScore;
      return {
        multiplier,
        bonusPoints,
        message: "🎉 대박! 현재 점수가 2배가 됩니다!"
      };
    } else if (rewardType < specialChance * 0.6) {
      // 고정 대량 점수 (희귀)
      const multiplier = 3.0 + Math.random() * 2.0; // 3.0~5.0배
      const bonusPoints = Math.floor(basePoints * multiplier);
      return {
        multiplier,
        bonusPoints,
        message: `🌟 엄청난 행운! ${multiplier.toFixed(1)}배 점수 획득!`
      };
    } else if (rewardType < specialChance) {
      // 높은 배수 (일반 특별)
      const multiplier = 2.0 + Math.random() * 1.5; // 2.0~3.5배
      const bonusPoints = Math.floor(basePoints * multiplier);
      return {
        multiplier,
        bonusPoints,
        message: `✨ 대성공! ${multiplier.toFixed(1)}배 점수 획득!`
      };
    } else {
      // 일반 보상
      const multiplier = 0.5 + Math.random() * 1.5; // 0.5~2.0배
      const bonusPoints = Math.floor(basePoints * multiplier);
      const message = multiplier >= 1.5 ? `🎊 성공! ${multiplier.toFixed(1)}배 점수!` :
                      multiplier >= 1.0 ? `👍 보통! ${multiplier.toFixed(1)}배 점수!` :
                      `😅 아쉽! ${multiplier.toFixed(1)}배 점수...`;
      return {
        multiplier,
        bonusPoints,
        message
      };
    }
  };

  const calculateActivityBonus = () => {
    const bonus = {
      correctAnswerBonus: gameSession.correctAnswers * 50,
      streakBonus: gameSession.maxStreak * 30,
      speedBonus: gameSession.averageAnswerTime < 30 ? 200 : 0,
      participationBonus: gameSession.participatedInOpinion ? 150 : 0,
      completionBonus: 300
    };

    // 열정 버프가 활성화되어 있으면 연속 정답 보너스 2배
    const passionBuff = gameSession.temporaryBuffs.find(
      buff => buff.id === 'PASSION_BUFF' && buff.active
    );
    if (passionBuff) {
      const stackCount = passionBuff.stackCount || 1;
      bonus.streakBonus *= (2 * stackCount);
    }

    // 지혜 버프는 완료 보너스에 적용
    const wisdomBuff = gameSession.temporaryBuffs.find(
      buff => buff.id === 'WISDOM_BUFF' && buff.active
    );
    if (wisdomBuff) {
      const stackCount = wisdomBuff.stackCount || 1;
      bonus.completionBonus += (50 * stackCount * gameSession.correctAnswers);
    }

    const total = bonus.correctAnswerBonus + bonus.streakBonus + 
                  bonus.speedBonus + bonus.participationBonus + bonus.completionBonus;

    return { ...bonus, total };
  };

  const activityBonus = calculateActivityBonus();
  const totalBonusFromRoulette = results.reduce((sum, result) => sum + result.bonusPoints, 0);

  if (showActivityBonus) {
    const spinsToShow = calculateRouletteSpins();
    
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* 스테이지 헤더 */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🎰</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">최종 룰렛 - 활동 보너스 점수!</h2>
          <p className="text-gray-600">
            모험을 완주하신 것을 축하합니다! 활동 보너스를 확인해보세요.
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

        {/* 룰렛 안내 */}
        <div className="bg-yellow-50 rounded-lg p-4 mb-8">
          <div className="flex items-start space-x-2">
            <div className="text-yellow-600">🎰</div>
            <div>
              <h4 className="font-medium text-yellow-800 mb-1">
                보너스 룰렛 {spinsToShow}회가 기다리고 있습니다!
              </h4>
              <p className="text-sm text-yellow-700">
                활동 보너스 {activityBonus.total.toLocaleString()}점에 따라 {spinsToShow}번의 룰렛 기회를 획득했습니다!
                <br />각 룰렛은 점수 2배, 고정 대량 점수 등 다양한 보상을 제공합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 룰렛 시작 버튼 */}
        <div className="text-center">
          <button
            onClick={handleSpinRoulette}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105"
          >
            🎰 보너스 룰렛 {spinsToShow}회 시작!
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
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          보너스 룰렛 {results.length > 0 ? `완료 (${totalSpins}회)` : `진행중 (${currentSpinIndex}/${totalSpins})`}
        </h2>
        <p className="text-gray-600">
          {isSpinning ? `${currentSpinIndex}번째 룰렛을 돌리는 중...` : '모든 룰렛이 완료되었습니다!'}
        </p>
      </div>

      {/* 룰렛 애니메이션 */}
      <div className="text-center mb-8">
        {isSpinning ? (
          <div className="relative">
            <div className="text-8xl animate-spin">🎰</div>
            <p className="mt-4 text-lg font-medium text-gray-600">
              {currentSpinIndex}번째 룰렛을 돌리는 중...
            </p>
            <div className="mt-2 text-sm text-gray-500">
              {currentSpinIndex - 1}회 완료, {totalSpins - currentSpinIndex + 1}회 남음
            </div>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-6">
            <div className="text-8xl">🎉</div>
            
            {/* 각 룰렛 결과 표시 */}
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">
                    {index + 1}번째 룰렛: × {result.multiplier.toFixed(1)}배
                  </h3>
                  <p className="text-md text-indigo-600 font-bold mb-1">
                    +{result.bonusPoints.toLocaleString()}점 획득!
                  </p>
                  <p className="text-sm text-gray-600">{result.message}</p>
                </div>
              ))}
            </div>

            {/* 최종 결과 */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🎉 최종 결과</h3>
              
              <div className="space-y-2 text-left">
                <div className="flex justify-between">
                  <span>• 기본 점수:</span>
                  <span className="font-medium">{gameSession.baseScore.toLocaleString()}점</span>
                </div>
                <div className="flex justify-between">
                  <span>• 활동 보너스:</span>
                  <span className="font-medium">{activityBonus.total.toLocaleString()}점</span>
                </div>
                <div className="flex justify-between">
                  <span>• 룰렛 보너스 ({totalSpins}회):</span>
                  <span className="font-medium text-purple-600">+{totalBonusFromRoulette.toLocaleString()}점</span>
                </div>
                <div className="border-t-2 border-gray-400 pt-2 mt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>🏆 총 최종 점수:</span>
                    <span className="text-indigo-600">
                      {(gameSession.baseScore + activityBonus.total + totalBonusFromRoulette).toLocaleString()}점
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              축하합니다! 잠시 후 최종 결과를 확인할 수 있습니다...
            </div>
          </div>
        ) : (
          <div className="text-8xl opacity-50">🎰</div>
        )}
      </div>
    </div>
  );
};

export default RoguelikeRouletteStage; 