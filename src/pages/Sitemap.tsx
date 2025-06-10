import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Settings, Home, FileText, HelpCircle, Shield, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

const ProfileSkeleton = () => (
  <div className="bg-purple-100 animate-pulse text-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 w-28 h-8"></div>
);

const Sitemap: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  const sitemapData = [
    {
      title: "메인 페이지",
      links: [
        { name: "홈", path: "/", icon: Home, description: "콰직 메인 페이지" }
      ]
    },
    {
      title: "서비스",
      links: [
        { name: "퀴즈 참여", path: "/join", icon: BookOpen, description: "퀴즈 코드로 참여하기" },
        { name: "로그인", path: "/login", icon: User, description: "로그인 및 회원가입" },
        { name: "회원가입", path: "/register", icon: User, description: "새 계정 만들기" }
      ]
    },
    {
      title: "사용자 페이지",
      links: [
        { name: "프로필", path: "/profile", icon: User, description: "사용자 프로필 관리" },
        { name: "내 퀴즈", path: "/host/my-quizzes", icon: BookOpen, description: "내가 만든 퀴즈 관리" },
        { name: "활동 기록", path: "/host/history", icon: FileText, description: "퀴즈 진행 이력" }
      ]
    },
    {
      title: "정보 페이지",
      links: [
        { name: "블로그", path: "/blog", icon: BookOpen, description: "교육 팁과 인사이트" },
        { name: "도움말", path: "/help", icon: HelpCircle, description: "사용법 및 FAQ" },
        { name: "이용약관", path: "/terms", icon: FileText, description: "서비스 이용약관" },
        { name: "개인정보처리방침", path: "/privacy", icon: Shield, description: "개인정보 보호정책" },
        { name: "사이트맵", path: "/sitemap", icon: FileText, description: "전체 사이트 구조" }
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F8F7FF] via-[#F3F1FF] to-[#F0EEFF]">
      <div className="px-4 sm:px-6 lg:px-8 w-full max-w-4xl mx-auto">
        <header className="pt-4 pb-8">
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
                >
                  로그인
                </Button>
              </Link>
            )}
          </div>

          {/* 뒤로가기 버튼과 제목 */}
          <div className="flex items-center gap-4 mb-8">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">홈으로</span>
            </Link>
          </div>

          <h1 className="text-4xl font-bold text-[#783ae8] mb-4" style={{ fontFamily: 'SBAggroB' }}>
            사이트맵
          </h1>
          <p className="text-gray-600 text-lg">
            콰직의 모든 페이지와 기능을 한눈에 확인하세요.
          </p>
        </header>

        <main className="pb-12">
          <div className="grid gap-8">
            {sitemapData.map((section, sectionIndex) => (
              <div 
                key={sectionIndex}
                className="bg-white p-6 rounded-2xl border-2 border-purple-200 shadow-lg"
              >
                <h2 className="text-2xl font-bold text-purple-800 mb-6 flex items-center gap-3">
                  {section.title}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.links.map((link, linkIndex) => {
                    const IconComponent = link.icon;
                    return (
                      <Link
                        key={linkIndex}
                        to={link.path}
                        className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                          <IconComponent size={20} className="text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800 group-hover:text-purple-800 transition-colors">
                            {link.name}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {link.description}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 추가 정보 */}
          <div 
            className="bg-white p-8 mt-8 rounded-2xl border-2 border-purple-200 shadow-lg"
          >
            <h2 className="text-2xl font-bold text-purple-800 mb-4">사이트 정보</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">서비스 소개</h3>
                <p className="leading-relaxed">
                  콰직은 교육자와 학습자를 위한 온라인 퀴즈 플랫폼입니다. 
                  쉽고 빠르게 퀴즈를 제작하고 실시간으로 진행할 수 있습니다.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">주요 기능</h3>
                <ul className="space-y-1 leading-relaxed">
                  <li>• 직관적인 퀴즈 제작 도구</li>
                  <li>• 실시간 퀴즈 진행</li>
                  <li>• 상세한 결과 분석</li>
                  <li>• 등급 시스템 및 순위</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center">
                문의사항이 있으시면 <strong>support@quizshow.com</strong>으로 연락주세요.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Sitemap; 