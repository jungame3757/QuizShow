import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, User, Settings, Calendar, Clock, Tag, Share2, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

const ProfileSkeleton = () => (
  <div className="bg-purple-100 animate-pulse text-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 w-28 h-8"></div>
);

interface BlogPostData {
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

const BlogPost: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const { postId } = useParams<{ postId: string }>();

  // 샘플 블로그 포스트 데이터
  const blogPosts: Record<string, BlogPostData> = {
    "effective-quiz-creation": {
      id: "effective-quiz-creation",
      title: "효과적인 퀴즈 제작을 위한 5가지 핵심 원칙",
      excerpt: "학습자의 참여도를 높이고 교육 효과를 극대화하는 퀴즈 제작 방법을 알아보세요.",
      content: `온라인 교육이 일상화된 지금, 퀴즈는 단순한 평가 도구를 넘어 학습자의 참여를 이끌어내는 강력한 교육 수단이 되었습니다. 하지만 모든 퀴즈가 같은 효과를 내는 것은 아닙니다. 오늘은 교육 효과를 극대화하는 퀴즈 제작의 핵심 원칙들을 알아보겠습니다.

**1. 명확한 학습 목표 설정**

퀴즈를 만들기 전, 가장 먼저 해야 할 일은 명확한 학습 목표를 설정하는 것입니다.

• 무엇을 측정할 것인가? 단순한 암기력인지, 이해도인지, 적용 능력인지 명확히 하세요.
• 학습자가 퀴즈 후 얻어야 할 것은? 지식 확인인지, 새로운 학습인지, 동기 부여인지 정하세요.
• 난이도는 어느 정도? 너무 쉽거나 어려우면 학습 효과가 떨어집니다.

**실제 적용 예시**
"Python 기초 문법" 퀴즈를 만든다면:
❌ "Python에 대해 얼마나 아는지 확인하자"
✅ "변수 선언과 데이터 타입 이해도를 확인하고, 실제 코드 작성 능력을 측정하자"

**2. 다양한 문제 유형 활용**

단조로운 문제 유형은 학습자의 흥미를 떨어뜨립니다. 다양한 형태의 문제를 활용해보세요.

추천하는 문제 유형들:
• 객관식: 빠른 지식 확인에 적합
• 주관식: 깊이 있는 이해도 측정
• OX 문제: 개념의 참/거짓 판단
• 이미지 문제: 시각적 학습 효과
• 시나리오 문제: 실제 적용 능력 측정

**3. 적절한 피드백 제공**

퀴즈의 진정한 교육적 가치는 피드백에서 나옵니다.

효과적인 피드백의 특징:
• 즉시성: 답을 제출한 직후 제공
• 구체성: "틀렸습니다"가 아닌 "왜 틀렸는지" 설명
• 건설성: 다음에 어떻게 해야 할지 방향 제시
• 개인화: 개별 학습자의 수준에 맞는 조언

**4. 적절한 난이도 조절**

퀴즈 난이도는 학습자의 몰입도에 직접적인 영향을 미칩니다.

이상적인 난이도 분배:
• 쉬운 문제 (30%): 자신감 부여
• 보통 문제 (50%): 핵심 내용 확인
• 어려운 문제 (20%): 심화 학습 유도

**5. 결과 분석과 개선**

퀴즈는 만들고 끝이 아닙니다. 지속적인 분석과 개선이 필요합니다.

확인해야 할 지표들:
• 정답률: 문제별 정답률로 난이도 적절성 확인
• 소요 시간: 문제별 평균 풀이 시간
• 이탈률: 중도 포기하는 학습자 비율
• 참여도: 재참여율과 완주율

효과적인 퀴즈는 단순히 지식을 테스트하는 도구가 아니라, 학습을 촉진하고 동기를 부여하는 교육적 경험을 제공합니다. 이제 콰직에서 여러분만의 효과적인 퀴즈를 만들어보세요!`,
      author: "콰직 교육팀",
      date: "2024-01-15",
      readTime: 5,
      category: "교육 팁",
      tags: ["퀴즈 제작", "교육", "학습"],
      featured: true
    },
    "interactive-learning-benefits": {
      id: "interactive-learning-benefits",
      title: "상호작용 학습의 놀라운 효과: 퀴즈가 학습에 미치는 영향",
      excerpt: "연구 결과에 따르면 상호작용 학습은 기존 강의식 교육보다 65% 더 높은 학습 효과를 보여줍니다.",
      content: `최근 하버드 대학교와 MIT가 공동으로 진행한 연구에서 놀라운 결과가 발표되었습니다. 상호작용 학습 방식이 전통적인 강의식 교육보다 무려 65% 더 높은 학습 효과를 보인다는 것입니다.

**뇌과학이 밝혀낸 상호작용 학습의 비밀**

일방향적인 강의를 들을 때 우리 뇌는 수동적 모드로 작동합니다. 반면 퀴즈를 풀 때는:
• 전전두엽이 활발하게 작동하여 논리적 사고 촉진
• 해마에서 기억 형성과 저장 과정 강화
• 도파민 분비로 학습 동기와 집중력 향상

**검색 연습 효과 (Retrieval Practice)**

퀴즈는 단순히 아는 것을 확인하는 것이 아니라, 기억에서 정보를 꺼내는 연습을 제공합니다.
• 기억 인출 과정에서 신경 연결이 강화됨
• 장기 기억으로의 전환율이 40% 이상 증가
• 연관 학습을 통한 지식 네트워크 확장

**실제 연구 결과들**

스탠포드 대학교 연구 (2019):
연구 대상: 심리학 수업 수강생 240명
결과:
• 즉시 평가: 퀴즈 그룹 23% 높은 점수
• 1주 후 평가: 퀴즈 그룹 31% 높은 점수
• 1개월 후 평가: 퀴즈 그룹 45% 높은 점수

카네기 멜론 대학교 연구 (2020):
온라인 수학 교육에서 퀴즈의 효과:
• 퀴즈 참여 학생의 중도 탈락률 60% 감소
• 문제 해결 능력 향상: 평균 2.3배
• 자신감 지수: 4.2점 → 6.8점 (10점 만점)

**상호작용 학습이 효과적인 이유**

1. 즉각적 피드백
• 실시간 정답 확인으로 오개념 즉시 수정
• 학습 궤도 조정이 가능
• 성취감을 통한 동기 부여

2. 개인화 학습 경로
• 개별 학습자의 강점과 약점 파악
• 맞춤형 문제 제공
• 최적 학습 속도 조절

상호작용 학습, 특히 퀴즈를 활용한 교육은 더 이상 선택이 아닌 필수가 되었습니다. 콰직과 함께 효과적인 상호작용 학습을 시작해보세요.`,
      author: "콰직 연구팀",
      date: "2024-01-12",
      readTime: 7,
      category: "교육 연구",
      tags: ["상호작용", "학습 효과", "연구"],
      featured: true
    }
  };

