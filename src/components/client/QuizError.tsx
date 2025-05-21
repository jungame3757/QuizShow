import React from 'react';
import { XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';

interface QuizErrorProps {
  errorMessage: string;
}

const QuizError: React.FC<QuizErrorProps> = ({ errorMessage }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0FFFD] via-[#E6FFFC] to-[#E0FFFA] p-4 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full text-center"
        style={{
          boxShadow: '0 3px 0 rgba(20, 184, 166, 0.5)',
          border: '2px solid #0D9488',
          borderRadius: '16px',
        }}
      >
        <div className="text-red-500 mb-4">
          <XCircle size={48} className="mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">오류 발생</h2>
        <p className="text-gray-600 mb-6">{errorMessage}</p>
        <Button 
          onClick={() => navigate('/join')}
          variant="primary"
          size="medium"
          className="bg-gradient-to-r from-teal-500 to-teal-400"
          style={{
            boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
            border: '2px solid #000',
            borderRadius: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
          }}
        >
          퀴즈 참여 페이지로 돌아가기
        </Button>
      </div>
    </div>
  );
};

export default QuizError; 