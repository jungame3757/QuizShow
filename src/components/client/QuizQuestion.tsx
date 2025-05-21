import React from 'react';
import { Question } from '../../types';
import { Check, X } from 'lucide-react';

interface QuizQuestionProps {
  question: Question;
  selectedAnswer: string | null;
  selectedAnswerIndex: number | null;
  onSelectAnswer: (answer: string, index: number) => void;
  showResult: boolean;
  disabled: boolean;
}

const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  selectedAnswerIndex,
  onSelectAnswer,
  showResult,
  disabled
}) => {
  const isCorrect = showResult && selectedAnswerIndex === question.correctAnswer;

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl md:text-2xl font-bold text-[#783ae8] mb-4">
        {question.text}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswerIndex !== null && selectedAnswerIndex === index;
          const isCorrectAnswer = index === question.correctAnswer;
          
          let optionClass = 'bg-white border-2 border-gray-200 hover:border-teal-300';
          let optionStyle: React.CSSProperties = {};
          
          if (showResult) {
            if (isCorrectAnswer) {
              optionClass = 'bg-green-100 border-2 border-green-500';
              optionStyle = { 
                boxShadow: '0 3px 0 rgba(22, 163, 74, 0.3)',
                transform: isSelected ? 'translateY(-2px)' : 'none'
              };
            } else if (isSelected) {
              optionClass = 'bg-red-100 border-2 border-red-500';
              optionStyle = { boxShadow: '0 3px 0 rgba(220, 38, 38, 0.3)' };
            }
          } else if (isSelected) {
            optionClass = 'bg-teal-100 border-2 border-teal-500';
            optionStyle = { boxShadow: '0 2px 0 rgba(20, 184, 166, 0.5)' };
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
                if (!disabled && !showResult && !isSelected) {
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
              
              {showResult && isCorrectAnswer && (
                <span className="text-green-600 ml-2">
                  <Check size={24} />
                </span>
              )}
              
              {showResult && isSelected && !isCorrectAnswer && (
                <span className="text-red-600 ml-2">
                  <X size={24} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      
      {showResult && (
        <div className={`
          mt-6 p-4 rounded-lg text-center font-bold text-lg
          ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
        `}
          style={{
            border: isCorrect ? '2px solid #22C55E' : '2px solid #EF4444',
            boxShadow: isCorrect 
              ? '0 3px 0 rgba(22, 163, 74, 0.3)'
              : '0 3px 0 rgba(220, 38, 38, 0.3)'
          }}
        >
          {isCorrect ? (
            <div className="flex items-center justify-center">
              <Check size={24} className="mr-2" />
              정답입니다!
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <X size={24} className="mr-2" />
              오답입니다
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizQuestion;