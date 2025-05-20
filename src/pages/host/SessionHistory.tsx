import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Clock, ArrowLeft, BookOpen, Trash2, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSessionHistoryById, SessionHistory, deleteSessionHistory, Attempt, Answer } from '../../firebase/sessionHistoryService';
import HostNavBar from '../../components/host/HostNavBar';
import HostPageHeader from '../../components/host/HostPageHeader';
import Breadcrumb from '../../components/ui/Breadcrumb';
import LoadingAnimation from '../../components/ui/LoadingAnimation';
import SummaryCards from '../../components/host/history/SummaryCards';
import RankingTab from '../../components/host/history/RankingTab';
import QuestionStatsTab from '../../components/host/history/QuestionStatsTab';

// 활동 시간 계산 (끝 시간 - 시작 시간)
const calculateDuration = (startTimestamp: any, endTimestamp: any): string => {
  if (!startTimestamp || !endTimestamp) return '시간 정보 없음';
  
  try {
    // Timestamp 객체를 Date로 변환
    const startDate = startTimestamp.toDate ? startTimestamp.toDate() : new Date(startTimestamp);
    const endDate = endTimestamp.toDate ? endTimestamp.toDate() : new Date(endTimestamp);
    
    // 밀리초 단위 차이
    const diffMs = endDate.getTime() - startDate.getTime();
    
    // 음수인 경우 처리
    if (diffMs < 0) return '0분';
    
    // 분 단위로 변환
    const diffMinutes = Math.floor(diffMs / 60000);
    
    // 시간과 분으로 표시
    if (diffMinutes < 60) {
      return `${diffMinutes}분`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}시간 ${minutes}분`;
    }
  } catch (error) {
    console.error('시간 계산 오류:', error);
    return '시간 계산 오류';
  }
};

// 확장된 참가자 타입 (answers 포함)
interface ExtendedParticipant {
  id: string;
  name: string;
  joinedAt: number;
  isActive: boolean;
  score: number;
  answers?: Record<string, Answer>;
  attempts?: Attempt[];
}

const SessionHistoryDetail: React.FC = () => {
  const { historyId } = useParams<{ historyId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [sessionHistory, setSessionHistory] = useState<SessionHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'ranking' | 'questions'>('ranking');
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [statsViewMode, setStatsViewMode] = useState<'latest' | 'all'>('latest');
  const [participantDetailTab, setParticipantDetailTab] = useState<'detail' | 'summary'>('summary');
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState<number | -1>(-1); // -1은 현재 시도
  
  useEffect(() => {
    const loadSessionHistory = async () => {
      if (!currentUser || !historyId) {
        navigate('/login');
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const history = await getSessionHistoryById(historyId, currentUser.uid);
        
        if (!history) {
          setError('세션 기록을 찾을 수 없습니다.');
          return;
        }
        
        setSessionHistory(history);
      } catch (err) {
        console.error('세션 기록 로드 오류:', err);
        setError('세션 기록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    loadSessionHistory();
  }, [currentUser, historyId, navigate]);
  
  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = async () => {
    if (!currentUser || !historyId) return;
    
    try {
      setDeleting(true);
      await deleteSessionHistory(historyId, currentUser.uid);
      navigate('/host/history');
    } catch (err) {
      console.error('세션 기록 삭제 오류:', err);
      setError('세션 기록을 삭제하는 중 오류가 발생했습니다.');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const toggleParticipantDetails = (participantId: string) => {
    if (selectedParticipant === participantId) {
      setSelectedParticipant(null);
    } else {
      setSelectedParticipant(participantId);
    }
  };

  // 참가자 점수 순위로 정렬
  const getSortedParticipants = () => {
    if (!sessionHistory) return [] as ExtendedParticipant[];
    return Object.entries(sessionHistory.participants ?? {})
      .sort(([, a], [, b]) => b.score - a.score)
      .map(([id, participant]) => ({ 
        ...participant,
        id 
      })) as ExtendedParticipant[];
  };

  // 문제별 참여자 응답 통계 계산 (모드에 따라 다른 계산)
  const calculateQuestionStats = (questionIndex: number, mode: 'latest' | 'all' = 'latest') => {
    if (!sessionHistory) return { totalResponses: 0, optionCounts: [] };
    const { participants, quiz } = sessionHistory;
    const question = quiz.questions[questionIndex];
    let totalResponses = 0;
    const optionCounts = new Array(question.options.length).fill(0);
    Object.values(participants ?? {}).forEach((participant) => {
      const extParticipant = participant as unknown as ExtendedParticipant;
      if (mode === 'latest') {
        if (extParticipant.answers) {
          const answers = Object.values(extParticipant.answers);
          const answer = answers.find(a => a.questionIndex === questionIndex);
          if (answer && answer.answerIndex >= 0) {
            optionCounts[answer.answerIndex]++;
            totalResponses++;
          }
        }
      } else {
        if (extParticipant.answers) {
          const answers = Object.values(extParticipant.answers);
          const answer = answers.find(a => a.questionIndex === questionIndex);
          if (answer && answer.answerIndex >= 0) {
            optionCounts[answer.answerIndex]++;
            totalResponses++;
          }
        }
        if (extParticipant.attempts) {
          extParticipant.attempts.forEach(attempt => {
            const answers = Object.values(attempt.answers);
            const answer = answers.find(a => a.questionIndex === questionIndex);
            if (answer && answer.answerIndex >= 0) {
              optionCounts[answer.answerIndex]++;
              totalResponses++;
            }
          });
        }
      }
    });
    return { totalResponses, optionCounts };
  };

  // 정답률 계산
  const calculateCorrectRate = () => {
    if (!sessionHistory) return 0;
    const { participants, quiz } = sessionHistory;
    const totalQuestions = quiz.questions.length * Object.keys(participants ?? {}).length;
    let correctAnswers = 0;
    Object.values(participants ?? {}).forEach((participant) => {
      const extParticipant = participant as unknown as ExtendedParticipant;
      if (extParticipant.answers) {
        Object.values(extParticipant.answers).forEach(answer => {
          if (answer.isCorrect) correctAnswers++;
        });
      }
    });
    return totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  };
  
  // 지정된 형식으로 날짜를 포맷팅하는 함수 추가 
  const formatDateCustom = (timestamp: any): string => {
    if (!timestamp) return '날짜 없음';
    
    try {
      // Timestamp 객체를 Date로 변환
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      
      // 년, 월, 일 구하기
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      // 시간 구하기
      const hours = date.getHours();
      const minutes = date.getMinutes();
      
      // 오전/오후 구분
      const ampm = hours >= 12 ? '오후' : '오전';
      
      // 12시간제로 변환
      const hours12 = hours % 12 || 12;
      
      // 원하는 형식으로 조합
      return `${year}/${month}/${day} ${ampm} ${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('날짜 변환 오류:', error);
      return '날짜 형식 오류';
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-3 sm:p-4">
        <div className="max-w-4xl mx-auto">
          <HostPageHeader handleNavigation={handleNavigation} />
          <HostNavBar handleNavigation={handleNavigation} />
          <Breadcrumb 
            items={[
              { label: '결과 보고서', path: '/host/history' },
              { label: ' ' }
            ]} 
          />
          
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 mb-4 sm:mb-8">
            <LoadingAnimation message="세션 기록을 불러오는 중" />
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !sessionHistory) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-3 sm:p-4">
        <div className="max-w-4xl mx-auto">
          <HostPageHeader handleNavigation={handleNavigation} />
          <HostNavBar handleNavigation={handleNavigation} />
          <Breadcrumb 
            items={[
              { label: '결과 보고서', path: '/host/history' },
              { label: ' ' }
            ]} 
          />
          
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 mb-4 sm:mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-purple-700 mb-2 sm:mb-0">결과 보고서를 찾을 수 없습니다.</h1>
              <Link 
                to="/host/history"
                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center text-sm whitespace-nowrap w-full sm:w-auto justify-center sm:justify-start"
              >
                <ArrowLeft size={14} className="mr-1" /> 목록으로 돌아가기
              </Link>
            </div>
            
            <div className="bg-red-50 text-red-600 p-3 sm:p-4 rounded-md">
              {error || '세션 기록을 찾을 수 없습니다.'}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const sortedParticipants = getSortedParticipants();
  const correctRate = calculateCorrectRate();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <HostPageHeader handleNavigation={handleNavigation} />
        <HostNavBar handleNavigation={handleNavigation} />
        <Breadcrumb 
          items={[
            { label: '결과 보고서', path: '/host/history' },
            { label: sessionHistory.title }
          ]} 
        />
        
        {/* 첫 번째 프레임: 세션 제목, 기본 정보 및 요약 정보 카드 */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 mb-3 sm:mb-4">
          <div className="relative mb-2 sm:mb-3">
            <h1 className="text-xl sm:text-2xl font-bold text-purple-700 mb-2 sm:mb-0 break-words">{sessionHistory.title}</h1>

            {/* 시작시간과 종료시간 표시 */}
            <div className="mb-2 sm:mb-3">
              <p className="text-xs sm:text-sm text-gray-600 flex items-center">
                <Clock size={14} className="mr-1 flex-shrink-0" />
                <span className="truncate">{formatDateCustom(sessionHistory.startedAt)} - {formatDateCustom(sessionHistory.endedAt)}</span>
              </p>
            </div>
          
            {/* 모바일에서는 날짜 아래, 데스크톱에서는 제목 옆에 위치 */}
            <div className="flex items-center space-x-2 w-full sm:w-auto sm:absolute sm:top-0 sm:right-0">
              <Link 
                to="/host/history"
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center text-xs sm:text-sm whitespace-nowrap"
              >
                <ArrowLeft size={14} className="mr-1" /> 목록
              </Link>
              <button
                onClick={handleDeleteClick}
                className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center text-xs sm:text-sm whitespace-nowrap"
              >
                <Trash2 size={14} className="mr-1" /> 삭제
              </button>
            </div>
          </div>

          {/* 요약 정보 카드 컴포넌트 */}
          <SummaryCards 
            sessionHistory={sessionHistory} 
            correctRate={correctRate} 
            calculateDuration={calculateDuration} 
          />
        </div>
        
        {/* 두 번째 프레임: 탭 내비게이션 및 콘텐츠 */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-md overflow-hidden mb-4 sm:mb-8">
          {/* 탭 네비게이션 */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                className={`py-3 sm:py-4 px-3 sm:px-6 font-medium text-sm sm:text-base flex-1 sm:flex-none ${
                  activeTab === 'ranking' 
                    ? 'text-purple-700 border-b-2 border-purple-500' : 
                    'text-gray-600 hover:text-purple-700'
                }`}
                onClick={() => setActiveTab('ranking')}
              >
                <div className="flex items-center justify-center sm:justify-start">
                  <Award size={16} className="mr-1 sm:mr-2" /> 점수 순위
                </div>
              </button>
              <button
                className={`py-3 sm:py-4 px-3 sm:px-6 font-medium text-sm sm:text-base flex-1 sm:flex-none ${
                  activeTab === 'questions' 
                    ? 'text-purple-700 border-b-2 border-purple-500' : 
                    'text-gray-600 hover:text-purple-700'
                }`}
                onClick={() => setActiveTab('questions')}
              >
                <div className="flex items-center justify-center sm:justify-start">
                  <BookOpen size={16} className="mr-1 sm:mr-2" /> 문제별 통계
                </div>
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-6">
          {/* 점수 순위 탭 내용 */}
          {activeTab === 'ranking' && (
              <RankingTab 
                sortedParticipants={sortedParticipants}
                sessionHistory={sessionHistory}
                selectedParticipant={selectedParticipant}
                toggleParticipantDetails={toggleParticipantDetails}
                participantDetailTab={participantDetailTab}
                setParticipantDetailTab={setParticipantDetailTab}
                selectedAttemptIndex={selectedAttemptIndex}
                setSelectedAttemptIndex={setSelectedAttemptIndex}
                formatDateCustom={formatDateCustom}
              />
          )}

          {/* 문제별 통계 탭 내용 */}
          {activeTab === 'questions' && (
              <QuestionStatsTab 
                sessionHistory={sessionHistory}
                statsViewMode={statsViewMode}
                setStatsViewMode={setStatsViewMode}
                calculateQuestionStats={calculateQuestionStats}
              />
            )}
                          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-5 max-w-md w-full mx-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3">세션 기록 삭제</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
              "{sessionHistory.title}" 세션 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={handleCancelDelete}
                className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto text-sm"
                disabled={deleting}
              >
                취소
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center w-full sm:w-auto text-sm"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    삭제 중...
                  </>
                ) : (
                  "삭제하기"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionHistoryDetail; 