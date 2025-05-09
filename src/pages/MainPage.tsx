import React from 'react';
import { Link } from 'react-router-dom';
import { Wand, Users, Sparkles, Star, GraduationCap, BookOpen, Lightbulb, Rocket, User, Settings } from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';

const MainPage: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-indigo-50 via-purple-50 to-pink-50">
      <header className="py-8 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-6 -left-12 w-24 h-24 bg-yellow-200 rounded-full opacity-30"></div>
          <div className="absolute top-10 right-16 w-12 h-12 bg-pink-300 rounded-full opacity-20"></div>
          <div className="absolute -right-8 bottom-0 w-28 h-28 bg-purple-200 rounded-full opacity-30"></div>
          <div className="absolute left-1/4 bottom-4 w-16 h-16 bg-blue-200 rounded-full opacity-20"></div>
        </div>
        
        <div className="relative flex flex-col sm:flex-row items-center justify-center">
          {/* 제목 섹션 */}
          <div className="w-full mb-6 sm:mb-0">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500 flex items-center justify-center gap-3">
              <Sparkles size={28} className="text-yellow-400" />
              퀴즈 위자드
              <Star size={28} className="text-yellow-400" />
            </h1>
            <p className="text-lg sm:text-xl text-purple-800 font-medium mt-2">인터랙티브 퀴즈로 즐겁게 배우는 마법 같은 경험!</p>
          </div>
          
          {/* 프로필 섹션 - 모바일에서는 제목 아래에 표시 */}
          <div className="flex justify-center w-full sm:w-auto sm:absolute sm:top-0 sm:right-4 md:right-10">
            {!isLoading && currentUser ? (
              <Link 
                to="/profile" 
                className="bg-purple-600 text-white px-4 py-2 rounded-full shadow hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <User size={18} className="text-white" />
                {currentUser.isAnonymous ? '익명 사용자' : (currentUser.displayName || currentUser.email || '사용자')}
                <Settings size={16} />
              </Link>
            ) : !isLoading && (
              <Link to="/login">
                <Button variant="secondary" size="small">
                  로그인
                </Button>
              </Link>
            )}
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
                  <h2 className="text-3xl font-extrabold text-purple-800">퀴즈 쇼 만들기</h2>
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
              
              <div className="mt-auto flex flex-col space-y-3">
                {!isLoading && (
                  currentUser ? (
                    <>
                      <Link to="/host/create">
                        <Button 
                          variant="primary" 
                          size="large"
                          className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg hover:shadow-purple-300/50 transition-all"
                        >
                          <Sparkles size={20} className="mr-2" /> 퀴즈 만들기 시작하기
                        </Button>
                      </Link>
                      <Link to="/host/my-quizzes">
                        <Button 
                          variant="secondary" 
                          size="medium"
                          className="w-full rounded-xl"
                        >
                          내가 만든 퀴즈 보기
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Link to="/login">
                      <Button 
                        variant="primary" 
                        size="large"
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg hover:shadow-purple-300/50 transition-all"
                      >
                        <User size={20} className="mr-2" /> 퀴즈 만들기 시작하기
                      </Button>
                    </Link>
                  )
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
                <Link to="/join">
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