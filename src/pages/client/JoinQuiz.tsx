import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LogIn } from 'lucide-react';
import { useQuiz } from '../../contexts/QuizContext';
import Button from '../../components/Button';
import Input from '../../components/Input';

const JoinQuiz: React.FC = () => {
  const navigate = useNavigate();
  const { joinQuiz, getQuiz } = useQuiz();
  
  const [inviteCode, setInviteCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  
  const handleJoinQuiz = () => {
    setError('');
    
    if (!inviteCode.trim()) {
      setError('초대 코드를 입력해주세요');
      return;
    }
    
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요');
      return;
    }
    
    try {
      const quiz = getQuiz(inviteCode.trim());
      
      if (!quiz) {
        setError('유효하지 않은 초대 코드입니다. 다시 확인해주세요.');
        return;
      }
      
      if (quiz.status !== 'waiting') {
        setError('이 퀴즈는 이미 시작되었거나 종료되었습니다.');
        return;
      }
      
      joinQuiz(inviteCode.trim(), nickname.trim());
      navigate(`/waiting-room/${quiz.id}`);
    } catch (err: any) {
      setError(err.message || '퀴즈 참여에 실패했습니다');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-blue-50 p-4 flex flex-col items-center">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center text-teal-700 mb-6 hover:text-teal-900 transition-colors">
          <ArrowLeft size={20} className="mr-2" /> 홈으로 돌아가기
        </Link>

        <div className="bg-white rounded-2xl shadow-md p-8 animate-fade-in-up">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center">
              <LogIn size={36} className="text-teal-600" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-center text-teal-700 mb-6">퀴즈 쇼 참여하기</h1>
          
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                초대 코드
              </label>
              <Input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="코드를 입력하세요 (예: ABC123)"
                className="w-full"
                maxLength={6}
              />
            </div>
            
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                닉네임
              </label>
              <Input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="어떻게 불러드릴까요?"
                className="w-full"
                maxLength={15}
              />
            </div>
            
            <Button 
              onClick={handleJoinQuiz}
              variant="primary"
              size="large"
              fullWidth
              className="bg-gradient-to-r from-teal-500 to-cyan-500"
            >
              퀴즈 참여하기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinQuiz;