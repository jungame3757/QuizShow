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
import { PathChoice, MapPathType, RoguelikeStage, RoguelikeGameSession, RouletteResult } from '../../../types/roguelike';

// 커스텀 노드 컴포넌트
const StartNode = ({ data }: { data: any }) => {
  // StageNode와 동일한 비활성화 로직 적용
  const { isActive = false, isCompleted = false, isFailed = false, onClick } = data;
  const isClickable = isActive && !isCompleted && !isFailed;
  
  return (
    <div className="relative">
      <Handle type="source" position={Position.Top} className="w-3 h-3 bg-green-500 border-2 border-white invisible" /> 
      <div 
        className={`w-16 h-16 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-full shadow-lg border-3 border-green-300 flex items-center justify-center ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={() => { if (isClickable && onClick) onClick(); }}
      >
        <div className="text-3xl">🚀</div>
      </div>
    </div>
  );
};

const StageNode = ({ data }: { data: any }) => {
  const { stageType = 'normal', isActive = false, isCompleted = false, isFailed = false, onClick, label, isClickable: dataIsClickable } = data;
  const getStageInfo = (type: string) => {
    switch (type) {
      case 'elite': return { icon: '⚔️', title: '엘리트', bgClass: 'from-red-400 to-red-600', borderClass: 'border-red-300' };
      case 'campfire': return { icon: '🔥', title: '모닥불', bgClass: 'from-orange-400 to-orange-600', borderClass: 'border-orange-300' };
      case 'roulette': return { icon: '🎰', title: '룰렛', bgClass: 'from-purple-400 to-purple-600', borderClass: 'border-purple-300' };
      default: return { icon: '🗡️', title: '일반', bgClass: 'from-gray-400 to-gray-600', borderClass: 'border-gray-300' };
    }
  };
  const stageInfo = getStageInfo(stageType);
  // data에서 전달받은 isClickable을 우선 사용
  const isClickable = dataIsClickable !== undefined ? dataIsClickable : (isActive && !isCompleted && !isFailed);

  // 완료 상태에 따른 스타일 결정
  let statusRing = '';
  let statusIcon = '';
  if (isCompleted && !isFailed) {
    statusRing = 'ring-4 ring-offset-2 ring-green-400';
    statusIcon = '✓';
  } else if (isFailed) {
    statusRing = 'ring-4 ring-offset-2 ring-red-400';
    statusIcon = '✗';
  } else if (isActive && !isCompleted) {
    statusRing = 'ring-4 ring-offset-2 ring-yellow-400 animate-pulse';
    statusIcon = '';
  }

  return (
    <div className="relative">
      <Handle type="target" position={Position.Bottom} className="w-3 h-3 bg-blue-500 border-2 border-white invisible" />
      <div
        className={`w-14 h-14 bg-gradient-to-r ${stageInfo.bgClass} text-white rounded-xl shadow-lg border-3 ${stageInfo.borderClass} transition-transform ${isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'} ${statusRing} ${!isActive && !isCompleted ? 'opacity-60' : ''} flex items-center justify-center`}
        onClick={() => { if (isClickable && onClick) onClick(); }}
      >
        <div className="text-2xl">{stageInfo.icon}</div>
        {(isCompleted || isFailed) && (
          <div className={`absolute -top-2 -right-2 ${isCompleted && !isFailed ? 'bg-green-500' : 'bg-red-500'} text-white text-xs w-6 h-6 rounded-full flex items-center justify-center`}>
            {statusIcon}
          </div>
        )}
        {!isActive && !isCompleted && !isFailed && (
          <div className="absolute -top-2 -right-2 bg-gray-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">🔒</div>
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
      <div className={`w-16 h-16 bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-full shadow-lg border-3 ${data.isActive ? "ring-4 ring-offset-2 ring-purple-500" : "border-purple-300"} flex items-center justify-center transition-transform hover:scale-105`}>
        <div className="text-3xl">🏆</div>
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

  const reactFlowInstance = useReactFlow();

  const stageConnections = useMemo(() => mapStageConnections, [mapStageConnections]);

  // 게임 상태 정보 계산
  const gameStats = useMemo(() => {
    if (!gameSession) return null;
    
    const accuracy = gameSession.totalQuestions > 0 
      ? Math.round((gameSession.correctAnswers / gameSession.totalQuestions) * 100)
      : 0;
    
    return {
      currentScore: gameSession.baseScore || 0,
      correctAnswers: gameSession.correctAnswers || 0,
      totalQuestions: gameSession.totalQuestions || 0,
      accuracy,
      currentStreak: gameSession.currentStreak || 0,
      maxStreak: gameSession.maxStreak || 0,
      activityBonus: gameSession.activityBonus?.total || 0
    };
  }, [gameSession]);

  // 보유 아이템/버프 정보 계산
  const activeBuffs = useMemo(() => {
    if (!gameSession?.temporaryBuffs) return [];
    
    return gameSession.temporaryBuffs
      .filter((buff: any) => buff.active)
      .map((buff: any) => {
        switch (buff.id) {
          case 'PASSION_BUFF':
            return { name: '🔥 열정', description: '연속 정답 보너스 × 2' };
          case 'WISDOM_BUFF':
            return { name: '🧠 지혜', description: '룰렛 완료 보너스 추가' };
          case 'LUCK_BUFF':
            return { name: '🍀 행운', description: '룰렛 고배수 확률 증가' };
          default:
            return { name: buff.name || '알 수 없음', description: buff.description || '' };
        }
      });
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
      
      let edgeColor = '#9ca3af'; // 기본 회색
      let strokeWidth = 3;
      let strokeDasharray = 'none';
      let animated = false;

      if (isCurrentlyAvailable) {
        // 현재 선택 가능한 경로 - 노란색 애니메이션
        edgeColor = '#eab308';
        strokeWidth = 4;
        strokeDasharray = '5,5';
        animated = true;
      } else if (isActuallyTraveledPath) {
        // 실제로 지나온 경로 - 파란색 (성공/실패 구분 없이)
        edgeColor = '#3b82f6';
        strokeWidth = 4;
      }
      // 나머지 경우(선택 가능했지만 지나가지 않은 길)는 기본 회색 유지

      return {
        ...e,
        style: {
          ...e.style,
          stroke: edgeColor,
          strokeWidth,
          strokeDasharray,
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-6xl w-full">
        {/* 게임 상태 표시 바 */}
        {gameStats && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-200">
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* 현재 점수 */}
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">{gameStats.currentScore.toLocaleString()}</div>
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
              <div className="border-t border-blue-200 pt-3">
                <div className="text-xs text-gray-600 mb-2">🎒 보유 아이템</div>
                <div className="flex flex-wrap gap-2">
                  {activeBuffs.map((buff: any, index: number) => (
                    <div 
                      key={index}
                      className="bg-gradient-to-r from-purple-100 to-indigo-100 px-3 py-2 rounded-full text-sm border border-purple-300 flex items-center gap-1"
                      title={buff.description}
                    >
                      <span>{buff.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 버프가 없을 때 안내 메시지 */}
            {activeBuffs.length === 0 && (
              <div className="border-t border-blue-200 pt-3">
                <div className="text-xs text-gray-600 mb-2">🎒 보유 아이템</div>
                <div className="text-xs text-gray-400 italic">
                  모닥불 스테이지에서 특별한 버프를 획득할 수 있습니다
                </div>
              </div>
            )}
          </div>
        )}

        {/* 스테이지 헤더 */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🗺️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">갈림길 선택</h2>
          <p className="text-gray-600">
            다음으로 진행할 경로를 선택하세요!
          </p>
        </div>

        <div className="h-[500px] mb-6 border-2 border-indigo-200 rounded-xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 relative shadow-xl">
          <button 
            onClick={() => setIsFitViewActive(!isFitViewActive)} 
            className="absolute top-4 left-4 z-10 bg-indigo-500 hover:bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-md shadow-md transition-colors"
          >
            {isFitViewActive ? "현재 노드 보기" : "전체 맵 보기"}
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
            <Background color="#c7d2fe" gap={20} size={1} variant={BackgroundVariant.Dots} />
            <ViewportUpdater 
              currentPlayerPosition={currentPlayerPosition} 
              nodes={nodes} 
              isFitViewActive={isFitViewActive}
              stageConnections={stageConnections}
            />
          </ReactFlow>
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