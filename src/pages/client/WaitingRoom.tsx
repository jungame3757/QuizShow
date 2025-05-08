import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Clock, ArrowLeft } from 'lucide-react';
import { useQuiz } from '../../contexts/QuizContext';
import Button from '../../components/Button';

const WaitingRoom: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { getQuiz, participants } = useQuiz();
  
  const [quiz, setQuiz] = useState<any>(null);
  const [countdown, setCountdown] = useState<null | number>(null);
  
  useEffect(() => {
    if (quizId) {
      const quizData = getQuiz(quizId);
      if (quizData) {
        setQuiz(quizData);
        
        // If quiz is already active, redirect to play
        if (quizData.status === 'active') {
          navigate(`/play/${quizId}`);
        } else if (quizData.status === 'completed') {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    }
  }, [quizId, getQuiz, navigate]);
  
  // Check quiz status every 2 seconds
  useEffect(() => {
    if (!quiz) return;
    
    const interval = setInterval(() => {
      const updatedQuiz = getQuiz(quiz.id);
      if (updatedQuiz) {
        setQuiz(updatedQuiz);
        
        if (updatedQuiz.status === 'active') {
          setCountdown(3); // Start countdown
        } else if (updatedQuiz.status === 'completed') {
          navigate('/');
        }
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [quiz, getQuiz, navigate]);
  
  // Handle countdown
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      navigate(`/play/${quizId}`);
    }
  }, [countdown, navigate, quizId]);
  
  if (!quiz) {
    return <div className="p-8 text-center">퀴즈 로딩 중...</div>;
  }
  
  const quizParticipants = participants.filter(p => p.quizId === quiz.id);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-blue-50 p-4">
      {countdown !== null ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-10">
          <div className="text-center">
            <div className="text-7xl font-bold text-white mb-4">
              {countdown}
            </div>
            <div className="text-2xl text-white">
              준비하세요!
            </div>
          </div>
        </div>
      ) : null}
      
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-teal-700 mb-6 hover:text-teal-900 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" /> 퀴즈 나가기
        </button>

        <div className="bg-white rounded-2xl shadow-md p-6 mb-8 text-center">
          <h1 className="text-3xl font-bold text-teal-700 mb-2">{quiz.title}</h1>
          
          <div className="animate-pulse flex justify-center items-center my-8">
            <Clock size={32} className="text-yellow-500 mr-3" />
            <p className="text-xl font-medium text-yellow-600">
              호스트가 퀴즈를 시작하기를 기다리는 중...
            </p>
          </div>
          
          <div className="flex justify-center mb-6">
            <div className="flex items-center space-x-2 bg-teal-50 px-4 py-2 rounded-full">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <p className="font-medium text-teal-700">
                대기실에 입장하셨습니다!
              </p>
            </div>
          </div>
          
          <div className="max-w-xs mx-auto bg-yellow-50 rounded-xl p-4">
            <p className="text-yellow-800">
              페이지를 닫지 마세요! 퀴즈 참여 자격을 잃게 됩니다!
            </p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-2xl font-bold text-teal-700 mb-4 flex items-center justify-center">
            <Users size={24} className="mr-2" /> 
            <span>참가자 ({quizParticipants.length})</span>
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {quizParticipants.map(participant => (
              <div 
                key={participant.id}
                className="bg-teal-50 p-3 rounded-xl text-center"
              >
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-teal-200 flex items-center justify-center">
                  {participant.nickname.charAt(0).toUpperCase()}
                </div>
                <div className="font-medium text-teal-800 truncate">
                  {participant.nickname}
                </div>
              </div>
            ))}
          </div>
          
          {quizParticipants.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              아직 참가자가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;