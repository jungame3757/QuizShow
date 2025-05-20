import React from 'react';
import { Users, BarChart2 } from 'lucide-react';
import ParticipantList from './ParticipantList';
import QuizProgress from './QuizProgress';

interface SessionTabsProps {
  activeTab: 'participants' | 'progress';
  setActiveTab: (tab: 'participants' | 'progress') => void;
  participants: Record<string, any>;
  quiz: any;
  sessionCode: string;
  qrValue: string;
  isCopied: boolean;
  onCopySessionCode: () => void;
  onCopyJoinUrl: () => void;
}

const SessionTabs: React.FC<SessionTabsProps> = ({
  activeTab,
  setActiveTab,
  participants,
  quiz,
  sessionCode,
  qrValue,
  isCopied,
  onCopySessionCode,
  onCopyJoinUrl
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-8">
      <div className="flex border-b border-gray-200">
        <button
          className={`
            flex-1 py-3 px-3 sm:px-6 text-center font-medium
            ${activeTab === 'participants' ? 
              'text-purple-700 border-b-2 border-purple-500' : 
              'text-gray-600 hover:text-purple-700'}
          `}
          onClick={() => setActiveTab('participants')}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center">
            <Users size={18} className="sm:mr-2" /> 
            <span className="text-xs sm:text-base mt-1 sm:mt-0">
              참가자
              {Object.keys(participants).length > 0 && (
                <span className="inline-flex items-center justify-center ml-1 w-5 h-5 text-xs font-medium text-white bg-purple-600 rounded-full">
                  {Object.keys(participants).length}
                </span>
              )}
            </span>
          </div>
        </button>
        <button
          className={`
            flex-1 py-3 px-3 sm:px-6 text-center font-medium
            ${activeTab === 'progress' ? 
              'text-purple-700 border-b-2 border-purple-500' : 
              'text-gray-600 hover:text-purple-700'}
          `}
          onClick={() => setActiveTab('progress')}
        >
          <div className="flex flex-col sm:flex-row items-center justify-center">
            <BarChart2 size={18} className="sm:mr-2" /> 
            <span className="text-xs sm:text-base mt-1 sm:mt-0">퀴즈 진행 상황</span>
          </div>
        </button>
      </div>
      
      <div className="p-6">
        {activeTab === 'participants' && (
          <ParticipantList 
            participants={participants} 
            quiz={quiz}
            sessionCode={sessionCode}
            qrValue={qrValue}
            isCopied={isCopied}
            onCopySessionCode={onCopySessionCode}
            onCopyJoinUrl={onCopyJoinUrl}
          />
        )}
        
        {activeTab === 'progress' && (
          <QuizProgress quiz={quiz} participants={participants} />
        )}
      </div>
    </div>
  );
};

export default SessionTabs; 