import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, Users, ChevronRight, ChevronLeft, ChevronRight as ChevronNext } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSessionHistoriesByHostId, SessionHistory } from '../../firebase/sessionHistoryService';
import HostNavBar from '../../components/host/HostNavBar';
import HostPageHeader from '../../components/host/HostPageHeader';
import Breadcrumb from '../../components/ui/Breadcrumb';
import LoadingAnimation from '../../components/ui/LoadingAnimation';

// 상대적인 시간 형식으로 변환하는 함수
const formatRelativeTime = (timestamp: any): string => {
  if (!timestamp) return '시간 정보 없음';
  
  try {
    // Timestamp 객체를 Date로 변환
    const endDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    
    // 밀리초 단위 차이
    const diffMs = now.getTime() - endDate.getTime();
    
    // 방금 전 (1분 이내)
    if (diffMs < 60 * 1000) {
      return '방금 전';
    }
    
    // n분 전 (1시간 이내)
    if (diffMs < 60 * 60 * 1000) {
      const minutes = Math.floor(diffMs / (60 * 1000));
      return `${minutes}분 전`;
    }
    
    // n시간 전 (24시간 이내)
    if (diffMs < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diffMs / (60 * 60 * 1000));
      return `${hours}시간 전`;
    }
    
    // n일 전 (30일 이내)
    if (diffMs < 30 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      return `${days}일 전`;
    }
    
    // n개월 전 (1년 이내)
    if (diffMs < 12 * 30 * 24 * 60 * 60 * 1000) {
      const months = Math.floor(diffMs / (30 * 24 * 60 * 60 * 1000));
      return `${months}개월 전`;
    }
    
    // n년 전
    const years = Math.floor(diffMs / (12 * 30 * 24 * 60 * 60 * 1000));
    return `${years}년 전`;
    
  } catch (error) {
    console.error('상대적 시간 계산 오류:', error);
    return '시간 계산 오류';
  }
};

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

// 색상 배열 정의 (메모리에 한 번만 생성)
const BORDER_COLORS = [
  'border-blue-400',
  'border-green-400',
  'border-yellow-400',
  'border-pink-400',
  'border-purple-400',
  'border-indigo-400',
  'border-red-400',
  'border-orange-400',
  'border-teal-400',
  'border-cyan-400',
];

// 퀴즈 ID에 따른 배경색을 가져오는 함수
const getColorByQuizId = (quizId: string) => {
  if (!quizId || quizId === 'unknown') {
    return BORDER_COLORS[0]; // 기본 색상
  }
  
  // 퀴즈 ID를 문자열로 변환하여 간단한 해시 함수 적용
  let hashValue = 0;
  for (let i = 0; i < quizId.length; i++) {
    hashValue = (hashValue + quizId.charCodeAt(i)) % BORDER_COLORS.length;
  }
  
  // 해시값을 사용하여 색상 선택
  return BORDER_COLORS[hashValue];
};

// 페이지 당 항목 수
const PAGE_SIZE = 10;

