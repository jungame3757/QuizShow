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
  const [selectedMultiplier, setSelectedMultiplier] = useState<any | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [finalRewardPoints, setFinalRewardPoints] = useState<number>(0);

  // 게임 상태 정보 계산
  const gameStats = React.useMemo(() => {
    if (!gameSession) return null;
    
    return {
      currentScore: gameSession.baseScore || 0,
      currentStreak: gameSession.currentStreak || 0,
    };
  }, [gameSession]);

  // 스테이지별 보상 상자 설정
  const getBoxConfig = () => {
    switch (stageType) {
      case 'normal':
        return {
          title: '일반 스테이지 클리어!',
          emoji: '🗡️',
          boxes: [
            { 
              minPoints: 80, 
              maxPoints: 350, 
              color: 'bg-blue-100 border-blue-300',
              label: '상자 1' 
            },
            { 
              minPoints: 80, 
              maxPoints: 350, 
              color: 'bg-green-100 border-green-300',
              label: '상자 2' 
            },
            { 
              minPoints: 80, 
              maxPoints: 350, 
              color: 'bg-purple-100 border-purple-300',
              label: '상자 3' 
            }
          ]
        };
      case 'elite':
        return {
          title: '엘리트 스테이지 클리어!',
          emoji: '⚔️',
          boxes: [
            { 
              minPoints: 250, 
              maxPoints: 1000, 
              color: 'bg-orange-100 border-orange-300',
              label: '상자 1' 
            },
            { 
              minPoints: 250, 
              maxPoints: 1000, 
              color: 'bg-red-100 border-red-300',
              label: '상자 2' 
            },
            { 
              minPoints: 250, 
              maxPoints: 1000, 
              color: 'bg-purple-100 border-purple-300',
              label: '상자 3' 
            }
          ]
        };
      case 'campfire':
        return {
          title: '모닥불 스테이지 완료!',
          emoji: '🔥',
          isMultiplier: true, // 곱셈 방식 표시
          multiplierBoxes: getCampfireMultiplierBoxes()
        };
      default:
        return {
          title: '스테이지 클리어!',
          emoji: '🎉',
          boxes: [
            { 
              minPoints: 30, 
              maxPoints: 180, 
              color: 'bg-gray-100 border-gray-300',
              label: '상자 1' 
            },
            { 
              minPoints: 30, 
              maxPoints: 180, 
              color: 'bg-blue-100 border-blue-300',
              label: '상자 2' 
            },
            { 
              minPoints: 30, 
              maxPoints: 180, 
              color: 'bg-purple-100 border-purple-300',
              label: '상자 3' 
            }
          ]
        };
    }
  };

  // 모닥불 곱셈 보상 박스 생성
  const getCampfireMultiplierBoxes = () => {
    // 기본 보상 박스들 (모두 곱셈 방식, 0.8~2배 범위)
    const baseBoxes = [
      { id: 1, multiplier: 0.8, description: '현재 점수 × 0.8배' },
      { id: 2, multiplier: 0.9, description: '현재 점수 × 0.9배' },
      { id: 3, multiplier: 1.1, description: '현재 점수 × 1.1배' },
      { id: 4, multiplier: 1.2, description: '현재 점수 × 1.2배' },
      { id: 5, multiplier: 1.3, description: '현재 점수 × 1.3배' },
      { id: 6, multiplier: 1.4, description: '현재 점수 × 1.4배' },
      { id: 7, multiplier: 1.5, description: '현재 점수 × 1.5배' },
      { id: 8, multiplier: 1.6, description: '현재 점수 × 1.6배' },
      { id: 9, multiplier: 1.8, description: '현재 점수 × 1.8배' },
      { id: 10, multiplier: 2.0, description: '현재 점수 × 2.0배' }
    ];

    // 3개의 랜덤 박스 선택
    const shuffled = [...baseBoxes].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).map((box, index) => ({
      ...box,
      id: index + 1,
      label: `보상 ${index + 1}`,
      color: 'bg-orange-100 border-orange-300'
    }));
  };

  const config = getBoxConfig();

  const handleBoxSelect = (boxIndex: number) => {
    if (selectedBox !== null || config.isMultiplier) return;
    
    setSelectedBox(boxIndex);
    setIsAnimating(true);
    
    // 랜덤 점수 계산 (한 번만 계산하여 고정)
    const box = config.boxes![boxIndex];
    const randomPoints = Math.floor(Math.random() * (box.maxPoints - box.minPoints + 1)) + box.minPoints;
    setFinalRewardPoints(randomPoints);
    
    // 애니메이션 후 콜백 실행
    setTimeout(() => {
      onBoxSelect(randomPoints);
    }, 2000);
  };

  const handleMultiplierSelect = (multiplierIndex: number) => {
    if (selectedMultiplier !== null || !config.isMultiplier) return;
    
    setSelectedMultiplier(config.multiplierBoxes![multiplierIndex]);
    setIsAnimating(true);
    
    // 현재 점수에 배수 적용
    const currentScore = gameStats?.currentScore || 0;
    const multiplier = config.multiplierBoxes![multiplierIndex].multiplier;
    const newScore = Math.floor(currentScore * multiplier);
    setFinalRewardPoints(newScore);
    
    // 애니메이션 후 콜백 실행 (곱셈 결과 전달)
    setTimeout(() => {
      onBoxSelect(newScore);
    }, 2000);
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
              </div>
            )}

            {/* 타이틀 */}
            <div className="text-center">
              <div className="text-4xl mb-2">{config.emoji}</div>
              <h2 className="text-xl font-bold text-gray-800 mb-1">{config.title}</h2>
              <p className="text-sm text-gray-600">
                {config.isMultiplier ? '점수 곱셈 보상을 선택하세요!' : '보상 상자를 선택하여 추가 점수를 획득하세요!'}
              </p>
            </div>
          </div>

          {/* 모달 본문 */}
          <div className="p-6">
            {/* 곱셈 보상 선택 (모닥불 스테이지) */}
            {config.isMultiplier && config.multiplierBoxes && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {config.multiplierBoxes.map((multiplier, index) => (
                  <button
                    key={multiplier.id}
                    onClick={() => handleMultiplierSelect(index)}
                    disabled={selectedMultiplier !== null}
                    className={`relative p-6 rounded-xl border-2 transition-all transform hover:scale-105 ${
                      selectedMultiplier === multiplier
                        ? `${multiplier.color} scale-105 ring-4 ring-orange-300`
                        : selectedMultiplier !== null
                        ? 'opacity-50 scale-95'
                        : `${multiplier.color} hover:scale-110 hover:shadow-lg`
                    }`}
                  >
                    {/* 보상 아이콘 */}
                    <div className="text-3xl mb-2">
                      {selectedMultiplier === multiplier && isAnimating ? '✨' : '🎁'}
                    </div>
                    
                    {/* 보상 정보 */}
                    <div className="text-lg font-bold text-gray-800 mb-2">
                      {multiplier.label}
                    </div>
                    
                    {/* 선택 전에는 신비한 보상으로 표시, 선택 후에만 실제 배수 공개 */}
                    {selectedMultiplier !== multiplier && (
                      <div className="text-sm text-gray-600 mb-3">
                        🎲 신비한 배수 보상
                      </div>
                    )}

                    {/* 선택된 상자가 아니고 아직 선택하지 않은 경우 예상 결과 점수 숨김 */}
                    {selectedMultiplier === null && (
                      <div className="text-xs text-gray-500">
                        현재 점수: {(gameStats?.currentScore || 0).toLocaleString()}점
                      </div>
                    )}
                    
                    {/* 선택 결과 표시 (선택된 상자만) */}
                    {selectedMultiplier === multiplier && (
                      <div className="mt-3 p-2 bg-white rounded-lg">
                        <div className="text-lg font-bold text-orange-600 mb-1">
                          🎉 {multiplier.description}
                        </div>
                        <div className="text-sm font-bold text-green-600">
                          {gameStats?.currentScore.toLocaleString()}점 → {finalRewardPoints.toLocaleString()}점
                        </div>
                        <div className="text-xs text-gray-600">
                          {isAnimating ? '보상 적용 중...' : '보상 적용됨!'}
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 보상 상자들 (일반/엘리트 스테이지) */}
            {!config.isMultiplier && config.boxes && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {config.boxes.map((box, index) => (
                  <button
                    key={index}
                    onClick={() => handleBoxSelect(index)}
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
                      {box.label}
                    </div>
                    <div className="text-sm text-gray-600">
                      {box.minPoints} ~ {box.maxPoints}점
                    </div>
                    
                    {/* 선택된 상자의 결과 표시 */}
                    {selectedBox === index && (
                      <div className="mt-3 p-2 bg-white rounded-lg">
                        <div className="text-xl font-bold text-green-600">
                          +{finalRewardPoints}점!
                        </div>
                        <div className="text-xs text-gray-600">
                          {isAnimating ? '보상 적용 중...' : '보상 적용됨!'}
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 선택 안내 */}
            {selectedBox === null && selectedMultiplier === null && (
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500">
                  🎯 {config.isMultiplier ? '곱셈 보상을 선택하여 점수를 늘려보세요!' : '상자를 선택하여 보상을 받아보세요!'}
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