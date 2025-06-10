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
  const [selectedMultiplier, setSelectedMultiplier] = useState<number | null>(null);
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
              label: '상자 1',
              icon: '📦'
            },
            { 
              minPoints: 80, 
              maxPoints: 350, 
              color: 'bg-green-100 border-green-300',
              label: '상자 2',
              icon: '📦'
            },
            { 
              minPoints: 80, 
              maxPoints: 350, 
              color: 'bg-purple-100 border-purple-300',
              label: '상자 3',
              icon: '📦'
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
              label: '상자 1',
              icon: '💎'
            },
            { 
              minPoints: 250, 
              maxPoints: 1000, 
              color: 'bg-red-100 border-red-300',
              label: '상자 2',
              icon: '💎'
            },
            { 
              minPoints: 250, 
              maxPoints: 1000, 
              color: 'bg-purple-100 border-purple-300',
              label: '상자 3',
              icon: '💎'
            }
          ]
        };
      case 'campfire':
        return {
          title: '모닥불 스테이지 완료!',
          emoji: '🔥',
          isMultiplier: true,
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
              label: '상자 1',
              icon: '🔮'
            },
            { 
              minPoints: 30, 
              maxPoints: 180, 
              color: 'bg-blue-100 border-blue-300',
              label: '상자 2',
              icon: '🔮'
            },
            { 
              minPoints: 30, 
              maxPoints: 180, 
              color: 'bg-purple-100 border-purple-300',
              label: '상자 3',
              icon: '🔮'
            }
          ]
        };
    }
  };

  // 모닥불 곱셈 보상 박스 생성
  const getCampfireMultiplierBoxes = () => {
    const baseBoxes = [
      { id: 1, multiplier: 0.8, description: '현재 점수 × 0.8배', icon: '🔮' },
      { id: 2, multiplier: 0.9, description: '현재 점수 × 0.9배', icon: '🔮' },
      { id: 3, multiplier: 1.1, description: '현재 점수 × 1.1배', icon: '🔮' },
      { id: 4, multiplier: 1.2, description: '현재 점수 × 1.2배', icon: '🔮' },
      { id: 5, multiplier: 1.3, description: '현재 점수 × 1.3배', icon: '🔮' },
      { id: 6, multiplier: 1.4, description: '현재 점수 × 1.4배', icon: '🔮' },
      { id: 7, multiplier: 1.5, description: '현재 점수 × 1.5배', icon: '🔮' },
      { id: 8, multiplier: 1.6, description: '현재 점수 × 1.6배', icon: '🔮' },
      { id: 9, multiplier: 1.8, description: '현재 점수 × 1.8배', icon: '🔮' },
      { id: 10, multiplier: 2.0, description: '현재 점수 × 2.0배', icon: '🔮' }
    ];

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
    
    const box = config.boxes![boxIndex];
    const randomPoints = Math.floor(Math.random() * (box.maxPoints - box.minPoints + 1)) + box.minPoints;
    setFinalRewardPoints(randomPoints);
    
    setTimeout(() => {
      onBoxSelect(randomPoints);
    }, 2000);
  };

  const handleMultiplierSelect = (multiplierIndex: number) => {
    if (selectedMultiplier !== null || !config.isMultiplier) return;
    
    setSelectedMultiplier(multiplierIndex);
    setIsAnimating(true);
    
    const currentScore = gameStats?.currentScore || 0;
    const multiplier = config.multiplierBoxes![multiplierIndex].multiplier;
    const newScore = Math.floor(currentScore * multiplier);
    setFinalRewardPoints(newScore);
    
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
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* 모달 컨테이너 */}
        <div 
          className="bg-gradient-to-br from-gray-800 via-purple-800 to-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30 backdrop-blur-sm relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          style={{
            animation: 'modalSlideIn 0.3s ease-out'
          }}
        >
          {/* 네온 글로우 효과 */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-pink-500/10 rounded-3xl animate-pulse"></div>
          <div className="absolute top-4 right-4 w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
          <div className="absolute bottom-4 left-4 w-2 h-2 bg-pink-400 rounded-full animate-ping"></div>
          
          {/* 모달 헤더 */}
          <div className="sticky top-0 bg-gradient-to-r from-gray-800/95 via-purple-800/95 to-gray-900/95 border-b border-purple-400/30 p-6 rounded-t-3xl backdrop-blur-sm relative z-10">
            {/* 타이틀 */}
            <div className="text-center">
              <div className="text-6xl mb-2 drop-shadow-[0_0_25px_rgba(168,85,247,0.8)]">{config.emoji}</div>
              <h2 className="text-2xl font-bold text-white mb-1 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">{config.title}</h2>
              <p className="text-sm text-purple-300">
                {config.isMultiplier ? '우주 에너지 증폭 보상을 선택하세요!' : '우주 보물상자를 선택하여 추가 점수를 획득하세요!'}
              </p>
            </div>
          </div>

          {/* 모달 본문 */}
          <div className="p-8 relative z-10">
            {/* 곱셈 보상 선택 (모닥불 스테이지) */}
            {config.isMultiplier && config.multiplierBoxes && (
              <div className="flex justify-center items-center gap-8 mb-6">
                {config.multiplierBoxes.map((multiplier, index) => (
                  <button
                    key={multiplier.id}
                    onClick={() => handleMultiplierSelect(index)}
                    disabled={selectedMultiplier !== null}
                    className={`relative transition-all transform hover:scale-125 ${
                      selectedMultiplier === index
                        ? 'scale-125 animate-bounce'
                        : selectedMultiplier !== null
                        ? 'opacity-30 scale-75'
                        : 'hover:scale-125'
                    }`}
                  >
                    <div className={`text-8xl transition-all ${
                      selectedMultiplier === index && isAnimating ? 'animate-spin' : ''
                    }`}>
                      {selectedMultiplier === index && isAnimating ? '✨' : multiplier.icon}
                    </div>
                    
                    {/* 선택 결과 표시 (선택된 아이콘 아래에만) */}
                    {selectedMultiplier === index && (
                      <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 p-2 bg-orange-500/20 rounded-lg border border-orange-400/30 backdrop-blur-sm whitespace-nowrap">
                        <div className="text-sm font-bold text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.7)]">
                          점수 {multiplier.multiplier}배!
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 보상 상자들 (일반/엘리트 스테이지) */}
            {!config.isMultiplier && config.boxes && (
              <div className="flex justify-center items-center gap-8 mb-6">
                {config.boxes.map((box, index) => (
                  <button
                    key={index}
                    onClick={() => handleBoxSelect(index)}
                    disabled={selectedBox !== null}
                    className={`relative transition-all transform hover:scale-125 ${
                      selectedBox === index
                        ? 'scale-125 animate-bounce'
                        : selectedBox !== null
                        ? 'opacity-30 scale-75'
                        : 'hover:scale-125'
                    }`}
                  >
                    <div className={`text-8xl transition-all ${
                      selectedBox === index && isAnimating ? 'animate-spin' : ''
                    }`}>
                      {selectedBox === index && isAnimating ? '✨' : box.icon}
                    </div>
                    
                    {/* 선택된 상자의 결과 표시 (선택된 아이콘 아래에만) */}
                    {selectedBox === index && (
                      <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 p-2 bg-cyan-500/20 rounded-lg border border-cyan-400/30 backdrop-blur-sm whitespace-nowrap">
                        <div className="text-lg font-bold text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.7)]">
                          +{finalRewardPoints}점!
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* 선택 안내 */}
            {selectedBox === null && selectedMultiplier === null && (
              <div className="mt-8 text-center">
                <p className="text-sm text-purple-300">
                  🌌 {config.isMultiplier ? '에너지 증폭을 선택하여 점수를 늘려보세요!' : '우주 보물상자를 선택하여 보상을 받아보세요!'}
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