import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Settings, Calendar, Clock, ArrowRight, Tag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

const ProfileSkeleton = () => (
  <div className="bg-purple-100 animate-pulse text-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 w-28 h-8"></div>
);

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  readTime: number;
  category: string;
  tags: string[];
  featured: boolean;
}

const Blog: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  // 샘플 블로그 포스트 데이터
  const blogPosts: BlogPost[] = [
    {
      id: "effective-quiz-creation",
      title: "효과적인 퀴즈 제작을 위한 5가지 핵심 원칙",
      excerpt: "학습자의 참여도를 높이고 교육 효과를 극대화하는 퀴즈 제작 방법을 알아보세요. 문제 유형 선택부터 결과 분석까지, 성공적인 퀴즈를 만드는 실용적인 가이드입니다.",
      content: "",
      author: "콰직 교육팀",
      date: "2024-01-15",
      readTime: 5,
      category: "교육 팁",
      tags: ["퀴즈 제작", "교육", "학습"],
      featured: true
    },
    {
      id: "interactive-learning-benefits",
      title: "상호작용 학습의 놀라운 효과: 퀴즈가 학습에 미치는 영향",
      excerpt: "연구 결과에 따르면 상호작용 학습은 기존 강의식 교육보다 65% 더 높은 학습 효과를 보여줍니다. 퀴즈를 통한 상호작용 학습의 과학적 근거와 실제 적용 사례를 살펴보세요.",
      content: "",
      author: "콰직 연구팀",
      date: "2024-01-12",
      readTime: 7,
      category: "교육 연구",
      tags: ["상호작용", "학습 효과", "연구"],
      featured: true
    },
    {
      id: "classroom-quiz-strategies",
      title: "교실에서 퀴즈 활용하기: 선생님을 위한 실전 가이드",
      excerpt: "수업 시간에 퀴즈를 효과적으로 활용하는 방법을 소개합니다. 아이스브레이킹부터 복습까지, 다양한 상황에서 퀴즈를 활용하는 구체적인 전략과 팁을 제공합니다.",
      content: "",
      author: "김교육",
      date: "2024-01-10",
      readTime: 6,
      category: "교육 실무",
      tags: ["교실", "수업", "선생님"],
      featured: false
    },
    {
      id: "online-quiz-trends",
      title: "2024년 온라인 퀴즈 트렌드: 무엇이 달라졌을까?",
      excerpt: "코로나19 이후 급성장한 온라인 교육 시장에서 퀴즈의 역할과 최신 트렌드를 분석합니다. AI, 게임화, 개인화 학습 등 주목할 만한 변화들을 살펴보세요.",
      content: "",
      author: "콰직 트렌드팀",
      date: "2024-01-08",
      readTime: 8,
      category: "트렌드",
      tags: ["온라인 교육", "트렌드", "2024"],
      featured: false
    },
    {
      id: "quiz-accessibility",
      title: "모든 학습자를 위한 접근성 있는 퀴즈 만들기",
      excerpt: "장애가 있는 학습자도 쉽게 참여할 수 있는 퀴즈를 만드는 방법을 알아보세요. 웹 접근성 가이드라인을 준수하여 더 포용적인 학습 환경을 조성하는 실용적인 팁을 제공합니다.",
      content: "",
      author: "콰직 접근성팀",
      date: "2024-01-05",
      readTime: 6,
      category: "접근성",
      tags: ["접근성", "포용성", "웹 표준"],
      featured: false
    },
    {
      id: "gamification-quiz",
      title: "게임화로 퀴즈 재미 100배 늘리기",
      excerpt: "지루한 퀴즈는 그만! 게임 요소를 활용해 학습자들이 몰입할 수 있는 재미있는 퀴즈를 만드는 방법을 소개합니다. 포인트 시스템, 리더보드, 뱃지 등 다양한 게임화 전략을 활용해보세요.",
      content: "",
      author: "콰직 게임팀",
      date: "2024-01-03",
      readTime: 5,
      category: "게임화",
      tags: ["게임화", "재미", "참여도"],
      featured: false
    }
  ];

  const featuredPosts = blogPosts.filter(post => post.featured);
  const regularPosts = blogPosts.filter(post => !post.featured);
  const categories = [...new Set(blogPosts.map(post => post.category))];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F8F7FF] via-[#F3F1FF] to-[#F0EEFF]">
      <div className="px-4 sm:px-6 lg:px-8 w-full max-w-6xl mx-auto">
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

          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-[#783ae8] mb-4" style={{ fontFamily: 'SBAggroB' }}>
              콰직 블로그
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              교육과 퀴즈에 관한 최신 트렌드, 실용적인 팁, 그리고 흥미로운 인사이트를 공유합니다.
            </p>
          </div>
        </header>

        <main className="pb-12">
          {/* 카테고리 필터 */}
          <div className="flex flex-wrap gap-3 justify-center mb-12">
            <span className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium">
              전체
            </span>
            {categories.map((category) => (
              <span 
                key={category}
                className="px-4 py-2 bg-white text-purple-600 border border-purple-200 hover:bg-purple-50 rounded-full text-sm font-medium transition-colors cursor-pointer"
              >
                {category}
              </span>
            ))}
          </div>

          {/* 추천 포스트 */}
          {featuredPosts.length > 0 && (
            <section className="mb-16">
              <h2 className="text-3xl font-bold text-[#783ae8] mb-8 text-center" style={{ fontFamily: 'SBAggroB' }}>
                추천 포스트
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {featuredPosts.map((post) => (
                  <article 
                    key={post.id}
                    className="bg-white rounded-2xl border-2 border-purple-200 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="p-8">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          {post.category}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500 text-sm">
                          <Calendar size={14} />
                          {post.date}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500 text-sm">
                          <Clock size={14} />
                          {post.readTime}분
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-purple-800 mb-4 leading-tight">
                        {post.title}
                      </h3>
                      
                      <p className="text-gray-700 leading-relaxed mb-6">
                        {post.excerpt}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <User size={16} className="text-purple-600" />
                          </div>
                          <span className="text-sm text-gray-600">{post.author}</span>
                        </div>
                        
                        <Link 
                          to={`/blog/${post.id}`}
                          className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium transition-colors"
                        >
                          더 보기
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* 일반 포스트 */}
          <section>
            <h2 className="text-3xl font-bold text-[#783ae8] mb-8 text-center" style={{ fontFamily: 'SBAggroB' }}>
              최신 포스트
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPosts.map((post) => (
                <article 
                  key={post.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {post.category}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {post.date}
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-800 mb-3 leading-tight">
                      {post.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                      {post.excerpt}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{post.author}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">{post.readTime}분</span>
                      </div>
                      
                      <Link 
                        to={`/blog/${post.id}`}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium transition-colors"
                      >
                        읽기
                      </Link>
                    </div>
                    
                    <div className="flex gap-2 mt-4 flex-wrap">
                      {post.tags.slice(0, 2).map((tag) => (
                        <span 
                          key={tag}
                          className="flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-600 rounded text-xs"
                        >
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* 뉴스레터 구독 섹션 */}
          <section className="mt-16">
            <div 
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8 rounded-2xl text-center"
              style={{
                boxShadow: '0 3px 0 rgba(120, 58, 232, 0.3)',
                border: '2px solid #8B5CF6',
              }}
            >
              <h3 className="text-2xl font-bold mb-4">콰직 뉴스레터 구독하기</h3>
              <p className="text-purple-100 mb-6 max-w-md mx-auto">
                교육과 퀴즈에 관한 최신 팁과 트렌드를 이메일로 받아보세요.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input 
                  type="email" 
                  placeholder="이메일 주소를 입력하세요"
                  className="flex-1 px-4 py-3 rounded-lg text-gray-800 border-none outline-none"
                />
                <Button 
                  variant="secondary"
                  className="px-6 py-3 bg-white text-purple-600 hover:bg-gray-100 font-medium rounded-lg transition-colors"
                >
                  구독하기
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Blog; 