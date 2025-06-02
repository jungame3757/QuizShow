import React from 'react';

interface QuizTimerProps {
  timerPercentage: number;
  timeLeft: number | null;
}

const QuizTimer: React.FC<QuizTimerProps> = ({ timerPercentage, timeLeft }) => {
  if (timeLeft === null) {
    return null;
  }

  return (
    <div className="bg-gray-100 h-2 rounded-full mb-3 overflow-hidden">
      <div 
        className={`h-2 rounded-full ${timeLeft && timeLeft < 10 ? 'bg-red-500' : 'bg-gradient-to-r from-teal-500 to-teal-400'} transition-all duration-100`}
        style={{ width: `${timerPercentage}%` }}
      ></div>
    </div>
  );
};

export default QuizTimer; 