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
  calculateQuestionStats,
}) => {
  // 재시도 데이터가 있는지 확인
  const hasRetries = useMemo(() => {
    if (!sessionHistory.participants) return false;
    return Object.values(sessionHistory.participants).some(
      participant => participant.attempts && participant.attempts.length > 0
    );
  }, [sessionHistory.participants]);

  // 주관식/의견 수집 문제의 답변 목록을 가져오는 함수
  const getTextAnswers = (questionIndex: number, mode: 'latest' | 'all' = 'latest') => {
    if (!sessionHistory.participants) return [];
    
    const answers: { participantName: string; answer: string; isCorrect?: boolean }[] = [];
    
    Object.entries(sessionHistory.participants).forEach(([_participantId, participant]) => {
      if (mode === 'latest') {
        // 현재 답변에서 찾기
        const participantAnswers = (participant as any).answers;
        if (participantAnswers) {
          const answer = Object.values(participantAnswers).find((a: any) => a.questionIndex === questionIndex);
          if (answer && (answer as any).answerText) {
            answers.push({
              participantName: participant.name,
              answer: (answer as any).answerText,
              isCorrect: (answer as any).isCorrect
            });
          }
        }
      } else {
        // 모든 시도 포함
        // 현재 답변
        const participantAnswers = (participant as any).answers;
        if (participantAnswers) {
          const answer = Object.values(participantAnswers).find((a: any) => a.questionIndex === questionIndex);
          if (answer && (answer as any).answerText) {
            answers.push({
              participantName: participant.name,
              answer: (answer as any).answerText,
              isCorrect: (answer as any).isCorrect
            });
          }
        }
        
        // 이전 시도들
        const participantAttempts = (participant as any).attempts;
        if (participantAttempts) {
          participantAttempts.forEach((attempt: any, attemptIndex: number) => {
            const answer = Object.values(attempt.answers).find((a: any) => a.questionIndex === questionIndex);
            if (answer && (answer as any).answerText) {
              answers.push({
                participantName: `${participant.name} (시도 ${attemptIndex + 1})`,
                answer: (answer as any).answerText,
                isCorrect: (answer as any).isCorrect
              });
            }
          });
        }
      }
    });
    
    return answers;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl font-bold text-gray-800">문제별 통계</h2>
        
        {/* 재시도가 있는 경우에만 모드 선택 버튼 표시 */}
        {hasRetries && (
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setStatsViewMode('latest')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                statsViewMode === 'latest'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              최신 시도만
            </button>
            <button
              onClick={() => setStatsViewMode('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                statsViewMode === 'all'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              모든 시도
            </button>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {sessionHistory.quiz.questions.map((question, index) => {
          // 재시도가 없으면 항상 'latest' 모드로 계산
          const currentMode = hasRetries ? statsViewMode : 'latest';
          const questionType = question.type || 'multiple-choice';
          
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    문제 {index + 1}
                  </h3>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    questionType === 'multiple-choice' ? 'bg-blue-100 text-blue-800' :
                    questionType === 'short-answer' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {questionType === 'multiple-choice' ? '객관식' :
                     questionType === 'short-answer' ? '주관식' : '의견 수집'}
                  </span>
                </div>
                <p className="text-gray-700 mt-1">{question.text}</p>
              </div>
              
              <div className="p-4">
                {questionType === 'multiple-choice' && question.options ? (
                  // 객관식 통계
                  (() => {
                    const { totalResponses, optionCounts } = calculateQuestionStats(index, currentMode);
                    
                    return (
                      <div className="space-y-4">
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
                    );
                  })()
                ) : (
                  // 주관식 또는 의견 수집 통계
                  (() => {
                    const textAnswers = getTextAnswers(index, currentMode);
                    const totalResponses = textAnswers.length;
                    
                    if (questionType === 'short-answer') {
                      const correctAnswers = textAnswers.filter(a => a.isCorrect).length;
                      const incorrectAnswers = totalResponses - correctAnswers;
                      
                      return (
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-700">정답률 통계 (총 {totalResponses}명 응답)</h4>
                          
                          {/* 정답률 차트 */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-green-700">정답</span>
                              <span className="text-sm text-gray-600">
                                {correctAnswers}명 ({totalResponses > 0 ? ((correctAnswers / totalResponses) * 100).toFixed(1) : 0}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div 
                                className="h-2.5 rounded-full bg-green-500"
                                style={{ width: `${totalResponses > 0 ? (correctAnswers / totalResponses) * 100 : 0}%` }}
                              ></div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-red-700">오답</span>
                              <span className="text-sm text-gray-600">
                                {incorrectAnswers}명 ({totalResponses > 0 ? ((incorrectAnswers / totalResponses) * 100).toFixed(1) : 0}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div 
                                className="h-2.5 rounded-full bg-red-500"
                                style={{ width: `${totalResponses > 0 ? (incorrectAnswers / totalResponses) * 100 : 0}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          {/* 정답 정보 */}
                          <div className="bg-green-50 p-3 rounded-md border border-green-200">
                            <h5 className="font-medium text-green-800 mb-1">정답</h5>
                            <p className="text-green-700">{question.correctAnswerText || '정답 정보 없음'}</p>
                            {question.additionalAnswers && question.additionalAnswers.length > 0 && (
                              <div className="mt-2">
                                <span className="font-medium text-green-800">추가 인정 답안: </span>
                                <span className="text-green-700">{question.additionalAnswers.join(', ')}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* 제출된 답변 목록 */}
                          <div className="space-y-2">
                            <h5 className="font-medium text-gray-700">제출된 답변</h5>
                            <div className="max-h-60 overflow-y-auto space-y-2">
                              {textAnswers.map((answer, answerIndex) => (
                                <div key={answerIndex} className={`p-2 rounded border text-sm ${
                                  answer.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                }`}>
                                  <div className="flex justify-between items-start">
                                    <span className="font-medium text-gray-800">{answer.participantName}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      answer.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                      {answer.isCorrect ? '정답' : '오답'}
                                    </span>
                                  </div>
                                  <p className="text-gray-700 mt-1 break-words">{answer.answer}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      // 의견 수집
                      return (
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-700">수집된 의견 (총 {totalResponses}개)</h4>
                          
                          <div className="max-h-80 overflow-y-auto space-y-3">
                            {textAnswers.map((answer, answerIndex) => (
                              <div key={answerIndex} className="p-3 rounded border bg-blue-50 border-blue-200">
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-medium text-blue-800">{answer.participantName}</span>
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                                    의견
                                  </span>
                                </div>
                                <p className="text-gray-700 break-words">{answer.answer}</p>
                              </div>
                            ))}
                            {totalResponses === 0 && (
                              <p className="text-gray-500 text-center py-4">아직 제출된 의견이 없습니다.</p>
                            )}
                          </div>
                        </div>
                      );
                    }
                  })()
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuestionStatsTab; 