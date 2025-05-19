import React from 'react';
import { BarChart2 } from 'lucide-react';
import { Quiz } from '../../../types';

// Realtime Database 참가자 타입 정의
interface RealtimeParticipant {
  id: string;
  name: string;
  score: number;
  isActive: boolean;
  joinedAt: number;
  answers?: Record<string, {
    questionIndex: number;
    answerIndex: number;
    isCorrect: boolean;
    points: number;
    answeredAt: number;
  }>;
}

interface QuizProgressProps {
  quiz: Quiz;
  participants: Record<string, RealtimeParticipant>;
}

const QuizProgress: React.FC<QuizProgressProps> = ({ quiz, participants }) => {
  // 참가자 배열로 변환
  const participantsArray = Object.values(participants);

  // Calculate total answers per question
  const answersByQuestion = quiz.questions.map((question, questionIndex) => {
    // 모든 참가자의 해당 질문에 대한 답변 수집
    const answers = participantsArray.flatMap(p => {
      if (!p.answers) return [];
      
      return Object.values(p.answers)
        .filter(a => a.questionIndex === questionIndex);
    });
    
    // Count by answer index
    const answerCounts: { [key: number]: number } = {};
    answers.forEach(answer => {
      answerCounts[answer.answerIndex] = (answerCounts[answer.answerIndex] || 0) + 1;
    });
    
    // Calculate percentages
    const totalAnswers = answers.length;
    const percentages = Object.entries(answerCounts).map(([answerIndexStr, count]) => {
      const answerIndex = parseInt(answerIndexStr);
      return {
        answerIndex,
        answerText: answerIndex >= 0 && answerIndex < question.options.length 
          ? question.options[answerIndex] 
          : '유효하지 않은 답변',
        count,
        percentage: totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0,
        isCorrect: answerIndex === question.correctAnswer
      };
    });
    
    return {
      question,
      totalAnswers,
      correctAnswers: answers.filter(a => a.isCorrect).length,
      percentages: percentages.sort((a, b) => b.count - a.count)
    };
  });

  return (
    <div>
      <h3 className="text-xl font-bold text-purple-700 mb-4 flex items-center">
        <BarChart2 size={24} className="mr-2" /> 문제 통계
      </h3>
      
      {answersByQuestion.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          문제가 없습니다
        </div>
      ) : (
        <div className="space-y-8">
          {answersByQuestion.map((item, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-4">
              <div className="mb-3">
                <div className="font-medium text-gray-500">문제 {index + 1}</div>
                <div className="font-bold text-gray-800 mb-1">{item.question.text}</div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center text-purple-700">
                    <span className="font-bold mr-1">{item.totalAnswers}</span> 응답
                  </div>
                  <div className="flex items-center text-green-600">
                    <span className="font-bold mr-1">
                      {item.totalAnswers > 0 
                        ? Math.round((item.correctAnswers / item.totalAnswers) * 100) 
                        : 0}%
                    </span> 
                    정답률
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {item.question.options.map((option, optionIndex) => {
                  // 해당 옵션 인덱스에 대한 통계 찾기
                  const stats = item.percentages.find(p => p.answerIndex === optionIndex) || {
                    answerIndex: optionIndex,
                    answerText: option,
                    count: 0,
                    percentage: 0,
                    isCorrect: optionIndex === item.question.correctAnswer
                  };
                  
                  return (
                    <div key={optionIndex} className="relative">
                      <div className="flex items-center mb-1">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 text-xs font-bold text-gray-700">
                          {optionIndex + 1}
                        </div>
                        <span className="text-sm flex-1">{option}</span>
                        {stats.isCorrect && (
                          <div className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                            정답
                          </div>
                        )}
                      </div>
                      <div className="flex items-center">
                        <div className="h-6 bg-gray-200 rounded-full overflow-hidden flex-grow mr-3" style={{ width: 'calc(100% - 50px)' }}>
                          <div 
                            className={`h-full ${stats.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${stats.percentage}%` }}
                          ></div>
                        </div>
                        <div className="font-bold text-gray-700 w-[50px] text-right">
                          {stats.percentage}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizProgress;