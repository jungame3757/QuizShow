import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wand, Lightbulb, User, Settings, Medal, Apple } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useQuiz } from '../contexts/QuizContext';

const ProfileSkeleton = () => (
  <div className="bg-purple-100 animate-pulse text-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 w-28 h-8"></div>
);

const MainPage: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const { loadUserQuizzes } = useQuiz();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && !isLoading) {
      loadUserQuizzes();
    }
  }, [currentUser, isLoading, loadUserQuizzes]);

  const handleStartQuizCreation = () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // 로그인 상태라면 항상 내 퀴즈 목록으로 이동
    navigate('/host/my-quizzes');
  };

  // 공통 스타일 정의
  const commonButtonStyle = {
    boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
    border: '2px solid #000',
    borderRadius: '12px',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F8F7FF] via-[#F3F1FF] to-[#F0EEFF]">
      <div className="px-4 sm:px-6 lg:px-8 w-full max-w-7xl mx-auto">
        <header className="pt-4 pb-8 relative overflow-hidden">
          {/* 상단 메뉴 및 로그인 버튼 */}
          <div className="flex items-center justify-between mb-6">
            <Link to="/" aria-label="홈으로 이동" className="flex items-center gap-2 h-8">
              <img 
                src="/assets/logo/logo-light.svg" 
                alt="콰직 로고" 
                className="h-8 mr-1" 
              />
              <span className="text-xl sm:text-2xl font-bold text-[#783ae8] flex items-center gap-2" style={{ fontFamily: 'SBAggroB' }}>
                콰직
              </span>
            </Link>

            {isLoading ? (
              <ProfileSkeleton />
            ) : currentUser ? (
              <Link 
                to="/profile" 
                className="bg-purple-600 text-white px-3 py-1.5 rounded-full hover:bg-purple-700 transition-colors flex items-center gap-1.5 h-8"
                style={{
                  boxShadow: '0 1px 0 #000',
                  border: '1px solid #000',
                  transition: 'all 0.2s ease',
                  fontSize: '0.875rem',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 2px 0 #000';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 0 #000';
                }}
              >
                <User size={14} className="text-white" />
                <span className="font-medium">{currentUser.isAnonymous ? '익명 사용자' : (currentUser.displayName || currentUser.email || '사용자')}</span>
                <Settings size={12} />
              </Link>
            ) : (
              <Link to="/login">
                <Button 
                  variant="secondary" 
                  size="small"
                  className="px-3 py-1.5 h-8 rounded-full"
                  style={{
                    boxShadow: '0 1px 0 #000',
                    border: '1px solid #000',
                    transition: 'all 0.2s ease',
                    fontSize: '0.875rem',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 0 #000';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 0 #000';
                  }}
                >
                  로그인
                </Button>
              </Link>
            )}
          </div>

          {/* 히어로 섹션 */}
          <div className="flex flex-col-reverse lg:flex-row items-center gap-6 lg:gap-14 mb-12 pt-4">
            <div className="lg:w-1/2 text-center lg:text-left">
              <h1 className="font-bold mb-7 tracking-tight leading-tight" style={{ fontFamily: 'SBAggroB' }}>
                <span className="text-5xl md:text-6xl lg:text-7xl text-[#783ae8] inline-block mb-2">콰직</span><br />
                <span className="text-3xl md:text-4xl lg:text-5xl text-purple-700 inline-block mb-1">어떤 환경에서도 쉽게</span><br />
                <span className="text-3xl md:text-4xl lg:text-5xl text-teal-600 inline-block">무료 퀴즈 활동</span>
              </h1>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mt-8">
                <Button 
                  variant="primary" 
                  size="large"
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl px-8 py-4 text-lg"
                  style={commonButtonStyle}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 6px 0 rgba(0,0,0,0.8)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
                  }}
                  onClick={handleStartQuizCreation}
                >
                  퀴즈 만들기 시작하기
                </Button>
              </div>
            </div>
            <div className="lg:w-1/2 flex justify-center mb-8 lg:mb-0">
              <div className="relative transform lg:scale-110">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full blur-xl opacity-70 transform scale-110"></div>
                <img 
                  src="/assets/logo/logo-light.svg" 
                  alt="콰직 로고" 
                  className="h-44 sm:h-52 md:h-60 lg:h-72 drop-shadow-xl relative z-10" 
                />
              </div>
            </div>
          </div>
        </header>
        
        <main className="py-12">
          <h2 className="text-3xl font-bold text-center mt-10 mb-5 text-[#783ae8] leading-tight">
            퀴즈를 사과 깨물듯 쉽게 <br /> 
            <span style={{ fontFamily: 'SBAggroB', fontSize: '3rem' }} className="flex items-center justify-center gap-2">
              콰직!<Apple size={48} className="text-red-500 -translate-y-1.5" fill="currentColor" />
            </span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 카드 1: 퀴즈 제작 */}
            <div 
              className="bg-white p-7 relative overflow-hidden transform transition-all duration-300 hover:-translate-y-2" 
              style={{
                boxShadow: '0 3px 0 rgba(98, 58, 162, 0.5)',
                border: '2px solid #8B5CF6',
                borderRadius: '16px',
                background: 'linear-gradient(to bottom right, #fff, #fafaff)',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 0 rgba(98, 58, 162, 0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 3px 0 rgba(98, 58, 162, 0.5)';
              }}
            >
              <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center mb-5" style={{ border: '2px solid #8B5CF6' }}>
                <Wand size={28} className="text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-purple-800 mb-3">너무나 간편한 활동 준비</h3>
              <p className="text-gray-600 mb-4">
                전날 미리 활동을 만들고 온/오프라인 현장에서 참가방 준비 없이 바로 시작하세요.
              </p>
              <div className="absolute -bottom-3 -right-3 w-16 h-16 bg-purple-100 rounded-full opacity-40"></div>
            </div>
            
            {/* 카드 2: 실시간 퀴즈 진행 */}
            <div 
              className="bg-white p-7 relative overflow-hidden transform transition-all duration-300 hover:-translate-y-2" 
              style={{
                boxShadow: '0 3px 0 rgba(59, 130, 246, 0.5)',
                border: '2px solid #3B82F6',
                borderRadius: '16px',
                background: 'linear-gradient(to bottom right, #fff, #f0f7ff)',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 0 rgba(59, 130, 246, 0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 3px 0 rgba(59, 130, 246, 0.5)';
              }}
            >
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mb-5" style={{ border: '2px solid #3B82F6' }}>
                <Medal size={28} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-blue-800 mb-3">퀴즈 등급전으로 동기부여</h3>
              <p className="text-gray-600 mb-4">
                온라인으로 실시간 퀴즈를 진행하고 결과 및 등급을 즉시 확인하여 학습 동기를 강화합니다.
              </p>
              <div className="absolute -bottom-3 -right-3 w-16 h-16 bg-blue-100 rounded-full opacity-40"></div>
            </div>
            
            {/* 카드 3: 결과 분석 */}
            <div 
              className="bg-white p-7 relative overflow-hidden transform transition-all duration-300 hover:-translate-y-2" 
              style={{
                boxShadow: '0 3px 0 rgba(20, 184, 166, 0.5)',
                border: '2px solid #14B8A6',
                borderRadius: '16px',
                background: 'linear-gradient(to bottom right, #fff, #f0fdf9)',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 0 rgba(20, 184, 166, 0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 3px 0 rgba(20, 184, 166, 0.5)';
              }}
            >
              <div className="w-14 h-14 rounded-xl bg-teal-100 flex items-center justify-center mb-5" style={{ border: '2px solid #14B8A6' }}>
                <Lightbulb size={28} className="text-teal-600" />
              </div>
              <h3 className="text-xl font-bold text-teal-800 mb-3">결과 분석</h3>
              <p className="text-gray-600 mb-4">
                퀴즈 결과를 상세하게 분석하고 학습 개선점을 파악할 수 있습니다. 개인별, 문항별 통계를 제공합니다.
              </p>
              <div className="absolute -bottom-3 -right-3 w-16 h-16 bg-teal-100 rounded-full opacity-40"></div>
            </div>
          </div>
        </main>
        
        <footer className="py-10 text-center text-gray-600 border-t border-gray-200 mt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img 
                src="/assets/logo/logo-light.svg" 
                alt="콰직 로고" 
                className="h-8" 
              />
              <span className="text-xl text-[#783ae8]" style={{ fontFamily: 'SBAggroB' }}>콰직</span>
            </div>
            <div className="flex justify-center gap-6 text-sm mt-2">
              <Link to="#" className="text-gray-500 hover:text-purple-600 transition-colors">이용약관</Link>
              <Link to="#" className="text-gray-500 hover:text-purple-600 transition-colors">개인정보처리방침</Link>
              <Link to="#" className="text-gray-500 hover:text-purple-600 transition-colors">도움말</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MainPage;