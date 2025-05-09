import React from 'react';
import { Question } from '../types';
import { Check, X } from 'lucide-react';

interface QuizQuestionProps {
  question: Question;
  selectedAnswer: string | null;
  onSelectAnswer: (answer: string) => void;
  showResult: boolean;
  disabled: boolean;
}

const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  selectedAnswer,
  onSelectAnswer,
  showResult,
  disabled
}) => {
  const isCorrect = selectedAnswer === question.options[question.correctAnswer];

  return (
    <div className="animate-fade-in">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4">
        {question.text}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === option;
          const isCorrectAnswer = index === question.correctAnswer;
          
          let optionClass = 'bg-white border-2 border-gray-200 hover:border-purple-300';
          
          if (showResult) {
            if (isCorrectAnswer) {
              optionClass = 'bg-green-100 border-2 border-green-500';
            } else if (isSelected) {
              optionClass = 'bg-red-100 border-2 border-red-500';
            }
          } else if (isSelected) {
            optionClass = 'bg-purple-100 border-2 border-purple-500';
          }
          
          return (
            <button
              key={index}
              onClick={() => !disabled && onSelectAnswer(option)}
              disabled={disabled}
              className={`
                p-4 rounded-xl shadow-sm text-left flex items-center
                transition-all hover:shadow-md
                ${optionClass}
                ${disabled ? 'cursor-default' : 'cursor-pointer'}
              `}
            >
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3 font-bold text-gray-700">
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
        `}>
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