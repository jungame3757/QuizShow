import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Star, Home, BarChart2 } from 'lucide-react';
import { Quiz, Participant } from '../types';
import Button from './Button';
import confetti from 'canvas-confetti';

interface QuizResultsProps {
  quiz: Quiz;
  participant: Participant;
}

const QuizResults: React.FC<QuizResultsProps> = ({ quiz, participant }) => {
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Calculate results
  const totalQuestions = quiz.questions.length;
  const answeredQuestions = participant.answers.length;
  const correctAnswers = participant.answers.filter(a => a.isCorrect).length;
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  
  // Determine performance message
  let performanceMessage = '';
  if (accuracy >= 90) {
    performanceMessage = '놀라워요! 당신은 퀴즈 마법사입니다! ✨';
  } else if (accuracy >= 70) {
    performanceMessage = '잘했어요! 실력이 대단해요! 🌟';
  } else if (accuracy >= 50) {
    performanceMessage = '좋은 노력이에요! 계속 배워가세요! 👍';
  } else {
    performanceMessage = '연습이 완벽을 만듭니다! 다시 도전해보세요! 💪';
  }
  
  // Launch confetti
  useEffect(() => {
    if (accuracy >= 70 && !showConfetti) {
      setShowConfetti(true);
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      
      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };
      
      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }
        
        const particleCount = 50;
        
        confetti({
          particleCount,
          origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
          colors: ['#9C27B0', '#3B82F6', '#4ECDC4', '#FFE66D'],
          zIndex: 2000,
        });
      }, 300);
      
      return () => clearInterval(interval);
    }
  }, [accuracy, showConfetti]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-6 md:p-8 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-700 mb-2">퀴즈 완료!</h1>
          <p className="text-lg text-gray-600">{performanceMessage}</p>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
              <Trophy size={60} className="text-yellow-300" />
            </div>
          </div>
          <div className="text-4xl font-bold mb-1">{participant.score}</div>
          <div className="text-xl font-medium text-purple-100">최종 점수</div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{answeredQuestions}/{totalQuestions}</div>
            <div className="text-sm font-medium text-gray-600">답변한 문제</div>
          </div>
          
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{correctAnswers}</div>
            <div className="text-sm font-medium text-gray-600">정답 수</div>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">{accuracy}%</div>
            <div className="text-sm font-medium text-gray-600">정확도</div>
          </div>
        </div>
        
        {/* Show star rating based on accuracy */}
        <div className="flex justify-center space-x-2 mb-8">
          {[...Array(5)].map((_, i) => (
            <Star 
              key={i} 
              size={32} 
              className={i < Math.round(accuracy / 20) ? 'text-yellow-400 fill-current' : 'text-gray-300'}
            />
          ))}
        </div>
        
        <div className="flex justify-center">
          <Button 
            onClick={() => navigate('/')}
            variant="primary"
            size="large"
            className="px-8"
          >
            <Home size={20} className="mr-2" /> 홈으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;