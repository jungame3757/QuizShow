import React from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Calendar } from 'lucide-react';

interface QuizHeaderProps {
  quiz: any;
  currentSession: any;
  onEditClick: () => void;
  onDeleteClick: () => void;
  isProcessing: boolean;
}

const QuizHeader: React.FC<QuizHeaderProps> = ({ 
  quiz, 
  currentSession, 
  onEditClick, 
  onDeleteClick, 
  isProcessing 
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start mb-2 sm:mb-4">
      <div className="mb-2 sm:mb-0 w-full">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2">
          <div className="sm:pr-4">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
              <h1 className="text-2xl font-bold text-purple-700 break-words overflow-hidden">{quiz.title}</h1>
              {currentSession ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                  <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
                  활동 켜짐
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 whitespace-nowrap">
                  <span className="w-2 h-2 mr-1 bg-gray-500 rounded-full"></span>
                  활동 꺼짐
                </span>
              )}
            </div>
            
            {quiz.description && (
              <p className="text-gray-600 break-words overflow-hidden text-ellipsis text-sm sm:text-base">{quiz.description}</p>
            )}
            
            <div className="flex flex-wrap items-center mt-2 sm:mt-3 space-x-4">
              <div className="flex items-center text-xs sm:text-sm text-gray-500">
                <Calendar size={14} className="mr-1" />
                <span>생성일: {new Date(quiz.createdAt).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mt-2 mb-1 sm:mt-0 sm:mb-0 sm:pt-0 flex-shrink-0">
            {currentSession ? (
              <button 
                onClick={onEditClick}
                className="px-3 py-1 sm:py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center text-sm whitespace-nowrap"
              >
                <Edit size={14} className="mr-1" />
                편집
              </button>
            ) : (
              <Link 
                to={`/host/edit/${quiz.id}`}
                className="px-3 py-1 sm:py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center text-sm whitespace-nowrap"
              >
                <Edit size={14} className="mr-1" />
                편집
              </Link>
            )}
            <button
              onClick={onDeleteClick}
              className="px-3 py-1 sm:py-1.5 bg-white border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center text-sm whitespace-nowrap"
              disabled={isProcessing}
            >
              <Trash2 size={14} className="mr-1" />
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizHeader; 