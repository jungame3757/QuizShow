import React, { useState, useRef, useEffect } from 'react';
import { Play, User, Edit, X, LogOut } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { ref, update } from 'firebase/database';
import { rtdb } from '../../firebase/config';
import { Link } from 'react-router-dom';

interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
}

interface Quiz {
  title: string;
  description?: string;
  questions: Question[];
}

interface Participant {
  id: string;
  name: string;
  score: number;
  isActive: boolean;
  joinedAt: number;
  quizId: string;
}

interface QuizStartPageProps {
  quiz: Quiz;
  participant: Participant;
  currentQuestionIndex: number;
  sessionId: string;
  onStartQuiz: () => void;
  timeLimit?: number; // 문제 시간 제한 (초)
}

const QuizStartPage: React.FC<QuizStartPageProps> = ({
  quiz,
  participant,
  currentQuestionIndex,
  sessionId,
  onStartQuiz,
  timeLimit = 30 // 기본값 30초
}) => {
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nickname, setNickname] = useState(participant.name || '');
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  
  // 팝업 외부 클릭을 감지하기 위한 ref
  const popupRef = useRef<HTMLDivElement>(null);
  
  // 이어서 푸는 경우인지 확인
  const isResuming = currentQuestionIndex > 0;
  
  // 팝업 닫기
  const closePopup = () => {
    setIsEditingNickname(false);
    setNickname(participant.name || '');
    setNicknameError(null);
  };
  
  // 닉네임 변경 핸들러
  const handleNicknameChange = async () => {
    // 입력 유효성 검사
    if (!nickname.trim()) {
      setNicknameError('닉네임을 입력해주세요');
      return;
    }
    
    if (nickname.trim().length < 2 || nickname.trim().length > 15) {
      setNicknameError('닉네임은 2~15자 사이여야 합니다');
      return;
    }
    
    try {
      setIsUpdatingNickname(true);
      
      // Firebase 데이터베이스에 닉네임 업데이트
      const participantRef = ref(rtdb, `participants/${sessionId}/${participant.id}`);
      await update(participantRef, {
        name: nickname.trim()
      });
      
      // 로컬 스토리지 참여 정보 업데이트
      const storedParticipation = localStorage.getItem('quizParticipation');
      if (storedParticipation) {
        const participation = JSON.parse(storedParticipation);
        participation.nickname = nickname.trim();
        localStorage.setItem('quizParticipation', JSON.stringify(participation));
      }
      
      // 팝업 닫기
      closePopup();
      
      // 성공 메시지 표시 (선택사항)
      console.log('닉네임이 성공적으로 변경되었습니다');
    } catch (error) {
      console.error('닉네임 변경 실패:', error);
      setNicknameError('닉네임 변경에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsUpdatingNickname(false);
    }
  };
  
  // 팝업 외부 클릭 감지를 위한 이벤트 리스너
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        closePopup();
      }
    };
    
    if (isEditingNickname) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditingNickname]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0FFFD] via-[#E6FFFC] to-[#E0FFFA] p-4 flex flex-col items-center pt-4">
      <div className="max-w-3xl w-full bg-white rounded-2xl p-8 animate-fade-in"
        style={{
          boxShadow: '0 3px 0 rgba(20, 184, 166, 0.5)',
          border: '2px solid #0D9488',
          borderRadius: '16px',
          background: 'linear-gradient(to bottom right, #fff, #f0fffc)',
        }}
      >
        {/* 사용자 정보 - 심플하게 개선 */}
        <div className="flex justify-end mb-6">
          <button 
            onClick={() => setIsEditingNickname(true)}
            className="inline-flex items-center gap-1.5 bg-teal-50 py-1.5 px-3 rounded-full text-teal-600 hover:bg-teal-100 transition-all font-medium text-sm"
            style={{ border: '1px solid #0D9488' }}
          >
            <User size={14} className="text-teal-500" /> {participant.name} <Edit size={12} className="ml-1 text-teal-400" />
          </button>
        </div>
        
        {/* 닉네임 변경 팝업 */}
        {isEditingNickname && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div 
              ref={popupRef} 
              className="bg-white rounded-lg p-6 w-full max-w-md animate-fade-in-up"
              style={{
                boxShadow: '0 3px 0 rgba(20, 184, 166, 0.5)',
                border: '2px solid #0D9488',
                borderRadius: '16px',
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-[#783ae8]">닉네임 변경</h3>
                <button 
                  onClick={closePopup}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  새 닉네임
                </label>
                <Input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="닉네임 입력 (2~15자)"
                  className="w-full"
                  maxLength={15}
                  disabled={isUpdatingNickname}
                  autoFocus
                />
                {nicknameError && (
                  <p className="mt-1 text-sm text-red-500">
                    {nicknameError}
                  </p>
                )}
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  onClick={closePopup}
                  variant="secondary"
                  size="small"
                  disabled={isUpdatingNickname}
                >
                  취소
                </Button>
                <Button
                  onClick={handleNicknameChange}
                  variant="primary"
                  size="small"
                  disabled={isUpdatingNickname}
                  className="bg-gradient-to-r from-teal-500 to-teal-400"
                  style={{
                    boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
                    border: '2px solid #000',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 5px 0 rgba(0,0,0,0.8)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
                  }}
                >
                  {isUpdatingNickname ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      저장 중...
                    </span>
                  ) : '저장'}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#783ae8] mb-3">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-gray-600 mb-4">{quiz.description}</p>
          )}
        </div>

        <div className="flex justify-center mb-6">
          <Button
            onClick={onStartQuiz}
            variant="primary"
            size="large"
            className="px-8 bg-gradient-to-r from-teal-500 to-teal-400"
            style={{
              boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
              border: '2px solid #000',
              borderRadius: '12px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 6px 0 rgba(0,0,0,0.8)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
            }}
          >
            <Play size={20} className="mr-2" /> {isResuming ? '이어서 풀기' : '퀴즈 시작하기'}
          </Button>
        </div>
        
        <div className="bg-teal-50 rounded-lg p-6" style={{ border: '1px solid #0D9488' }}>
          <div className="space-y-2">
            <div className="flex items-center text-gray-600">
              <div className="w-28 font-medium">문제 수:</div>
              <div className="font-bold text-teal-700">{quiz.questions.length}문제</div>
            </div>
            <div className="flex items-center text-gray-600">
              <div className="w-28 font-medium">시간 제한:</div>
              <div className="font-bold text-teal-700">문제당 {timeLimit}초</div>
            </div>
            {isResuming && (
              <div className="flex items-center text-gray-600">
                <div className="w-28 font-medium">진행 상태:</div>
                <div className="font-bold text-teal-700">{currentQuestionIndex} / {quiz.questions.length} 문제 완료</div>
              </div>
            )}
          </div>
        </div>
        
        {/* 다른 퀴즈 참여하기 링크 - 나가기 아이콘으로 변경 */}
        <div className="text-center mt-8 border-t pt-6 border-dashed border-teal-200">
          <Link 
            to="/join" 
            className="inline-flex items-center text-teal-600 hover:text-teal-800 transition-colors font-medium"
          >
            다른 퀴즈 참여하기 <LogOut size={16} className="ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default QuizStartPage; 