const ActivityHistory: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [sessionHistories, setSessionHistories] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // 총 세션 기록 개수 조회 함수 (개선된 API 사용)
  const getTotalSessionCount = useCallback(async () => {
    if (!currentUser) return 0;
    
    try {
      // 백엔드에서 총 개수만 얻어오는 API 기능 사용
      const result = await getSessionHistoriesByHostId(currentUser.uid, 0, null, 0, true);
      
      // 새 API 응답 형식 확인
      if (typeof result === 'object' && 'totalCount' in result) {
        return result.totalCount;
      }
      
      return 0;
    } catch (err) {
      console.error('전체 세션 개수 조회 오류:', err);
      return 0;
    }
  }, [currentUser]);

  // 페이지별 데이터 로드
  const loadPageData = useCallback(async (page: number) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 페이지 번호가 0보다 작으면 1로 설정
      const validPage = Math.max(1, page);
      setCurrentPage(validPage);
      
      // 먼저 총 세션 개수 조회
      const totalCount = await getTotalSessionCount();
      
      // 총 페이지 수 계산
      const calculatedTotalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
      setTotalPages(calculatedTotalPages);
      
      // 현재 페이지에 해당하는 데이터 로드 (offset 기반 페이지네이션 사용)
      const offset = (validPage - 1) * PAGE_SIZE;
      
      // 개선된 API 사용 - offset 파라미터로 페이지 처리
      const result = await getSessionHistoriesByHostId(
        currentUser.uid, 
        PAGE_SIZE, 
        null, 
        offset
      );
      
      // 새 API 응답 형식 확인
      let histories: SessionHistory[] = [];
      
      if (typeof result === 'object' && 'histories' in result) {
        // 새 API 응답 형식 (SessionHistoryResponse)
        histories = result.histories;
        
        // 총 페이지 수 계산 (전체 개수 정보를 API에서 제공)
        const calculatedTotalPages = Math.max(1, Math.ceil(result.totalCount / PAGE_SIZE));
        setTotalPages(calculatedTotalPages);
      } else if (Array.isArray(result)) {
        // 이전 API 응답 형식 호환성 (배열)
        histories = result;
      }
      
      if (histories && histories.length > 0) {
        setSessionHistories(histories);
      } else {
        setSessionHistories([]);
        // 데이터가 없는데 페이지가 1보다 크면 첫 페이지로 이동
        if (validPage > 1 && Number(totalCount) === 0) {
          setCurrentPage(1);
        }
      }
    } catch (err) {
      console.error('세션 기록 로드 오류:', err);
      setError('활동 기록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, navigate, getTotalSessionCount]);
  
  // 페이지 변경 함수
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) {
      return; // 유효하지 않은 페이지 번호 무시
    }
    loadPageData(newPage);
  }, [currentPage, loadPageData, totalPages]);
  
  // 초기 데이터 로드
  useEffect(() => {
    // 첫 페이지 데이터 로드
    loadPageData(1);
  }, [loadPageData]);
  

  
  const handleNavigation = (path: string) => {
    navigate(path);
  };
  
  const navigateToHistoryDetail = (historyId: string) => {
    navigate(`/host/history/${historyId}`);
  };
  
  // 비어있는 상태 메시지 메모이제이션
  const emptyStateMessage = useMemo(() => (
    <div className="text-center py-6 sm:py-8">
      <Calendar className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
      <h3 className="mt-2 text-base sm:text-lg font-medium text-gray-900">분석할 퀴즈 활동이 없습니다</h3>
      <p className="mt-1 text-xs sm:text-sm text-gray-500">
        아직 종료된 퀴즈 활동이 없습니다. 퀴즈를 진행하고 종료하면 여기에 기록됩니다.
      </p>
      <div className="mt-4 sm:mt-6">
        <Link
          to="/host/my-quizzes"
          className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          퀴즈 목록으로 이동
        </Link>
      </div>
    </div>
  ), []);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-3 sm:p-4">
        <div className="max-w-4xl mx-auto">
          <HostPageHeader handleNavigation={handleNavigation} />
          <HostNavBar handleNavigation={handleNavigation} />
          <Breadcrumb items={[{ label: '결과 보고서' }]} />
          
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 mb-4 sm:mb-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-purple-700">결과 보고서</h1>
            </div>
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <LoadingAnimation message="활동 기록을 불러오는 중" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <HostPageHeader handleNavigation={handleNavigation} />
        <HostNavBar handleNavigation={handleNavigation} />
        <Breadcrumb items={[{ label: '결과 보고서' }]} />
        
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 mb-4 sm:mb-8">
          <div className="mb-3 sm:mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-purple-700">결과 보고서</h1>
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 sm:p-4 mb-4 rounded-md flex flex-col sm:flex-row sm:justify-between sm:items-center">
              <span className="mb-2 sm:mb-0">{error}</span>
              <button 
                onClick={() => loadPageData(currentPage)}
                className="text-red-700 hover:text-red-900 text-sm font-medium py-1 px-2 border border-red-300 rounded-md self-end sm:self-auto"
              >
                다시 시도
              </button>
            </div>
          )}
          

          
          {!loading && sessionHistories.length === 0 ? (
            emptyStateMessage
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {sessionHistories.map((history) => (
                <div 
                  key={history.id}
                  className={`border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer border-l-4 sm:border-l-8 ${getColorByQuizId(history.quiz?.id || 'unknown')}`}
                  onClick={() => navigateToHistoryDetail(history.id!)}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 bg-white">
                    <div className="mb-2 sm:mb-0 pr-6 sm:pr-0">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-0.5 sm:mb-1">{history.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-500">
                        <span className="inline-flex items-center">
                          <Clock size={12} className="mr-1" />
                          {formatRelativeTime(history.endedAt)}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center w-full sm:w-auto">
                      <div className="flex flex-wrap gap-1 sm:gap-2 mr-1 sm:mr-2 w-full sm:w-auto justify-end">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Users size={10} className="mr-1" />
                          참가자 {history.participantCount}명
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Clock size={10} className="mr-1" />
                          진행: {calculateDuration(history.startedAt, history.endedAt)}
                        </span>
                      </div>
                      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 페이지네이션 UI */}
              {sessionHistories.length > 0 && (
                <div className="flex justify-center items-center mt-4 space-x-1 sm:space-x-2">
                  {/* 이전 페이지 버튼 */}
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loading}
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-md border ${
                      currentPage === 1 || loading
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-purple-300 text-purple-700 hover:bg-purple-50'
                    }`}
                    aria-label="이전 페이지"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {/* 페이지 번호 버튼들 */}
                  {(() => {
                    // 표시할 페이지 번호 범위 계산
                    const pageNumbers = [];
                    const maxVisiblePages = window.innerWidth < 640 ? 3 : 5; // 모바일에서는 3개만 표시
                    
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    
                    // 끝 페이지가 최대 페이지를 초과하지 않도록 조정
                    if (endPage - startPage + 1 < maxVisiblePages && startPage > 1) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }
                    
                    // 첫 페이지 버튼 (시작 페이지가 1이 아닌 경우)
                    if (startPage > 1) {
                      pageNumbers.push(
                        <button
                          key="page-1"
                          onClick={() => handlePageChange(1)}
                          disabled={loading}
                          className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-md border ${
                            1 === currentPage
                              ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                              : 'border-purple-200 text-purple-700 hover:bg-purple-50'
                          }`}
                        >
                          1
                        </button>
                      );
                      
                      // 줄임표 (1과 시작 페이지 사이에 페이지가 있는 경우)
                      if (startPage > 2) {
                        pageNumbers.push(
                          <span key="ellipsis-1" className="px-1 sm:px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                    }
                    
                    // 페이지 번호 버튼들
                    for (let i = startPage; i <= endPage; i++) {
                      pageNumbers.push(
                        <button
                          key={`page-${i}`}
                          onClick={() => handlePageChange(i)}
                          disabled={loading}
                          className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-md border text-xs sm:text-sm ${
                            i === currentPage
                              ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                              : 'border-purple-200 text-purple-700 hover:bg-purple-50'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }
                    
                    // 마지막 페이지 버튼 (끝 페이지가 totalPages가 아닌 경우)
                    if (endPage < totalPages) {
                      // 줄임표 (끝 페이지와 totalPages 사이에 페이지가 있는 경우)
                      if (endPage < totalPages - 1) {
                        pageNumbers.push(
                          <span key="ellipsis-2" className="px-1 sm:px-2 text-gray-500">
                            ...
                          </span>
                        );
                      }
                      
                      pageNumbers.push(
                        <button
                          key={`page-${totalPages}`}
                          onClick={() => handlePageChange(totalPages)}
                          disabled={loading}
                          className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-md border text-xs sm:text-sm ${
                            totalPages === currentPage
                              ? 'border-purple-500 bg-purple-50 text-purple-700 font-bold'
                              : 'border-purple-200 text-purple-700 hover:bg-purple-50'
                          }`}
                        >
                          {totalPages}
                        </button>
                      );
                    }
                    
                    return pageNumbers;
                  })()}
                  
                  {/* 다음 페이지 버튼 */}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || loading}
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-md border ${
                      currentPage === totalPages || loading
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-purple-300 text-purple-700 hover:bg-purple-50'
                    }`}
                    aria-label="다음 페이지"
                  >
                    <ChevronNext size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityHistory; 