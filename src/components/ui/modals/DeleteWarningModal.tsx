import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DeleteWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  hasActiveSession: boolean;
}

const DeleteWarningModal: React.FC<DeleteWarningModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  hasActiveSession 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center mb-4">
          <AlertTriangle size={24} className="text-red-600 mr-2" />
          <h3 className="text-xl font-bold text-gray-800">{hasActiveSession ? "활동 중 퀴즈 삭제" : "퀴즈 삭제"}</h3>
        </div>
        <p className="text-gray-600 mb-4">
          퀴즈의 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
        </p>
        {hasActiveSession && (
          <p className="text-red-600 mb-4">
            현재 진행 중인 활동이 종료됩니다.
          </p>
        )}
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 inline-flex items-center"
          >
            퀴즈 삭제
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteWarningModal; 