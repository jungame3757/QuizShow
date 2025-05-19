import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={40} className="text-red-500" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4">이런!</h1>
        <p className="text-xl text-gray-600 mb-8">
          찾으시는 페이지를 찾을 수 없습니다.
        </p>
        
        <Link to="/">
          <Button variant="primary" size="large" className="px-8">
            <Home size={20} className="mr-2" /> 홈으로 가기
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;