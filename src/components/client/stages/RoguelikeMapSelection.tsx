import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  NodeTypes,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Sparkle } from 'lucide-react';
import { PathChoice, MapPathType, RoguelikeStage, RoguelikeGameSession, RouletteResult } from '../../../types/roguelike';

// 커스텀 노드 컴포넌트
const StartNode = ({ data }: { data: any }) => {
  // StageNode와 동일한 비활성화 로직 적용
  const { isActive = false, isCompleted = false, isFailed = false, onClick } = data;
  const isClickable = isActive && !isCompleted && !isFailed;
  
  return (
    <div className="relative">
      <Handle type="source" position={Position.Top} className="w-3 h-3 bg-green-500 border-2 border-white invisible" /> 
      {/* 별자리 별처럼 빛나는 효과 */}
      <div className="absolute inset-0 w-16 h-16 bg-gradient-to-r from-cyan-400/30 to-blue-400/30 rounded-full animate-pulse"></div>
      <div className="absolute inset-1 w-14 h-14 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full animate-ping"></div>
      
      <div 
        className={`relative w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-full shadow-[0_0_30px_rgba(34,211,238,0.8)] border-2 border-cyan-300/50 flex items-center justify-center transform transition-all duration-300 overflow-hidden shimmer-start-node ${isClickable ? 'cursor-pointer hover:scale-110 hover:shadow-[0_0_40px_rgba(34,211,238,1)]' : 'cursor-default'}`}
        style={{
          boxShadow: '0 0 30px rgba(34, 211, 238, 0.8), inset 0 0 20px rgba(255, 255, 255, 0.2)'
        }}
        onClick={() => { if (isClickable && onClick) onClick(); }}
      >
        <div className="text-3xl drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">🚀</div>
        
        {/* 고급 별빛 효과 */}
        <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
          {Array.from({ length: 6 }).map((_, i) => {
            const positions = [
              { top: '10%', left: '20%', size: 8, delay: 0 },
              { top: '80%', left: '15%', size: 6, delay: 0.5 },
              { top: '25%', right: '20%', size: 10, delay: 1 },
              { top: '70%', right: '25%', size: 4, delay: 1.5 },
              { top: '50%', left: '10%', size: 5, delay: 2 },
              { top: '60%', right: '10%', size: 7, delay: 2.5 }
            ];
            const pos = positions[i];
            return (
              <div 
                key={i}
                className="absolute sparkle-animation-advanced"
                style={{
                  ...pos,
                  animationDelay: `${pos.delay}s`,
                  animationDuration: '3s'
                }}
              >
                <Sparkle 
                  size={pos.size} 
                  className="text-white opacity-90" 
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const StageNode = ({ data }: { data: any }) => {
  const { stageType = 'normal', isActive = false, isCompleted = false, isFailed = false, onClick, label, isClickable: dataIsClickable } = data;
  const getStageInfo = (type: string) => {
    switch (type) {
      case 'elite': return { 
        icon: '⚔️', 
        title: '엘리트', 
        bgClass: 'from-red-400 to-pink-500', 
        borderClass: 'border-red-300/50',
        glowColor: 'rgba(239, 68, 68, 0.8)',
        starColor: 'bg-red-200'
      };
      case 'campfire': return { 
        icon: '🔥', 
        title: '모닥불', 
        bgClass: 'from-orange-400 to-yellow-500', 
        borderClass: 'border-orange-300/50',
        glowColor: 'rgba(251, 146, 60, 0.8)',
        starColor: 'bg-orange-200'
      };
      case 'roulette': return { 
        icon: '🎰', 
        title: '룰렛', 
        bgClass: 'from-purple-400 to-indigo-500', 
        borderClass: 'border-purple-300/50',
        glowColor: 'rgba(168, 85, 247, 0.8)',
        starColor: 'bg-purple-200'
      };
      default: return { 
        icon: '🗡️', 
        title: '일반', 
        bgClass: 'from-blue-400 to-cyan-500', 
        borderClass: 'border-blue-300/50',
        glowColor: 'rgba(59, 130, 246, 0.8)',
        starColor: 'bg-blue-200'
      };
    }
  };
  const stageInfo = getStageInfo(stageType);
  // data에서 전달받은 isClickable을 우선 사용
  const isClickable = dataIsClickable !== undefined ? dataIsClickable : (isActive && !isCompleted && !isFailed);

  // 완료 상태에 따른 스타일 결정
  let statusEffect = '';
  let statusIcon = '';
  let glowEffect = '';
  let backgroundOverride = '';
  
  if (isCompleted && !isFailed) {
    statusEffect = 'shadow-[0_0_25px_rgba(34,197,94,0.8)]';
    statusIcon = '✓';
    glowEffect = '0 0 25px rgba(34, 197, 94, 0.8), inset 0 0 15px rgba(255, 255, 255, 0.2)';
    backgroundOverride = 'from-green-500 to-emerald-600'; // 성공 시 녹색 배경
  } else if (isFailed) {
    statusEffect = 'shadow-[0_0_25px_rgba(239,68,68,0.8)]';
    statusIcon = '✗';
    glowEffect = '0 0 25px rgba(239, 68, 68, 0.8), inset 0 0 15px rgba(255, 255, 255, 0.2)';
    backgroundOverride = 'from-red-500 to-red-600'; // 실패 시 빨간색 배경
  } else if (isActive && !isCompleted) {
    statusEffect = 'shadow-[0_0_30px_rgba(250,204,21,0.9)] animate-pulse';
    glowEffect = `0 0 30px rgba(250, 204, 21, 0.9), inset 0 0 20px rgba(255, 255, 255, 0.3)`;
  } else if (isClickable) {
    statusEffect = `shadow-[0_0_20px_${stageInfo.glowColor.replace('0.8', '0.6')}]`;
    glowEffect = `0 0 20px ${stageInfo.glowColor}, inset 0 0 15px rgba(255, 255, 255, 0.2)`;
  } else {
    glowEffect = `0 0 10px ${stageInfo.glowColor.replace('0.8', '0.3')}, inset 0 0 10px rgba(255, 255, 255, 0.1)`;
  }
  
  // 배경색 결정 (상태에 따라 오버라이드)
  const finalBgClass = backgroundOverride || stageInfo.bgClass;

  return (
    <div className="relative">
      <Handle type="target" position={Position.Bottom} className="w-3 h-3 bg-blue-500 border-2 border-white invisible" />
      
      {/* 별자리 별 빛 효과 */}
      {(isActive || isCompleted || isFailed) && (
        <>
          <div className={`absolute inset-0 w-14 h-14 bg-gradient-to-r ${stageInfo.bgClass.replace('400', '300').replace('500', '400')} opacity-30 rounded-full animate-pulse`}></div>
          <div className={`absolute inset-1 w-12 h-12 bg-gradient-to-r ${stageInfo.bgClass.replace('400', '200').replace('500', '300')} opacity-20 rounded-full animate-ping`}></div>
        </>
      )}
      
      <div
        className={`relative w-14 h-14 bg-gradient-to-r ${finalBgClass} text-white rounded-full border-2 ${stageInfo.borderClass} transition-all duration-300 overflow-hidden ${isClickable ? 'cursor-pointer hover:scale-125 transform shimmer-stage-node' : 'cursor-default'} ${statusEffect} ${!isActive && !isCompleted && !isFailed ? 'opacity-50' : ''} flex items-center justify-center`}
        style={{
          boxShadow: glowEffect
        }}
        onClick={() => { if (isClickable && onClick) onClick(); }}
      >
        <div className="text-2xl drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] relative z-10">{stageInfo.icon}</div>
        
        {/* 고급 별빛 반짝임 효과 */}
        {(isActive || isCompleted || isFailed) && (
          <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
            {Array.from({ length: 4 }).map((_, i) => {
              const positions = [
                { top: '15%', right: '15%', size: 6, delay: 0 },
                { bottom: '20%', left: '20%', size: 4, delay: 0.7 },
                { top: '50%', left: '5%', size: 3, delay: 1.4 },
                { bottom: '10%', right: '5%', size: 5, delay: 2.1 }
              ];
              const pos = positions[i];
              return (
                <div 
                  key={i}
                  className="absolute sparkle-animation-advanced"
                  style={{
                    ...pos,
                    animationDelay: `${pos.delay}s`,
                    animationDuration: '2.8s'
                  }}
                >
                  <Sparkle 
                    size={pos.size} 
                    className={`${stageInfo.starColor.replace('bg-', 'text-')} opacity-90`}
                  />
                </div>
              );
            })}
          </div>
        )}
        

      </div>
      <Handle type="source" position={Position.Top} className="w-3 h-3 bg-blue-500 border-2 border-white invisible" />
    </div>
  );
};

const EndNode = ({ data }: { data: any }) => {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Bottom} className="w-3 h-3 bg-purple-500 border-2 border-white invisible" />
      
      {/* 별자리 최종 별 효과 */}
      {data.isActive && (
        <>
          <div className="absolute inset-0 w-16 h-16 bg-gradient-to-r from-yellow-400/40 to-orange-400/40 rounded-full animate-pulse"></div>
          <div className="absolute inset-1 w-14 h-14 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 rounded-full animate-ping"></div>
          <div className="absolute inset-2 w-12 h-12 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-full animate-pulse"></div>
        </>
      )}
      
             <div 
         className={`relative w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full border-2 border-yellow-300/50 flex items-center justify-center transition-all duration-300 transform hover:scale-110 overflow-hidden shimmer-end-node ${data.isActive ? 'shadow-[0_0_40px_rgba(250,204,21,1)] animate-pulse' : 'shadow-[0_0_20px_rgba(168,85,247,0.6)]'}`}
         style={{
           boxShadow: data.isActive 
             ? '0 0 40px rgba(250, 204, 21, 1), inset 0 0 25px rgba(255, 255, 255, 0.3)' 
             : '0 0 20px rgba(168, 85, 247, 0.6), inset 0 0 15px rgba(255, 255, 255, 0.2)'
         }}
       >
         <div className="text-3xl drop-shadow-[0_0_15px_rgba(255,255,255,1)] relative z-10">🏆</div>
         
         {/* 고급 최종 목표 별빛 효과 */}
         <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
           {Array.from({ length: 8 }).map((_, i) => {
             const positions = [
               { top: '10%', left: '15%', size: 8, delay: 0 },
               { bottom: '15%', right: '20%', size: 6, delay: 0.4 },
               { top: '20%', right: '10%', size: 4, delay: 0.8 },
               { bottom: '20%', left: '15%', size: 7, delay: 1.2 },
               { top: '50%', left: '5%', size: 5, delay: 1.6 },
               { bottom: '10%', right: '5%', size: 3, delay: 2.0 },
               { top: '70%', left: '50%', size: 6, delay: 2.4 },
               { top: '30%', left: '80%', size: 4, delay: 2.8 }
             ];
             const pos = positions[i];
             return (
               <div 
                 key={i}
                 className="absolute sparkle-animation-advanced"
                 style={{
                   ...pos,
                   animationDelay: `${pos.delay}s`,
                   animationDuration: '3.2s'
                 }}
               >
                 <Sparkle 
                   size={pos.size} 
                   className="text-yellow-100 opacity-95" 
                 />
               </div>
             );
           })}
         </div>
         
         {/* 승리의 광채 효과 */}
         {data.isActive && (
           <>
             <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0.5 h-4 bg-gradient-to-t from-yellow-400 to-transparent opacity-80"></div>
             <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0.5 h-4 bg-gradient-to-b from-yellow-400 to-transparent opacity-80"></div>
             <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 h-0.5 w-4 bg-gradient-to-l from-yellow-400 to-transparent opacity-80"></div>
             <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 h-0.5 w-4 bg-gradient-to-r from-yellow-400 to-transparent opacity-80"></div>
           </>
         )}
       </div>
    </div>
  );
};

const nodeTypes: NodeTypes = {
  startNode: StartNode,
  stageNode: StageNode,
  endNode: EndNode,
};

interface MapNode {
  id: string;
  type: 'normal' | 'elite' | 'campfire' | 'roulette' | 'start';
  position: { x: number; y: number };
  connections: string[];
  completed: boolean;
  current: boolean;
  available: boolean;
  reward?: string;
}

interface RoguelikeMapSelectionProps {
  pathType: MapPathType;
  availablePaths: PathChoice[];
  onPathSelect: (nodeId: string) => void;
  allStages?: RoguelikeStage[];
  currentStageIndex?: number;
  mapNodes: Node[];
  mapEdges: Edge[];
  mapStageConnections: Record<string, string[]>;
  initialPlayerPosition?: string;
  gameSession: RoguelikeGameSession;
  onSpinRoulette?: () => RouletteResult;
}

const ViewportUpdater: React.FC<{ 
  currentPlayerPosition: string; 
  nodes: Node[]; 
  isFitViewActive: boolean;
  stageConnections: Record<string, string[]>;
}> = ({ currentPlayerPosition, nodes, isFitViewActive, stageConnections }) => {
  const reactFlowInstance = useReactFlow();
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!reactFlowInstance || !nodes || nodes.length === 0) return;

    // 디바운싱을 위한 타이머
    const timer = setTimeout(() => {
      const mobileBreakpoint = 768;
      const isMobile = windowDimensions.width < mobileBreakpoint;
      
      if (isFitViewActive) {
        reactFlowInstance.fitView({ 
          duration: 400, 
          padding: isMobile ? 0.05 : 0.1, // 모바일에서 더 적은 패딩으로 크게 보이게
          maxZoom: 1.0, // 모바일 최대 줌 증가
          minZoom: 0.3
        });
      } else {
        const currentNode = nodes.find(node => node.id === currentPlayerPosition);

        if (currentNode && currentNode.position) {
          // 안전한 포커싱을 위한 개선된 로직
          const nodeWidth = currentNode.width || 100;
          const nodeHeight = currentNode.height || 60;
          const nodeCenterX = currentNode.position.x + nodeWidth / 2;
          const nodeCenterY = currentNode.position.y + nodeHeight / 2;
          
          // 컨테이너 크기 정보
          const containerWidth = windowDimensions.width;
          const containerHeight = 500; // Tailwind h-[500px] 고정 높이
          
          // 안전한 줌 레벨 계산 (화면 크기에 따라 동적 조정)
          const baseZoom = 0.9; // 모바일에서 더 크게 보이도록 0.7 → 1.2로 증가
          const safeZoom = Math.min(baseZoom, Math.max(0.5, containerWidth / 1200)); // 최소 0.5, 최대 기본값
          
          // 현재 위치에서 선택 가능한 노드들 구하기
          const activatableNodeIds = stageConnections[currentPlayerPosition] || [];
          const activatableNodes = nodes.filter(n => activatableNodeIds.includes(n.id));
          
          // 포커싱 대상: 현재 노드 + 선택 가능한 노드들 (총 3개 내외)
          const focusNodes = [currentNode, ...activatableNodes];
          
          if (focusNodes.length > 1) {
            // 현재 노드와 선택 가능한 노드들을 모두 포함하는 영역으로 fitView
            reactFlowInstance.fitView({ 
              nodes: focusNodes,
              duration: 400, 
              padding: isMobile ? 0.12 : 0.2, // 3개 노드에 최적화된 패딩
              maxZoom: isMobile ? 1.8 : 1.2, // 적은 노드로 더 크게 줌 가능
              minZoom: 0.5
            });
          } else {
            // 선택 가능한 노드가 없으면 현재 노드만 포커싱
            try {
              reactFlowInstance.setCenter(nodeCenterX, nodeCenterY, { 
                zoom: Math.max(safeZoom, 1.0), // 단일 노드일 때는 더 크게
                duration: 400 
              });
            } catch (error) {
              // setCenter 실패 시 fitView로 폴백
              reactFlowInstance.fitView({ 
                duration: 400, 
                padding: isMobile ? 0.15 : 0.25,
                maxZoom: isMobile ? 1.5 : safeZoom,
                minZoom: 0.3
              });
            }
          }
        } else if (nodes.length > 0 && reactFlowInstance.getNodes().length > 0) {
          // 폴백: 현재 노드를 찾을 수 없을 때 전체 맵 보기
          const fitViewPadding = isMobile ? 0.1 : 0.25; // 모바일 전체 맵 패딩도 조정
          reactFlowInstance.fitView({ 
            duration: 400, 
            padding: fitViewPadding,
            maxZoom: isMobile ? 1.2 : 0.9, // 모바일 전체 맵 최대 줌도 증가
            minZoom: 0.3
          });
        }
      }
    }, 100); // 100ms 디바운싱

    return () => clearTimeout(timer);
  }, [currentPlayerPosition, reactFlowInstance, windowDimensions, isFitViewActive, nodes]);

  return null;
};

const RoguelikeMapSelectionInternal: React.FC<RoguelikeMapSelectionProps> = ({
  pathType,
  onPathSelect,
  mapNodes,
  mapEdges,
  mapStageConnections,
  initialPlayerPosition = 'start',
  gameSession,
  onSpinRoulette,
}) => {
  const [selectedPath, setSelectedPath] = useState<PathChoice | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [currentPlayerPosition, setCurrentPlayerPosition] = useState<string>(initialPlayerPosition);
  const [isFitViewActive, setIsFitViewActive] = useState(false);

  // CSS 애니메이션 스타일 추가
  React.useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      /* 고급 스파클 애니메이션 */
      .sparkle-animation-advanced {
        opacity: 0;
        transform: scale(0);
        animation: sparkleEffectAdvanced infinite;
      }
      
      @keyframes sparkleEffectAdvanced {
        0% {
          opacity: 0;
          transform: scale(0) rotate(0deg);
        }
        15% {
          opacity: 0.6;
          transform: scale(0.8) rotate(45deg);
        }
        30% {
          opacity: 1;
          transform: scale(1.2) rotate(90deg);
        }
        50% {
          opacity: 1;
          transform: scale(1) rotate(180deg);
        }
        70% {
          opacity: 0.8;
          transform: scale(1.1) rotate(270deg);
        }
        85% {
          opacity: 0.4;
          transform: scale(0.9) rotate(315deg);
        }
        100% {
          opacity: 0;
          transform: scale(0) rotate(360deg);
        }
      }
      
      /* 배경 별 애니메이션 */
      .sparkle-animation-background {
        opacity: 0;
        transform: scale(0);
        animation: sparkleBackgroundEffect infinite;
      }
      
      @keyframes sparkleBackgroundEffect {
        0% {
          opacity: 0;
          transform: scale(0) rotate(0deg);
        }
        20% {
          opacity: 0.4;
          transform: scale(0.8) rotate(20deg);
        }
        40% {
          opacity: 0.8;
          transform: scale(1) rotate(40deg);
        }
        60% {
          opacity: 1;
          transform: scale(1.1) rotate(60deg);
        }
        80% {
          opacity: 0.6;
          transform: scale(0.9) rotate(80deg);
        }
        100% {
          opacity: 0;
          transform: scale(0) rotate(100deg);
        }
      }
      
      /* 노드별 shimmer 효과 */
      .shimmer-start-node {
        position: relative;
        overflow: hidden;
      }
      .shimmer-start-node::after {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          to right, 
          rgba(255,255,255,0) 0%,
          rgba(34,211,238,0.4) 50%,
          rgba(255,255,255,0) 100%
        );
        transform: rotate(30deg);
        animation: shimmerStart 4s infinite;
      }
      @keyframes shimmerStart {
        0% { transform: rotate(30deg) translateX(-150%); }
        100% { transform: rotate(30deg) translateX(150%); }
      }
      
      .shimmer-stage-node {
        position: relative;
        overflow: hidden;
      }
      .shimmer-stage-node::after {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          to right, 
          rgba(255,255,255,0) 0%,
          rgba(255,255,255,0.3) 50%,
          rgba(255,255,255,0) 100%
        );
        transform: rotate(30deg);
        animation: shimmerStage 5s infinite;
      }
      @keyframes shimmerStage {
        0% { transform: rotate(30deg) translateX(-150%); }
        100% { transform: rotate(30deg) translateX(150%); }
      }
      
      .shimmer-end-node {
        position: relative;
        overflow: hidden;
      }
      .shimmer-end-node::after {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          to right, 
          rgba(255,255,255,0) 0%,
          rgba(250,204,21,0.4) 50%,
          rgba(255,255,255,0) 100%
        );
        transform: rotate(30deg);
        animation: shimmerEnd 3s infinite;
      }
      @keyframes shimmerEnd {
        0% { transform: rotate(30deg) translateX(-150%); }
        100% { transform: rotate(30deg) translateX(150%); }
      }
      
             /* 페이지 배경 별 애니메이션 */
       .sparkle-animation-background-page {
         opacity: 0;
         transform: scale(0);
         animation: sparklePageBackgroundEffect infinite;
       }
       
       @keyframes sparklePageBackgroundEffect {
         0% {
           opacity: 0;
           transform: scale(0) rotate(0deg);
         }
         10% {
           opacity: 0.3;
           transform: scale(0.6) rotate(18deg);
         }
         25% {
           opacity: 0.7;
           transform: scale(1) rotate(45deg);
         }
         50% {
           opacity: 1;
           transform: scale(1.3) rotate(90deg);
         }
         75% {
           opacity: 0.8;
           transform: scale(1.1) rotate(135deg);
         }
         90% {
           opacity: 0.4;
           transform: scale(0.7) rotate(162deg);
         }
         100% {
           opacity: 0;
           transform: scale(0) rotate(180deg);
         }
       }
       
       /* 기존 twinkle 애니메이션 개선 */
       @keyframes twinkle {
         0%, 100% { 
           opacity: 0.2; 
           transform: scale(0.8);
         }
         50% { 
           opacity: 1; 
           transform: scale(1.2);
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

  const reactFlowInstance = useReactFlow();

  const stageConnections = useMemo(() => mapStageConnections, [mapStageConnections]);

  // 게임 상태 정보 계산
  const gameStats = useMemo(() => {
    if (!gameSession) return null;
    
    return {
      currentScore: gameSession.baseScore || 0,
      correctAnswers: gameSession.correctAnswers || 0,
      totalQuestions: gameSession.totalQuestions || 0,
      currentStreak: gameSession.currentStreak || 0,
      maxStreak: gameSession.maxStreak || 0,
      activityBonus: gameSession.activityBonus?.total || 0
    };
  }, [gameSession]);

  // initialPlayerPosition이 변경될 때마다 currentPlayerPosition 업데이트
  useEffect(() => {
    setCurrentPlayerPosition(initialPlayerPosition);
  }, [initialPlayerPosition]);

  const getActivatableNodes = useCallback((currentPos: string): string[] => {
    const connections = stageConnections[currentPos] || [];
    // 시작 노드만 활성화 대상에서 제외 (종료 노드는 룰렛 스테이지로 연결)
    return connections.filter(nodeId => 
      !nodeId.includes('start') && 
      nodeId !== 'start'
    );
  }, [stageConnections]);

  const handleNodeClickCallback = useCallback((nodeId: string, isNodeActive: boolean) => {
    if (isNodeActive) {
      setIsConfirming(true);
      setTimeout(() => {
        setIsConfirming(false);
        console.log(`Progressing to node: ${nodeId}`);
        onPathSelect(nodeId);
      }, 1000);
    }
  }, [onPathSelect]);

  const [nodes, setNodes, onNodesChange] = useNodesState(mapNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(mapEdges);

  // mapNodes가 변경될 때마다 노드 상태 업데이트
  useEffect(() => {
    setNodes(mapNodes);
  }, [mapNodes, setNodes]);

  useEffect(() => {
    setNodes(prevNodes => prevNodes.map(n => {
      const isActive = getActivatableNodes(currentPlayerPosition).includes(n.id);
      const isCurrent = n.id === currentPlayerPosition;
      const isStartNode = n.type === 'startNode' || n.id === 'start' || n.id.includes('start');
      // mapNodes에서 완료 상태와 실패 상태를 가져옴
      const nodeIsCompleted = n.data.isCompleted || false;
      const nodeIsFailed = n.data.isFailed || false;
      // 시작 노드만 클릭 불가능
      const isClickable = !isStartNode && isActive && !isCurrent && !nodeIsCompleted && !nodeIsFailed;

      return {
        ...n,
        data: {
          ...n.data,
          // 시작 노드만 강제로 비활성화
          isActive: isStartNode ? false : isClickable,
          isCompleted: nodeIsCompleted,
          isFailed: nodeIsFailed,
          onClick: isStartNode ? undefined : () => handleNodeClickCallback(n.id, isClickable),
          // 클릭 가능 상태를 data에 포함
          isClickable: isClickable
        },
        // 클릭 가능한 상태를 className에 반영
        className: isClickable ? 'clickable-node' : 'non-clickable-node'
      };
    }));

    // 경로 색상 처리 개선
    setEdges(prevEdges => prevEdges.map(e => {
      const sourceNodeCompleted = nodes.find(n => n.id === e.source)?.data?.isCompleted || false;
      const targetNodeCompleted = nodes.find(n => n.id === e.target)?.data?.isCompleted || false;
      const sourceNodeFailed = nodes.find(n => n.id === e.source)?.data?.isFailed || false;
      const targetNodeFailed = nodes.find(n => n.id === e.target)?.data?.isFailed || false;
      
      // 시작 노드 확인 (시작 노드는 항상 "지나온" 것으로 간주)
      const isSourceStartNode = e.source.includes('start') || e.source === initialPlayerPosition;
      const isTargetStartNode = e.target.includes('start') || e.target === initialPlayerPosition;
      
      const isCurrentlyAvailable = stageConnections[e.source]?.includes(e.target) && currentPlayerPosition === e.source;
      // 실제로 지나온 경로: 
      // 1. 출발/도착 노드 모두 완료된 경우 (성공/실패 구분 없이)
      // 2. 시작 노드에서 완료된 노드로 가는 경우
      const isActuallyTraveledPath = 
        ((sourceNodeCompleted || sourceNodeFailed) && (targetNodeCompleted || targetNodeFailed)) ||
        (isSourceStartNode && (targetNodeCompleted || targetNodeFailed)) ||
        ((sourceNodeCompleted || sourceNodeFailed) && isTargetStartNode);
      
      let edgeColor = '#475569'; // 기본 어두운 회색 (별자리 배경에 맞게)
      let strokeWidth = 2;
      let strokeDasharray = 'none';
      let animated = false;
      let glowEffect = '';

      if (isCurrentlyAvailable) {
        // 현재 선택 가능한 경로 - 황금색 별자리 연결선 애니메이션
        edgeColor = '#fbbf24';
        strokeWidth = 3;
        strokeDasharray = '8,4';
        animated = true;
        glowEffect = '0 0 15px #fbbf24, 0 0 30px #fbbf24';
      } else if (isActuallyTraveledPath) {
        // 실제로 지나온 경로 - 청록색 별자리 연결선 (완료된 별자리)
        edgeColor = '#06b6d4';
        strokeWidth = 3;
        glowEffect = '0 0 10px #06b6d4, 0 0 20px #06b6d4';
      } else {
        // 미지의 경로 - 희미한 별자리 연결선
        edgeColor = '#64748b';
        strokeWidth = 1.5;
        strokeDasharray = '3,3';
        glowEffect = '0 0 5px #64748b';
      }

      return {
        ...e,
        style: {
          ...e.style,
          stroke: edgeColor,
          strokeWidth,
          strokeDasharray,
          filter: `drop-shadow(${glowEffect})`,
          opacity: isCurrentlyAvailable ? 1 : (isActuallyTraveledPath ? 0.9 : 0.6)
        },
        animated
      };
    }));
  }, [currentPlayerPosition, getActivatableNodes, handleNodeClickCallback, setNodes, setEdges, stageConnections, mapNodes]);

  const onGlobalNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const activatableNodes = getActivatableNodes(currentPlayerPosition);
    if (node.data && node.data.onClick && activatableNodes.includes(node.id)) {
      const isMovingToNextNode = stageConnections[currentPlayerPosition]?.includes(node.id);

      if (pathType === 'fork' && stageConnections[currentPlayerPosition]?.length > 1 && isMovingToNextNode) {
        const nextOptions = stageConnections[currentPlayerPosition];
        if (nextOptions && nextOptions[0] === node.id) {
          setSelectedPath('left');
        } else if (nextOptions && nextOptions[1] === node.id) {
          setSelectedPath('right');
        } else {
          setSelectedPath('straight');
        }
      } else if (pathType !== 'fork' && isMovingToNextNode) {
        setSelectedPath('straight');
      }
      node.data.onClick(node.id, activatableNodes.includes(node.id));
    }
  }, [pathType, currentPlayerPosition, stageConnections, getActivatableNodes]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-start justify-center p-4 pt-8 relative overflow-hidden">
      {/* 고급 우주 배경 효과 */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
      
      {/* 고급 배경 별빛 효과 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 25 }).map((_, i) => {
          const backgroundStars = [
            { top: '5%', left: '8%', color: 'text-white', size: 12, delay: 0 },
            { top: '15%', right: '12%', color: 'text-cyan-400', size: 8, delay: 0.5 },
            { bottom: '18%', left: '15%', color: 'text-pink-400', size: 10, delay: 1.0 },
            { top: '35%', left: '25%', color: 'text-yellow-400', size: 6, delay: 1.5 },
            { bottom: '25%', right: '18%', color: 'text-purple-400', size: 14, delay: 2.0 },
            { top: '8%', left: '50%', color: 'text-indigo-300', size: 7, delay: 2.5 },
            { bottom: '45%', left: '8%', color: 'text-emerald-400', size: 9, delay: 3.0 },
            { top: '60%', right: '25%', color: 'text-rose-400', size: 5, delay: 3.5 },
            { bottom: '8%', left: '40%', color: 'text-orange-400', size: 8, delay: 4.0 },
            { top: '25%', right: '45%', color: 'text-violet-300', size: 11, delay: 4.5 },
            { bottom: '35%', left: '70%', color: 'text-teal-400', size: 6, delay: 5.0 },
            { top: '75%', left: '20%', color: 'text-amber-300', size: 10, delay: 5.5 },
            { top: '45%', right: '8%', color: 'text-lime-400', size: 7, delay: 6.0 },
            { bottom: '60%', left: '50%', color: 'text-sky-300', size: 9, delay: 6.5 },
            { top: '12%', right: '70%', color: 'text-fuchsia-400', size: 8, delay: 7.0 },
            { bottom: '12%', right: '50%', color: 'text-blue-300', size: 6, delay: 7.5 },
            { top: '50%', left: '5%', color: 'text-red-300', size: 5, delay: 8.0 },
            { bottom: '70%', right: '15%', color: 'text-green-400', size: 11, delay: 8.5 },
            { top: '80%', left: '60%', color: 'text-yellow-300', size: 8, delay: 9.0 },
            { top: '30%', left: '75%', color: 'text-cyan-300', size: 7, delay: 9.5 },
            { bottom: '50%', right: '35%', color: 'text-pink-300', size: 9, delay: 10.0 },
            { top: '65%', left: '35%', color: 'text-purple-300', size: 6, delay: 10.5 },
            { bottom: '80%', left: '80%', color: 'text-indigo-400', size: 10, delay: 11.0 },
            { top: '20%', left: '90%', color: 'text-emerald-300', size: 5, delay: 11.5 },
            { bottom: '30%', right: '5%', color: 'text-orange-300', size: 8, delay: 12.0 }
          ];
          const star = backgroundStars[i];
          return (
            <div 
              key={i}
              className="absolute sparkle-animation-background-page"
              style={{
                ...star,
                animationDelay: `${star.delay}s`,
                animationDuration: '6s'
              }}
            >
              <Sparkle 
                size={star.size} 
                className={`${star.color} opacity-60`}
              />
            </div>
          );
        })}
      </div>
      
      <div className="bg-gradient-to-br from-gray-800 via-purple-800 to-gray-900 rounded-3xl shadow-2xl p-8 max-w-6xl w-full border border-purple-500/30 backdrop-blur-sm relative overflow-hidden">
        {/* 네온 글로우 효과 */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-cyan-500/5 to-pink-500/5 rounded-3xl"></div>
        
        {/* 카드 내부 고급 별빛 효과 */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => {
            const cardStars = [
              { top: '8%', right: '8%', color: 'text-purple-400', size: 10, delay: 0 },
              { bottom: '12%', left: '8%', color: 'text-cyan-400', size: 8, delay: 1.5 },
              { top: '25%', right: '25%', color: 'text-pink-300', size: 6, delay: 3.0 },
              { bottom: '30%', right: '15%', color: 'text-yellow-300', size: 7, delay: 4.5 },
              { top: '60%', left: '15%', color: 'text-indigo-300', size: 5, delay: 6.0 },
              { top: '45%', right: '40%', color: 'text-emerald-300', size: 9, delay: 7.5 },
              { bottom: '60%', left: '40%', color: 'text-orange-300', size: 4, delay: 9.0 },
              { top: '80%', right: '60%', color: 'text-violet-300', size: 8, delay: 10.5 }
            ];
            const star = cardStars[i];
            return (
              <div 
                key={i}
                className="absolute sparkle-animation-background-page"
                style={{
                  ...star,
                  animationDelay: `${star.delay}s`,
                  animationDuration: '8s'
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
        {/* 스테이지 헤더 */}
        <div className="text-center mb-8">
            <div className="text-6xl mb-4 drop-shadow-[0_0_25px_rgba(168,85,247,0.8)]">🗺️</div>
            <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">우주 항로 네비게이션</h2>
            <p className="text-purple-300 text-lg">
              다음으로 진행할 우주 항로를 선택하세요!
          </p>
        </div>

          <div className="h-[500px] mb-6 border-2 border-cyan-400/20 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-black relative shadow-2xl backdrop-blur-sm">
          {/* 고급 별자리 배경 별들 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 15 }).map((_, i) => {
              const positions = [
                { top: '8%', left: '15%', color: 'text-white', size: 8, delay: 0 },
                { top: '25%', left: '8%', color: 'text-cyan-300', size: 4, delay: 0.5 },
                { top: '15%', right: '20%', color: 'text-yellow-200', size: 10, delay: 1.0 },
                { bottom: '35%', left: '25%', color: 'text-purple-300', size: 6, delay: 1.5 },
                { bottom: '15%', right: '15%', color: 'text-blue-200', size: 8, delay: 2.0 },
                { top: '45%', left: '5%', color: 'text-pink-300', size: 5, delay: 2.5 },
                { top: '30%', right: '8%', color: 'text-indigo-200', size: 7, delay: 3.0 },
                { bottom: '45%', left: '40%', color: 'text-emerald-300', size: 4, delay: 3.5 },
                { top: '12%', left: '50%', color: 'text-orange-200', size: 6, delay: 4.0 },
                { bottom: '25%', right: '35%', color: 'text-rose-300', size: 5, delay: 4.5 },
                { top: '60%', left: '12%', color: 'text-violet-200', size: 4, delay: 5.0 },
                { top: '75%', right: '12%', color: 'text-teal-300', size: 6, delay: 5.5 },
                { bottom: '8%', left: '60%', color: 'text-amber-200', size: 7, delay: 6.0 },
                { top: '50%', right: '50%', color: 'text-lime-300', size: 5, delay: 6.5 },
                { bottom: '60%', right: '8%', color: 'text-sky-200', size: 8, delay: 7.0 }
              ];
              const star = positions[i];
              return (
                <div 
                  key={i}
                  className="absolute sparkle-animation-background"
                  style={{
                    ...star,
                    animationDelay: `${star.delay}s`,
                    animationDuration: '4s'
                  }}
                >
                  <Sparkle 
                    size={star.size} 
                    className={`${star.color} opacity-70`}
                  />
                </div>
              );
            })}
          </div>
          
          <button 
            onClick={() => setIsFitViewActive(!isFitViewActive)} 
              className="absolute top-4 left-4 z-10 bg-gradient-to-r from-indigo-700/80 to-purple-700/80 hover:from-indigo-600/90 hover:to-purple-600/90 text-cyan-100 text-xs px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all transform hover:scale-105 border border-cyan-400/20 backdrop-blur-sm"
          >
              {isFitViewActive ? "🎯 현재 위치 보기" : "🌌 전체 별자리 보기"}
          </button>
          <style>{`
            .react-flow__pane, 
            .react-flow__viewport, 
            .react-flow__container, 
            .react-flow__renderer, 
            .react-flow__edge, 
            .react-flow__edge-path, 
            .react-flow__edge:hover, 
            .react-flow__edge-path:hover, 
            .react-flow__background, 
            .react-flow__selection {
              cursor: default !important;
              background: transparent !important;
            }
            
            /* React Flow 배경을 완전히 투명하게 */
            .react-flow__renderer {
              background: transparent !important;
            }
            
            .react-flow__pane {
              background: transparent !important;
            }
            
            /* 클릭 가능한 노드만 포인터 커서 표시 */
            .react-flow__node.clickable-node {
              cursor: pointer !important;
            }
            
            .react-flow__node.clickable-node:hover {
              cursor: pointer !important;
            }

            /* 클릭 불가능한 노드는 기본 커서 */
            .react-flow__node.non-clickable-node {
              cursor: default !important;
            }

            .react-flow__node.non-clickable-node:hover {
              cursor: default !important;
            }
            
            /* 별자리 분위기를 위한 추가 스타일 */
            .react-flow__background {
              opacity: 0.3 !important;
            }
          `}</style>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onGlobalNodeClick}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={true}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            proOptions={{ hideAttribution: true }}
            fitView
          >
              <Background color="#1e293b" gap={30} size={0.5} variant={BackgroundVariant.Dots} />
            <ViewportUpdater 
              currentPlayerPosition={currentPlayerPosition} 
              nodes={nodes} 
              isFitViewActive={isFitViewActive}
              stageConnections={stageConnections}
            />
          </ReactFlow>
          </div>

          {/* 하단 점수 표시 */}
          {gameStats && (
            <div className="mt-6 bg-gradient-to-r from-gray-900/80 via-purple-900/80 to-gray-900/80 rounded-xl p-4 border border-purple-400/30 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.7)]">{gameStats.currentScore.toLocaleString()}</div>
                <div className="text-sm text-gray-300 mt-1">⭐ 현재 점수</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RoguelikeMapSelection: React.FC<RoguelikeMapSelectionProps> = (props) => (
  <ReactFlowProvider>
    <RoguelikeMapSelectionInternal {...props} />
  </ReactFlowProvider>
);

export default RoguelikeMapSelection; 