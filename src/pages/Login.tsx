import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuiz } from '../contexts/QuizContext';
import Button from '../components/ui/Button';

const Login: React.FC = () => {
  const { currentUser, signInWithGoogle, signInAnonymous, isLoading } = useAuth();
  const { quizzes, loadUserQuizzes, loading: quizLoading } = useQuiz();
  const navigate = useNavigate();
  const isInitialMount = useRef(true);
  const [reloadQuizData, setReloadQuizData] = useState(true);
  const previousUser = useRef<string | null>(null);

  // 사용자 변경 감지 및 퀴즈 데이터 로드 상태 초기화
  useEffect(() => {
    if (currentUser) {
      // 이전 사용자와 현재 사용자가 다르면 재로드 표시
      if (previousUser.current !== currentUser.uid) {
        setReloadQuizData(true);
        previousUser.current = currentUser.uid;
      }
    } else {
      // 로그아웃 상태면 이전 사용자 정보 초기화
      previousUser.current = null;
    }
  }, [currentUser]);

  // 로그인 시 퀴즈 데이터 로드
  useEffect(() => {
    if (currentUser && !isLoading && reloadQuizData) {
      // 로컬 스토리지 캐시 초기화 (sessionStorage나 localStorage에 캐싱된 데이터가 있다면)
      localStorage.removeItem('quizzes');
      sessionStorage.removeItem('quizzes');
      
      // 퀴즈 데이터 새로 로드
      loadUserQuizzes();
      setReloadQuizData(false);
    }
  }, [currentUser, isLoading, loadUserQuizzes, reloadQuizData]);

  // 퀴즈 데이터 로드 후 페이지 이동
  useEffect(() => {
    // 첫 마운트 시에는 실행하지 않음
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // 로그인된 상태에서 퀴즈 데이터 로드가 완료된 경우
    if (currentUser && !isLoading && !quizLoading && !reloadQuizData) {
      if (quizzes.length === 0) {
        navigate('/host/create');
      } else {
        navigate('/host/my-quizzes');
      }
    }
  }, [currentUser, isLoading, quizLoading, quizzes, navigate, reloadQuizData]);

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
    // 로그인 후 리다이렉트는 useEffect에서 처리
  };

  const handleAnonymousLogin = async () => {
    await signInAnonymous();
    // 로그인 후 리다이렉트는 useEffect에서 처리
  };

  if (isLoading || quizLoading) {
    return <div className="p-8 text-center">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F7FF] via-[#F3F1FF] to-[#F0EEFF] p-4">
      <div className="max-w-md mx-auto">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-[#783ae8] mb-6 hover:text-purple-900 transition-colors"
          style={{
            transition: 'all 0.2s ease',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateX(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <ArrowLeft size={20} className="mr-2" /> 홈으로 돌아가기
        </button>

        <div className="bg-white rounded-2xl shadow-md p-8" style={{
          border: '1px solid rgba(139, 92, 246, 0.3)', 
          boxShadow: '0 3px 0 rgba(139, 92, 246, 0.15)'
        }}>
          <h1 className="text-3xl font-bold text-[#783ae8] mb-8 text-center">로그인</h1>
          
          <p className="text-gray-600 mb-8 text-center">
            퀴즈를 생성하려면 로그인이 필요합니다.
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={handleGoogleLogin}
              className="bg-white border border-blue-300 text-blue-600 px-4 py-3 rounded-xl hover:bg-blue-50 transition-colors w-full flex items-center justify-center"
              style={{
                boxShadow: '0 2px 0 rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 0 rgba(0,0,0,0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 0 rgba(0,0,0,0.1)';
              }}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M21.8,12.1c0-0.7-0.1-1.3-0.2-2H12v3.8h5.5c-0.2,1.2-0.9,2.2-2,2.9v2.4h3.2C20.6,17.1,21.8,14.9,21.8,12.1z"
                />
                <path
                  fill="#34A853"
                  d="M12,22c2.7,0,5-0.9,6.6-2.4l-3.2-2.4c-0.9,0.6-2,1-3.3,1c-2.6,0-4.8-1.7-5.5-4.1H3.3v2.5C5,19.5,8.3,22,12,22z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.5,14.1c-0.2-0.6-0.3-1.3-0.3-2.1s0.1-1.4,0.3-2.1V7.4H3.3C2.5,9,2,10.9,2,13s0.5,4,1.3,5.6L6.5,14.1z"
                />
                <path
                  fill="#EA4335"
                  d="M12,5.8c1.5,0,2.8,0.5,3.8,1.5l2.8-2.8C16.9,2.9,14.6,2,12,2C8.3,2,5,4.5,3.3,8.1l3.2,2.5C7.2,7.5,9.4,5.8,12,5.8z"
                />
              </svg>
              Google로 로그인
            </button>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">또는</span>
              </div>
            </div>
            
            <Button 
              onClick={handleAnonymousLogin}
              variant="secondary"
              className="w-full py-3 justify-center bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl"
              style={{
                boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
                border: '2px solid #000',
                borderRadius: '12px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 6px 0 rgba(0,0,0,0.8)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
              }}
            >
              <UserCircle size={20} className="mr-2" /> 익명으로 로그인
            </Button>
            
            <p className="text-sm text-gray-500 text-center mt-6">
              로그인은 퀴즈 생성에만 필요합니다.<br />
              이미 생성된 퀴즈에 참여하는 것은 로그인 없이 가능합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 