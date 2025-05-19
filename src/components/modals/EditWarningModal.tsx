import React from 'react';
import { Link } from 'react-router-dom';

interface EditWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  quizId: string;
}

const EditWarningModal: React.FC<EditWarningModalProps> = ({ isOpen, onClose, quizId }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-bold text-gray-900 mb-3">활동 중 편집 주의</h3>
        <p className="text-gray-600 mb-4">
          현재 활동이 진행 중입니다. 퀴즈를 편집하려면 현재 진행 중인 활동을 먼저 종료해야 할 수 있습니다.
        </p>
        <p className="text-gray-600 mb-4">
          활동을 종료하면 참가자들의 진행 상황이 모두 사라집니다. 계속하시겠습니까?
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            취소
          </button>
          <Link 
            to={`/host/edit/${quizId}`}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 inline-flex items-center"
          >
            편집으로 이동
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EditWarningModal; 