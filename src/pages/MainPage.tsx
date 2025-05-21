import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wand, Users, Lightbulb, Rocket, User, Settings, GraduationCap, BookOpen, Coffee, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useQuiz } from '../contexts/QuizContext';

const ProfileSkeleton = () => (
  <div className="bg-purple-100 animate-pulse text-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 w-28 h-8"></div>
);

const ButtonSkeleton = () => (
  <div className="w-full h-14 bg-purple-100 animate-pulse rounded-xl shadow-md"></div>
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
        <header className="pt-6 pb-10 relative overflow-hidden">
          {/* 상단 메뉴 및 로그인 버튼 */}
          <div className="flex items-center justify-between mb-8">
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
          <div className="flex flex-col-reverse lg:flex-row items-center gap-8 lg:gap-12 mb-16">
            <div className="lg:w-1/2 text-center lg:text-left">
              <h1 className="text-5xl md:text-6xl font-bold mb-4" style={{ fontFamily: 'SBAggroB' }}>
                <span className="text-[#783ae8]">콰직</span><span className="text-purple-500">으로</span><br />
                <span className="text-purple-700">퀴즈를 만들고</span><br />
                <span className="text-teal-600">함께 배워요</span>
              </h1>
              <p className="text-lg text-gray-700 mb-8">
                간단하고 재미있는 퀴즈를 만들어 학습 효과를 높이세요.<br />
                다양한 주제와 형식으로 모두가 참여할 수 있습니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  variant="primary" 
                  size="large"
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl px-8 py-3"
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
                <Link to="/join">
                  <Button 
                    variant="secondary" 
                    size="large"
                    className="bg-gradient-to-r from-teal-500 to-teal-400 rounded-xl px-8 py-3"
                    style={commonButtonStyle}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 6px 0 rgba(0,0,0,0.8)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
                    }}
                  >
                    코드로 참여하기
                  </Button>
                </Link>
              </div>
            </div>
            <div className="lg:w-1/2 flex justify-center mb-8 lg:mb-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full blur-xl opacity-60 transform scale-110"></div>
                <img 
                  src="/assets/logo/logo-light.svg" 
                  alt="콰직 로고" 
                  className="h-40 sm:h-48 md:h-56 lg:h-64 drop-shadow-xl relative z-10" 
                />
              </div>
            </div>
          </div>
        </header>
        
        <main className="py-16">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#783ae8]">
            콰직으로 할 수 있는 것
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
              <h3 className="text-xl font-bold text-purple-800 mb-3">퀴즈 제작</h3>
              <p className="text-gray-600 mb-4">
                다양한 유형의 문제를 손쉽게 만들고 편집할 수 있습니다. 이미지, 텍스트, 객관식 등 다양한 형식을 지원합니다.
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
                <Users size={28} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-blue-800 mb-3">실시간 퀴즈 진행</h3>
              <p className="text-gray-600 mb-4">
                온라인으로 실시간 퀴즈를 진행하고 참가자들의 답변을 즉시 확인할 수 있습니다. 모든 기기에서 접속 가능합니다.
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
          
          <div className="mt-20 bg-gradient-to-br from-purple-50 to-indigo-50 p-10 rounded-3xl" style={{border: '1px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 3px 0 rgba(139, 92, 246, 0.15)'}}>
                          <h2 className="text-2xl font-bold text-center mb-10 text-[#783ae8]">
                콰직 시작하기
              </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* 단계 연결선 (데스크톱에서만 표시) */}
              <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-purple-200" style={{zIndex: 1, transform: 'translateY(-50%)'}}></div>
              
              {/* 단계 1: 계정 만들기 */}
              <div 
                className="bg-white p-6 rounded-xl relative z-10 transform transition-all duration-300 hover:-translate-y-2" 
                style={{
                  boxShadow: '0 3px 0 rgba(139, 92, 246, 0.3)',
                  border: '2px solid #D8B4FE',
                  borderRadius: '12px',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 0 rgba(139, 92, 246, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 3px 0 rgba(139, 92, 246, 0.3)';
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4" style={{border: '2px solid #D8B4FE', boxShadow: '0 2px 0 rgba(139, 92, 246, 0.2)'}}>
                    <span className="text-xl font-bold text-purple-700">1</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">계정 만들기</h3>
                  <p className="text-gray-600 text-center">무료로 가입하고 서비스를 이용하세요</p>
                </div>
                <div className="absolute bottom-0 right-0 w-full h-1 bg-purple-200 rounded-b-xl"></div>
              </div>
              
              {/* 단계 2: 퀴즈 만들기 */}
              <div 
                className="bg-white p-6 rounded-xl relative z-10 transform transition-all duration-300 hover:-translate-y-2" 
                style={{
                  boxShadow: '0 3px 0 rgba(139, 92, 246, 0.3)',
                  border: '2px solid #C084FC',
                  borderRadius: '12px',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 0 rgba(139, 92, 246, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 3px 0 rgba(139, 92, 246, 0.3)';
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4" style={{border: '2px solid #C084FC', boxShadow: '0 2px 0 rgba(139, 92, 246, 0.2)'}}>
                    <span className="text-xl font-bold text-purple-700">2</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">퀴즈 만들기</h3>
                  <p className="text-gray-600 text-center">내용을 추가하고 설정을 조정하세요</p>
                </div>
                <div className="absolute bottom-0 right-0 w-full h-1 bg-purple-400 rounded-b-xl"></div>
              </div>
              
              {/* 단계 3: 퀴즈 진행하기 */}
              <div 
                className="bg-white p-6 rounded-xl relative z-10 transform transition-all duration-300 hover:-translate-y-2" 
                style={{
                  boxShadow: '0 3px 0 rgba(139, 92, 246, 0.3)',
                  border: '2px solid #A855F7',
                  borderRadius: '12px',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 0 rgba(139, 92, 246, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = '0 3px 0 rgba(139, 92, 246, 0.3)';
                }}
              >
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mb-4" style={{border: '2px solid #A855F7', boxShadow: '0 2px 0 rgba(139, 92, 246, 0.2)'}}>
                    <span className="text-xl font-bold text-purple-700">3</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">퀴즈 진행하기</h3>
                  <p className="text-gray-600 text-center">참가자들에게 코드를 공유하고 시작하세요</p>
                </div>
                <div className="absolute bottom-0 right-0 w-full h-1 bg-purple-600 rounded-b-xl"></div>
              </div>
            </div>
            <div className="mt-12 flex justify-center">
              <Button 
                variant="primary" 
                size="large"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl px-10 py-3 flex items-center gap-2"
                style={commonButtonStyle}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 5px 0 rgba(0,0,0,0.8)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
                }}
                onClick={handleStartQuizCreation}
              >
                지금 시작하기
                <ArrowRight size={20} />
              </Button>
            </div>
          </div>
        </main>
        
        <footer className="py-12 text-center text-gray-600 border-t border-gray-200 mt-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img 
                src="/assets/logo/logo-light.svg" 
                alt="콰직 로고" 
                className="h-8" 
              />
              <span className="text-xl text-[#783ae8]" style={{ fontFamily: 'SBAggroB' }}>콰직</span>
            </div>
                          <p>© 2025 <span className="text-[#783ae8]">콰직</span> - 인터랙티브 퀴즈 플랫폼</p>
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