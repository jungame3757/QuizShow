import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, User, RefreshCw, Award, LogOut, AlertTriangle, Share2, Gem, Sparkle } from 'lucide-react';
import Button from '../ui/Button';
import confetti from 'canvas-confetti';

interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
}

interface Quiz {
  id?: string;
  title: string;
  description?: string;
  questions: Question[];
  createdAt?: string;
  status?: 'waiting' | 'active' | 'completed';
}

interface Answer {
  questionIndex: number;
  answer: string;
  isCorrect: boolean;
  points: number;
  answeredAt: string;
}

interface Participant {
  id: string;
  quizId: string;
  nickname: string;
  score: number;
  answers: Answer[];
  joinedAt?: string;
}

// 랭킹 참가자 인터페이스 추가
interface RankingParticipant {
  id: string;
  name: string;
  score: number;
  isCurrentUser: boolean;
}

interface QuizResultsProps {
  quiz: Quiz;
  participant: Participant;
  rankings?: RankingParticipant[]; // 랭킹 정보 추가
  isLoadingRankings?: boolean; // 랭킹 로딩 상태 추가
  onResetQuiz?: () => void; // 퀴즈 다시 시작 함수 추가
  inviteCode?: string; // 초대 코드 추가
  canRetry?: boolean; // 퀴즈 재시도 가능 여부
}

