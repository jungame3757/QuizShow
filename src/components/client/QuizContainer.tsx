import React from 'react';
import QuizHeader from './QuizHeader';
import QuizTimer from './QuizTimer';
import QuizQuestion from './QuizQuestion';

interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
}

interface QuizContainerProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  question: Question;
  score: number;
  timeLeft: number | null;
  timerPercentage: number;
  selectedAnswer: string | null;
  selectedAnswerIndex: number | null;
  showResult: boolean;
  onSelectAnswer: (answer: string, index: number) => void;
}

const QuizContainer: React.FC<QuizContainerProps> = ({
  currentQuestionIndex,
  totalQuestions,
  question,
  score,
  timeLeft,
  timerPercentage,
  selectedAnswer,
  selectedAnswerIndex,
  showResult,
  onSelectAnswer
}) => {
  return (
    <div className="h-screen overflow-hidden bg-gradient-to-b from-[#F0FFFD] via-[#E6FFFC] to-[#E0FFFA] p-4 flex flex-col">
      <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col">
        <div className="bg-white rounded-2xl p-4 flex flex-col"
          style={{
            boxShadow: '0 3px 0 rgba(20, 184, 166, 0.5)',
            border: '2px solid #0D9488',
            borderRadius: '16px',
            background: 'linear-gradient(to bottom right, #fff, #f0fffc)',
          }}
        >
          <QuizHeader 
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={totalQuestions}
            score={score}
          />
          
          <QuizTimer 
            timeLeft={timeLeft}
            timerPercentage={timerPercentage}
          />
          
          <div className="flex-1 overflow-auto">
            <QuizQuestion 
              question={question}
              selectedAnswer={selectedAnswer}
              selectedAnswerIndex={selectedAnswerIndex}
              onSelectAnswer={onSelectAnswer} 
              showResult={showResult}
              disabled={showResult || timeLeft === 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizContainer; 