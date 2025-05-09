import React from 'react';
import { Link } from 'react-router-dom';
import { User, Settings, Sparkles, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HostPageHeaderProps {
  handleNavigation?: (path: string) => void;
}

const HostPageHeader: React.FC<HostPageHeaderProps> = ({ 
  handleNavigation 
}) => {
  const { currentUser, isLoading } = useAuth();

  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center">
        {handleNavigation ? (
          <button 
            onClick={() => handleNavigation("/")}
            className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500 flex items-center gap-2"
            aria-label="홈으로 이동"
          >
            <Sparkles size={20} className="text-yellow-400" />
            퀴즈 위자드
            <Star size={20} className="text-yellow-400" />
          </button>
        ) : (
          <Link to="/" className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-500 flex items-center gap-2" aria-label="홈으로 이동">
            <Sparkles size={20} className="text-yellow-400" />
            퀴즈 위자드
            <Star size={20} className="text-yellow-400" />
          </Link>
        )}
      </div>

      <div>
        {!isLoading && currentUser && (
          <Link 
            to="/profile" 
            className="bg-purple-600 text-white px-4 py-2 rounded-full shadow hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <User size={18} className="text-white" />
            {currentUser.isAnonymous ? '익명 사용자' : (currentUser.displayName || currentUser.email || '사용자')}
            <Settings size={16} />
          </Link>
        )}
      </div>
    </div>
  );
};

export default HostPageHeader; 