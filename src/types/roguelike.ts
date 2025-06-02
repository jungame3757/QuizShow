import { Question } from '.'; // Question 타입을 가져올 수 있도록 경로 수정이 필요할 수 있음 (현재 파일 위치 기준)

// 로그라이크 퀴즈 모드 관련 타입 정의

export type RoguelikeStageType = 'normal' | 'elite' | 'campfire' | 'roulette' | 'start';

// 갈림길 선택지 타입
export interface ForkChoice {
  id: string;
  name: string;
  description: string;
  stageType: RoguelikeStageType;
  icon: string;
  difficulty: 'easy' | 'normal' | 'hard';
  rewardRange: string;
}

// 게임 상태 타입 확장
export type GameState = 'fork-selection' | 'question' | 'reward-box' | 'completed' | 'map-selection' | 'stage-active';

// 맵 경로 타입 추가
export type MapPathType = 'single' | 'fork'; // 한갈래 또는 두갈래
export type PathChoice = 'left' | 'right' | 'straight';

// 보상 상자 타입 추가
export interface RewardBox {
  id: string;
  icon: string;
  minPoints: number;
  maxPoints: number;
  rarity: 'common' | 'rare' | 'epic';
}

export interface RoguelikeStage {
  type: RoguelikeStageType;
  questions: number[]; // 문제 인덱스 배열 (Quiz.questions 전체 배열에 대한 인덱스)
  completed: boolean;
  score: number;
  pathType?: MapPathType; // MapPathType은 여기서도 사용될 수 있음
  availablePaths?: PathChoice[]; // PathChoice도 여기서 사용될 수 있음
  selectedPath?: PathChoice;
}

export interface TemporaryBuff {
  id: string;
  name: string;
  description: string;
  effect: string;
  icon: string;
  active: boolean;
  usesRemaining: number;
  stackCount?: number; // 버프 스택 수 (선택적)
}

export interface ActivityBonus {
  correctAnswerBonus: number;    // 정답 개수 보너스
  streakBonus: number;          // 연속 정답 보너스
  speedBonus: number;           // 빠른 답변 보너스
  participationBonus: number;   // 의견 참여 보너스
  completionBonus: number;      // 완주 보너스
  total: number;               // 총 활동 보너스
}

export interface RoguelikeGameSession {
  id: string;
  userId: string;
  quizId: string;
  stages: RoguelikeStage[]; // 맵 기반으로 생성된 스테이지들의 배열 (주로 통계/참고용)
  // currentStageIndex: number; // 사용 빈도 줄이고 currentPlayerNodeId 또는 currentStage로 대체 고려
  currentPlayerNodeId: string; // 현재 플레이어가 위치한 맵 노드의 ID
  baseScore: number;
  activityBonus: ActivityBonus;
  rouletteBonus: number;
  finalScore: number;
  temporaryBuffs: TemporaryBuff[];
  correctAnswers: number;
  totalQuestions: number;
  maxStreak: number;
  currentStreak: number;
  averageAnswerTime: number;
  participatedInOpinion: boolean;
  completed: boolean;
  currentGameState: GameState;
  waitingForReward: boolean;
  startedAt?: number;
  completedAt?: number;
  pendingAnswer?: {
    questionIndex: number;
    answerData: { answerIndex?: number; answerText?: string };
    isCorrect: boolean;
    timeSpent: number;
    stageType: string;
  };
  eliteLastQuestionData?: {
    questionIndex: number;
    answer: string | number;
    isCorrect: boolean;
    questionType: 'multiple-choice' | 'short-answer';
  }; // 엘리트 스테이지 마지막 문제 답변 데이터
}

export interface RoguelikeAnswer {
  questionIndex: number;
  stageType: RoguelikeStageType;
  answerIndex?: number; // 객관식용
  answerText?: string; // 주관식/의견용
  isCorrect: boolean;
  points: number;
  answeredAt: number;
  timeSpent: number; // 답변에 걸린 시간 (초)
  buffApplied?: string; // 적용된 버프 ID
}

export interface RouletteResult {
  multiplier: number; // 0.5 ~ 2.5배
  bonusPoints: number; // 실제 추가 점수
  message: string; // 결과 메시지
}

export interface RoguelikeStats {
  totalPlays: number;        // 총 플레이 횟수
  highestScore: number;      // 최고 점수
  lastPlayDate: number;      // 마지막 플레이 일시
  completionCount: number;   // 완주 횟수
  averageScore: number;      // 평균 점수
  totalPlayTime: number;     // 총 플레이 시간 (분)
}

// 버프 아이템 정의
export const TEMPORARY_BUFFS: Record<string, Omit<TemporaryBuff, 'active' | 'usesRemaining'>> = {
  LUCKY_CLOVER: {
    id: 'LUCKY_CLOVER',
    name: '행운의 클로버',
    description: '다음 기본 점수 +100점',
    effect: 'normal_score_boost_100',
    icon: '🍀'
  },
  LIGHTNING_BOOSTER: {
    id: 'LIGHTNING_BOOSTER',
    name: '번개 부스터',
    description: '다음 엘리트 점수 +200점',
    effect: 'elite_score_boost_200',
    icon: '⚡'
  },
  FOCUS_ENHANCEMENT: {
    id: 'FOCUS_ENHANCEMENT',
    name: '집중력 향상',
    description: '다음 문제 제한시간 +30초',
    effect: 'time_extension_30',
    icon: '🎯'
  },
  SAFETY_NET: {
    id: 'SAFETY_NET',
    name: '안전망',
    description: '다음 오답 시에도 50점 획득',
    effect: 'wrong_answer_points_50',
    icon: '🛡️'
  },
  PASSION_BUFF: {
    id: 'PASSION_BUFF',
    name: '열정 버프',
    description: '연속 정답 보너스 2배',
    effect: 'streak_bonus_double',
    icon: '🔥'
  }
};

export const ROULETTE_MESSAGES = [
  '대박! 엄청난 보너스입니다!',
  '훌륭해요! 좋은 결과네요!',
  '괜찮은 보너스입니다!',
  '아쉽지만 나쁘지 않아요!',
  '다음에는 더 좋은 결과가 있을 거예요!'
]; 