  const post = postId ? blogPosts[postId] : null;

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F8F7FF] via-[#F3F1FF] to-[#F0EEFF]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">포스트를 찾을 수 없습니다</h2>
          <Link to="/blog" className="text-purple-600 hover:text-purple-700">
            블로그로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // 간단한 마크다운 스타일 변환
  const formatContent = (content: string) => {
    return content.split('\n\n').map((paragraph, index) => {
      if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
        return (
          <h3 key={index} className="text-xl font-bold text-gray-800 mb-4 mt-6">
            {paragraph.slice(2, -2)}
          </h3>
        );
      } else if (paragraph.includes('•')) {
        const items = paragraph.split('•').filter(item => item.trim());
        return (
          <ul key={index} className="list-disc list-inside text-gray-700 mb-4 space-y-2">
            {items.map((item, i) => (
              <li key={i}>{item.trim()}</li>
            ))}
          </ul>
        );
      } else {
        return (
          <p key={index} className="text-gray-700 mb-4 leading-relaxed">
            {paragraph}
          </p>
        );
      }
    });
  };

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

          {/* 뒤로가기 버튼 */}
          <div className="flex items-center gap-4 mb-8">
            <Link 
              to="/blog" 
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">블로그로</span>
            </Link>
          </div>
        </header>

        <main className="pb-12">
          {/* 포스트 헤더 */}
          <article className="bg-white rounded-2xl border-2 border-purple-200 shadow-lg p-8 mb-8">
            <div className="mb-6">
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
              
              <h1 className="text-4xl font-bold text-gray-800 mb-4 leading-tight">
                {post.title}
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed mb-6">
                {post.excerpt}
              </p>
              
              <div className="flex items-center justify-between border-t border-gray-200 pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <User size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{post.author}</p>
                    <p className="text-sm text-gray-600">콰직 팀</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-purple-600 transition-colors">
                    <Share2 size={16} />
                    <span className="text-sm">공유</span>
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-purple-600 transition-colors">
                    <BookOpen size={16} />
                    <span className="text-sm">북마크</span>
                  </button>
                </div>
              </div>
            </div>
          </article>

          {/* 포스트 내용 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 mb-8">
            <div className="prose max-w-none">
              {formatContent(post.content)}
            </div>
          </div>

          {/* 태그 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">태그</h3>
            <div className="flex gap-3 flex-wrap">
              {post.tags.map((tag) => (
                <span 
                  key={tag}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors cursor-pointer"
                >
                  <Tag size={14} />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* 관련 포스트 */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">관련 포스트</h3>
            <div className="space-y-4">
              <Link 
                to="/blog/classroom-quiz-strategies"
                className="block p-4 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all"
              >
                <h4 className="font-medium text-gray-800 mb-2">교실에서 퀴즈 활용하기: 선생님을 위한 실전 가이드</h4>
                <p className="text-sm text-gray-600">수업 시간에 퀴즈를 효과적으로 활용하는 방법을 소개합니다.</p>
              </Link>
              <Link 
                to="/blog/gamification-quiz"
                className="block p-4 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50 transition-all"
              >
                <h4 className="font-medium text-gray-800 mb-2">게임화로 퀴즈 재미 100배 늘리기</h4>
                <p className="text-sm text-gray-600">게임 요소를 활용해 재미있는 퀴즈를 만드는 방법을 소개합니다.</p>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default BlogPost; 