import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wand, Users, Sparkles, Star, GraduationCap, BookOpen, Lightbulb, Rocket, User, Settings } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useQuiz } from '../contexts/QuizContext';

const ProfileSkeleton = () => (
  <div className="bg-purple-200 animate-pulse text-white px-4 py-2 rounded-full shadow flex items-center gap-2 w-32 h-10"></div>
);

const ButtonSkeleton = () => (
  <div className="w-full h-12 bg-purple-200 animate-pulse rounded-xl shadow-lg"></div>
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50">
      <header className="py-8 px-4 text-center relative overflow-hidden">
        {/* 배경 효과를 z-index를 낮게 설정 */}
        <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
          <div className="absolute -top-6 -left-12 w-24 h-24 bg-yellow-200 rounded-full opacity-30"></div>
          <div className="absolute top-10 right-16 w-12 h-12 bg-pink-300 rounded-full opacity-20"></div>
          <div className="absolute -right-8 bottom-0 w-28 h-28 bg-purple-200 rounded-full opacity-30"></div>
          <div className="absolute left-1/4 bottom-4 w-16 h-16 bg-blue-200 rounded-full opacity-20"></div>
        </div>
        
        {/* 프로필 섹션 - 헤더 상단에 별도로 배치하고 z-index를 높게 설정 */}
        <div className="w-full flex justify-end mb-4 relative" style={{ zIndex: 10 }}>
          {isLoading ? (
            <ProfileSkeleton />
          ) : currentUser ? (
            <Link 
              to="/profile" 
              className="bg-purple-600 text-white px-4 py-2 rounded-full shadow hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <User size={18} className="text-white" />
              <span>{currentUser.isAnonymous ? '익명 사용자' : (currentUser.displayName || currentUser.email || '사용자')}</span>
              <Settings size={16} />
            </Link>
          ) : (
            <Link to="/login">
              <Button variant="secondary" size="small">
                로그인
              </Button>
            </Link>
          )}
        </div>
        
        {/* 제목 섹션 - z-index를 설정하여 배경 위에 표시 */}
        <div className="relative flex flex-col sm:flex-row items-center justify-center" style={{ zIndex: 5 }}>
          <div className="w-full mb-6 sm:mb-0">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center gap-3">
              <Sparkles size={28} className="text-yellow-400" />
              퀴즈 위자드
              <Star size={28} className="text-yellow-400" />
            </h1>
            <p className="text-lg sm:text-xl text-purple-800 font-medium mt-2">인터랙티브 퀴즈로 즐겁게 배우는 마법 같은 경험!</p>
          </div>
        </div>
      </header>
      
      <main className="flex-1 px-6 py-10 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
          {/* 메인 카드 - 퀴즈 만들기 */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg p-8 border-4 border-purple-200 transform transition-all hover:scale-102 hover:shadow-xl relative overflow-hidden h-full flex flex-col">
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-purple-300 to-purple-100 rounded-full opacity-30"></div>
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-tr from-indigo-200 to-transparent rounded-full opacity-30"></div>
            
            <div className="relative flex-1 flex flex-col">
              <div className="flex items-center mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center transform -rotate-6 shadow-lg">
                  <Wand size={40} className="text-white" />
                </div>
                <div className="ml-6">
                  <div className="text-sm text-purple-500 font-semibold">함께 배워요</div>
                  <h2 className="text-3xl font-extrabold text-purple-800">퀴즈 만들기</h2>
                </div>
              </div>
              
              <div className="rounded-2xl bg-purple-50 p-6 mb-8">
                <h3 className="text-lg font-bold text-purple-800 mb-2 flex items-center">
                  <Lightbulb size={20} className="mr-2 text-yellow-500" /> 퀴즈로 재미있게 가르치세요!
                </h3>
                <p className="text-purple-700">
                  수업, 친구들, 가족 모임을 위한 재미있는 퀴즈를 만들어보세요! 
                  간단한 질문부터 복잡한 문제까지, 모든 연령과 주제에 맞는 퀴즈를 만들 수 있어요.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-3 mb-6">
                <div className="flex items-center bg-indigo-100 rounded-full py-1 px-3">
                  <GraduationCap size={16} className="text-indigo-600 mr-1" /> 
                  <span className="text-sm text-indigo-700">학습 게임</span>
                </div>
                <div className="flex items-center bg-pink-100 rounded-full py-1 px-3">
                  <BookOpen size={16} className="text-pink-600 mr-1" /> 
                  <span className="text-sm text-pink-700">교육용</span>
                </div>
                <div className="flex items-center bg-amber-100 rounded-full py-1 px-3">
                  <Rocket size={16} className="text-amber-600 mr-1" /> 
                  <span className="text-sm text-amber-700">창의력 키우기</span>
                </div>
              </div>
              
              <div className="mt-auto">
                {isLoading ? (
                  <ButtonSkeleton />
                ) : (
                  <Button 
                    variant="primary" 
                    size="large"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg hover:shadow-purple-300/50 transition-all"
                    onClick={handleStartQuizCreation}
                  >
                    <Sparkles size={20} className="mr-2" /> 퀴즈 만들기 시작하기
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          {/* 서브 카드 - 퀴즈 참여 */}
          <div className="bg-white rounded-3xl shadow-md p-6 border-2 border-teal-100 relative overflow-hidden h-full flex flex-col">
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-teal-100 rounded-full opacity-50"></div>
            
            <div className="relative flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-teal-400 to-cyan-300 flex items-center justify-center shadow">
                    <Users size={32} className="text-white" />
                  </div>
                </div>
                
                <h2 className="text-xl font-bold text-center text-teal-700 mb-3">퀴즈 참여하기</h2>
                <p className="text-gray-600 mb-5 text-center text-sm">
                  초대 코드가 있으신가요? 퀴즈에 참여하고 실력을 뽐내보세요!
                </p>
              </div>
              
              <div className="mt-auto">
                <Link to="/join" target="_blank" rel="noopener noreferrer">
                  <Button 
                    variant="secondary" 
                    fullWidth 
                    size="large"
                    className="bg-gradient-to-r from-teal-400 to-cyan-400 text-sm"
                  >
                    코드 입력하기
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="py-4 px-6 bg-purple-100/50 text-center text-purple-700 border-t border-purple-200">
        <p className="flex items-center justify-center gap-2">
          <Sparkles size={16} className="text-purple-500" /> 
          © 2025 퀴즈 위자드 - 재미있는 학습!
          <Star size={16} className="text-purple-500" />
        </p>
      </footer>
    </div>
  );
};

export default MainPage;