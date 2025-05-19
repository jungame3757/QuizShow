import React, { useState } from 'react';
import { Trophy, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

// Realtime Database의 참가자 구조에 맞는 타입 정의
interface RealtimeParticipant {
  id: string;
  name: string;
  score: number;
  isActive: boolean;
  joinedAt: number;
  quizId?: string;
  answers?: Record<string, {
    questionIndex: number;
    answerIndex: number;
    isCorrect: boolean;
    points: number;
    answeredAt: number;
  }>;
}

interface ParticipantListProps {
  participants: Record<string, RealtimeParticipant>;
  quiz?: {
    questions: Array<{
      text: string;
      options: string[];
      correctAnswer: number;
    }>;
  };
}

const ParticipantList: React.FC<ParticipantListProps> = ({ participants, quiz }) => {
  // 상세 정보를 확장할 참가자 ID 추적
  const [expandedParticipantId, setExpandedParticipantId] = useState<string | null>(null);

  // Object를 배열로 변환하고 점수 순으로 정렬
  const participantArray = Object.values(participants);
  
  // 점수 내림차순 정렬
  const sortedParticipants = participantArray.sort((a, b) => b.score - a.score);

  // 답변 확장/접기 토글
  const toggleExpand = (participantId: string) => {
    if (expandedParticipantId === participantId) {
      setExpandedParticipantId(null);
    } else {
      setExpandedParticipantId(participantId);
    }
  };

  // 특정 참가자의 답변 목록 렌더링
  const renderAnswers = (participant: RealtimeParticipant) => {
    if (!participant.answers || Object.keys(participant.answers).length === 0) {
      return <p className="text-gray-500 text-sm py-2">아직 답변이 없습니다.</p>;
    }

    // 답변을 문제 인덱스 오름차순으로 정렬
    const sortedAnswers = Object.values(participant.answers)
      .sort((a, b) => a.questionIndex - b.questionIndex);

    return (
      <div className="space-y-2 py-2">
        {sortedAnswers.map((answer) => {
          const questionNumber = answer.questionIndex + 1;
          const questionText = quiz?.questions[answer.questionIndex]?.text || `문제 ${questionNumber}`;
          
          // 선택한 답변 텍스트 가져오기
          let selectedOption = `선택지 ${answer.answerIndex + 1}`;
          if (quiz?.questions[answer.questionIndex]?.options) {
            const options = quiz.questions[answer.questionIndex].options;
            if (answer.answerIndex >= 0 && answer.answerIndex < options.length) {
              selectedOption = options[answer.answerIndex];
            }
          }

          return (
            <div key={answer.questionIndex} className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-700">
                    {questionNumber}. {questionText}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    선택한 답변: {selectedOption}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  {answer.isCorrect ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle size={16} className="mr-1" />
                      <span className="font-medium">정답</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <XCircle size={16} className="mr-1" />
                      <span className="font-medium">오답</span>
                    </div>
                  )}
                  <p className="text-sm text-purple-600 font-medium mt-1">
                    +{answer.points} 점
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-800 mb-4">참가자 목록</h3>

      {sortedParticipants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          아직 참가자가 없습니다
        </div>
      ) : (
        <div className="space-y-3">
          {sortedParticipants.map((participant, index) => {
            // 답변 진행 상황 계산
            const totalAnswers = participant.answers ? Object.keys(participant.answers).length : 0;
            const correctAnswers = participant.answers 
              ? Object.values(participant.answers).filter(a => a.isCorrect).length
              : 0;

            const isExpanded = expandedParticipantId === participant.id;

            return (
              <div 
                key={participant.id}
                className={`
                  rounded-xl transition-all
                  ${index === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}
                  ${isExpanded ? 'shadow-md' : 'hover:scale-102'}
                `}
              >
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer"
                  onClick={() => toggleExpand(participant.id)}
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
                        {participant.name}
                        {totalAnswers > 0 && (
                          <span className="ml-2 text-sm text-gray-500">
                            ({correctAnswers}/{totalAnswers})
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(participant.joinedAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} 참여
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="font-bold text-lg text-purple-700 mr-3">
                      {participant.score}
                    </div>
                    {isExpanded ? 
                      <ChevronUp size={18} className="text-gray-500" /> : 
                      <ChevronDown size={18} className="text-gray-500" />}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-gray-200 mt-1">
                    {renderAnswers(participant)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ParticipantList;