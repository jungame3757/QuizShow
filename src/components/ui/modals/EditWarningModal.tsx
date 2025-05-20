import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

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
        <div className="flex items-center mb-4">
          <AlertTriangle size={24} className="text-red-600 mr-2" />
          <h3 className="text-xl font-bold text-gray-800">활동 중 편집 주의</h3>
        </div>
        <p className="text-gray-600 mb-4">
          퀴즈를 편집하려면 현재 진행 중인 활동을 종료해야 합니다.
        </p>
        <p className="text-red-600 mb-4">
          현재 진행 중인 활동이 종료됩니다.
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
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 inline-flex items-center"
          >
            활동 종료 후 편집
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EditWarningModal; 