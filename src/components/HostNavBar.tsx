import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookMarked, Wand, BarChartBig } from 'lucide-react';

interface HostNavBarProps {
  handleNavigation?: (path: string) => void;
}

const HostNavBar: React.FC<HostNavBarProps> = ({ handleNavigation }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  
  const isMyQuizzes = path === '/host/my-quizzes' || path.includes('/host/session') || path.includes('/host/edit');
  const isCreateQuiz = path === '/host/create';
  const isHistory = path === '/host/history' || path.includes('/host/history');

  // 네비게이션 핸들러
  const handleNav = (path: string) => {
    if (handleNavigation) {
      handleNavigation(path);
    } else {
      navigate(path);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
      <div className="container pl-0">
        <div className="flex justify-between">
          <button 
            onClick={() => handleNav('/host/my-quizzes')}
            className={`py-3 px-3 sm:px-6 flex flex-col sm:flex-row items-center transition-colors flex-1 justify-center sm:justify-start ${
              isMyQuizzes 
                ? 'bg-purple-600 text-white font-medium border-b-2 border-purple-800' 
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
            }`}
            aria-label="내 퀴즈"
          >
            <BookMarked size={18} className="sm:mr-2" />
            <span className="text-xs sm:text-base mt-1 sm:mt-0">내 퀴즈</span>
          </button>
          
          <div className="h-12 sm:h-8 w-px bg-gray-200 my-auto"></div>
          
          <button 
            onClick={() => handleNav('/host/create')}
            className={`py-3 px-3 sm:px-6 flex flex-col sm:flex-row items-center transition-colors flex-1 justify-center sm:justify-start ${
              isCreateQuiz 
                ? 'bg-purple-600 text-white font-medium border-b-2 border-purple-800' 
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
            }`}
            aria-label="퀴즈 만들기"
          >
            <Wand size={18} className="sm:mr-2" />
            <span className="text-xs sm:text-base mt-1 sm:mt-0">퀴즈 만들기</span>
          </button>
          
          <div className="h-12 sm:h-8 w-px bg-gray-200 my-auto"></div>
          
          <button 
            onClick={() => handleNav('/host/history')}
            className={`py-3 px-3 sm:px-6 flex flex-col sm:flex-row items-center transition-colors flex-1 justify-center sm:justify-start ${
              isHistory 
                ? 'bg-purple-600 text-white font-medium border-b-2 border-purple-800' 
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
            }`}
            aria-label="결과 보고서"
          >
            <BarChartBig size={18} className="sm:mr-2" />
            <span className="text-xs sm:text-base mt-1 sm:mt-0">결과 보고서</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostNavBar;