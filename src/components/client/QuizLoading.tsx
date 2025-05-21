import React from 'react';
import { Loader2 } from 'lucide-react';

const QuizLoading: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0FFFD] via-[#E6FFFC] to-[#E0FFFA] flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={48} className="animate-spin text-teal-600 mx-auto mb-4" />
        <p className="text-xl text-teal-700">퀴즈 로딩 중...</p>
      </div>
    </div>
  );
};

export default QuizLoading; 