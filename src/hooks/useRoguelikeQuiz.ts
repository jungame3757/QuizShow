import { useState, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { Question, Quiz } from '../types';
import { submitAnswer as submitAnswerToServer } from '../firebase/sessionService';
import { 
  RoguelikeGameSession, 
  RoguelikeStage, 
  RoguelikeAnswer, 
  ActivityBonus,
  RouletteResult,
  ROULETTE_MESSAGES,
  TemporaryBuff,
  RoguelikeStageType,
  GameState
} from '../types/roguelike';

export interface RoguelikeMapData {
  nodes: Node[];
  edges: Edge[];
  stageConnections: Record<string, string[]>;
  initialPlayerPosition: string;
  generatedStages?: Record<string, RoguelikeStage>;
}

const getQuestionPool = (questions: Question[], type: 'multiple-choice' | 'short-answer' | 'opinion'): number[] => {
  return questions
    .map((q, index) => ({ question: q, index }))
    .filter(({ question }) => question.type === type)
    .map(({ index }) => index);
};

const getRandomQuestionsFromPool = (questionPool: number[], count: number, allowDuplicates: boolean = false): number[] => {
  if (questionPool.length === 0 || count === 0) return [];
  const selected: number[] = [];
  const poolCopy = [...questionPool]; // 비복원 추출을 위해 복사본 사용

  for (let i = 0; i < count; i++) {
    if (!allowDuplicates && poolCopy.length === 0) {
      // 비복원 추출인데 더 이상 뽑을 문제가 없으면 중단
      break;
    }
    
    let randomIndex;
    let questionIndex;

    if (allowDuplicates) {
      // 복원 추출: 원본 풀에서 랜덤하게 선택
      randomIndex = Math.floor(Math.random() * questionPool.length);
      questionIndex = questionPool[randomIndex];
    } else {
      // 비복원 추출: 복사본 풀에서 랜덤하게 선택하고 제거
      randomIndex = Math.floor(Math.random() * poolCopy.length);
      questionIndex = poolCopy.splice(randomIndex, 1)[0];
    }
    selected.push(questionIndex);
  }
  return selected;
};

const generateRoguelikeMap = (quiz: Quiz | null, totalRounds: number = 7): RoguelikeMapData => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const stageConnections: Record<string, string[]> = {};
  const generatedStages: Record<string, RoguelikeStage> = {};
  let nodeIdCounter = 0;

  if (!quiz) return { nodes: [], edges: [], stageConnections: {}, initialPlayerPosition: 'start', generatedStages: {} };

  const mcQuestions = getQuestionPool(quiz.questions, 'multiple-choice');
  const saQuestions = getQuestionPool(quiz.questions, 'short-answer');
  const opinionQuestions = getQuestionPool(quiz.questions, 'opinion');

  if (mcQuestions.length === 0) {
    console.error("[맵 생성 실패] 로그라이크 맵을 생성하려면 최소한 하나 이상의 객관식 문제가 필요합니다.");
    return { nodes: [], edges: [], stageConnections: {}, initialPlayerPosition: 'start', generatedStages: {} }; 
  }

  const NODE_WIDTH = 150; const HORIZONTAL_SPACING = 50; const VERTICAL_SPACING = 150;

  // 다양한 맵 패턴 생성 함수
  const generateMapLayout = (totalRounds: number): number[] => {
    // 사전 정의된 재미있는 패턴들
    const predefinedLayouts = [
      [1, 2, 4, 3, 4, 2, 1], // 기본형 (현재)
      [1, 2, 3, 4, 3, 2, 1], // 피라미드형
      [1, 3, 2, 1, 2, 3, 1], // 도넛형 (가운데가 좁음)
      [1, 2, 4, 5, 4, 2, 1], // 다이아몬드형
      [1, 3, 1, 4, 1, 3, 1], // 웨이브형 (위아래 반복)
      [1, 2, 3, 5, 4, 2, 1], // 확장형
      [1, 4, 2, 3, 2, 4, 1], // 역도넛형 (가운데 확장)
      [1, 1, 3, 5, 3, 1, 1], // 허리띠형
      [1, 2, 2, 4, 2, 2, 1], // 계단형
      [1, 3, 3, 2, 3, 3, 1], // 역계단형
    ];

    // 규칙 검증 함수
    const isValidLayout = (layout: number[]): boolean => {
      // 1. 시작과 끝이 1이어야 함
      if (layout[0] !== 1 || layout[layout.length - 1] !== 1) return false;
      
      // 2. 현재 라운드가 n이면 다음 라운드는 2n 이하이거나 n/2 이상
      for (let i = 0; i < layout.length - 1; i++) {
        const current = layout[i];
        const next = layout[i + 1];
        if (next > current * 2 || next < Math.ceil(current / 2)) {
          return false;
        }
      }
      
      // 3. 총 라운드 수가 맞는지 확인
      return layout.length === totalRounds;
    };

    // totalRounds에 맞는 패턴들만 필터링
    const validLayouts = predefinedLayouts.filter(layout => 
      layout.length === totalRounds && isValidLayout(layout)
    );

    // 유효한 패턴이 있으면 랜덤 선택, 없으면 기본 패턴 사용
    if (validLayouts.length > 0) {
      const selectedLayout = validLayouts[Math.floor(Math.random() * validLayouts.length)];
      console.log(`[맵 생성] 선택된 패턴: [${selectedLayout.join(', ')}]`);
      return selectedLayout;
    } else {
      // 기본 패턴으로 폴백
      console.warn(`[맵 생성] totalRounds=${totalRounds}에 맞는 패턴이 없어 기본 패턴 사용`);
      return [1, 2, 4, 3, 4, 2, 1];
    }
  };

  const roundsLayout = generateMapLayout(totalRounds);
  
  if (totalRounds !== roundsLayout.length) {
    console.warn(`[맵 생성 경고] totalRounds(${totalRounds})와 roundsLayout.length(${roundsLayout.length})가 다릅니다. roundsLayout 기준으로 진행합니다.`);
  }

  const targetNormalStages = roundsLayout.slice(1, -1).reduce((sum, count) => sum + count, 0);

  const rounds: Node[][] = Array.from({ length: roundsLayout.length }, () => []);
  
  // 자연스러운 노드 위치 계산 함수
  const calculateNaturalPosition = (
    roundIdx: number, 
    nodeIndex: number, 
    totalNodesInRound: number
  ): { x: number; y: number } => {
    // 기본 Y 위치 (수직 진행)
    const baseY = (roundsLayout.length - 1 - roundIdx) * VERTICAL_SPACING;
    
    // 기본 X 위치 (수평 중앙 정렬)
    const baseX = (nodeIndex - (totalNodesInRound - 1) / 2) * (NODE_WIDTH + HORIZONTAL_SPACING);
    
    // 자연스러운 변형을 위한 요소들
    const seed = roundIdx * 1000 + nodeIndex; // 일관된 랜덤성을 위한 시드
    const pseudoRandom1 = Math.sin(seed * 0.1) * 0.5 + 0.5; // 0~1 사이의 값
    const pseudoRandom2 = Math.cos(seed * 0.2) * 0.5 + 0.5; // 0~1 사이의 값
    const pseudoRandom3 = Math.sin(seed * 0.15 + 100) * 0.5 + 0.5;
    
    // X축 변형: 곡선적 배치와 약간의 랜덤성
    let xOffset = 0;
    
    // 1. 웨이브 효과 (라운드별로 약간씩 좌우로 흔들림)
    const waveAmplitude = 60;
    const waveOffset = Math.sin(roundIdx * 0.8) * waveAmplitude;
    
    // 2. 노드별 개별 랜덤 오프셋 (화면을 벗어나지 않도록 제한)
    const maxRandomOffset = 40;
    const randomOffsetX = (pseudoRandom1 - 0.5) * 2 * maxRandomOffset;
    
    // 3. 라운드 중앙에서 멀어질수록 약간의 확산 효과
    const spreadFactor = Math.abs(nodeIndex - (totalNodesInRound - 1) / 2) * 15;
    const spreadDirection = nodeIndex > (totalNodesInRound - 1) / 2 ? 1 : -1;
    const spreadOffset = spreadDirection * spreadFactor * pseudoRandom2;
    
    xOffset = waveOffset + randomOffsetX + spreadOffset;
    
    // Y축 변형: 약간의 수직 변동
    let yOffset = 0;
    
    // 1. 라운드 내에서 노드별 높이 변화 (산맥 효과)
    const heightVariation = 30;
    const nodeHeightOffset = Math.sin(nodeIndex * 1.2 + roundIdx * 0.5) * heightVariation * pseudoRandom3;
    
    // 2. 전체적인 경로의 굽이굽이함
    const pathCurveAmplitude = 25;
    const pathCurve = Math.cos(roundIdx * 0.6 + nodeIndex * 0.3) * pathCurveAmplitude;
    
    yOffset = nodeHeightOffset + pathCurve;
    
    // 최종 위치 계산
    const finalX = baseX + xOffset;
    const finalY = baseY + yOffset;
    
    return { x: finalX, y: finalY };
  };
  
  const startNodeId = `node-${nodeIdCounter++}`;
  const startNode: Node = { id: startNodeId, type: 'startNode', position: { x: 0, y: (roundsLayout.length - 1) * VERTICAL_SPACING }, data: { label: '시작', stageType: 'start' } };
  nodes.push(startNode); rounds[0].push(startNode); stageConnections[startNodeId] = [];
  generatedStages[startNodeId] = { type: 'start', questions: [], completed: false, score: 0 };

  const endNodeId = `node-end`;
  const endNodeStageType: RoguelikeStageType = 'roulette';
  generatedStages[endNodeId] = { type: endNodeStageType, questions: [], completed: false, score: 0 };

  const stageTypePool: RoguelikeStageType[] = [];
  
  // 단순한 비율 기반 스테이지 구성
  // 전체 중간 스테이지에서 각 타입별 고정 비율
  const CAMPFIRE_RATIO = 0.15;  // 15% - 모닥불 스테이지
  const ELITE_RATIO = 0.25;     // 25% - 엘리트 스테이지  
  const NORMAL_RATIO = 0.60;    // 60% - 일반 스테이지

  // 비율에 따른 각 스테이지 개수 계산
  let numCampfire = Math.round(targetNormalStages * CAMPFIRE_RATIO);
  let numElite = Math.round(targetNormalStages * ELITE_RATIO);  
  let numNormal = targetNormalStages - numCampfire - numElite;

  // 문제 가용성 확인 및 조정
  if (opinionQuestions.length === 0) {
    // 의견 문제가 없으면 모닥불 스테이지를 일반 스테이지로 변경
    numNormal += numCampfire;
    numCampfire = 0;
  }
  
  if (saQuestions.length === 0 && mcQuestions.length === 0) {
    // 주관식과 객관식 문제가 모두 없으면 엘리트 스테이지를 일반 스테이지로 변경
    numNormal += numElite;
    numElite = 0;
  }

  // 최소 보장: 문제가 있으면 최소 1개씩은 배치
  if (numCampfire === 0 && opinionQuestions.length > 0 && targetNormalStages >= 3) {
    numCampfire = 1;
    numNormal -= 1;
    }
  
  if (numElite === 0 && (saQuestions.length > 0 || mcQuestions.length > 0) && targetNormalStages >= 3) {
    numElite = 1;
    numNormal -= 1;
  }

  // 음수 방지
  numNormal = Math.max(0, numNormal);

  console.log(`[맵 생성] 비율 기반 스테이지 구성: Campfire=${numCampfire}, Elite=${numElite}, Normal=${numNormal} (총 ${targetNormalStages})`);

  // 스테이지 타입 풀 생성
  for (let i = 0; i < numCampfire; i++) stageTypePool.push('campfire');
  for (let i = 0; i < numElite; i++) stageTypePool.push('elite');
  for (let i = 0; i < numNormal; i++) stageTypePool.push('normal');

  // 셔플
  for (let i = stageTypePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [stageTypePool[i], stageTypePool[j]] = [stageTypePool[j], stageTypePool[i]];
  }
  let stageTypePoolIndex = 0;

  // 라운드별 노드 생성 (중간 라운드)
  for (let roundIdx = 1; roundIdx < roundsLayout.length - 1; roundIdx++) {
    const numNodesThisRound = roundsLayout[roundIdx];
    let nodesActuallyCreatedThisRound = 0;

    for (let i = 0; i < numNodesThisRound; i++) {
      let stageTypeToAssign: RoguelikeStageType;
      let questionsForStage: number[] = [];

      if (stageTypePoolIndex < stageTypePool.length) {
        stageTypeToAssign = stageTypePool[stageTypePoolIndex];
        
        // 첫 번째 라운드에는 엘리트 스테이지가 나오지 않도록 제한
        if (roundIdx === 1 && stageTypeToAssign === 'elite') {
          // 엘리트가 첫 번째 라운드에 배정되려 하면 일반 스테이지로 대체
          stageTypeToAssign = 'normal';
          
          // 현재 엘리트를 뒤로 미루기 위해 풀에서 뒤쪽의 일반 스테이지와 교체
          const remainingIndices = stageTypePool.slice(stageTypePoolIndex + 1);
          const normalIndexInRemaining = remainingIndices.findIndex(type => type === 'normal');
          
          if (normalIndexInRemaining !== -1) {
            // 뒤쪽의 일반 스테이지와 현재 엘리트 교체
            const actualNormalIndex = stageTypePoolIndex + 1 + normalIndexInRemaining;
            stageTypePool[stageTypePoolIndex] = 'normal';
            stageTypePool[actualNormalIndex] = 'elite';
            console.log(`[맵 생성] 첫 번째 라운드의 엘리트 스테이지를 ${actualNormalIndex}번째 위치와 교체`);
          }
        }
      } else {
        stageTypeToAssign = 'normal'; 
        // console.warn(`[맵 생성 경고] Round ${roundIdx}: 스테이지 타입 풀 소진. 'normal'으로 대체.`);
      }
      
      if (stageTypeToAssign === 'normal') {
        // 일반 스테이지는 객관식과 주관식을 모두 포함
        const combinedPool = [...mcQuestions, ...saQuestions];
        if (combinedPool.length > 0) {
          questionsForStage = getRandomQuestionsFromPool(combinedPool, 1, false);
        } else {
          questionsForStage = getRandomQuestionsFromPool(mcQuestions, 1, false); // 폴백: 객관식만
        }
      } else if (stageTypeToAssign === 'elite') {
        // 엘리트 문제는 객관식과 주관식을 모두 포함하여 3개 필요하고 중복 허용
        const eliteCombinedPool = [...mcQuestions, ...saQuestions];
        questionsForStage = getRandomQuestionsFromPool(eliteCombinedPool, 3, true); 
        if (questionsForStage.length < 3 && eliteCombinedPool.length > 0) {
            // 문제가 3개 미만이면 중복을 허용하여 3개까지 채움
            console.warn(`[맵 생성 경고] Round ${roundIdx}, Node ${i}: elite 문제가 ${questionsForStage.length}개만 확보됨 (목표: 3개). 'normal'으로 대체 시도.`);
            stageTypeToAssign = 'normal';
            const combinedPool = [...mcQuestions, ...saQuestions];
            questionsForStage = getRandomQuestionsFromPool(combinedPool.length > 0 ? combinedPool : mcQuestions, 1, false);
        } else if (questionsForStage.length === 0 && eliteCombinedPool.length === 0 && mcQuestions.length > 0) { 
          // 엘리트 문제 풀 자체가 비어있어 elite 문제를 못 가져온 경우
          console.warn(`[맵 생성 경고] Round ${roundIdx}, Node ${i}: elite 문제 풀(combinedPool) 완전 소진. 'normal'으로 대체.`);
          stageTypeToAssign = 'normal';
          const combinedPool = [...mcQuestions, ...saQuestions];
          questionsForStage = getRandomQuestionsFromPool(combinedPool.length > 0 ? combinedPool : mcQuestions, 1, false);
        }
      } else if (stageTypeToAssign === 'campfire') {
        questionsForStage = getRandomQuestionsFromPool(opinionQuestions, 1, false); // 모닥불도 중복 없이
      }

      // 최종적으로 문제 할당이 안 된 경우 (campfire 제외), normal으로 다시 시도
      if (questionsForStage.length === 0 && stageTypeToAssign !== 'campfire') {
        if (mcQuestions.length > 0) {
          // if (stageTypeToAssign !== 'normal') console.warn(`[맵 생성 경고] Round ${roundIdx}, Node ${i}: ${stageTypeToAssign}에 문제 배정 불가. 최종 'normal' 대체.`);
          stageTypeToAssign = 'normal';
          questionsForStage = getRandomQuestionsFromPool(mcQuestions, 1, false); 
        } else {
          // console.error(`[맵 생성 오류] Round ${roundIdx}, Node ${i}: ${stageTypeToAssign} 문제 배정 불가 (모든 풀 소진/부적합). 노드 건너뜀.`);
          continue; 
        }
      }
      
      if (stageTypePoolIndex < stageTypePool.length && stageTypeToAssign === stageTypePool[stageTypePoolIndex]) {
        stageTypePoolIndex++;
      }

      const nodeId = `node-${nodeIdCounter++}`;
      const node: Node = {
        id: nodeId, type: 'stageNode',
        position: calculateNaturalPosition(roundIdx, i, numNodesThisRound),
        data: { label: `${stageTypeToAssign} (${nodeId.replace('node-','')})`, stageType: stageTypeToAssign },
      };
      nodes.push(node); rounds[roundIdx].push(node); stageConnections[nodeId] = [];
      generatedStages[nodeId] = { type: stageTypeToAssign, questions: questionsForStage, completed: false, score: 0 };
      nodesActuallyCreatedThisRound++;
    }
    if (nodesActuallyCreatedThisRound < numNodesThisRound) {
      // console.error(`[맵 생성 심각한 경고] Round ${roundIdx}에 ${numNodesThisRound}개 노드 생성 목표였으나 ${nodesActuallyCreatedThisRound}개만 생성됨.`);
    }
  }
  
  const finalEndNode: Node = { id: endNodeId, type: 'endNode', position: { x: 0, y: 0 }, data: { label: '종료', stageType: endNodeStageType } };
  nodes.push(finalEndNode); rounds[roundsLayout.length - 1].push(finalEndNode);

  for (let roundIdx = 0; roundIdx < roundsLayout.length - 1; roundIdx++) {
    const currentRoundNodes = rounds[roundIdx];
    const nextRoundNodes = rounds[roundIdx + 1];
    if (!nextRoundNodes || nextRoundNodes.length === 0) continue;

    const sortedCurrentRoundNodes = [...currentRoundNodes].sort((a, b) => a.position.x - b.position.x);
    const sortedNextRoundNodes = [...nextRoundNodes].sort((a, b) => a.position.x - b.position.x);

    sortedCurrentRoundNodes.forEach((sourceNode, _sourceIdx) => {
      let connectionsMade = 0;
      const maxConnections = (sourceNode.data.stageType === 'start' && sortedNextRoundNodes.length >=2) ? 2 : (Math.random() < 0.3 ? 2 : 1);
      
      const potentialTargets = sortedNextRoundNodes
        .map(targetNode => ({
          node: targetNode,
          priority: Math.abs(targetNode.position.x - sourceNode.position.x) + (edges.filter(e => e.target === targetNode.id).length * 100) 
        }))
        .sort((a, b) => a.priority - b.priority);

      for (const { node: targetNode } of potentialTargets) {
        if (connectionsMade >= maxConnections) break;
        if (edges.some(e => e.source === sourceNode.id && e.target === targetNode.id)) continue;

        let isCrossing = false;
        const otherCommittedEdges = edges.filter(edge => 
            rounds[roundIdx].some(n => n.id === edge.source) &&
            edge.source !== sourceNode.id
        );

        for (const otherEdge of otherCommittedEdges) {
            const otherSourceNode = nodes.find(n => n.id === otherEdge.source);
            const otherTargetNode = nodes.find(n => n.id === otherEdge.target);

            if (otherSourceNode && otherTargetNode && rounds[roundIdx+1].some(n => n.id === otherTargetNode.id)) {
                if ((sourceNode.position.x < otherSourceNode.position.x && targetNode.position.x > otherTargetNode.position.x) || 
                    (sourceNode.position.x > otherSourceNode.position.x && targetNode.position.x < otherTargetNode.position.x)) {
                     isCrossing = true;
                     break;
                }
            }
        }
        
        if (isCrossing) {
          continue;
        }

        edges.push({ id: `edge-${sourceNode.id}-${targetNode.id}`, source: sourceNode.id, target: targetNode.id, style: { strokeWidth: 3 } });
        stageConnections[sourceNode.id].push(targetNode.id);
        connectionsMade++;
      }
      
      if (connectionsMade === 0 && potentialTargets.length > 0) {
        const fallbackTarget = potentialTargets[0].node;
        if (!edges.some(e => e.source === sourceNode.id && e.target === fallbackTarget.id)) {
            edges.push({ id: `edge-fallback-${sourceNode.id}-${fallbackTarget.id}`, source: sourceNode.id, target: fallbackTarget.id, style: { strokeWidth: 3, stroke: '#FFA500' } });
            stageConnections[sourceNode.id].push(fallbackTarget.id);
            connectionsMade++;
        }
      }
    });
  }

  for (let roundIdx = 1; roundIdx < roundsLayout.length -1; roundIdx++) {
    const currentRoundNodes = rounds[roundIdx];
    const prevRoundNodes = rounds[roundIdx - 1];
    if (!prevRoundNodes || prevRoundNodes.length === 0) continue;

    currentRoundNodes.forEach(node => {
      const hasIncomingEdge = edges.some(edge => edge.target === node.id);
      if (!hasIncomingEdge) {
        const closestPrevNode = prevRoundNodes
          .map(prevNode => ({ node: prevNode, dist: Math.abs(prevNode.position.x - node.position.x) }))
          .sort((a, b) => a.dist - b.dist)[0]?.node;
        
        if (closestPrevNode && !edges.some(e => e.source === closestPrevNode.id && e.target === node.id)) {
          edges.push({ id: `edge-補-${closestPrevNode.id}-${node.id}`, source: closestPrevNode.id, target: node.id, style: { strokeWidth: 2, stroke: '#FF0000' } });
          if(!stageConnections[closestPrevNode.id]) stageConnections[closestPrevNode.id] = [];
          stageConnections[closestPrevNode.id].push(node.id);
          console.log(`[맵 생성 보완] 노드 ${node.id}가 이전 라운드와 연결이 없어 ${closestPrevNode.id}와 강제 연결`);
        }
      }
    });
  }

  for (let roundIdx = 0; roundIdx < roundsLayout.length - 2; roundIdx++) {
    const currentRoundNodes = rounds[roundIdx];
    const nextRoundNodes = rounds[roundIdx + 1];
    if (!nextRoundNodes || nextRoundNodes.length === 0) continue;

    currentRoundNodes.forEach(node => {
        if (!stageConnections[node.id] || stageConnections[node.id].length === 0) {
            const closestNextNode = nextRoundNodes
                .map(nextNode => ({ node: nextNode, dist: Math.abs(nextNode.position.x - node.position.x) }))
                .sort((a,b) => a.dist - b.dist)[0]?.node;
            if (closestNextNode && !edges.some(e => e.source === node.id && e.target === closestNextNode.id)) {
                edges.push({ id: `edge-補out-${node.id}-${closestNextNode.id}`, source: node.id, target: closestNextNode.id, style: { strokeWidth: 2, stroke: '#00FF00' }});
                stageConnections[node.id].push(closestNextNode.id);
                console.log(`[맵 생성 보완] 노드 ${node.id}가 다음 라운드와 연결이 없어 ${closestNextNode.id}와 강제 연결`);
            }
        }
    });
  }

  const penultimateNodes = rounds[roundsLayout.length - 2];
  if (penultimateNodes && endNodeId) {
    penultimateNodes.forEach(node => {
      const sourceNodeId = node.id;
      
      if (!stageConnections[sourceNodeId]) {
        stageConnections[sourceNodeId] = [];
      }
      if (!stageConnections[sourceNodeId].includes(endNodeId)) {
        stageConnections[sourceNodeId].push(endNodeId);
      }

      const alreadyConnectedByEdge = edges.some(e => e.source === sourceNodeId && e.target === endNodeId);
      if (!alreadyConnectedByEdge) {
         edges.push({ id: `edge-final-${sourceNodeId}-${endNodeId}`, source: sourceNodeId, target: endNodeId, style: { strokeWidth: 3 } });
      }
    });
  }

  const allXPositions = nodes.filter(n => n.id !== startNodeId && n.id !== endNodeId).map(n => n.position.x);
  if (allXPositions.length > 0) {
    const minX = Math.min(...allXPositions);
    const maxX = Math.max(...allXPositions);
    const xOffset = -(minX + maxX) / 2;
    nodes.forEach(node => {
        if (node.id !== startNodeId && node.id !== endNodeId) {
        node.position.x += xOffset;
        }
    });
  }
  const startNodeRef = nodes.find(n => n.id === startNodeId);
  const endNodeRef = nodes.find(n => n.id === endNodeId);
  if(startNodeRef) startNodeRef.position.x = 0;
  if(endNodeRef) endNodeRef.position.x = 0;

  nodes.forEach(node => {
    if (generatedStages[node.id] && node.data && node.id !== startNodeId && node.id !== endNodeId) {
        node.data.label = `${generatedStages[node.id].type} (${node.id.replace('node-','')})`;
    } else if (node.id === startNodeId) node.data.label = '시작';
      else if (node.id === endNodeId) node.data.label = '종료';
  });

  return { nodes, edges, stageConnections, initialPlayerPosition: startNodeId, generatedStages };
};

