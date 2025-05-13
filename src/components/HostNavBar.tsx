import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookMarked, Wand } from 'lucide-react';

interface HostNavBarProps {
  handleNavigation?: (path: string) => void;
}

const HostNavBar: React.FC<HostNavBarProps> = ({ handleNavigation }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  
  const isMyQuizzes = path === '/host/my-quizzes' || path.includes('/host/session') || path.includes('/host/edit');
  const isCreateQuiz = path === '/host/create';

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
        <div className="flex">
          <button 
            onClick={() => handleNav('/host/my-quizzes')}
            className={`py-4 px-6 flex items-center transition-colors ${
              isMyQuizzes 
                ? 'bg-purple-600 text-white font-medium border-b-2 border-purple-800' 
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
            }`}
          >
            <BookMarked size={18} className="mr-2" />
            내 퀴즈
          </button>
          
          <button 
            onClick={() => handleNav('/host/create')}
            className={`py-4 px-6 flex items-center transition-colors ${
              isCreateQuiz 
                ? 'bg-purple-600 text-white font-medium border-b-2 border-purple-800' 
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
            }`}
          >
            <Wand size={18} className="mr-2" />
            퀴즈 만들기
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostNavBar; 