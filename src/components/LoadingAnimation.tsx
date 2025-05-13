import React from 'react';

interface LoadingAnimationProps {
  message?: string; // 로딩 메시지 (선택적)
  color?: 'purple' | 'white'; // 애니메이션 색상
}

/**
 * 재사용 가능한 로딩 애니메이션 컴포넌트
 * @param message - 표시할 로딩 메시지 (기본값: "로딩 중...")
 * @param color - 애니메이션 색상 (기본값: "purple")
 */
const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ 
  message,
  color = 'purple'
}) => {
  const dotColor = color === 'purple' ? 'bg-purple-600' : 'bg-white';
  const textColor = color === 'purple' ? 'text-purple-700' : 'text-white';
  
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex space-x-2 mb-2">
        <div className={`w-2 h-2 ${dotColor} rounded-full animate-bounce`} style={{animationDelay: '0ms'}}></div>
        <div className={`w-2 h-2 ${dotColor} rounded-full animate-bounce`} style={{animationDelay: '150ms'}}></div>
        <div className={`w-2 h-2 ${dotColor} rounded-full animate-bounce`} style={{animationDelay: '300ms'}}></div>
      </div>
      {message && <p className={`${textColor} font-medium text-center`}>{message}</p>}
    </div>
  );
};

export default LoadingAnimation; 