import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, ClipboardCopy, Users, CheckCircle,
  BarChart2, Clock
} from 'lucide-react';
import { useQuiz } from '../../contexts/QuizContext';
import Button from '../../components/Button';
import ParticipantList from '../../components/ParticipantList';
import QuizProgress from '../../components/QuizProgress';

const ManageQuiz: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { getQuiz, startQuiz, participants, updateQuiz } = useQuiz();
  
  const [quiz, setQuiz] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'participants' | 'progress'>('participants');
  
  useEffect(() => {
    if (quizId) {
      const quizData = getQuiz(quizId);
      if (quizData) {
        setQuiz(quizData);
      } else {
        navigate('/');
      }
    }
  }, [quizId, getQuiz, navigate]);
  
  if (!quiz) {
    return <div className="p-8 text-center">퀴즈 로딩 중...</div>;
  }
  
  const quizParticipants = participants.filter(p => p.quizId === quiz.id);
  
  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(quiz.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleStartQuiz = () => {
    if (quizParticipants.length === 0) {
      alert('퀴즈를 시작하기 전에 참가자들이 입장할 때까지 기다려주세요');
      return;
    }
    
    startQuiz(quiz.id);
    setActiveTab('progress');
  };
  
  const handleEndQuiz = () => {
    updateQuiz(quiz.id, { 
      status: 'completed',
      completedAt: new Date().toISOString()
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-purple-700 mb-6 hover:text-purple-900 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" /> 홈으로 돌아가기
        </button>

        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-purple-700">{quiz.title}</h1>
              {quiz.description && (
                <p className="text-gray-600 mt-1">{quiz.description}</p>
              )}
            </div>
            <div className="flex items-center">
              <div className={`
                px-3 py-1 rounded-full text-sm font-medium
                ${quiz.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' : 
                quiz.status === 'active' ? 'bg-green-100 text-green-800' : 
                'bg-purple-100 text-purple-800'}
              `}>
                {quiz.status === 'waiting' ? '참가자 대기 중' : 
                 quiz.status === 'active' ? '퀴즈 진행 중' : 
                 '퀴즈 완료'}
              </div>
            </div>
          </div>
          
          {quiz.status === 'waiting' && (
            <div className="bg-yellow-50 rounded-xl p-4 mb-6">
              <div className="flex items-center mb-2">
                <h3 className="text-lg font-medium text-yellow-800">초대 코드</h3>
              </div>
              <div className="flex items-center">
                <div className="bg-white px-4 py-2 rounded-l-lg border border-yellow-300 text-2xl font-bold text-yellow-800 tracking-wider">
                  {quiz.inviteCode}
                </div>
                <button 
                  onClick={handleCopyInviteCode}
                  className={`
                    px-4 py-2 rounded-r-lg focus:outline-none
                    ${copied ? 
                      'bg-green-500 text-white' : 
                      'bg-yellow-500 text-white hover:bg-yellow-600'}
                    transition-colors
                  `}
                >
                  {copied ? (
                    <CheckCircle size={20} />
                  ) : (
                    <ClipboardCopy size={20} />
                  )}
                </button>
              </div>
              <p className="text-sm text-yellow-700 mt-2">
                이 코드를 참가자들과 공유하여 퀴즈에 참여하도록 하세요
              </p>
            </div>
          )}
          
          {quiz.status === 'waiting' && (
            <div className="flex justify-center">
              <Button 
                onClick={handleStartQuiz}
                variant="primary"
                size="large"
                className="px-8"
                disabled={quizParticipants.length === 0}
              >
                <Play size={20} className="mr-2" /> 퀴즈 시작
              </Button>
            </div>
          )}
          
          {quiz.status === 'active' && (
            <div className="flex justify-center">
              <Button 
                onClick={handleEndQuiz}
                variant="warning"
                size="large"
                className="px-8"
              >
                퀴즈 종료
              </Button>
            </div>
          )}
        </div>

        {quiz.status !== 'waiting' && (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-8">
            <div className="flex border-b border-gray-200">
              <button
                className={`
                  flex-1 py-4 px-6 text-center font-medium
                  ${activeTab === 'participants' ? 
                    'text-purple-700 border-b-2 border-purple-500' : 
                    'text-gray-600 hover:text-purple-700'}
                `}
                onClick={() => setActiveTab('participants')}
              >
                <div className="flex items-center justify-center">
                  <Users size={20} className="mr-2" /> 참가자
                </div>
              </button>
              <button
                className={`
                  flex-1 py-4 px-6 text-center font-medium
                  ${activeTab === 'progress' ? 
                    'text-purple-700 border-b-2 border-purple-500' : 
                    'text-gray-600 hover:text-purple-700'}
                `}
                onClick={() => setActiveTab('progress')}
              >
                <div className="flex items-center justify-center">
                  <BarChart2 size={20} className="mr-2" /> 퀴즈 진행 상황
                </div>
              </button>
            </div>
            
            <div className="p-6">
              {activeTab === 'participants' && (
                <ParticipantList participants={quizParticipants} />
              )}
              
              {activeTab === 'progress' && (
                <QuizProgress quiz={quiz} participants={quizParticipants} />
              )}
            </div>
          </div>
        )}
        
        {quiz.status === 'waiting' && quizParticipants.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-purple-700 mb-4 flex items-center">
              <Users size={24} className="mr-2" /> 참가자
            </h2>
            <ParticipantList participants={quizParticipants} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageQuiz;