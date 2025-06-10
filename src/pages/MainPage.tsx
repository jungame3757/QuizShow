import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wand, Lightbulb, User, Settings, Medal, Apple, Users, Shield, Zap, BarChart3, Clock, CheckCircle } from 'lucide-react';
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
      {/* SEO Meta Information */}
      <div style={{ display: 'none' }}>
        <h1>콰직 - 온라인 퀴즈 플랫폼 | 무료 퀴즈 제작 및 진행 서비스</h1>
        <meta name="description" content="콰직은 교육자와 학습자를 위한 무료 온라인 퀴즈 플랫폼입니다. 쉽고 빠르게 퀴즈를 제작하고 실시간으로 진행하세요. 결과 분석과 등급 시스템으로 학습 동기를 높여보세요." />
        <meta name="keywords" content="온라인 퀴즈, 퀴즈 제작, 교육, 학습, 실시간 퀴즈, 무료 퀴즈 플랫폼, 콰직" />
      </div>

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
          
          <div className="grid grid-cols-1 mb-16 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          {/* About Us 섹션 추가 */}
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-[#783ae8] mb-4" style={{ fontFamily: 'SBAggroB' }}>
                콰직이 특별한 이유
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                콰직은 교육의 디지털 전환을 선도하는 혁신적인 온라인 퀴즈 플랫폼입니다. 
                우리는 학습이 더 재미있고 효과적이 되도록 돕습니다.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
                  <Users size={32} className="text-purple-600" />
                </div>
                <h3 className="text-xl font-bold text-purple-800 mb-2">10,000+</h3>
                <p className="text-gray-600">활성 사용자</p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 size={32} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-blue-800 mb-2">50,000+</h3>
                <p className="text-gray-600">제작된 퀴즈</p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                  <Clock size={32} className="text-teal-600" />
                </div>
                <h3 className="text-xl font-bold text-teal-800 mb-2">24/7</h3>
                <p className="text-gray-600">서비스 운영</p>
              </div>

              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Shield size={32} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-green-800 mb-2">100%</h3>
                <p className="text-gray-600">데이터 보안</p>
              </div>
            </div>
          </section>

          {/* 추가 기능 섹션 */}
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[#783ae8] mb-4" style={{ fontFamily: 'SBAggroB' }}>
                더 많은 기능들
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-2xl border-2 border-purple-200 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Zap size={24} className="text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-purple-800">실시간 상호작용</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  참가자들과 실시간으로 소통하며 즉각적인 피드백을 받을 수 있습니다. 
                  라이브 채팅과 반응 기능으로 더욱 생동감 있는 퀴즈 경험을 제공합니다.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl border-2 border-blue-200 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <BarChart3 size={24} className="text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-blue-800">상세한 분석</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  개인별, 문항별 상세한 분석 데이터를 제공합니다. 
                  학습 패턴을 파악하고 개선점을 찾아 더 효과적인 학습을 도와드립니다.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl border-2 border-teal-200 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
                    <CheckCircle size={24} className="text-teal-600" />
                  </div>
                  <h3 className="text-xl font-bold text-teal-800">다양한 문제 유형</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  객관식, 주관식, OX 문제 등 다양한 형태의 문제를 지원합니다. 
                  이미지와 텍스트를 함께 활용하여 더욱 풍부한 퀴즈를 만들어보세요.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl border-2 border-green-200 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                    <Users size={24} className="text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-green-800">팀 협업</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  동료들과 함께 퀴즈를 제작하고 관리할 수 있습니다. 
                  역할 분담과 권한 관리를 통해 효율적인 팀워크를 경험해보세요.
                </p>
              </div>
            </div>
          </section>

          {/* 사용 사례 섹션 */}
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[#783ae8] mb-4" style={{ fontFamily: 'SBAggroB' }}>
                이런 분들께 추천합니다
              </h2>
            </div>

            <div className="bg-white p-8 rounded-2xl border-2 border-purple-200 shadow-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-purple-800 mb-3">교육자</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    선생님, 교수님, 강사님들이 학생들의 학습 이해도를 확인하고 
                    재미있는 수업을 만들 때 활용하세요.
                  </p>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-purple-800 mb-3">기업 교육 담당자</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    직원 교육, 워크샵, 세미나에서 참여도를 높이고 
                    교육 효과를 측정할 때 사용하세요.
                  </p>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-purple-800 mb-3">이벤트 기획자</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    행사나 모임에서 아이스브레이킹이나 
                    재미있는 게임 활동을 기획할 때 이용하세요.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 블로그 섹션 */}
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[#783ae8] mb-4" style={{ fontFamily: 'SBAggroB' }}>
                콰직 블로그
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                교육과 퀴즈에 관한 최신 트렌드, 실용적인 팁, 그리고 흥미로운 인사이트를 확인해보세요.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Link to="/blog/effective-quiz-creation" className="group">
                <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      교육 팁
                    </span>
                    <span className="text-gray-400 text-sm">2024-01-15</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 group-hover:text-purple-700 transition-colors">
                    효과적인 퀴즈 제작을 위한 5가지 핵심 원칙
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    학습자의 참여도를 높이고 교육 효과를 극대화하는 퀴즈 제작 방법을 알아보세요.
                  </p>
                </div>
              </Link>

              <Link to="/blog/interactive-learning-benefits" className="group">
                <div className="bg-white p-6 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      교육 연구
                    </span>
                    <span className="text-gray-400 text-sm">2024-01-12</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-3 group-hover:text-purple-700 transition-colors">
                    상호작용 학습의 놀라운 효과: 퀴즈가 학습에 미치는 영향
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    연구 결과에 따르면 상호작용 학습은 기존 강의식 교육보다 65% 더 높은 학습 효과를 보여줍니다.
                  </p>
                </div>
              </Link>
            </div>

            <div className="text-center">
              <Link to="/blog">
                <Button 
                  variant="secondary"
                  className="px-6 py-3 border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                >
                  더 많은 포스트 보기
                </Button>
              </Link>
            </div>
          </section>
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
            <div className="text-sm text-gray-500 mb-4">
              <p>콰직 | 온라인 퀴즈 플랫폼 | support@quizshow.com</p>
              <p className="mt-1">© 2024 콰직. All rights reserved.</p>
            </div>
            <div className="flex justify-center gap-6 text-sm mt-2">
              <Link to="/blog" className="text-gray-500 hover:text-purple-600 transition-colors">블로그</Link>
              <Link to="/terms" className="text-gray-500 hover:text-purple-600 transition-colors">이용약관</Link>
              <Link to="/privacy" className="text-gray-500 hover:text-purple-600 transition-colors">개인정보처리방침</Link>
              <Link to="/help" className="text-gray-500 hover:text-purple-600 transition-colors">도움말</Link>
              <Link to="/sitemap" className="text-gray-500 hover:text-purple-600 transition-colors">사이트맵</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MainPage;