import React from 'react';
import { BarChart2, Award, ChevronUp, ChevronDown, Clock, RefreshCw, Trophy, CheckCircle, XCircle, BookOpen } from 'lucide-react';
import { SessionHistory, Answer, Attempt } from '../firebase/sessionHistoryService';

// 컴포넌트 내부에서 사용할 ExtendedParticipant 인터페이스
interface ExtendedParticipant {
  id: string;
  name: string;
  joinedAt: number;
  isActive: boolean;
  score: number;
  answers?: Record<string, Answer>;
  attempts?: Attempt[];
}

// 시도 결과 인터페이스 정의
interface AttemptResult {
  isCorrect: boolean;
  attemptIndex: number;
}

interface RankingTabProps {
  sortedParticipants: ExtendedParticipant[];
  sessionHistory: SessionHistory;
  selectedParticipant: string | null;
  toggleParticipantDetails: (participantId: string) => void;
  participantDetailTab: 'summary' | 'detail';
  setParticipantDetailTab: (tab: 'summary' | 'detail') => void;
  selectedAttemptIndex: number | -1;
  setSelectedAttemptIndex: (index: number) => void;
  formatDateCustom: (timestamp: any) => string;
}

const RankingTab: React.FC<RankingTabProps> = ({
  sortedParticipants,
  sessionHistory,
  selectedParticipant,
  toggleParticipantDetails,
  participantDetailTab,
  setParticipantDetailTab,
  selectedAttemptIndex,
  setSelectedAttemptIndex,
  formatDateCustom
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">참가자 순위</h2>
        
        {sortedParticipants.length > 0 ? (
          <div className="space-y-4">
            {sortedParticipants.map((participant, index) => {
              const hasMultipleAttempts = participant.attempts && participant.attempts.length > 0;
              return (
                <div key={participant.id} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
                  <div 
                    className={`p-4 flex justify-between items-center cursor-pointer transition-colors duration-200 ${
                      selectedParticipant === participant.id ? 'bg-purple-50 border-b border-purple-100' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      toggleParticipantDetails(participant.id);
                      setSelectedAttemptIndex(-1); // 새 참가자 선택 시 현재 시도로 초기화
                      setParticipantDetailTab('summary'); // 탭 초기화
                    }}
                  >
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                        index === 1 ? 'bg-gray-100 text-gray-700 border border-gray-300' :
                        index === 2 ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                        'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}>
                        {index < 3 ? (
                          <Award size={20} />
                        ) : (
                          <span className="font-bold">{index + 1}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900 text-lg">
                            {participant.name}
                          </span>
                          {index < 3 && (
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                              index === 0 ? 'bg-yellow-100 text-yellow-800' :
                              index === 1 ? 'bg-gray-100 text-gray-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {index === 0 ? '1등' : index === 1 ? '2등' : '3등'}
                            </span>
                          )}
                        </div>
                        {hasMultipleAttempts && (
                          <span className="text-xs text-indigo-600 mt-0.5 block">
                            {participant.attempts?.length || 0}회 재시도
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="text-right mr-3">
                        <span className="text-lg font-bold text-purple-700">{participant.score}점</span>
                        <div className="text-xs text-gray-500">
                          정답률: {
                            participant.answers
                              ? ((Object.values(participant.answers).filter(a => a.isCorrect).length / 
                                Object.values(participant.answers).length) * 100).toFixed(0)
                              : 0
                          }%
                        </div>
                      </div>
                      <div className="border rounded-full p-1 bg-gray-100 transition-transform duration-200 transform 
                        hover:scale-110 hover:bg-gray-200">
                        {selectedParticipant === participant.id ? (
                          <ChevronUp size={20} className="text-gray-600" />
                        ) : (
                          <ChevronDown size={20} className="text-gray-600" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {selectedParticipant === participant.id && (
                    <div className="p-4 bg-white">
                      {/* 참가자 상세 정보 탭 네비게이션 */}
                      <div className="border-b border-gray-200 mb-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setParticipantDetailTab('summary')}
                            className={`px-3 py-2 text-sm font-medium border-b-2 ${
                              participantDetailTab === 'summary'
                                ? 'border-purple-500 text-purple-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            종합 정보
                          </button>
                          <button
                            onClick={() => setParticipantDetailTab('detail')}
                            className={`px-3 py-2 text-sm font-medium border-b-2 ${
                              participantDetailTab === 'detail'
                                ? 'border-purple-500 text-purple-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            문제 풀이 상세
                          </button>
                        </div>
                      </div>

                      {/* 문제 풀이 상세 탭 (통합된 문제별 정답 및 제출 타임라인) */}
                      {participantDetailTab === 'detail' && (
                        <div className="space-y-4">
                          {/* 제출 타임라인 - 축소된 버전 */}
                          <div>
                            {/* 타임라인 헤더 */}
                            <div className="py-3 font-medium text-gray-700 flex items-center justify-center">
                              <Clock size={16} className="mr-2 text-indigo-600" /> 제출 타임라인
                            </div>
                            
                            {/* 최종 제출 데이터는 항상 표시 */}
                            <p className="text-center text-sm text-gray-500 mb-2">
                              {participant.attempts && participant.attempts.length > 0 
                                ? "제출 시점을 선택하여 답안 비교가 가능합니다."
                                : "최종 제출 데이터만 존재합니다."}
                            </p>
                            
                            {/* 시각적 타임라인 */}
                            <div className="relative mt-4 mb-2 mx-4">
                              {/* 타임라인 선 */}
                              <div className="absolute h-1.5 bg-gray-200 rounded w-full top-4"></div>
                              
                              {/* 최종 제출 포인트는 항상 표시 */}
                              <div className="py-8 relative">
                                <div 
                                  className="absolute left-0 top-0 cursor-pointer group z-10"
                                  onClick={() => setSelectedAttemptIndex(-1)}
                                >
                                  <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shadow-md transform transition-transform duration-200 ${
                                    selectedAttemptIndex === -1 
                                      ? 'bg-indigo-600 border-indigo-200 scale-110' 
                                      : 'bg-white border-indigo-500 hover:bg-indigo-100 hover:scale-110'
                                  }`}
                                  >
                                    <CheckCircle size={18} className={selectedAttemptIndex === -1 ? 'text-white' : 'text-indigo-600'} />
                                  </div>
                                </div>
                                
                                {/* 이전 시도 포인트들 - 최신 시도가 왼쪽에 가깝게 시간 순으로 */}
                                {participant.attempts && participant.attempts.length > 0 && [...participant.attempts].reverse().map((attempt, index) => {
                                  // 위치 계산 - 전체 대비 균등 분할
                                  const totalAttempts = participant.attempts ? participant.attempts.length : 0;
                                  const spacing = totalAttempts > 0 ? 100 / (totalAttempts + 1) : 0;
                                  const position = (index + 1) * spacing;
                                  
                                  // 시도 번호 계산 (인덱스 + 1)
                                  const attemptNumber = index + 1;
                                  
                                  return (
                                    <div 
                                      key={index} 
                                      className="absolute top-0 cursor-pointer group z-10"
                                      style={{ left: `${position}%` }}
                                      onClick={() => setSelectedAttemptIndex(totalAttempts - index - 1)}
                                    >
                                      <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center shadow-md transform transition-transform duration-200 ${
                                        selectedAttemptIndex === totalAttempts - index - 1 
                                          ? 'bg-green-600 border-green-200 scale-110' 
                                          : 'bg-white border-green-600 hover:bg-green-100 hover:scale-110'
                                      }`}
                                      >
                                        <span className={`text-sm font-bold ${selectedAttemptIndex === totalAttempts - index - 1 ? 'text-white' : 'text-green-700'}`}>{attemptNumber}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* 선택된 시도 정보 - 최종 제출 정보는 항상 표시 */}
                            <div className="bg-gray-50 rounded-md p-3">
                              {selectedAttemptIndex === -1 ? (
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                  <div className="flex items-center mb-2 sm:mb-0">
                                    <div className="w-4 h-4 rounded-full bg-indigo-600 mr-2"></div>
                                    <span className="font-medium">최종 제출</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">총점: </span>
                                    <span className="font-bold text-indigo-700">{participant.score}점</span>
                                    <span className="text-gray-600 ml-3">정답률: </span>
                                    <span className="font-bold text-green-700">
                                      {participant.answers && Object.values(participant.answers).length > 0
                                        ? ((Object.values(participant.answers).filter(a => a.isCorrect).length / 
                                          Object.values(participant.answers).length) * 100).toFixed(0)
                                        : 0}%
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                  <div className="flex items-center mb-2 sm:mb-0">
                                    <div className="w-4 h-4 rounded-full bg-green-600 mr-2"></div>
                                    <span className="font-medium">시도 {participant.attempts && participant.attempts.length > 0 ? participant.attempts.length - selectedAttemptIndex : 0}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      {participant.attempts && participant.attempts.length > 0 && participant.attempts[selectedAttemptIndex] && new Date(participant.attempts[selectedAttemptIndex].completedAt).toLocaleString('ko-KR', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">총점: </span>
                                    <span className="font-bold text-green-700">{participant.attempts && participant.attempts.length > 0 && participant.attempts[selectedAttemptIndex] ? participant.attempts[selectedAttemptIndex].score : 0}점</span>
                                    <span className="text-gray-600 ml-3">정답률: </span>
                                    <span className="font-bold text-green-700">
                                      {participant.attempts && participant.attempts.length > 0 && participant.attempts[selectedAttemptIndex] && Object.values(participant.attempts[selectedAttemptIndex].answers).length > 0
                                        ? ((Object.values(participant.attempts[selectedAttemptIndex].answers).filter(a => a.isCorrect).length / 
                                          Object.values(participant.attempts[selectedAttemptIndex].answers).length) * 100).toFixed(0)
                                        : 0}%
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 문제별 답안 */}
                          <div className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <div className="divide-y divide-gray-100">
                              {sessionHistory.quiz.questions.map((question, qIndex) => {
                                // 표시할 답변 결정 (선택된 시도 또는 현재 답변)
                                let answer: Answer | undefined;
                                if (selectedAttemptIndex === -1) {
                                  // 현재 답변
                                  answer = participant.answers && 
                                    Object.values(participant.answers).find(a => a.questionIndex === qIndex);
                                } else if (participant.attempts && participant.attempts[selectedAttemptIndex]) {
                                  // 선택된 시도의 답변
                                  answer = Object.values(participant.attempts[selectedAttemptIndex].answers)
                                    .find(a => a.questionIndex === qIndex);
                                }
                                
                                const isCorrect = answer && answer.isCorrect;
                                const hasAnswer = answer && answer.answerIndex >= 0;
                                
                                // 시도별 정답 여부 수집
                                const attemptResults: AttemptResult[] = [];
                                if (participant.attempts) {
                                  participant.attempts.forEach(attempt => {
                                    const attemptAnswer = Object.values(attempt.answers).find(a => a.questionIndex === qIndex);
                                    if (attemptAnswer) {
                                      attemptResults.push({
                                        isCorrect: attemptAnswer.isCorrect,
                                        attemptIndex: attemptResults.length
                                      });
                                    }
                                  });
                                }
                                
                                return (
                                  <div 
                                    key={qIndex} 
                                    className={`p-4 ${isCorrect ? 'bg-green-50' : hasAnswer ? 'bg-red-50' : 'bg-white'}`}
                                  >
                                    <div className="flex items-start">
                                      <div className="flex-shrink-0 mr-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2 border border-gray-200">
                                          <span className="font-medium text-gray-700">{qIndex + 1}</span>
                                        </div>
                                        {/* 점수와 상태를 번호 아래로 이동 */}
                                        {answer ? (
                                          <div className="text-center">
                                            <div className={`font-bold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                              {answer.points}점
                                            </div>
                                            <div className="mt-1">
                                              {isCorrect ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                  정답
                                                </span>
                                              ) : hasAnswer ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                  오답
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                  시간초과
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-center">
                                            <span className="text-gray-400">미제출</span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="flex-grow">
                                        <p className="font-medium text-gray-800 mb-3">{question.text}</p>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {question.options.map((option, optIndex) => {
                                            const isSelected = hasAnswer && answer?.answerIndex === optIndex;
                                            const isCorrectOption = optIndex === question.correctAnswer;
                                            
                                            return (
                                              <div 
                                                key={optIndex} 
                                                className={`text-sm rounded-md p-2.5 border ${
                                                  isSelected && isCorrectOption ? 'bg-green-100 border-green-300 text-green-800' :
                                                  isSelected ? 'bg-red-100 border-red-300 text-red-800' :
                                                  isCorrectOption ? 'bg-green-50 border-green-200 text-green-700' :
                                                  'bg-gray-50 border-gray-200 text-gray-600'
                                                }`}
                                              >
                                                <div className="flex items-start">
                                                  <div className="mr-2 mt-0.5">
                                                    {isSelected && isCorrectOption && (
                                                      <CheckCircle size={16} className="text-green-700" />
                                                    )}
                                                    {isSelected && !isCorrectOption && (
                                                      <XCircle size={16} className="text-red-700" />
                                                    )}
                                                    {!isSelected && isCorrectOption && (
                                                      <CheckCircle size={16} className="text-green-600 opacity-70" />
                                                    )}
                                                    {!isSelected && !isCorrectOption && (
                                                      <span className="w-4 h-4 inline-block text-center">{optIndex + 1}</span>
                                                    )}
                                                  </div>
                                                  <span className={isCorrectOption ? 'font-medium' : ''}>{option}</span>
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
                        </div>
                      )}

                      {/* 종합 정보 탭 */}
                      {participantDetailTab === 'summary' && (
                        <div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                            <div className="rounded-lg p-4 flex items-center">
                              <RefreshCw size={16} className="text-blue-600 mr-2 flex-shrink-0" />
                              <div>
                                <p className="text-gray-600 text-sm font-medium">총 시도 횟수</p>
                                <p className="text-xl font-bold text-blue-700">
                                  {((participant.attempts?.length || 0) + 1)}회
                                </p>
                              </div>
                            </div>
                            <div className="rounded-lg p-4 flex items-center">
                              <Award size={16} className="text-green-600 mr-2 flex-shrink-0" />
                              <div>
                                <p className="text-gray-600 text-sm font-medium">최종 점수</p>
                                <p className="text-xl font-bold text-green-700">
                                  {participant.score}점
                                </p>
                              </div>
                            </div>
                            <div className="rounded-lg p-4 flex items-center">
                              <Trophy size={16} className="text-purple-600 mr-2 flex-shrink-0" />
                              <div>
                                <p className="text-gray-600 text-sm font-medium">최고 점수</p>
                                <p className="text-xl font-bold text-purple-700">
                                  {Math.max(
                                    participant.score,
                                    ...(participant.attempts?.map(a => a.score) || [0])
                                  )}점
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-6">
                            <div className="rounded-lg p-4 border border-gray-200">
                              <h3 className="font-medium text-gray-700 mb-3 flex items-center">
                                <BarChart2 size={16} className="mr-2 text-indigo-600" />
                                정답률 변화
                              </h3>
                              
                              <div className="space-y-3">
                                {/* 현재 답변 정답률 - 항상 표시 */}
                                {participant.answers && (
                                  <div className="flex items-center">
                                    <span className="w-20 text-sm font-medium text-gray-700 flex-shrink-0">최종</span>
                                    <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                                      {(() => {
                                        const correctCount = Object.values(participant.answers).filter(a => a.isCorrect).length;
                                        const totalCount = Object.values(participant.answers).length;
                                        const correctRate = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
                                        
                                        return (
                                          <div 
                                            className="h-full bg-blue-500 rounded-full flex items-center transition-all duration-500"
                                            style={{ width: `${correctRate}%` }}
                                          >
                                            {correctRate > 30 && (
                                              <span className="mx-auto text-xs text-white font-medium">
                                                {correctRate.toFixed(0)}%
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                    <span className="text-sm font-medium w-12 text-right">
                                      {Object.values(participant.answers).filter(a => a.isCorrect).length}/
                                      {Object.values(participant.answers).length}
                                    </span>
                                  </div>
                                )}
                                
                                {/* 이전 시도가 있는 경우에만 구분선 및 이전 시도 정보 표시 */}
                                {participant.attempts && participant.attempts.length > 0 && (
                                  <>
                                    <div className="pt-3 border-t border-gray-300"></div>
                                    
                                    {/* 각 시도별 정답률 변화 (역순으로) */}
                                    {[...participant.attempts].reverse().map((attempt, idx) => {
                                      const attemptNumber = participant.attempts ? participant.attempts.length - idx : 0;
                                      const correctCount = Object.values(attempt.answers).filter(a => a.isCorrect).length;
                                      const totalCount = Object.values(attempt.answers).length;
                                      const correctRate = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
                                      
                                      return (
                                        <div key={idx} className="flex items-center">
                                          <span className="w-20 text-sm text-gray-600 flex-shrink-0">시도 {attemptNumber}</span>
                                          <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                                            <div 
                                              className="h-full bg-green-500 rounded-full flex items-center transition-all duration-500"
                                              style={{ width: `${correctRate}%` }}
                                            >
                                              {correctRate > 30 && (
                                                <span className="mx-auto text-xs text-white font-medium">
                                                  {correctRate.toFixed(0)}%
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <span className="text-sm font-medium w-12 text-right">
                                            {correctCount}/{totalCount}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            참가자 정보가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default RankingTab; 