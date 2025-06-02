import React, { useState } from 'react';
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
    answerIndex?: number; // 객관식용
    answerText?: string; // 주관식/의견용
    answer?: string; // 호환성을 위한 필드
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
  const [showAnswers, setShowAnswers] = useState(true);

  // 참가자 배열로 변환
  const participantsArray = Object.values(participants);

  // Calculate total answers per question
  const answersByQuestion = quiz.questions.map((question, questionIndex) => {
    const questionType = question.type || 'multiple-choice';
    
    // 모든 참가자의 해당 질문에 대한 답변 수집
    const answers = participantsArray.flatMap(p => {
      if (!p.answers) return [];
      
      return Object.values(p.answers)
        .filter(a => a.questionIndex === questionIndex);
    });
    
    // 객관식인 경우에만 선택지별 통계 계산
    if (questionType === 'multiple-choice' && question.options) {
      // Count by answer index
      const answerCounts: { [key: number]: number } = {};
      answers.forEach(answer => {
        if (answer.answerIndex !== undefined && answer.answerIndex >= 0) {
          answerCounts[answer.answerIndex] = (answerCounts[answer.answerIndex] || 0) + 1;
        }
      });
      
      // Calculate percentages
      const totalAnswers = answers.length;
      const percentages = Object.entries(answerCounts).map(([answerIndexStr, count]) => {
        const answerIndex = parseInt(answerIndexStr);
        return {
          answerIndex,
          answerText: answerIndex >= 0 && answerIndex < question.options!.length 
            ? question.options![answerIndex] 
            : '유효하지 않은 답변',
          count,
          percentage: totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0,
          isCorrect: answerIndex === question.correctAnswer
        };
      });
      
      return {
        question,
        questionType,
        totalAnswers,
        correctAnswers: answers.filter(a => a.isCorrect).length,
        percentages: percentages.sort((a, b) => b.count - a.count),
        textAnswers: []
      };
    } else {
      // 주관식 또는 의견 수집인 경우 텍스트 답변 수집
      const textAnswers = answers.map(answer => ({
        participantName: participantsArray.find(p => 
          p.answers && Object.values(p.answers).some(a => a === answer)
        )?.name || '알 수 없음',
        answer: answer.answerText || answer.answer || '',
        isCorrect: answer.isCorrect
      }));
      
      return {
        question,
        questionType,
        totalAnswers: answers.length,
        correctAnswers: answers.filter(a => a.isCorrect).length,
        percentages: [],
        textAnswers
      };
    }
  });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <div className="flex items-center">
          <span className="font-medium text-sm text-gray-700 mr-2">정답 표시</span>
          <div className="relative inline-block w-10 h-6">
            <input
              type="checkbox"
              id="showAnswers"
              className="opacity-0 w-0 h-0"
              checked={showAnswers}
              onChange={(e) => setShowAnswers(e.target.checked)}
            />
            <label
              htmlFor="showAnswers"
              className={`
                absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full
                transition-colors duration-200 ease-in-out
                ${showAnswers ? 'bg-purple-500' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  absolute left-0.5 bottom-0.5 bg-white w-5 h-5 rounded-full
                  transition-transform duration-200 ease-in-out
                  ${showAnswers ? 'transform translate-x-4' : ''}
                `}
              ></span>
            </label>
          </div>
        </div>
      </div>
      
      {answersByQuestion.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          문제가 없습니다
        </div>
      ) : (
        <div className="space-y-8">
          {answersByQuestion.map((item, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-4">
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-500">문제 {index + 1}</div>
                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                    item.questionType === 'multiple-choice' ? 'bg-blue-100 text-blue-800' :
                    item.questionType === 'short-answer' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {item.questionType === 'multiple-choice' ? '객관식' :
                     item.questionType === 'short-answer' ? '주관식' : '의견 수집'}
                  </span>
                </div>
                <div className="font-bold text-gray-800 mb-1">{item.question.text}</div>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center text-purple-700">
                    <span className="font-bold mr-1">{item.totalAnswers}</span> 응답
                  </div>
                  {item.questionType !== 'opinion' && (
                    <div className="flex items-center text-green-600">
                      <span className="font-bold mr-1">
                        {item.totalAnswers > 0 
                          ? Math.round((item.correctAnswers / item.totalAnswers) * 100) 
                          : 0}%
                      </span> 
                      정답률
                    </div>
                  )}
                </div>
              </div>
              
              {/* 객관식 통계 */}
              {item.questionType === 'multiple-choice' && item.question.options && (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">답변 선택 비율 (총 {item.totalAnswers}명 응답)</h4>
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
                      
                      const isCorrect = stats.isCorrect && showAnswers;
                      
                      return (
                        <div key={optionIndex} className="relative">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm ${isCorrect ? 'font-medium text-green-700' : ''}`}>
                              {optionIndex + 1}. {option}
                              {isCorrect && (
                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">정답</span>
                              )}
                            </span>
                            <span className="text-sm text-gray-600">{stats.count}명 ({stats.percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${
                                isCorrect ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${stats.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* 주관식/의견 수집 답변 목록 */}
              {(item.questionType === 'short-answer' || item.questionType === 'opinion') && (
                <div className="space-y-3">
                  {item.questionType === 'short-answer' && showAnswers && (
                    <div className="bg-green-50 p-3 rounded-md border border-green-200 mb-3">
                      <h5 className="font-medium text-green-800 mb-1">정답</h5>
                      <p className="text-green-700">{item.question.correctAnswerText || '정답 정보 없음'}</p>
                      {item.question.additionalAnswers && item.question.additionalAnswers.length > 0 && (
                        <div className="mt-2">
                          <span className="font-medium text-green-800">추가 인정 답안: </span>
                          <span className="text-green-700">{item.question.additionalAnswers.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-700">
                      {item.questionType === 'short-answer' ? '제출된 답변' : '수집된 의견'}
                    </h5>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {item.textAnswers.map((textAnswer, answerIndex) => (
                        <div key={answerIndex} className={`p-2 rounded border text-sm ${
                          item.questionType === 'opinion' ? 'bg-blue-50 border-blue-200' :
                          textAnswer.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                        }`}>
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-gray-800">{textAnswer.participantName}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              item.questionType === 'opinion' ? 'bg-blue-100 text-blue-800' :
                              textAnswer.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.questionType === 'opinion' ? '의견' :
                               textAnswer.isCorrect ? '정답' : '오답'}
                            </span>
                          </div>
                          <p className="text-gray-700 mt-1 break-words">{textAnswer.answer}</p>
                        </div>
                      ))}
                      {item.textAnswers.length === 0 && (
                        <p className="text-gray-500 text-center py-4">
                          아직 제출된 {item.questionType === 'short-answer' ? '답변' : '의견'}이 없습니다.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizProgress;