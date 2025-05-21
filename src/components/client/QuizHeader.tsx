import React from 'react';

interface QuizHeaderProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  score: number;
}

const QuizHeader: React.FC<QuizHeaderProps> = ({ 
  currentQuestionIndex, 
  totalQuestions, 
  score 
}) => {
  return (
    <div className="flex justify-between items-center mb-3">
      <div className="flex items-center">
        <div className="bg-teal-100 px-3 py-1 rounded-full" style={{ border: '1px solid #0D9488' }}>
          <span className="font-medium text-teal-700">
            문제 {currentQuestionIndex + 1} / {totalQuestions}
          </span>
        </div>
      </div>
      
      <div className="flex items-center">
        <span className="text-base font-medium text-teal-600 mr-1">점수:</span>
        <span className="text-lg font-bold text-[#783ae8]">{score}</span>
      </div>
    </div>
  );
};

export default QuizHeader; 