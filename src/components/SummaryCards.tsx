import React from 'react';
import { Users, FileText, Clock, CheckCircle } from 'lucide-react';
import { SessionHistory } from '../firebase/sessionHistoryService';

interface SummaryCardsProps {
  sessionHistory: SessionHistory;
  correctRate: number;
  calculateDuration: (startTimestamp: any, endTimestamp: any) => string;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ 
  sessionHistory, 
  correctRate, 
  calculateDuration 
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="flex items-center">
        <Users className="w-10 h-10 text-blue-500 mr-3" />
        <div>
          <h3 className="text-sm font-medium text-gray-500">참가자 수</h3>
          <p className="text-xl font-bold text-blue-700">{sessionHistory.participantCount}명</p>
        </div>
      </div>
      
      <div className="flex items-center">
        <FileText className="w-10 h-10 text-purple-500 mr-3" />
        <div>
          <h3 className="text-sm font-medium text-gray-500">문제 수</h3>
          <p className="text-xl font-bold text-purple-700">{sessionHistory.quiz.questions.length}문제</p>
        </div>
      </div>
      
      <div className="flex items-center">
        <Clock className="w-10 h-10 text-orange-500 mr-3" />
        <div>
          <h3 className="text-sm font-medium text-gray-500">진행 시간</h3>
          <p className="text-xl font-bold text-orange-700">{calculateDuration(sessionHistory.startedAt, sessionHistory.endedAt)}</p>
        </div>
      </div>
      
      <div className="flex items-center">
        <CheckCircle className="w-10 h-10 text-green-500 mr-3" />
        <div>
          <h3 className="text-sm font-medium text-gray-500">정답률</h3>
          <p className="text-xl font-bold text-green-700">{correctRate.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
};

export default SummaryCards; 