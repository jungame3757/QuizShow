import React from 'react';
import LoadingAnimation from './LoadingAnimation';

interface LoadingOverlayProps {
  message?: string; // 로딩 메시지 (선택적)
}

/**
 * 심플한 로딩 컴포넌트
 * @param message - 표시할 로딩 메시지 (기본값: "로딩 중...")
 */
const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = "로딩 중..." 
}) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm">
      <LoadingAnimation message={message} color="white" />
    </div>
  );
};

export default LoadingOverlay; 