const QuizResults: React.FC<QuizResultsProps> = ({ 
  quiz, 
  participant,
  rankings = [], 
  isLoadingRankings = false,
  onResetQuiz,
  inviteCode,
  canRetry = true
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [rankingViewMode, setRankingViewMode] = useState<'top5' | 'around'>('top5');
  
  // Calculate results
  const totalQuestions = quiz.questions.length;
  
  // 점수별로 정렬된 랭킹 계산 (동점자 처리 포함)
  const processedRankings = React.useMemo(() => {
    // 점수별로 내림차순 정렬
    const sortedRankings = [...rankings].sort((a, b) => b.score - a.score);
    
    // 동점자 처리를 위한 배열
    let result: (RankingParticipant & { rank: number })[] = [];
    let currentRank = 1;
    let prevScore: number | null = null;
    
    // 동점자는 같은 순위 부여
    sortedRankings.forEach((ranker, index) => {
      if (prevScore !== null && prevScore === ranker.score) {
        // 동점자는 이전 참가자와 같은 순위 부여
        result.push({ ...ranker, rank: result[result.length - 1].rank });
      } else {
        // 새로운 점수는 현재 인덱스+1 순위 부여
        result.push({ ...ranker, rank: currentRank });
      }
      
      prevScore = ranker.score;
      currentRank = index + 2; // 다음 순위는 현재 인덱스 + 2
    });
    
    return result;
  }, [rankings]);
  
  // 사용자 랭킹 찾기
  const userRankInfo = processedRankings.find(r => r.isCurrentUser);
  const userRank = userRankInfo?.rank || 0;
  
  // 주변 랭킹 구하기 (내 순위 기준 위아래 2명씩)
  const aroundRankings = React.useMemo(() => {
    if (!userRankInfo) return [];
    
    const userIndex = processedRankings.findIndex(r => r.isCurrentUser);
    if (userIndex === -1) return [];
    
    // 총 표시할 랭킹 수
    const totalToShow = 5;
    
    // 기본 설정: 위로 2명, 아래로 2명 (본인 포함 5명)
    let aboveCount = 2;
    let belowCount = 2;
    
    // 위쪽 사용자가 부족한 경우 (1등 또는 2등인 경우)
    if (userIndex < aboveCount) {
      // 위쪽 부족한 만큼 아래쪽에 추가
      aboveCount = userIndex;
      belowCount = Math.min(processedRankings.length - userIndex - 1, totalToShow - aboveCount - 1);
    } 
    // 아래쪽 사용자가 부족한 경우 (꼴등 또는 끝에서 2등인 경우)
    else if (userIndex + belowCount >= processedRankings.length) {
      // 아래쪽 부족한 만큼 위쪽에 추가
      belowCount = processedRankings.length - userIndex - 1;
      aboveCount = Math.min(userIndex, totalToShow - belowCount - 1);
    }
    
    // 계산된 인덱스로 슬라이스
    const startIndex = userIndex - aboveCount;
    const endIndex = userIndex + belowCount + 1; // +1은 endIndex가 exclusive이기 때문
    
    return processedRankings.slice(startIndex, endIndex);
  }, [processedRankings, userRankInfo]);
  
  // 티어 결정 함수
  const getTierInfo = () => {
    // 참가자 수가 적을 경우 순위 기반 대신 점수 기반으로 티어 결정
    if (rankings.length <= 3) {
      const score = participant.score;
      const maxPossibleScore = totalQuestions * 100; // 예상 최대 점수
      const scorePercentage = maxPossibleScore > 0 ? (score / maxPossibleScore) * 100 : 0;
      
      if (scorePercentage >= 90) return { 
        name: '다이아몬드', 
        icon: <Gem size={40} className="text-white" />, 
        color: 'from-blue-500 to-purple-600',
        bgColor: 'bg-gradient-to-br from-indigo-900 to-purple-900',
        borderColor: 'border-blue-300',
        shadowColor: 'shadow-blue-500/50',
        iconAnimClass: 'shimmer-diamond',
        percentile: `상위 10%`,
        hasSpecialEffect: true
      };
      if (scorePercentage >= 75) return { 
        name: '플래티넘', 
        icon: <Trophy size={40} className="text-white" />, 
        color: 'from-cyan-400 to-blue-600',
        bgColor: 'bg-gradient-to-br from-cyan-800 to-blue-900',
        borderColor: 'border-cyan-300',
        shadowColor: 'shadow-cyan-500/30',
        iconAnimClass: 'shimmer-platinum',
        percentile: `상위 25%`,
        hasSpecialEffect: true
      };
      if (scorePercentage >= 60) return { 
        name: '골드', 
        icon: <Medal size={40} className="text-white" />, 
        color: 'from-yellow-400 to-amber-500',
        bgColor: 'bg-gradient-to-br from-amber-700 to-yellow-900',
        borderColor: 'border-yellow-400',
        shadowColor: 'shadow-amber-500/30',
        iconAnimClass: 'shimmer-gold',
        percentile: `상위 50%`,
        hasSpecialEffect: false
      };
      if (scorePercentage >= 40) return { 
        name: '실버', 
        icon: <Medal size={40} className="text-white" />, 
        color: 'from-gray-300 to-gray-500',
        bgColor: 'bg-gradient-to-br from-gray-700 to-gray-800',
        borderColor: 'border-gray-400',
        shadowColor: 'shadow-gray-500/20',
        iconAnimClass: 'shimmer-silver',
        percentile: `상위 75%`,
        hasSpecialEffect: false
      };
      return { 
        name: '브론즈', 
        icon: <Medal size={40} className="text-white" />, 
        color: 'from-amber-600 to-amber-800',
        bgColor: 'bg-gradient-to-br from-amber-800 to-amber-950',
        borderColor: 'border-amber-700',
        shadowColor: 'shadow-amber-700/20',
        iconAnimClass: '',
        percentile: `하위 25%`,
        hasSpecialEffect: false
      };
    }
    
    // 순위 기반 티어
    const rankPercentile = rankings.length > 0 ? (userRank / rankings.length) * 100 : 0;
    const percentileText = `상위 ${Math.round(rankPercentile)}%`;
    
    if (rankPercentile <= 10 || userRank === 1) return { 
      name: '다이아몬드', 
      icon: <Gem size={40} className="text-white" />, 
      color: 'from-blue-500 to-purple-600',
      bgColor: 'bg-gradient-to-br from-indigo-900 to-purple-900',
      borderColor: 'border-blue-300',
      shadowColor: 'shadow-blue-500/50',
      iconAnimClass: 'shimmer-diamond',
      percentile: percentileText,
      hasSpecialEffect: true
    };
    if (rankPercentile <= 25) return { 
      name: '플래티넘', 
      icon: <Trophy size={40} className="text-white" />, 
      color: 'from-cyan-400 to-blue-600',
      bgColor: 'bg-gradient-to-br from-cyan-800 to-blue-900',
      borderColor: 'border-cyan-300',
      shadowColor: 'shadow-cyan-500/30',
      iconAnimClass: 'shimmer-platinum',
      percentile: percentileText,
      hasSpecialEffect: true
    };
    if (rankPercentile <= 50) return { 
      name: '골드', 
      icon: <Medal size={40} className="text-white" />, 
      color: 'from-yellow-400 to-amber-500',
      bgColor: 'bg-gradient-to-br from-amber-700 to-yellow-900',
      borderColor: 'border-yellow-400',
      shadowColor: 'shadow-amber-500/30',
      iconAnimClass: 'shimmer-gold',
      percentile: percentileText,
      hasSpecialEffect: false
    };
    if (rankPercentile <= 75) return { 
      name: '실버', 
      icon: <Medal size={40} className="text-white" />, 
      color: 'from-gray-300 to-gray-500',
      bgColor: 'bg-gradient-to-br from-gray-700 to-gray-800',
      borderColor: 'border-gray-400',
      shadowColor: 'shadow-gray-500/20',
      iconAnimClass: 'shimmer-silver',
      percentile: percentileText,
      hasSpecialEffect: false
    };
    return { 
      name: '브론즈', 
      icon: <Medal size={40} className="text-white" />, 
      color: 'from-amber-600 to-amber-800',
      bgColor: 'bg-gradient-to-br from-amber-800 to-amber-950',
      borderColor: 'border-amber-700',
      shadowColor: 'shadow-amber-700/20',
      iconAnimClass: '',
      percentile: percentileText,
      hasSpecialEffect: false
    };
  };
  
  const tierInfo = getTierInfo();
  
  // CSS 클래스 생성을 위한 함수
  const generateCardStyles = () => {
    return `${tierInfo.bgColor} border-2 ${tierInfo.borderColor} rounded-xl p-4 text-white mb-3 shadow-lg ${tierInfo.shadowColor}`;
  };
  
  // 특별 효과를 위한 스타일 컴포넌트
  const RankEffects = () => {
    // 다이아몬드, 플래티넘 등급에만 sparkle 적용
    const sparkleCount = tierInfo.name === '다이아몬드' 
      ? 10 
      : tierInfo.name === '플래티넘' 
        ? 5 
        : 0;
    
    // sparkle 효과가 없으면 조기 반환
    if (sparkleCount === 0 && !tierInfo.hasSpecialEffect) return null;
    
    // 미리 sparkle 위치 생성
    const sparkles = Array.from({ length: sparkleCount }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.floor(Math.random() * 16) + 8, // 8-24px 크기
      delay: Math.random() * 3,
      duration: (Math.random() * 2) + 2 // 2-4초
    }));
    
    return (
      <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
        {/* 배경 효과 (기존 코드 유지) */}
        {tierInfo.hasSpecialEffect && (
          <div className="absolute inset-0 overflow-hidden">
            <div className={`absolute w-[150%] h-[150%] -top-1/4 -left-1/4 ${
              tierInfo.name === '다이아몬드' ? 'glitter-effect-diamond opacity-20' :
              tierInfo.name === '플래티넘' ? 'glitter-effect-platinum opacity-15' : ''
            }`}></div>
          </div>
        )}
        
        {/* 스파클 아이콘 효과 */}
        {sparkles.map(sparkle => (
          <div 
            key={sparkle.id}
            className="absolute sparkle-animation"
            style={{
              top: sparkle.top,
              left: sparkle.left,
              animationDelay: `${sparkle.delay}s`,
              animationDuration: `${sparkle.duration}s`
            }}
          >
            <Sparkle 
              size={sparkle.size} 
              className={
                tierInfo.name === '다이아몬드' ? 'text-blue-200' : 'text-cyan-200'
              } 
            />
          </div>
        ))}
      </div>
    );
  };
  
  // CSS 애니메이션 스타일 추가
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      /* 스파클 아이콘 애니메이션 */
      .sparkle-animation {
        opacity: 0;
        transform: scale(0);
        animation: sparkleEffect infinite;
      }
      
      @keyframes sparkleEffect {
        0% {
          opacity: 0;
          transform: scale(0) rotate(0deg);
        }
        20% {
          opacity: 0.8;
          transform: scale(1) rotate(20deg);
        }
        50% {
          opacity: 1;
          transform: scale(1.2) rotate(0deg);
        }
        80% {
          opacity: 0.8;
          transform: scale(1) rotate(-20deg);
        }
        100% {
          opacity: 0;
          transform: scale(0) rotate(0deg);
        }
      }
      
      /* 다이아몬드 아이콘 반짝임 효과 */
      .shimmer-diamond {
        position: relative;
        overflow: hidden;
      }
      .shimmer-diamond::after {
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
        animation: shimmerDiamond 3s infinite;
      }
      @keyframes shimmerDiamond {
        0% { transform: rotate(30deg) translateX(-100%); }
        100% { transform: rotate(30deg) translateX(100%); }
      }
      
      /* 플래티넘 아이콘 반짝임 효과 */
      .shimmer-platinum {
        position: relative;
        overflow: hidden;
      }
      .shimmer-platinum::after {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          to right, 
          rgba(255,255,255,0) 0%,
          rgba(255,255,255,0.2) 50%,
          rgba(255,255,255,0) 100%
        );
        transform: rotate(30deg);
        animation: shimmerPlatinum 4s infinite;
      }
      @keyframes shimmerPlatinum {
        0% { transform: rotate(30deg) translateX(-100%); }
        100% { transform: rotate(30deg) translateX(100%); }
      }
      
      /* 골드 아이콘 반짝임 효과 */
      .shimmer-gold {
        position: relative;
        overflow: hidden;
      }
      .shimmer-gold::after {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          to right, 
          rgba(255,255,255,0) 0%,
          rgba(255,215,0,0.2) 50%,
          rgba(255,255,255,0) 100%
        );
        transform: rotate(30deg);
        animation: shimmerGold 5s infinite;
      }
      @keyframes shimmerGold {
        0% { transform: rotate(30deg) translateX(-100%); }
        100% { transform: rotate(30deg) translateX(100%); }
      }
      
      /* 실버 아이콘 반짝임 효과 */
      .shimmer-silver {
        position: relative;
        overflow: hidden;
      }
      .shimmer-silver::after {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          to right, 
          rgba(255,255,255,0) 0%,
          rgba(192,192,192,0.2) 50%,
          rgba(255,255,255,0) 100%
        );
        transform: rotate(30deg);
        animation: shimmerSilver 6s infinite;
      }
      @keyframes shimmerSilver {
        0% { transform: rotate(30deg) translateX(-100%); }
        100% { transform: rotate(30deg) translateX(100%); }
      }
      
      /* 다이아몬드 카드 효과 */
      .glitter-effect-diamond {
        background: radial-gradient(circle at center, transparent 30%, rgba(128, 90, 213, 0.6) 70%);
      }
      
      /* 플래티넘 카드 효과 */
      .glitter-effect-platinum {
        background: radial-gradient(circle at center, transparent 30%, rgba(56, 189, 248, 0.5) 70%);
      }
      
      /* 다이아몬드 빛 효과 */
      .light-trail-diamond {
        background: radial-gradient(circle at center, rgba(255, 255, 255, 0.7), transparent 70%);
        border-radius: 50%;
        opacity: 0;
        animation: moveLight 8s ease-in-out infinite;
      }
      
      /* 플래티넘 빛 효과 */
      .light-trail-platinum {
        background: radial-gradient(circle at center, rgba(255, 255, 255, 0.5), transparent 70%);
        border-radius: 50%;
        opacity: 0;
        animation: moveLight 10s ease-in-out infinite;
      }
      
      @keyframes moveLight {
        0% { 
          opacity: 0;
          transform: translate(0, 0) scale(0.5);
        }
        50% { 
          opacity: 0.6;
          transform: translate(-100px, 50px) scale(1);
        }
        100% { 
          opacity: 0;
          transform: translate(-200px, 100px) scale(0.5);
        }
      }
      
      .delay-700 {
        animation-delay: 700ms;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Launch confetti
  useEffect(() => {
    if (!showConfetti) {
      setShowConfetti(true);
      
      // 티어에 따라 컨페티 강도 조절
      const duration = tierInfo.name === '다이아몬드' || tierInfo.name === '플래티넘' 
        ? 5 * 1000  // 최상위 등급은 더 오래 더 화려하게
        : tierInfo.name === '골드'
          ? 3 * 1000 // 골드는 적당히
          : 2 * 1000; // 기본
          
      const animationEnd = Date.now() + duration;
      
      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };
      
      // 티어별 컨페티 색상 설정
      const colors = tierInfo.name === '다이아몬드' 
        ? ['#14B8A6', '#0EA5E9', '#818CF8', '#A78BFA', '#C084FC', '#E9D5FF'] // 다이아몬드 색상
        : tierInfo.name === '플래티넘'
          ? ['#14B8A6', '#0EA5E9', '#38BDF8', '#7DD3FC', '#BAE6FD'] // 플래티넘 색상
          : tierInfo.name === '골드'
            ? ['#F59E0B', '#FBBF24', '#FCD34D', '#FEF3C7'] // 골드 색상
            : ['#14B8A6', '#0EA5E9', '#4ECDC4', '#FFE66D']; // 기본
            
      // 첫 발사 (등급이 높을수록 더 많은 파티클)
      const initialBlast = tierInfo.name === '다이아몬드' ? 150 
        : tierInfo.name === '플래티넘' ? 100
        : tierInfo.name === '골드' ? 80
        : 50;
      
      confetti({
        particleCount: initialBlast,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: colors,
        zIndex: 2000
      });
      
      // 티어가 높은 경우 추가 효과
      if (tierInfo.name === '다이아몬드' || tierInfo.name === '플래티넘') {
        setTimeout(() => {
          confetti({
            particleCount: 80,
            angle: 60,
            spread: 70,
            origin: { x: 0, y: 0.65 },
            colors: colors
          });
        }, 500);
        
        setTimeout(() => {
          confetti({
            particleCount: 80,
            angle: 120,
            spread: 70,
            origin: { x: 1, y: 0.65 },
            colors: colors
          });
        }, 800);
      }
      
      // 주기적인 발사 간격
      const firingInterval = tierInfo.name === '다이아몬드' ? 300 
        : tierInfo.name === '플래티넘' ? 400
        : tierInfo.name === '골드' ? 500
        : 600;
      
      // 발사 양
      const particlePerShot = tierInfo.name === '다이아몬드' ? 30
        : tierInfo.name === '플래티넘' ? 20
        : tierInfo.name === '골드' ? 15
        : 10;
      
      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }
        
        confetti({
          particleCount: particlePerShot,
          origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
          colors: colors,
          zIndex: 2000,
        });
      }, firingInterval);
      
      return () => clearInterval(interval);
    }
  }, [showConfetti, tierInfo.name]);

  const handleResetConfirm = () => {
    if (onResetQuiz) {
      onResetQuiz();
      setShowResetConfirm(false);
    }
  };

  // 퀴즈 결과 공유하기 함수
  const handleShareResults = async () => {
    // 공유할 텍스트 생성
    const challengeText = userRank === 1 
      ? `내가 1등을 차지했어요! 이 기록을 깰 수 있을까요?` 
      : `${rankings.length}명 중 ${userRank}등을 기록했어요. 더 좋은 기록에 도전해보세요!`;
    
    // 초대 코드가 있으면 해당 코드 사용
    const shareInviteCode = inviteCode;
    
    const shareText = `[퀴즈쇼] ${quiz.title}\n\n${participant.nickname}님의 결과\n▶ 점수: ${participant.score}점\n▶ 순위: ${userRank}/${rankings.length}\n\n${challengeText}\n\n지금 도전하기: ${window.location.origin}/join?code=${shareInviteCode}`;
    
    // 공유 API 사용 시도
    if (navigator.share) {
      try {
        await navigator.share({
          title: `퀴즈쇼 - ${quiz.title} 결과`,
          text: shareText,
        });
      } catch (error) {
        // 공유 API 사용 실패 시 클립보드에 복사
        await copyToClipboard(shareText);
      }
    } else {
      // 공유 API를 지원하지 않는 경우 클립보드에 복사
      await copyToClipboard(shareText);
    }
  };
  
  // 클립보드에 복사하는 함수
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 2000);
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
    }
  };

  // 리셋 버튼 클릭 핸들러 - 확인 대화상자 표시
  const handleResetClick = () => {
    if (!canRetry) {
      return; // 퀴즈 재시도가 불가능하면 아무 동작 하지 않음
    }
    setShowResetConfirm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0FFFD] via-[#E6FFFC] to-[#E0FFFA] p-4 flex flex-col items-center pt-4">
      <div className="max-w-3xl w-full bg-white rounded-2xl p-4 animate-fade-in"
        style={{
          boxShadow: '0 3px 0 rgba(20, 184, 166, 0.5)',
          border: '2px solid #0D9488',
          borderRadius: '16px',
          background: 'linear-gradient(to bottom right, #fff, #f0fffc)',
        }}
      >
        {/* 랭킹 정보 (중점적으로 표시) */}
        <div className="mb-3">
          <div className={`relative ${generateCardStyles()}`}>
            <RankEffects />
            
            {/* 상단 컨테이너를 flex로 변경하고 좌측 정렬 */}
            <div className="flex justify-start mb-2 relative z-10">
              {/* 사용자 닉네임 표시 좌측 상단으로 이동 */}
              <div className="inline-flex items-center bg-white bg-opacity-10 px-2 py-0.5 rounded-full text-xs">
                <User size={12} className="text-teal-100 mr-0.5" />
                <span className="text-teal-50">{participant.nickname}</span>
              </div>
            </div>
            
            {/* 중앙 정렬 컨텐츠 */}
            <div className="text-center relative z-10">
              <div className="flex justify-center mb-2">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-b ${tierInfo.color} shadow-xl flex items-center justify-center transform transition-all duration-300 hover:scale-110 border border-white border-opacity-30 ${tierInfo.iconAnimClass}`}>
                  {tierInfo.icon}
                </div>
              </div>
              <div className="text-3xl font-bold">{participant.score}</div>
              <div className="text-lg font-medium text-teal-100">최종 점수</div>
              
              {/* 티어 표시 추가 - 퍼센타일 표시 */}
              <div className="mt-2 bg-white bg-opacity-10 p-2 rounded-lg backdrop-blur-sm">
                <div className="font-bold text-yellow-200">등급 {tierInfo.name}</div>
                <div className="text-xs text-blue-100 mt-1">{tierInfo.percentile}</div>
              </div>
              
              {userRank > 0 && (
                <div className="mt-2 inline-flex items-center bg-white bg-opacity-20 px-3 py-0.5 rounded-full text-sm">
                  <Award size={16} className="text-yellow-300 mr-1" />
                  <span>현재 </span>
                  <span className="ml-1 font-bold">{userRank}위</span>
                  <span className="mx-1">/ </span>
                  <span>{rankings.length}명 중</span>
                </div>
              )}
            </div>
          </div>
          
          {/* 랭킹 목록 - 디자인 가이드에 맞게 수정 */}
          <div className="bg-white rounded-xl p-3 mb-3"
            style={{
              boxShadow: '0 3px 0 rgba(20, 184, 166, 0.3)',
              border: '1px solid #0D9488',
              borderRadius: '16px',
              background: 'linear-gradient(to bottom right, #fff, #f0fffc)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[#783ae8] flex items-center text-sm">
                <Trophy size={16} className="mr-1 text-teal-600" /> 
                {rankingViewMode === 'top5' ? 'TOP 5' : '내 주변 랭킹'}
              </h3>
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500">총 {rankings.length}명 참가</div>
                <div className="flex rounded-md overflow-hidden text-xs border border-teal-200">
                  <button 
                    onClick={() => setRankingViewMode('top5')}
                    className={`px-2 py-0.5 ${rankingViewMode === 'top5' 
                      ? 'bg-teal-500 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                  >
                    TOP 5
                  </button>
                  <button 
                    onClick={() => setRankingViewMode('around')}
                    className={`px-2 py-0.5 ${rankingViewMode === 'around' 
                      ? 'bg-teal-500 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                  >
                    내 등수
                  </button>
                </div>
              </div>
            </div>
            
            {isLoadingRankings ? (
              <div className="py-2 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-1"></div>
                <p className="text-gray-600 text-sm">랭킹 정보를 불러오는 중...</p>
              </div>
            ) : (
              <div className="space-y-1">
                {rankings.length === 0 ? (
                  <p className="text-center text-gray-600 py-1 text-sm">참가자 정보가 없습니다</p>
                ) : (
                  (rankingViewMode === 'top5' ? processedRankings.slice(0, 5) : aroundRankings).map((rank, index) => (
                    <div 
                      key={rank.id} 
                      className={`flex items-center p-1.5 rounded-lg text-sm ${
                        rank.isCurrentUser 
                          ? 'bg-teal-50 border border-teal-200' 
                          : index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                      }`}
                    >
                      <div className="w-6 text-center font-bold mr-2">
                        {rank.rank === 1 ? (
                          <Medal size={16} className="mx-auto text-yellow-500" />
                        ) : rank.rank === 2 ? (
                          <Medal size={16} className="mx-auto text-gray-400" />
                        ) : rank.rank === 3 ? (
                          <Medal size={16} className="mx-auto text-amber-600" />
                        ) : (
                          <span className="text-gray-700">{rank.rank}</span>
                        )}
                      </div>
                      <div className="flex-1 font-medium truncate">
                        {rank.name}
                        {rank.isCurrentUser && (
                          <span className="ml-1 text-xs text-teal-600 bg-teal-100 px-1.5 py-0.5 rounded-full">나</span>
                        )}
                      </div>
                      <div className="font-bold text-[#783ae8]">{rank.score}점</div>
                    </div>
                  ))
                )}
                <div className="text-xs text-gray-500 text-center mt-2 italic">
                  * 등급 및 등수는 퀴즈 진행 상황에 따라 변동될 수 있습니다.
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 버튼 그룹 - 가운데 정렬 및 디자인 변경 */}
        <div className="flex flex-col items-center gap-3 mb-3">
          {/* 공유하기 버튼 */}
          <Button 
            onClick={handleShareResults}
            variant="secondary"
            size="large"
            className="px-8 bg-gradient-to-r from-teal-500 to-teal-400 text-white"
            style={{
              boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
              border: '2px solid #000',
              borderRadius: '12px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 6px 0 rgba(0,0,0,0.8)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
            }}
          >
            <Share2 className="mr-2" /> 결과 공유하기
          </Button>
          
          {/* 퀴즈 다시 풀기 버튼 */}
          {onResetQuiz && canRetry && (
            <Button 
              onClick={handleResetClick}
              variant="primary"
              size="large"
              className="flex items-center mx-auto bg-gradient-to-r from-teal-500 to-teal-400 text-white"
              style={{
                boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
                border: '2px solid #000',
                borderRadius: '12px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 6px 0 rgba(0,0,0,0.8)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
              }}
            >
              <RefreshCw size={18} className="mr-2" />
              퀴즈 다시 풀기
            </Button>
          )}
          
          {/* 공유 성공 메시지 */}
          {showShareSuccess && (
            <div className="text-sm text-teal-600 bg-teal-50 px-3 py-1 rounded-full animate-fade-in" style={{ border: '1px solid #0D9488' }}>
              클립보드에 복사되었습니다!
            </div>
          )}
        </div>

        {/* 다른 퀴즈 참여하기 링크 - 나가기 아이콘으로 변경 */}
        <div className="text-center mt-3 border-t pt-3 border-dashed border-teal-200">
          <Link 
            to="/join" 
            className="inline-flex items-center text-teal-600 hover:text-teal-800 transition-colors font-medium text-sm"
          >
            다른 퀴즈 참여하기 <LogOut size={14} className="ml-1" />
          </Link>
        </div>
        
        {/* 확인 팝업 */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-5 max-w-md w-full animate-fade-in"
              style={{
                boxShadow: '0 3px 0 rgba(20, 184, 166, 0.5)',
                border: '2px solid #0D9488',
                borderRadius: '16px',
                background: 'linear-gradient(to bottom right, #fff, #f0fffc)',
              }}
            >
              <div className="flex items-center text-amber-500 mb-3">
                <AlertTriangle size={24} className="mr-2" />
                <h3 className="text-lg font-bold">퀴즈 다시 풀기</h3>
              </div>
              
              <p className="text-gray-700 mb-4">
                퀴즈를 다시 풀면 현재 기록이 초기화되고 새로운 시도가 시작됩니다. 계속 진행하시겠습니까?
              </p>
              
              <div className="flex justify-end gap-3">
                <Button
                  onClick={() => setShowResetConfirm(false)}
                  variant="secondary"
                  size="small"
                >
                  취소
                </Button>
                <Button
                  onClick={handleResetConfirm}
                  variant="primary"
                  size="small"
                  className="bg-gradient-to-r from-teal-500 to-teal-400"
                  style={{
                    boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
                    border: '2px solid #000',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 5px 0 rgba(0,0,0,0.8)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
                  }}
                >
                  계속하기
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizResults;