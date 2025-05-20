import React from 'react';
import { AlertTriangle, Loader } from 'lucide-react';

interface EndSessionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
}

const EndSessionConfirmModal: React.FC<EndSessionConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isProcessing 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-sm w-full">
        <div className="flex items-center mb-4">
          <AlertTriangle size={24} className="text-red-600 mr-2" />
          <h3 className="text-xl font-bold text-gray-800">활동 종료 확인</h3>
        </div>
        <p className="text-gray-700 mb-4">
          활동을 종료하고 학습 결과를 저장하시겠습니까?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 transition-colors"
            disabled={isProcessing}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 rounded-md text-white hover:bg-red-700 transition-colors flex items-center"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader size={16} className="animate-spin mr-2" />
                종료 중...
              </>
            ) : (
              '활동 종료'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndSessionConfirmModal; 