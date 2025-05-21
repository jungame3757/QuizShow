import React from 'react';
import { Link } from 'react-router-dom';
import { User, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HostPageHeaderProps {
  handleNavigation?: (path: string) => void;
}

const HostPageHeader: React.FC<HostPageHeaderProps> = ({ 
  handleNavigation
}) => {
  const { currentUser, isLoading } = useAuth();

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center">
        {handleNavigation ? (
          <button 
            onClick={() => handleNavigation("/")}
            className="flex items-center gap-2 h-8"
            aria-label="홈으로 이동"
          >
            <img src="/assets/logo/logo-light.svg" alt="콰직 로고" className="h-8 mr-1" />
            <span className="text-xl sm:text-2xl font-bold text-[#783ae8]" style={{ fontFamily: 'SBAggroB' }}>
              콰직
            </span>
          </button>
        ) : (
          <Link to="/" className="flex items-center gap-2 h-8" aria-label="홈으로 이동">
            <img src="/assets/logo/logo-light.svg" alt="콰직 로고" className="h-8 mr-1" />
            <span className="text-xl sm:text-2xl font-bold text-[#783ae8]" style={{ fontFamily: 'SBAggroB' }}>
              콰직
            </span>
          </Link>
        )}
      </div>

      <div>
        {!isLoading && currentUser && (
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
        )}
      </div>
    </div>
  );
};

export default HostPageHeader; 