export const useRoguelikeQuiz = (quiz: Quiz | null, userId: string, _sessionId?: string) => {
  const [gameSession, setGameSession] = useState<RoguelikeGameSession | null>(null);
  const [currentStage, setCurrentStage] = useState<RoguelikeStage | null>(null);
  const [currentQuestionNumericIndex, setCurrentQuestionNumericIndex] = useState(0); 
  const [answers, setAnswers] = useState<RoguelikeAnswer[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  
  const [mapNodes, setMapNodes] = useState<Node[]>([]);
  const [mapEdges, setMapEdges] = useState<Edge[]>([]);
  const [mapStageConnections, setMapStageConnections] = useState<Record<string, string[]>>({});
  const [mapGeneratedStages, setMapGeneratedStages] = useState<Record<string, RoguelikeStage>>({});
  const [initialPlayerPosition, setInitialPlayerPosition] = useState<string>('start');
  const [currentPlayerNodeId, setCurrentPlayerNodeId] = useState<string>('start');

  const TOTAL_STAGES_OR_ROUNDS = 7;

  const initializeGame = useCallback(() => {
    if (!quiz || !userId) return;

    const mapData = generateRoguelikeMap(quiz, TOTAL_STAGES_OR_ROUNDS);
    
    setMapNodes(mapData.nodes);
    setMapEdges(mapData.edges);
    setMapStageConnections(mapData.stageConnections);
    setInitialPlayerPosition(mapData.initialPlayerPosition);
    setCurrentPlayerNodeId(mapData.initialPlayerPosition);
    if (mapData.generatedStages) {
      setMapGeneratedStages(mapData.generatedStages);
    }
    
    // 시작 노드를 완료 상태로 설정
    setMapNodes(prevNodes => prevNodes.map(node => {
      if (node.id === mapData.initialPlayerPosition) {
        return {
          ...node,
          data: {
            ...node.data,
            isCompleted: true
          }
        };
      }
      return node;
    }));
    
    // 시작 스테이지도 완료 상태로 설정
    if (mapData.generatedStages && mapData.generatedStages[mapData.initialPlayerPosition]) {
      setMapGeneratedStages(prevStages => ({
        ...prevStages,
        [mapData.initialPlayerPosition]: {
          ...prevStages[mapData.initialPlayerPosition],
          completed: true
        }
      }));
    }
    
    const stagesForSession: RoguelikeStage[] = mapData.nodes
        .map(node => mapData.generatedStages?.[node.id])
        .filter((stage): stage is RoguelikeStage => !!stage);

    const newSession: RoguelikeGameSession = {
      id: `${userId}_${Date.now()}`,
      userId,
      quizId: quiz.id || '',
      stages: stagesForSession,
      currentPlayerNodeId: mapData.initialPlayerPosition,
      baseScore: 0,
      activityBonus: { correctAnswerBonus: 0, streakBonus: 0, speedBonus: 0, participationBonus: 0, completionBonus: 0, total: 0 },
      rouletteBonus: 0,
      finalScore: 0,
      temporaryBuffs: [],
      correctAnswers: 0,
      totalQuestions: 0,
      maxStreak: 0,
      currentStreak: 0,
      averageAnswerTime: 0,
      participatedInOpinion: false,
      completed: false,
      currentGameState: 'map-selection',
      waitingForReward: false,
      startedAt: Date.now()
    };

    setGameSession(newSession);
    const initialRoguelikeStage = mapData.generatedStages?.[mapData.initialPlayerPosition];
    setCurrentStage(initialRoguelikeStage || null);
    setCurrentQuestionNumericIndex(0);
    setAnswers([]);
    setGameStarted(true);
    setGameCompleted(false);
    
    console.log('게임 초기화 완료:', {
      initialPlayerPosition: mapData.initialPlayerPosition,
      initialStage: initialRoguelikeStage,
      totalNodes: mapData.nodes.length,
      stageConnections: mapData.stageConnections
    });
  }, [quiz, userId]);

  const getCurrentQuestionFromStage = useCallback((): Question | null => {
    if (!currentStage || !currentStage.questions || currentStage.questions.length === 0 || 
        currentQuestionNumericIndex < 0 || currentQuestionNumericIndex >= currentStage.questions.length) {
      return null;
    }
    const actualQuestionIndexInQuiz = currentStage.questions[currentQuestionNumericIndex];
    return quiz?.questions[actualQuestionIndexInQuiz] || null;
  }, [currentStage, currentQuestionNumericIndex, quiz]);

  const selectMapPath = useCallback((selectedNextNodeId: string) => {
    if (!gameSession || !mapGeneratedStages) return;

    const nextNodeAsStage = mapGeneratedStages[selectedNextNodeId];
    if (!nextNodeAsStage) {
      console.error("다음 스테이지 정보를 찾을 수 없습니다:", selectedNextNodeId);
      return;
    }

    const previousNodeId = gameSession.currentPlayerNodeId;

    setCurrentPlayerNodeId(selectedNextNodeId);
    setCurrentStage(nextNodeAsStage);
    setCurrentQuestionNumericIndex(0);

    let nextGameState: GameState = 'stage-active';
    if (nextNodeAsStage.type === 'roulette') {
      // 룰렛 스테이지는 stage-active로 설정하여 UI가 렌더링되도록 함
      nextGameState = 'stage-active';
    } else if (selectedNextNodeId === 'node-end') {
      nextGameState = 'completed';
    } else if (nextNodeAsStage.questions.length === 0 && nextNodeAsStage.type !== 'start') {
      nextGameState = 'map-selection';
    }
    
    // 맵 노드 상태 업데이트 (이전 노드를 완료됨으로 표시, 새 노드를 활성화)
    setMapNodes(prevNodes => prevNodes.map(node => {
      if (node.id === previousNodeId && mapGeneratedStages[previousNodeId]?.completed) {
        // 이전 노드가 완료되었으면 완료 표시
        return {
          ...node,
          data: {
            ...node.data,
            isCompleted: true,
            isActive: false
          }
        };
      } else if (node.id === selectedNextNodeId) {
        // 선택된 새 노드를 활성화
        return {
          ...node,
          data: {
            ...node.data,
            isActive: true,
            isCompleted: false
          }
        };
      } else {
        // 다른 노드들은 비활성화
        return {
          ...node,
          data: {
            ...node.data,
            isActive: false
          }
        };
      }
    }));
    
    setGameSession(prev => {
      if (!prev) return null;
      return { 
        ...prev, 
        currentPlayerNodeId: selectedNextNodeId,
        currentGameState: nextGameState 
      };
    });

    console.log(`맵 경로 선택: ${previousNodeId} → ${selectedNextNodeId}`, {
      nextStage: nextNodeAsStage,
      nextGameState
    });

  }, [gameSession, mapGeneratedStages]);
  
  // 로그라이크 게임의 활동 데이터를 기존 퀴즈 데이터베이스에 저장
  const uploadActivityData = useCallback(async (
    userId: string,
    quizId: string,
    questionIndex: number,
    answerData: { answerIndex?: number; answerText?: string },
    isCorrect: boolean,
    points: number,
    timeSpent: number,
    stageType: string
  ) => {
    if (!_sessionId) {
      console.warn('세션 ID가 없어 활동 데이터를 저장할 수 없습니다.');
      return;
    }

    try {
      // sessionService의 submitAnswer 함수를 사용하여 기존 데이터베이스 구조로 저장
      await submitAnswerToServer(
        _sessionId,
        questionIndex,
        userId,
        answerData,
        isCorrect,
        points,
        timeSpent,
        stageType,
        'roguelike' // mode 파라미터
      );
      
      console.log('퀴즈 활동 데이터 저장 완료:', {
        sessionId: _sessionId,
        questionIndex,
        answerData,
        isCorrect,
        points,
        stageType,
        timeSpent
      });
      
    } catch (error) {
      console.error('퀴즈 활동 데이터 저장 실패:', error);
      // 에러가 발생해도 게임 진행은 계속할 수 있도록 함
    }
  }, [_sessionId]);

  const submitAnswer = useCallback(async (answerIndex?: number, answerText?: string, timeSpent: number = 0, eliteAnswers?: Array<{questionIndex: number, answerIndex?: number, answerText?: string}>) => {
    if (!gameSession || !currentStage || !quiz) return;

    // 엘리트 스테이지 개별 문제 처리 확인
    const isEliteIndividualQuestion = currentStage.type === 'elite' && answerText && answerText.includes('엘리트 문제');
    
    if (isEliteIndividualQuestion) {
      // 엘리트 스테이지의 개별 문제는 활동 데이터 저장하지 않음 (전체 완료 시에만 저장)
      return;
    }

    // 엘리트 스테이지는 RoguelikeEliteStage에서 자체 관리하므로 여기서는 전체 결과만 처리
    if (currentStage.type === 'elite') {
      // 개별 문제 답변 처리
      if (eliteAnswers && eliteAnswers.length === 1) {
        // 개별 문제 답변 저장
        const answerInfo = eliteAnswers[0];
        const answerData = answerInfo.answerIndex !== undefined 
          ? { answerIndex: answerInfo.answerIndex } 
          : { answerText: answerInfo.answerText || '' };

        await uploadActivityData(
          gameSession.userId,
          gameSession.quizId,
          answerInfo.questionIndex,
          answerData,
          true, // 개별 문제는 항상 정답으로 처리 (검증은 클라이언트에서 완료)
          0, // 개별 문제는 0점
          timeSpent,
          currentStage.type
        );
        
        console.log('엘리트 개별 문제 답변 저장:', answerInfo);
        return; // 개별 문제는 여기서 종료
      }
      
      // 스테이지 완료 처리 (onStageComplete에서 호출)
      const isSuccess = answerIndex === 1;
      const correctCount = isSuccess ? 3 : (answerIndex || 0);
      
      const newAnswer: RoguelikeAnswer = {
        questionIndex: currentStage.questions[0], // 대표 문제 인덱스
        stageType: currentStage.type,
        answerIndex: isSuccess ? 1 : 0,
        answerText: `엘리트 스테이지 ${isSuccess ? '성공' : '실패'}: ${correctCount}문제 정답`,
        isCorrect: isSuccess,
        points: 0, // [규칙 0] 문제 자체는 점수 없음
        answeredAt: Date.now(),
        timeSpent,
      };
      setAnswers(prev => [...prev, newAnswer]);

      setGameSession(prev => {
        if (!prev) return null;
        return {
          ...prev,
          baseScore: prev.baseScore, // 엘리트 보상은 보상 상자 선택 시에만 추가
          correctAnswers: prev.correctAnswers + correctCount,
          totalQuestions: prev.totalQuestions + 3,
          currentStreak: isSuccess ? prev.currentStreak + 3 : 0,
          maxStreak: Math.max(prev.maxStreak, isSuccess ? prev.currentStreak + 3 : prev.currentStreak),
          // 엘리트 성공시 보상 상자 표시, 실패시 바로 맵 선택
          currentGameState: isSuccess ? 'reward-box' : 'map-selection',
          waitingForReward: isSuccess,
          currentPlayerNodeId: prev.currentPlayerNodeId,
        };
      });

      // 완료된 스테이지 정보 업데이트
      if (mapGeneratedStages[currentPlayerNodeId]) {
        const updatedStageInfo = { 
          ...mapGeneratedStages[currentPlayerNodeId], 
          completed: true, 
          score: mapGeneratedStages[currentPlayerNodeId].score || 0 // 엘리트 보상은 보상 상자 선택 시에만 추가
        };
        setMapGeneratedStages(prevStages => ({
            ...prevStages,
            [currentPlayerNodeId]: updatedStageInfo
        }));
        
        // 맵 노드의 완료 상태도 즉시 업데이트
        setMapNodes(prevNodes => prevNodes.map(node => {
          if (node.id === currentPlayerNodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                isCompleted: isSuccess,
                isFailed: !isSuccess
              }
            };
          }
          return node;
        }));
      }

      console.log(`엘리트 스테이지 ${isSuccess ? '성공' : '실패'}! 정답 수: ${correctCount}`);
      return;
    }

    // 일반/모닥불 스테이지는 기존 로직 사용 (활동 데이터는 보상 획득 시에 저장)
    const currentQuestionObject = getCurrentQuestionFromStage();
    if (!currentQuestionObject) {
        console.error("현재 문제 객체를 찾을 수 없습니다.");
        if (currentStage.questions.length === 0 || currentQuestionNumericIndex >= currentStage.questions.length -1) {
            setGameSession(prev => prev ? ({...prev, currentGameState: 'map-selection'}) : null);
        }
      return;
    }
    
    const actualQuestionIndexInQuiz = currentStage.questions[currentQuestionNumericIndex];
    const isCorrect = validateAnswer(currentQuestionObject, answerIndex, answerText);
    
    // 활동 데이터는 보상 획득 시에 저장하므로 여기서는 저장하지 않음
    // 대신 답변 정보만 임시 저장
    const answerData = answerIndex !== undefined 
      ? { answerIndex } 
      : { answerText: answerText || '' };
    
    // 답변 정보를 세션에 임시 저장 (보상 획득 시 활용)
    setGameSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pendingAnswer: {
          questionIndex: actualQuestionIndexInQuiz,
          answerData,
          isCorrect,
          timeSpent,
          stageType: currentStage.type
        }
      };
    });
    
    // [규칙 0] 모든 문제 정답시 점수 없음
    let points = 0;

    const newAnswer: RoguelikeAnswer = {
      questionIndex: actualQuestionIndexInQuiz,
      stageType: currentStage.type,
      answerIndex,
      answerText,
      isCorrect,
      points: 0, // [규칙 0] 문제 자체는 점수 없음
      answeredAt: Date.now(),
      timeSpent,
    };
    setAnswers(prev => [...prev, newAnswer]);

    // 다음 문제가 있는지 확인
    const hasMoreQuestions = currentQuestionNumericIndex < currentStage.questions.length - 1;
    const isStageCompleted = !hasMoreQuestions;

    setGameSession(prev => {
      if (!prev) return null;
      const newCorrectAnswers = prev.correctAnswers + (isCorrect ? 1 : 0);
      const newTotalQuestions = prev.totalQuestions + 1;
      const newCurrentStreak = isCorrect ? prev.currentStreak + 1 : 0;
      const newMaxStreak = Math.max(prev.maxStreak, newCurrentStreak);
      let newBaseScore = prev.baseScore; // 기본적으로 점수 변화 없음

      let nextGameState: GameState = prev.currentGameState;
      let waitingForReward = false;

      if (hasMoreQuestions) {
        // 스테이지 내에 더 문제가 있으면 계속 진행
        nextGameState = 'stage-active';
      } else {
        // 스테이지 완료됨
        if (currentStage.type === 'campfire') {
          // [규칙 3] 모닥불 스테이지는 점수 없음, 버프만 제공
          // 모닥불 완료 시 0점으로 활동 데이터 업로드
          if (prev.pendingAnswer) {
            uploadActivityData(
              prev.userId,
              prev.quizId,
              prev.pendingAnswer.questionIndex,
              prev.pendingAnswer.answerData,
              prev.pendingAnswer.isCorrect,
              0, // 모닥불은 0점
              prev.pendingAnswer.timeSpent,
              prev.pendingAnswer.stageType
            ).catch(error => console.error('모닥불 활동 데이터 업로드 실패:', error));
          }
          nextGameState = 'map-selection';
        } else if (currentStage.type === 'roulette' || currentPlayerNodeId === 'node-end') {
          // 룰렛 스테이지이거나 최종 노드면 게임 완료
          nextGameState = 'completed';
        } else {
          // [규칙 1] 일반 스테이지 - 정답인 경우에만 보상 상자, 오답인 경우 바로 맵 선택
          if (isCorrect) {
            nextGameState = 'reward-box';
            waitingForReward = true;
          } else {
            // 오답인 경우 0점으로 활동 데이터 업로드
            if (prev.pendingAnswer) {
              uploadActivityData(
                prev.userId,
                prev.quizId,
                prev.pendingAnswer.questionIndex,
                prev.pendingAnswer.answerData,
                prev.pendingAnswer.isCorrect,
                0, // 오답은 0점
                prev.pendingAnswer.timeSpent,
                prev.pendingAnswer.stageType
              ).catch(error => console.error('오답 활동 데이터 업로드 실패:', error));
            }
            nextGameState = 'map-selection';
          }
        }

        // 완료된 스테이지 정보 업데이트
        if (mapGeneratedStages[currentPlayerNodeId]) {
          const updatedStageInfo = { 
            ...mapGeneratedStages[currentPlayerNodeId], 
            completed: true, 
            score: mapGeneratedStages[currentPlayerNodeId].score || 0 // 문제 자체로는 점수 추가 안함
          };
          setMapGeneratedStages(prevStages => ({
              ...prevStages,
              [currentPlayerNodeId]: updatedStageInfo
          }));
          
          // 맵 노드의 완료 상태도 즉시 업데이트
          setMapNodes(prevNodes => prevNodes.map(node => {
            if (node.id === currentPlayerNodeId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  isCompleted: isCorrect || currentStage.type === 'campfire', // 캠프파이어는 항상 완료로 처리
                  isFailed: !isCorrect && currentStage.type !== 'campfire'
                }
              };
            }
            return node;
          }));
        }
      }
      
      return {
        ...prev,
        baseScore: newBaseScore,
        correctAnswers: newCorrectAnswers,
        totalQuestions: newTotalQuestions,
        currentStreak: newCurrentStreak,
        maxStreak: newMaxStreak,
        currentGameState: nextGameState,
        waitingForReward,
        currentPlayerNodeId: prev.currentPlayerNodeId,
        participatedInOpinion: currentStage.type === 'campfire' ? true : prev.participatedInOpinion,
      };
    });
    
    // 다음 문제로 이동 (스테이지 내에서)
    if (hasMoreQuestions) {
      setCurrentQuestionNumericIndex(prevIdx => prevIdx + 1);
    }
      
    // 정답/오답 피드백을 위한 약간의 지연 (선택사항)
    if (isStageCompleted && currentStage.type !== 'campfire') {
      // 스테이지 완료 시 잠시 대기 후 보상 상자 또는 다음 단계로 전환
      console.log(`스테이지 완료! 타입: ${currentStage.type}, 점수: ${points}, 정답: ${isCorrect}`);
    }

  }, [gameSession, currentStage, quiz, currentQuestionNumericIndex, getCurrentQuestionFromStage, mapGeneratedStages, currentPlayerNodeId, uploadActivityData]);

  const validateAnswer = (question: Question, answerIndex?: number, answerText?: string): boolean => {
    if (question.type === 'multiple-choice') {
      return question.correctAnswer === answerIndex;
    } else if (question.type === 'short-answer') {
      const correctAnswer = question.correctAnswerText?.trim().toLowerCase();
      const userAnswer = answerText?.trim().toLowerCase();
      if (userAnswer === correctAnswer) return true;
      return question.additionalAnswers?.some(ans => ans.trim().toLowerCase() === userAnswer) || false;
    } else if (question.type === 'opinion') {
      return true;
    }
    return false;
  };

  const selectTemporaryBuff = useCallback((buffId: string) => {
    console.log('Buff selected:', buffId);
    
    setGameSession(prev => {
      if (!prev) return null;
      
      // 이미 같은 버프가 있는지 확인
      const existingBuffIndex = prev.temporaryBuffs.findIndex(buff => buff.id === buffId);
      
      let updatedBuffs = [...prev.temporaryBuffs];
      
      if (existingBuffIndex >= 0) {
        // 이미 있는 버프라면 스택 수 증가 (강화)
        const existingBuff = updatedBuffs[existingBuffIndex];
        updatedBuffs[existingBuffIndex] = {
          ...existingBuff,
          active: true,
          usesRemaining: (existingBuff.usesRemaining || 3) + 2, // 2회 추가
          stackCount: (existingBuff.stackCount || 1) + 1, // 스택 수 증가
        };
        console.log(`버프 강화: ${buffId}, 새로운 스택: ${updatedBuffs[existingBuffIndex].stackCount}`);
      } else {
        // 새로운 버프 추가
        const newBuff: TemporaryBuff = {
          id: buffId,
          name: getBuffName(buffId),
          description: getBuffDescription(buffId),
          effect: getBuffEffect(buffId),
          icon: getBuffIcon(buffId),
          active: true,
          usesRemaining: 3,
          stackCount: 1, // 초기 스택 수
        };
        updatedBuffs.push(newBuff);
        console.log(`새 버프 추가: ${buffId}`);
      }
      
      return {
        ...prev,
        temporaryBuffs: updatedBuffs
      };
    });
  }, []);

  // 버프 정보 헬퍼 함수들
  const getBuffName = (buffId: string): string => {
    switch (buffId) {
      case 'PASSION_BUFF': return '🔥 열정 버프';
      case 'WISDOM_BUFF': return '🧠 지혜 버프';
      case 'LUCK_BUFF': return '🍀 행운 버프';
      default: return '알 수 없는 버프';
    }
  };

  const getBuffDescription = (buffId: string): string => {
    switch (buffId) {
      case 'PASSION_BUFF': return '연속 정답 보너스가 2배로 증가합니다';
      case 'WISDOM_BUFF': return '모든 정답에 추가 보너스 점수를 받습니다';
      case 'LUCK_BUFF': return '최종 룰렛에서 높은 배수가 나올 확률이 증가합니다';
      default: return '';
    }
  };

  const getBuffEffect = (buffId: string): string => {
    switch (buffId) {
      case 'PASSION_BUFF': return '연속 정답 보너스 × 2';
      case 'WISDOM_BUFF': return '정답당 +50점 추가';
      case 'LUCK_BUFF': return '룰렛 고배수 확률 상승';
      default: return '';
    }
  };

  const getBuffIcon = (buffId: string): string => {
    switch (buffId) {
      case 'PASSION_BUFF': return '🔥';
      case 'WISDOM_BUFF': return '🧠';
      case 'LUCK_BUFF': return '🍀';
      default: return '❓';
    }
  };

  const spinRoulette = useCallback((): RouletteResult => {
    const multiplier = (Math.floor(Math.random() * 5) + 1) * 0.5;
    const message = ROULETTE_MESSAGES[Math.floor(Math.random() * ROULETTE_MESSAGES.length)];
    const bonusPoints = Math.round((gameSession?.baseScore || 0) * (multiplier -1) ); 

    setGameSession(prev => {
        if (!prev) return null;
        const finalScore = prev.baseScore + (prev.activityBonus?.total || 0) + bonusPoints;
        return {
            ...prev,
            rouletteBonus: bonusPoints,
            finalScore,
            completed: true,
            currentGameState: 'completed',
            completedAt: Date.now()
        }
    });
    setGameCompleted(true);
    return { multiplier, bonusPoints, message };
  }, [gameSession]);

  const resetGame = useCallback(() => {
    setGameSession(null);
    setCurrentStage(null);
    setCurrentQuestionNumericIndex(0);
    setAnswers([]);
    setGameStarted(false);
    setGameCompleted(false);
    setMapNodes([]);
    setMapEdges([]);
    setMapStageConnections({});
    setMapGeneratedStages({});
    setInitialPlayerPosition('start');
    setCurrentPlayerNodeId('start');
  }, []);

  const calculateActivityBonus = useCallback((session: RoguelikeGameSession | null): ActivityBonus => {
    if (!session) return { correctAnswerBonus: 0, streakBonus: 0, speedBonus: 0, participationBonus: 0, completionBonus: 0, total: 0 };
    let bonus: ActivityBonus = {
        correctAnswerBonus: session.correctAnswers * 10,
        streakBonus: session.maxStreak * 50,
        speedBonus: 0,
        participationBonus: session.participatedInOpinion ? 200 : 0,
        completionBonus: session.completed ? 500 : 0,
        total: 0
    };
    bonus.total = bonus.correctAnswerBonus + bonus.streakBonus + bonus.speedBonus + bonus.participationBonus + bonus.completionBonus;
    return bonus;
  }, []);
  
  const selectRewardBox = useCallback((points: number) => {
    console.log('Reward box selected, points:', points);
    if (!gameSession) return;

    // 보상 획득 시 실제 점수로 활동 데이터 업로드
    if (gameSession.pendingAnswer && _sessionId) {
      uploadActivityData(
        gameSession.userId,
        gameSession.quizId,
        gameSession.pendingAnswer.questionIndex,
        gameSession.pendingAnswer.answerData,
        gameSession.pendingAnswer.isCorrect,
        points, // 실제 획득한 보상 점수
        gameSession.pendingAnswer.timeSpent,
        gameSession.pendingAnswer.stageType
      ).then(() => {
        console.log('보상 상자 활동 데이터 업로드 완료:', { points, isCorrect: gameSession.pendingAnswer?.isCorrect });
      }).catch(error => {
        console.error('보상 상자 활동 데이터 업로드 실패:', error);
      });
    }

    setGameSession(prev => {
      if (!prev) return null;
      return {
        ...prev,
        baseScore: prev.baseScore + points,
        currentGameState: 'map-selection',
        waitingForReward: false,
        pendingAnswer: undefined, // 활동 데이터 업로드 완료 후 초기화
      };
    });

    // 보상 선택 완료 메시지
    console.log(`보상 상자에서 ${points}점을 획득했습니다!`);

  }, [gameSession, uploadActivityData, _sessionId]);

  return {
    gameSession,
    currentStage,
    currentQuestionIndex: currentQuestionNumericIndex,
    currentQuestion: getCurrentQuestionFromStage(),
    gameStarted,
    gameCompleted,
    answers,
    totalStages: TOTAL_STAGES_OR_ROUNDS,
    initializeGame,
    submitAnswer,
    selectTemporaryBuff,
    spinRoulette,
    resetGame,
    calculateActivityBonus,
    selectMapPath,
    selectRewardBox,
    mapNodes,
    mapEdges,
    mapStageConnections,
    mapGeneratedStages,
    initialPlayerPosition,
    currentPlayerNodeId,
  };
}; 