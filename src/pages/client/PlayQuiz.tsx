import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, XCircle } from 'lucide-react';
import { useQuiz } from '../../contexts/QuizContext';
import Button from '../../components/Button';
import QuizQuestion from '../../components/QuizQuestion';
import QuizResults from '../../components/QuizResults';

const PlayQuiz: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { getQuiz, participants, submitAnswer } = useQuiz();
  
  const [quiz, setQuiz] = useState<any>(null);
  const [participant, setParticipant] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showQuizEnd, setShowQuizEnd] = useState(false);
  
  useEffect(() => {
    if (quizId) {
      const quizData = getQuiz(quizId);
      if (quizData) {
        setQuiz(quizData);
        
        // Find the participant for this user
        const userParticipant = participants.find(p => p.quizId === quizId);
        if (userParticipant) {
          setParticipant(userParticipant);
        } else {
          navigate('/join');
        }
        
        // If quiz is completed or waiting, redirect
        if (quizData.status === 'completed') {
          setShowQuizEnd(true);
        } else if (quizData.status === 'waiting') {
          navigate(`/waiting-room/${quizId}`);
        }
      } else {
        navigate('/');
      }
    }
  }, [quizId, getQuiz, participants, navigate]);
  
  // Set timer for current question
  useEffect(() => {
    if (!quiz || !quiz.questions || currentQuestionIndex >= quiz.questions.length) return;
    
    const questionTimeLimit = 30;
    
    setTimeLeft(questionTimeLimit);
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          // Time's up, auto-submit
          if (!selectedAnswer) {
            handleTimeUp();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [quiz, currentQuestionIndex, selectedAnswer]);
  
  // Check quiz status every 5 seconds
  useEffect(() => {
    if (!quiz) return;
    
    const interval = setInterval(() => {
      const updatedQuiz = getQuiz(quiz.id);
      if (updatedQuiz && updatedQuiz.status === 'completed' && !showQuizEnd) {
        setShowQuizEnd(true);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [quiz, getQuiz, showQuizEnd]);
  
  if (!quiz || !participant) {
    return <div className="p-8 text-center">퀴즈 로딩 중...</div>;
  }
  
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
  
  const handleSelectAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    
    // Submit answer
    submitAnswer(participant.id, currentQuestion.id, answer);
    
    // Show result feedback
    setShowResult(true);
    
    // Move to next question after 2 seconds
    setTimeout(() => {
      setShowResult(false);
      setSelectedAnswer(null);
      
      if (isLastQuestion) {
        setShowQuizEnd(true);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }, 2000);
  };
  
  const handleTimeUp = () => {
    // Submit empty answer on time up
    submitAnswer(participant.id, currentQuestion.id, '');
    
    setTimeout(() => {
      if (isLastQuestion) {
        setShowQuizEnd(true);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }, 1500);
  };

  // Find already answered questions
  const isAnswered = (questionId: string) => {
    return participant.answers.some((a: any) => a.questionId === questionId);
  };

  // If all questions are answered or quiz is completed, show end screen
  if (showQuizEnd || quiz.questions.every((q: any) => isAnswered(q.id))) {
    return <QuizResults quiz={quiz} participant={participant} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-purple-700">{quiz.title}</h1>
            <div className="flex items-center">
              <span className="text-lg font-medium text-yellow-600 mr-2">점수:</span>
              <span className="text-lg font-bold text-purple-700">{participant.score}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <div className="bg-purple-100 px-3 py-1 rounded-full">
                <span className="font-medium text-purple-700">
                  문제 {currentQuestionIndex + 1} / {quiz.questions.length}
                </span>
              </div>
            </div>
            
            <div className="flex items-center">
              <Clock size={20} className="text-red-500 mr-2" />
              <span className={`font-bold ${timeLeft && timeLeft < 10 ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
                {timeLeft !== null ? timeLeft : '--'} 초
              </span>
            </div>
          </div>
          
          <div className="bg-gray-100 h-2 rounded-full mb-6">
            <div 
              className={`h-2 rounded-full ${timeLeft && timeLeft < 10 ? 'bg-red-500' : 'bg-purple-500'}`}
              style={{ width: `${timeLeft !== null ? (timeLeft / 30) * 100 : 0}%` }}
            ></div>
          </div>
          
          <QuizQuestion 
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            onSelectAnswer={handleSelectAnswer}
            showResult={showResult}
            disabled={showResult || timeLeft === 0}
          />
        </div>
      </div>
    </div>
  );
};

export default PlayQuiz;