import React, { useState } from 'react';
import { RoguelikeStageType, RoguelikeGameSession } from '../../../types/roguelike';

interface RoguelikeRewardBoxProps {
  stageType: Exclude<RoguelikeStageType, 'start'>;
  onBoxSelect: (points: number) => void;
  gameSession?: RoguelikeGameSession;
  isOpen?: boolean;
  onClose?: () => void;
}

const RoguelikeRewardBox: React.FC<RoguelikeRewardBoxProps> = ({
  stageType,
  onBoxSelect,
  gameSession,
  isOpen = true,
  onClose
}) => {
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // 게임 상태 정보 계산
  const gameStats = React.useMemo(() => {
    if (!gameSession) return null;
    
    return {
      currentScore: gameSession.baseScore || 0,
      currentStreak: gameSession.currentStreak || 0,
    };
  }, [gameSession]);

  // 보유 아이템/버프 정보 계산
  const activeBuffs = React.useMemo(() => {
    if (!gameSession?.temporaryBuffs) return [];
    
    return gameSession.temporaryBuffs
      .filter((buff: any) => buff.active)
      .map((buff: any) => {
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

  // 스테이지별 보상 상자 설정
  const getBoxConfig = () => {
    switch (stageType) {
      case 'normal':
        return {
          title: '일반 스테이지 클리어!',
          emoji: '🗡️',
          boxes: [
            { points: 100, chance: '40%', color: 'bg-blue-100 border-blue-300' },
            { points: 200, chance: '35%', color: 'bg-green-100 border-green-300' },
            { points: 300, chance: '25%', color: 'bg-purple-100 border-purple-300' }
          ]
        };
      case 'elite':
        return {
          title: '엘리트 스테이지 클리어!',
          emoji: '⚔️',
          boxes: [
            { points: 300, chance: '40%', color: 'bg-orange-100 border-orange-300' },
            { points: 600, chance: '35%', color: 'bg-red-100 border-red-300' },
            { points: 800, chance: '25%', color: 'bg-purple-100 border-purple-300' }
          ]
        };
      case 'campfire':
        return {
          title: '모닥불 스테이지 완료!',
          emoji: '🔥',
          boxes: [
            { points: 50, chance: '50%', color: 'bg-yellow-100 border-yellow-300' },
            { points: 100, chance: '30%', color: 'bg-orange-100 border-orange-300' },
            { points: 150, chance: '20%', color: 'bg-red-100 border-red-300' }
          ]
        };
      default:
        return {
          title: '스테이지 클리어!',
          emoji: '🎉',
          boxes: [
            { points: 50, chance: '50%', color: 'bg-gray-100 border-gray-300' },
            { points: 100, chance: '30%', color: 'bg-blue-100 border-blue-300' },
            { points: 150, chance: '20%', color: 'bg-purple-100 border-purple-300' }
          ]
        };
    }
  };

  const config = getBoxConfig();

  const handleBoxSelect = (points: number, boxIndex: number) => {
    if (selectedBox !== null) return;
    
    setSelectedBox(boxIndex);
    setIsAnimating(true);
    
    // 애니메이션 후 콜백 실행
    setTimeout(() => {
      onBoxSelect(points);
    }, 2000);
  };

  // 실제 보상 포인트 계산 (확률 기반)
  const getActualReward = (boxIndex: number) => {
    const random = Math.random();
    const boxes = config.boxes;
    
    // 선택한 상자의 포인트 반환 (실제로는 랜덤이지만 UI상으로는 선택한 것처럼)
    return boxes[boxIndex].points;
  };

  // 모달이 열려있지 않으면 렌더링하지 않음
  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 배경 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* 모달 컨테이너 */}
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-pulse"
          onClick={(e) => e.stopPropagation()}
          style={{
            animation: 'modalSlideIn 0.3s ease-out'
          }}
        >
          {/* 모달 헤더 */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-2xl">
            {/* 게임 상태 바 (간소화) */}
            {gameStats && (
              <div className="mb-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-3 border border-yellow-200">
                <div className="grid grid-cols-2 gap-4">
                  {/* 현재 점수 */}
                  <div className="text-center">
                    <div className="text-xl font-bold text-yellow-600">{gameStats.currentScore.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">점수</div>
                  </div>
                  
                  {/* 현재 연속 */}
                  <div className="text-center">
                    <div className="text-xl font-bold text-orange-600">{gameStats.currentStreak}</div>
                    <div className="text-xs text-gray-600">연속 🔥</div>
                  </div>
                </div>

                {/* 보유 아이템/버프 표시 */}
                {activeBuffs.length > 0 && (
                  <div className="border-t border-orange-200 pt-3 mt-3">
                    <div className="text-xs text-gray-600 mb-2">🎒 보유 아이템</div>
                    <div className="flex flex-wrap gap-2">
                      {activeBuffs.map((buff, index) => (
                        <div 
                          key={index}
                          className="bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1 rounded-full text-xs border border-purple-300 shadow-sm"
                          title={buff.description}
                        >
                          {buff.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activeBuffs.length === 0 && (
                  <div className="border-t border-orange-200 pt-3 mt-3">
                    <div className="text-xs text-gray-500 text-center">아직 보유한 아이템이 없습니다</div>
                  </div>
                )}
              </div>
            )}

            {/* 타이틀 */}
            <div className="text-center">
              <div className="text-4xl mb-2">{config.emoji}</div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">{config.title}</h2>
              <p className="text-sm text-gray-600">
                보상 상자를 선택하여 추가 점수를 획득하세요!
              </p>
            </div>
          </div>

          {/* 모달 본문 */}
          <div className="p-6">
            {/* 보상 상자들 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {config.boxes.map((box, index) => (
                <button
                  key={index}
                  onClick={() => handleBoxSelect(box.points, index)}
                  disabled={selectedBox !== null}
                  className={`relative p-6 rounded-xl border-2 transition-all transform hover:scale-105 ${
                    selectedBox === index
                      ? `${box.color} scale-105 ring-4 ring-yellow-300`
                      : selectedBox !== null
                      ? 'opacity-50 scale-95'
                      : `${box.color} hover:scale-110 hover:shadow-lg`
                  }`}
                >
                  {/* 상자 아이콘 */}
                  <div className="text-3xl mb-2">
                    {selectedBox === index && isAnimating ? '✨' : '📦'}
                  </div>
                  
                  {/* 상자 정보 */}
                  <div className="text-lg font-bold text-gray-800 mb-1">
                    상자 {index + 1}
                  </div>
                  <div className="text-sm text-gray-600">
                    확률: {box.chance}
                  </div>
                  
                  {/* 선택된 상자의 결과 표시 */}
                  {selectedBox === index && (
                    <div className="mt-3 p-2 bg-white rounded-lg">
                      <div className="text-xl font-bold text-green-600">
                        +{getActualReward(index)}점!
                      </div>
                      <div className="text-xs text-gray-600">
                        {isAnimating ? '보상 적용 중...' : '보상 적용됨!'}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* 확률 정보 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-800 mb-3 text-sm">💡 보상 확률 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                {config.boxes.map((box, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span>{box.points}점</span>
                    <span className="text-gray-600">{box.chance}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 선택 안내 */}
            {selectedBox === null && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  🎯 상자를 선택하여 보상을 받아보세요!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 모달 애니메이션 CSS */}
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

export default RoguelikeRewardBox; 