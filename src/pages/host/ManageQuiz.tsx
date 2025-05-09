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
import HostNavBar from '../../components/HostNavBar';
import HostPageHeader from '../../components/HostPageHeader';

const ManageQuiz: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { getQuiz, participants, updateQuiz, loading, error: quizError } = useQuiz();
  
  const [quiz, setQuiz] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'participants' | 'progress'>('participants');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDataChanged, setIsDataChanged] = useState(false);
  
  // 퀴즈 정보 로드
  useEffect(() => {
    const loadQuiz = async () => {
      if (!quizId) return;
      
      try {
        setIsLoading(true);
        setError(null);
        console.log("퀴즈 정보 로드 중...", quizId);
        
        if (!quizId || typeof quizId !== 'string') {
          throw new Error('유효하지 않은 퀴즈 ID입니다.');
        }
        
        const quizData = await getQuiz(quizId);
        
        if (quizData) {
          console.log("퀴즈 정보 로드 완료:", quizData);
          
          // 데이터 유효성 검사
          if (!quizData.title) {
            console.warn("퀴즈 제목이 없습니다:", quizData);
          }
          
          // questions 배열 확인
          if (!Array.isArray(quizData.questions) || quizData.questions.length === 0) {
            console.warn("퀴즈에 문제가 없습니다:", quizData);
          }
          
          setQuiz(quizData);
        } else {
          console.error("퀴즈를 찾을 수 없음:", quizId);
          setError('퀴즈를 찾을 수 없습니다.');
          setTimeout(() => navigate('/'), 2000);
        }
      } catch (err) {
        console.error("퀴즈 로드 오류:", err);
        setError(err instanceof Error ? 
          err.message : '퀴즈 정보를 불러오는 중 오류가 발생했습니다.');
        
        // 심각한 오류 시 홈으로 리다이렉트
        setTimeout(() => navigate('/'), 3000);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadQuiz();
  }, [quizId, getQuiz, navigate]);
  
  // 다른 페이지로 이동하기 전에 확인 메시지 표시
  const handleNavigation = (path: string) => {
    if (isDataChanged && !isProcessing) {
      if (window.confirm('진행 중인 작업이 있습니다. 정말로 페이지를 떠나시겠습니까?')) {
        navigate(path);
      }
    } else {
      navigate(path);
    }
  };

  // 퀴즈 정보 로딩 중이거나 오류 발생 시
  if (isLoading || loading) {
    return <div className="p-8 text-center">퀴즈 로딩 중...</div>;
  }
  
  if (error || quizError) {
    return <div className="p-8 text-center text-red-600">{error || quizError}</div>;
  }
  
  if (!quiz) {
    return <div className="p-8 text-center">퀴즈 정보를 찾을 수 없습니다.</div>;
  }
  
  const quizParticipants = participants.filter(p => p.quizId === quiz.id);
  
  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(quiz.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleStartQuiz = async () => {
    if (quizParticipants.length === 0) {
      alert('퀴즈를 시작하기 전에 참가자들이 입장할 때까지 기다려주세요');
      return;
    }
    
    try {
      setIsProcessing(true);
      setIsDataChanged(true);
      console.log("퀴즈 시작 중...", quiz.id);
      
      // 퀴즈 상태 확인
      if (quiz.status !== 'waiting') {
        throw new Error('이미 시작되었거나 완료된 퀴즈입니다.');
      }
      
      // 문제 확인
      if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        throw new Error('퀴즈에 문제가 없습니다. 먼저 문제를 추가해주세요.');
      }
      
      await updateQuiz(quiz.id, {
        status: 'active',
        startedAt: new Date().toISOString()
      } as any);
      
      console.log("퀴즈 시작 완료");
      
      // 로컬 상태 업데이트
      setQuiz({
        ...quiz,
        status: 'active',
        startedAt: new Date().toISOString()
      });
      
      setActiveTab('progress');
      setIsDataChanged(false);
    } catch (err) {
      console.error("퀴즈 시작 오류:", err);
      alert(err instanceof Error ? 
        err.message : '퀴즈를 시작하는데 문제가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleEndQuiz = async () => {
    try {
      setIsProcessing(true);
      setIsDataChanged(true);
      console.log("퀴즈 종료 중...", quiz.id);
      
      // 퀴즈 상태 확인
      if (quiz.status !== 'active') {
        throw new Error('활성 상태인 퀴즈만 종료할 수 있습니다.');
      }
      
      const completedAt = new Date().toISOString();
      
      await updateQuiz(quiz.id, { 
        status: 'completed',
        completedAt
      } as any);
      console.log("퀴즈 종료 완료");
      
      // 로컬 상태 업데이트
      setQuiz({
        ...quiz,
        status: 'completed',
        completedAt
      });
      setIsDataChanged(false);
    } catch (err) {
      console.error("퀴즈 종료 오류:", err);
      alert(err instanceof Error ? 
        err.message : '퀴즈를 종료하는데 문제가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <HostPageHeader 
          title={quiz.title || '퀴즈 관리'} 
          handleNavigation={handleNavigation}
        />

        <HostNavBar handleNavigation={handleNavigation} />

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
                disabled={quizParticipants.length === 0 || isProcessing}
              >
                {isProcessing ? '처리 중...' : (
                  <>
                    <Play size={20} className="mr-2" /> 퀴즈 시작
                  </>
                )}
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
                disabled={isProcessing}
              >
                {isProcessing ? '처리 중...' : '퀴즈 종료'}
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