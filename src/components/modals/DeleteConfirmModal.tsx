import React from 'react';
import { Loader } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  isProcessing: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title,
  isProcessing 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-bold text-gray-900 mb-3">퀴즈 삭제</h3>
        <p className="text-gray-600 mb-4">
          "{title}" 퀴즈를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
            disabled={isProcessing}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader size={16} className="animate-spin mr-2" />
                삭제 중...
              </>
            ) : (
              "삭제하기"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal; 