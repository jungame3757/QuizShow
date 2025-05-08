import React from 'react';
import { Trophy } from 'lucide-react';
import { Participant } from '../types';

interface ParticipantListProps {
  participants: Participant[];
}

const ParticipantList: React.FC<ParticipantListProps> = ({ participants }) => {
  // Sort participants by score (highest first)
  const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);

  return (
    <div>
      {sortedParticipants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          아직 참가자가 없습니다
        </div>
      ) : (
        <div className="space-y-3">
          {sortedParticipants.map((participant, index) => (
            <div 
              key={participant.id}
              className={`
                flex items-center justify-between p-3 rounded-xl
                ${index === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}
                transition-all hover:scale-102
              `}
            >
              <div className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3
                  ${index === 0 ? 'bg-yellow-400 text-white' : 
                    index === 1 ? 'bg-gray-400 text-white' : 
                    index === 2 ? 'bg-amber-600 text-white' : 
                    'bg-purple-100 text-purple-700'}
                `}>
                  {index < 3 ? <Trophy size={16} /> : index + 1}
                </div>
                <div>
                  <div className="font-medium">
                    {participant.nickname}
                  </div>
                  {participant.answers.length > 0 && (
                    <div className="text-sm text-gray-500">
                      {participant.answers.length}개의 답변
                    </div>
                  )}
                </div>
              </div>
              <div className="font-bold text-lg text-purple-700">
                {participant.score}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParticipantList;