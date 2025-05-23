import React, { useMemo } from 'react';
import { SessionHistory } from '../../../firebase/sessionHistoryService';

interface QuestionStatsTabProps {
  sessionHistory: SessionHistory;
  statsViewMode: 'latest' | 'all';
  setStatsViewMode: (mode: 'latest' | 'all') => void;
  calculateQuestionStats: (questionIndex: number, mode: 'latest' | 'all') => { totalResponses: number; optionCounts: number[] };
}

const QuestionStatsTab: React.FC<QuestionStatsTabProps> = ({
  sessionHistory,
  statsViewMode,
  setStatsViewMode,
  calculateQuestionStats
}) => {
  // 재시도 데이터가 존재하는지 확인
  const hasRetries = useMemo(() => {
    // 적어도 하나의 문제에서 최신 데이터와 모든 데이터의 결과가 다른지 확인
    return sessionHistory.quiz.questions.some((_, index) => {
      const latestStats = calculateQuestionStats(index, 'latest');
      const allStats = calculateQuestionStats(index, 'all');
      
      // 총 응답 수가 다르거나 옵션 선택 분포가 다르면 재시도가 있는 것
      return latestStats.totalResponses !== allStats.totalResponses || 
        latestStats.optionCounts.some((count, i) => count !== allStats.optionCounts[i]);
    });
  }, [sessionHistory, calculateQuestionStats]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 mb-2 sm:mb-0">문제별 통계</h2>
          
          {/* 재시도가 있는 경우에만 보기 모드 전환 버튼 표시 */}
          {hasRetries && (
            <div className="flex space-x-2 w-full sm:w-auto">
              <button
                onClick={() => setStatsViewMode('latest')}
                className={`flex-1 sm:flex-none px-3 py-1.5 text-sm rounded-md transition whitespace-nowrap ${
                  statsViewMode === 'latest'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                최신 데이터만
              </button>
              <button
                onClick={() => setStatsViewMode('all')}
                className={`flex-1 sm:flex-none px-3 py-1.5 text-sm rounded-md transition whitespace-nowrap ${
                  statsViewMode === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                모든 제출 데이터
              </button>
            </div>
          )}
        </div>
        
        {/* 재시도가 있는 경우에만 설명글 표시 */}
        {hasRetries && (
          <div className="text-sm text-gray-500 mb-6">
            {statsViewMode === 'latest' 
              ? '각 참가자의 가장 최근에 제출한 답변만 집계합니다.' 
              : '모든 시도에서 제출된 모든 답변을 집계합니다.'}
          </div>
        )}
        
        {sessionHistory.quiz.questions.map((question, index) => {
          // 재시도가 없으면 항상 'latest' 모드로 계산
          const mode = hasRetries ? statsViewMode : 'latest';
          const { totalResponses, optionCounts } = calculateQuestionStats(index, mode);
          
          return (
            <div key={index} className="mb-6 rounded-lg shadow-sm overflow-hidden border border-gray-200">
              <div className="p-4">
                <span className="font-medium text-lg text-purple-700">문제 {index + 1}</span>
                <p className="text-gray-800 mt-2 mb-4 text-lg">{question.text}</p>
                
                {/* 정답 정보가 없는 경우 경고 메시지 표시 */}
                {(question.correctAnswer === undefined || question.correctAnswer === null) && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      ⚠️ 이 문제의 정답 정보가 누락되었습니다. 정답 표시가 되지 않습니다.
                    </p>
                  </div>
                )}
                
                <div className="space-y-4 mt-4">
                  <h4 className="font-medium text-gray-700">답변 선택 비율 (총 {totalResponses}명 응답)</h4>
                  <div className="space-y-4">
                    {question.options.map((option, optIndex) => {
                      const count = optionCounts[optIndex];
                      const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                      const isCorrect = optIndex === question.correctAnswer && question.correctAnswer !== undefined;
              
                      return (
                        <div key={optIndex} className="relative">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm ${isCorrect ? 'font-medium text-green-700' : ''}`}>
                              {optIndex + 1}. {option}
                              {isCorrect && (
                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">정답</span>
                              )}
                            </span>
                            <span className="text-sm text-gray-600">{count}명 ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${
                                isCorrect ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionStatsTab; 