import React from 'react';
import QuizHeader from './QuizHeader';
import QuizTimer from './QuizTimer';
import QuizQuestion from './QuizQuestion';
import { Question } from '../../types';

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
  otherOpinions?: string[]; // 다른 참가자들의 의견
  serverValidationResult?: { isCorrect: boolean; points: number } | null;
  currentShuffledOptions?: { options: string[], mapping: number[] } | null;
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
  onSelectAnswer,
  otherOpinions,
  serverValidationResult,
  currentShuffledOptions
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0FFFD] via-[#E6FFFC] to-[#E0FFFA] p-4 flex flex-col">
      <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col">
        <div className="bg-white rounded-2xl p-4 flex flex-col min-h-0"
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
          
          <div className="flex-1 min-h-0">
            <div className="h-full overflow-y-auto" style={{ paddingBottom: '20px' }}>
              <QuizQuestion 
                question={question}
                selectedAnswer={selectedAnswer}
                selectedAnswerIndex={selectedAnswerIndex}
                onSelectAnswer={onSelectAnswer} 
                showResult={showResult}
                disabled={showResult || timeLeft === 0}
                otherOpinions={otherOpinions}
                serverValidationResult={serverValidationResult}
                currentShuffledOptions={currentShuffledOptions}
              />
            </div>
          </div>
        </div>
        
        {/* Made by 콰직 Footer */}
        <div 
          className="mt-8 mb-4 text-center cursor-pointer"
          onClick={() => window.open('/', '_blank')}
        >
          <div className="bg-white bg-opacity-90 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full shadow-md border border-teal-100">
            <img 
              src="/assets/logo/logo-light.svg" 
              alt="콰직 로고" 
              className="w-5 h-5" 
            />
            <p className="text-teal-700 font-medium text-sm hover:text-teal-500 transition-colors">
              made with 콰직
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizContainer; 