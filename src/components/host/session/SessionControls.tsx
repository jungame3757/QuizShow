import React, { useEffect, useState } from 'react';
import { Play, Loader, StopCircle, Clock } from 'lucide-react';
import Button from '../../ui/Button';

interface SessionControlsProps {
  currentSession: any;
  needsSession: boolean;
  creatingSession: boolean;
  endingSession: boolean;
  onStartSession: () => void;
  onEndSessionClick: () => void;
  sessionCode?: string;
  isCopied: boolean;
  onCopyCode: () => void;
  sessionDeleted: boolean;
}

const SessionControls: React.FC<SessionControlsProps> = ({
  currentSession,
  needsSession,
  creatingSession,
  endingSession,
  onStartSession,
  onEndSessionClick,
}) => {
  const [remainingTime, setRemainingTime] = useState<string>("계산 중...");
  const [isExpired, setIsExpired] = useState(false);
  
  // 남은 시간 계산
  useEffect(() => {
    if (!currentSession || !currentSession.expiresAt) return;
    
    const calculateRemainingTime = () => {
      const now = Date.now();
      const remaining = currentSession.expiresAt - now;
      
      if (remaining <= 0) {
        setRemainingTime("만료됨");
        setIsExpired(true);
        return;
      }
      
      setIsExpired(false);
      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      
      // 조건부 형식 적용
      if (days > 0) {
        setRemainingTime(`${days}일 ${hours}시간 ${minutes}분`);
      } else if (hours > 0) {
        setRemainingTime(`${hours}시간 ${minutes}분`);
      } else {
        setRemainingTime(`${minutes}분`);
      }
    };
    
    calculateRemainingTime();
    const timer = setInterval(calculateRemainingTime, 60000); // 1분마다 업데이트
    
    return () => clearInterval(timer);
  }, [currentSession]);
  
  return (
    <>
      {currentSession && !needsSession ? (
        <div className={`mt-2 sm:mt-3 p-2 sm:p-4 rounded-xl ${isExpired ? 'bg-orange-100 border-2 border-orange-300' : 'bg-green-100 border-2 border-green-300'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h3 className={`text-base sm:text-lg font-medium ${isExpired ? 'text-orange-800' : 'text-green-800'} mb-0.5 sm:mb-1`}>
                {isExpired ? '활동 만료됨' : '활동 남은 시간'}
              </h3>
              <div className="flex items-center">
                <Clock size={18} className={`${isExpired ? 'text-orange-700' : 'text-green-700'} mr-1.5 sm:mr-2`} />
                <span className={`text-xl sm:text-3xl font-bold tracking-wider ${isExpired ? 'text-orange-700' : 'text-green-700'}`}>
                  {remainingTime}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center mt-3 sm:mt-0">
              <Button 
                onClick={onEndSessionClick}
                variant="danger"
                disabled={endingSession}
                className="w-full sm:w-auto flex justify-center items-center py-1.5 sm:py-2 px-3 sm:px-4 bg-gradient-to-r from-red-600 to-red-500"
                style={{
                  boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
                  border: '2px solid #000',
                  borderRadius: '0.75rem',
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
                {endingSession ? (
                  <>
                    <Loader size={16} className="animate-spin mr-1.5 sm:mr-2" />
                    <span className="text-sm sm:text-base">종료 중...</span>
                  </>
                ) : (
                  <>
                    <StopCircle size={16} className="mr-1.5 sm:mr-2" />
                    <span className="text-sm sm:text-base">활동 종료하기</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : needsSession ? (
        <div className="mt-2 sm:mt-3 p-2 sm:p-4 rounded-xl bg-gray-100 border-2 border-gray-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-0.5 sm:mb-1">
                활동이 꺼져있음
              </h3>
              <div className="flex items-center">
                <p className="text-sm sm:text-base text-gray-700">활동을 시작하여 참가자들을 초대하세요.</p>
              </div>
            </div>
            <div className="flex items-center justify-center mt-3 sm:mt-0">
              <Button 
                onClick={onStartSession}
                variant={"success"}
                disabled={creatingSession}
                className="w-full sm:w-auto flex justify-center items-center py-1.5 sm:py-2 px-3 sm:px-4 bg-gradient-to-r from-purple-600 to-indigo-600"
                style={{
                  boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
                  border: '2px solid #000',
                  borderRadius: '0.75rem',
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
                {creatingSession ? (
                  <>
                    <Loader size={16} className="animate-spin mr-1.5 sm:mr-2" />
                    <span className="text-sm sm:text-base">활동 생성 중...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} className="mr-1.5 sm:mr-2" />
                    <span className="text-sm sm:text-base">새 활동 시작하기</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default SessionControls; 