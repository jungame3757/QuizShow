import React from 'react';

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
        <h3 className="text-lg font-bold text-gray-900 mb-3">퀴즈 삭제 주의</h3>
        
        {hasActiveSession ? (
          <>
            <p className="text-gray-600 mb-4">
              현재 활동이 진행 중입니다. 퀴즈를 삭제하면 진행 중인 활동도 함께 종료됩니다.
            </p>
            <p className="text-gray-600 mb-4">
              활동을 종료하면 참가자들의 진행 상황이 모두 사라집니다. 계속하시겠습니까?
            </p>
          </>
        ) : (
          <p className="text-gray-600 mb-4">
            퀴즈를 삭제하면 모든 문제와 관련 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
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
            계속 진행
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteWarningModal; 