import React, { useState, useEffect } from 'react';
import { Question } from '../../types';
import { Check, X, MessageSquare, Users } from 'lucide-react';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface QuizQuestionProps {
  question: Question;
  selectedAnswer: string | null;
  selectedAnswerIndex: number | null;
  onSelectAnswer: (answer: string, index: number) => void;
  showResult: boolean;
  disabled: boolean;
  otherOpinions?: string[]; // 다른 참가자들의 의견
  // 서버 검증 결과를 받기 위한 prop 추가
  serverValidationResult?: { isCorrect: boolean; points: number } | null;
  // 섞인 선택지 정보를 받기 위한 prop 추가
  currentShuffledOptions?: { options: string[], mapping: number[] } | null;
}

const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  selectedAnswerIndex,
  onSelectAnswer,
  showResult,
  disabled,
  otherOpinions,
  serverValidationResult,
  currentShuffledOptions
}) => {
  // 주관식용 상태
  const [textAnswer, setTextAnswer] = useState('');
  
  // 의견 수집용 상태
  const [opinion, setOpinion] = useState('');
  
  useEffect(() => {
    // 문제가 바뀔 때마다 상태 초기화
    setTextAnswer('');
    setOpinion('');
  }, [question]);

  const isCorrect = () => {
    if (question.type === 'multiple-choice') {
      // 원본 정답 인덱스와 비교
      const correctAnswer = (question as any).originalCorrectAnswer !== undefined 
        ? (question as any).originalCorrectAnswer 
        : question.correctAnswer;
      return showResult && selectedAnswerIndex === correctAnswer;
    } else if (question.type === 'short-answer') {
      // 서버 검증 결과가 있으면 그것을 우선 사용
      if (showResult && serverValidationResult !== null && serverValidationResult !== undefined) {
        return serverValidationResult.isCorrect;
      }
      
      // 서버 검증 결과가 없는 경우에만 클라이언트 검증 수행
      if (!showResult || !textAnswer) return false;
      
      const userAnswer = textAnswer.toLowerCase().trim();
      const correctAnswer = question.correctAnswerText?.toLowerCase().trim();
      
      if (!correctAnswer) return false;
      
      // 정답 인정 방식에 따른 처리
      if (question.answerMatchType === 'contains') {
        // 정답 단어 포함 방식
        const isMainCorrect = userAnswer.includes(correctAnswer);
        const isAdditionalCorrect = question.additionalAnswers?.some(answer => 
          userAnswer.includes(answer.toLowerCase().trim())
        );
        return isMainCorrect || isAdditionalCorrect;
      } else {
        // 정확히 일치 방식 (기본값)
        const isMainCorrect = userAnswer === correctAnswer;
        const isAdditionalCorrect = question.additionalAnswers?.some(answer => 
          userAnswer === answer.toLowerCase().trim()
        );
        return isMainCorrect || isAdditionalCorrect;
      }
    } else if (question.type === 'opinion') {
      // 의견 수집은 정답이 없음, 하지만 제출했다면 성공으로 처리
      return showResult && opinion.trim().length > 0;
    }
    return false;
  };

  const handleTextSubmit = () => {
    if (textAnswer.trim()) {
      onSelectAnswer(textAnswer.trim(), 0);
    }
  };

  const handleOpinionSubmit = () => {
    if (opinion.trim()) {
      onSelectAnswer(opinion.trim(), 0);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* 문제 제목 - 문제 유형에 따라 정렬 조정 */}
      <h2 className={`text-xl md:text-2xl font-bold text-[#783ae8] mb-4 ${
        question.type === 'short-answer' || question.type === 'opinion' 
          ? 'text-center' 
          : ''
      }`}>
        {question.text}
      </h2>
      
      {/* 객관식 */}
      {question.type === 'multiple-choice' && question.options && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {question.options.map((option, index) => {
            // 표시용 정답 인덱스 (섞인 선택지 고려)
            const displayCorrectAnswer = question.correctAnswer;
            // 원본 정답 인덱스
            const originalCorrectAnswer = (question as any).originalCorrectAnswer !== undefined 
              ? (question as any).originalCorrectAnswer 
              : question.correctAnswer;
            
            // 사용자가 선택한 옵션인지 확인 (원본 인덱스 기준)
            const isSelectedByUser = selectedAnswerIndex !== null && selectedAnswerIndex === originalCorrectAnswer && showResult;
            // 정답 옵션인지 확인 (표시 인덱스 기준)
            const isCorrectAnswer = index === displayCorrectAnswer;
            
            let optionClass = 'bg-white border-2 border-gray-200 hover:border-teal-300';
            let optionStyle: React.CSSProperties = {};
            let showIcon = false;
            let iconType: 'correct' | 'wrong' = 'correct';
            
            if (showResult) {
              if (isCorrectAnswer) {
                // 정답 옵션은 항상 초록색으로 표시
                optionClass = 'bg-green-100 border-2 border-green-500';
                optionStyle = { 
                  boxShadow: '0 3px 0 rgba(22, 163, 74, 0.3)',
                  transform: isSelectedByUser ? 'translateY(-2px)' : 'none'
                };
                showIcon = true;
                iconType = 'correct';
              } else {
                // 사용자가 선택한 오답만 빨간색으로 표시
                const userSelectedDisplayIndex = selectedAnswerIndex !== null && currentShuffledOptions 
                  ? currentShuffledOptions.mapping.indexOf(selectedAnswerIndex)
                  : selectedAnswerIndex;
                
                if (userSelectedDisplayIndex === index && !isCorrectAnswer) {
                  optionClass = 'bg-red-100 border-2 border-red-500';
                  optionStyle = { boxShadow: '0 3px 0 rgba(220, 38, 38, 0.3)' };
                  showIcon = true;
                  iconType = 'wrong';
                }
              }
            } else {
              optionStyle = { 
                border: '2px solid #E2E8F0',
                transition: 'all 0.2s ease'
              };
            }
            
            return (
              <button
                key={index}
                onClick={() => !disabled && onSelectAnswer(option, index)}
                disabled={disabled}
                className={`
                  p-4 rounded-xl shadow-sm text-left flex items-center
                  transition-all hover:shadow-md
                  ${optionClass}
                  ${disabled ? 'cursor-default' : 'cursor-pointer'}
                `}
                style={optionStyle}
                onMouseOver={(e) => {
                  if (!disabled && !showResult) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 0 rgba(20, 184, 166, 0.3)';
                    e.currentTarget.style.borderColor = '#0D9488';
                  }
                }}
                onMouseOut={(e) => {
                  if (!disabled && !showResult) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 0 0 rgba(0,0,0,0)';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                  }
                }}
              >
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center mr-3 font-bold text-teal-700" style={{ border: '1px solid #0D9488' }}>
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="flex-1 font-medium">{option}</span>
                
                {showResult && showIcon && iconType === 'correct' && (
                  <span className="text-green-600 ml-2">
                    <Check size={24} />
                  </span>
                )}
                
                {showResult && showIcon && iconType === 'wrong' && (
                  <span className="text-red-600 ml-2">
                    <X size={24} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* 주관식 */}
      {question.type === 'short-answer' && (
        <div className="mt-6">
          <div className="max-w-md mx-auto">
            <Input
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="답을 입력하세요"
              disabled={disabled}
              className={`w-full text-center text-lg p-4 ${
                showResult && serverValidationResult !== null && serverValidationResult !== undefined
                  ? serverValidationResult.isCorrect 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-red-500 bg-red-50'
                  : showResult 
                    ? 'border-gray-300 bg-gray-50' // 검증 중일 때는 중립 색상
                    : ''
              }`}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !disabled) {
                  handleTextSubmit();
                }
              }}
            />
            {!disabled && !showResult && (
              <div className="mt-4 text-center overflow-visible">
                <Button
                  onClick={handleTextSubmit}
                  disabled={!textAnswer.trim()}
                  variant="primary"
                  className="px-8 py-3 bg-gradient-to-r from-teal-500 to-teal-400"
                  style={{
                    boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
                    border: '2px solid #000',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    if (!textAnswer.trim()) return;
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 6px 0 rgba(0,0,0,0.8)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
                  }}
                >
                  답안 제출
                </Button>
              </div>
            )}
            {showResult && (
              <div className="mt-4 text-center space-y-3">
                {/* 검증이 완료된 경우에만 결과 표시 */}
                {serverValidationResult !== null && serverValidationResult !== undefined ? (
                  <>
                    {/* 오답인 경우에만 정답 표시 */}
                    {!serverValidationResult.isCorrect && (
                      <div className="text-center">
                        <span className="text-red-600 font-medium">정답: {question.correctAnswerText}</span>
                      </div>
                    )}
                  </>
                ) : (
                  /* 검증 중 표시 */
                  <div className="inline-block px-6 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 border border-gray-300">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full mr-2"></div>
                      답안 확인 중...
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 의견 수집 */}
      {question.type === 'opinion' && (
        <div className="mt-6">
          <div className="max-w-lg mx-auto">
            
            {/* 다른 사람들의 의견 표시 */}
            {otherOpinions && otherOpinions.length > 0 && (
              <div className="mb-6">
                <div className="flex flex-wrap gap-3 justify-center">
                  {otherOpinions.slice(0, 5).map((opinion, index) => {
                    // 다양한 색상 배열
                    const colors = [
                      'bg-gradient-to-r from-orange-100 to-orange-50',
                      'bg-gradient-to-r from-blue-100 to-blue-50',
                      'bg-gradient-to-r from-green-100 to-green-50',
                      'bg-gradient-to-r from-purple-100 to-purple-50',
                      'bg-gradient-to-r from-pink-100 to-pink-50'
                    ];
                    
                    return (
                      <div 
                        key={index}
                        className={`${colors[index % colors.length]} rounded-full px-4 py-2 text-sm text-gray-700 font-medium whitespace-nowrap animate-fade-in`}
                        style={{
                          boxShadow: '0 2px 0 rgba(0,0,0,0.8)',
                          border: '2px solid #000',
                          transition: 'all 0.2s ease',
                          animationDelay: `${index * 0.2}s`,
                          opacity: 0,
                          animation: `fadeInUp 0.6s ease-out ${index * 0.2}s forwards`,
                          '--rotation': `${(index % 2 === 0 ? 1 : -1) * (Math.random() * 3)}deg`
                        } as React.CSSProperties & { '--rotation': string }}
                      >
                        {opinion.length > 20 ? `${opinion.slice(0, 20)}...` : opinion}
                      </div>
                    );
                  })}
                </div>
                {otherOpinions.length > 5 && (
                  <div className="text-center mt-3 text-xs text-gray-400">
                    외 {otherOpinions.length - 5}개의 생각들...
                  </div>
                )}
              </div>
            )}
            
            <textarea
              value={opinion}
              onChange={(e) => {
                // 50자 제한
                if (e.target.value.length <= 50) {
                  setOpinion(e.target.value);
                }
              }}
              placeholder="여기에 의견을 입력하세요... (최대 50자)"
              disabled={disabled}
              rows={4}
              maxLength={50}
              className={`
                w-full p-4 border-2 rounded-lg resize-none text-sm
                ${disabled 
                  ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
                  : 'border-orange-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
                }
              `}
            />
            
            {/* 글자수 표시 */}
            <div className="text-right text-xs text-gray-500 mt-1">
              {opinion.length}/50
            </div>
            
            {!disabled && !showResult && (
              <div className="mt-4 text-center overflow-visible">
                <Button
                  onClick={handleOpinionSubmit}
                  disabled={!opinion.trim()}
                  variant="primary"
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-orange-400"
                  style={{
                    boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
                    border: '2px solid #000',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    if (!opinion.trim()) return;
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 6px 0 rgba(0,0,0,0.8)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
                  }}
                >
                  의견 제출
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 결과 표시 - 모든 문제 형식에서 표시 */}
      {showResult && (
        <div className={`
          mt-6 p-4 rounded-lg text-center font-bold text-lg
          ${question.type === 'opinion' 
            ? 'bg-orange-100 text-orange-800' 
            : isCorrect() 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }
        `}
          style={{
            border: question.type === 'opinion' 
              ? '2px solid #F97316' 
              : isCorrect() 
                ? '2px solid #22C55E' 
                : '2px solid #EF4444',
            boxShadow: question.type === 'opinion' 
              ? '0 3px 0 rgba(249, 115, 22, 0.3)' 
              : isCorrect() 
                ? '0 3px 0 rgba(22, 163, 74, 0.3)'
                : '0 3px 0 rgba(220, 38, 38, 0.3)'
          }}
        >
          {question.type === 'opinion' ? (
            <div className="flex items-center justify-center">
              <MessageSquare size={24} className="mr-2" />
              의견이 제출되었습니다!
              {serverValidationResult && (
                <span className="ml-2 text-orange-600 font-bold">+{serverValidationResult.points}점</span>
              )}
            </div>
          ) : isCorrect() ? (
            <div>
              <div className="flex items-center justify-center mb-1">
                <Check size={24} className="mr-2" />
                정답입니다!
                {serverValidationResult && (
                  <span className="ml-2 text-green-600 font-bold">+{serverValidationResult.points}점</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <X size={24} className="mr-2" />
              오답입니다
              {serverValidationResult && serverValidationResult.points > 0 && (
                <span className="ml-2 text-red-600 font-bold">+{serverValidationResult.points}점</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizQuestion;