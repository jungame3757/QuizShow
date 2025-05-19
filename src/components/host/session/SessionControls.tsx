import React from 'react';
import { Play, Loader, StopCircle, Copy, Check } from 'lucide-react';
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
  sessionCode,
  isCopied,
  onCopyCode,
  sessionDeleted
}) => {
  return (
    <>
      {currentSession && !needsSession ? (
        <div className={`mt-4 p-4 rounded-xl bg-green-100 border-2 border-green-300`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-green-800 mb-1">초대 코드</h3>
              <div className="flex items-center">
                <span className="text-3xl font-bold tracking-wider text-green-700">{sessionCode}</span>
                <button 
                  onClick={onCopyCode}
                  className="ml-2 p-1 text-green-600 hover:text-green-800 hover:bg-green-200 rounded-full transition-colors"
                  aria-label="초대 코드 복사"
                >
                  {isCopied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <Button 
                onClick={onEndSessionClick}
                variant="danger"
                disabled={endingSession}
                className="flex items-center"
              >
                {endingSession ? (
                  <>
                    <Loader size={18} className="animate-spin mr-2" />
                    종료 중...
                  </>
                ) : (
                  <>
                    <StopCircle size={18} className="mr-2" />
                    활동 종료하기
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : needsSession ? (
        <div className={`mt-4 p-4 rounded-xl bg-gray-100 border-2 border-gray-300`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-1">
                활동이 꺼져있음
              </h3>
              <div className="flex items-center">
                <p className="text-gray-700">활동을 시작하면 참가자들이 퀴즈에 참여할 수 있습니다.</p>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <Button 
                onClick={onStartSession}
                variant={"success"}
                disabled={creatingSession}
                className="flex items-center"
              >
                {creatingSession ? (
                  <>
                    <Loader size={18} className="animate-spin mr-2" />
                    활동 생성 중...
                  </>
                ) : (
                  <>
                    <Play size={18} className="mr-2" />
                    {sessionDeleted ? "새 활동 시작하기" : "활동 시작하기"}
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