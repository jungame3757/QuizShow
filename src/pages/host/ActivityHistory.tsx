import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, Users, ChevronRight, RefreshCw } from 'lucide-react';
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

// 한 번에 불러올 항목 수
const PAGE_SIZE = 10;

const ActivityHistory: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [sessionHistories, setSessionHistories] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  
  // IntersectionObserver 설정
  const observer = useRef<IntersectionObserver | null>(null);
  const lastHistoryElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    
    // 이전 옵저버 연결 해제
    if (observer.current) observer.current.disconnect();
    
    // 새 옵저버 생성
    observer.current = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting && hasMore) {
        loadMoreData();
      }
    }, { 
      rootMargin: '200px', // 미리 로드 시작할 여유 공간 증가
      threshold: 0.1
    });
    
    // 새 노드 관찰 시작
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);
  
  // 초기 데이터 로드
  const loadInitialData = useCallback(async (showRefreshing = false) => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      setError(null);
      
      // 초기 로드 시 기존 데이터와 상태를 명확히 초기화
      if (!showRefreshing) {
        setSessionHistories([]);
      }
      
      setLastDoc(null);
      setHasMore(true);
      
      const histories = await getSessionHistoriesByHostId(currentUser.uid, PAGE_SIZE);
      
      if (histories.length > 0) {
        // 마지막 문서 저장
        setLastDoc(histories[histories.length - 1]);
        
        // 세션 기록 저장
        setSessionHistories(histories);
        
        // 더 불러올 데이터가 있는지 확인
        setHasMore(histories.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
        setSessionHistories([]);
      }
    } catch (err) {
      console.error('세션 기록 로드 오류:', err);
      setError('활동 기록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, navigate]);
  
  // 추가 데이터 로드
  const loadMoreData = useCallback(async () => {
    // 로드할 수 있는 데이터가 더 없거나 이미 로딩 중이거나 마지막 문서가 없으면 리턴
    if (!hasMore || loadingMore || loading || !lastDoc || !currentUser) return;
    
    try {
      setLoadingMore(true);
      
      // 마지막 문서 참조 사용 - _lastVisible 속성이 있으면 사용
      const lastDocRef = (lastDoc as any)._lastVisible || lastDoc;
      
      // 마지막 문서 이후부터 추가 데이터 로드
      const additionalHistories = await getSessionHistoriesByHostId(
        currentUser.uid, 
        PAGE_SIZE, 
        lastDocRef
      );
      
      if (additionalHistories.length > 0) {
        // 이전 데이터와 새 데이터 병합 (중복 제거)
        setSessionHistories(prev => {
          // 이미 존재하는 ID 필터링
          const existingIds = new Set(prev.map(h => h.id));
          const newHistories = additionalHistories.filter(h => !existingIds.has(h.id!));
          return [...prev, ...newHistories];
        });
        
        // 마지막 문서 업데이트
        setLastDoc(additionalHistories[additionalHistories.length - 1]);
        
        // 더 불러올 데이터가 있는지 확인
        setHasMore(additionalHistories.length >= PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('추가 데이터 로드 오류:', err);
      setError('추가 활동 기록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingMore(false);
    }
  }, [currentUser, lastDoc, hasMore, loadingMore, loading]);
  
  // 초기 데이터 로드
  useEffect(() => {
    loadInitialData();
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      if (observer.current) observer.current.disconnect();
    };
  }, [loadInitialData]);
  
  // 페이지 포커스 획득 시 갱신 (다른 탭에서 돌아올 때)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadInitialData(true); // 조용히 새로고침
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadInitialData]);
  
  // 새로고침 핸들러
  const handleRefresh = () => {
    loadInitialData(true);
  };
  
  const handleNavigation = (path: string) => {
    navigate(path);
  };
  
  const navigateToHistoryDetail = (historyId: string) => {
    navigate(`/host/history/${historyId}`);
  };
  
  // 비어있는 상태 메시지 메모이제이션
  const emptyStateMessage = useMemo(() => (
    <div className="text-center py-8">
      <Calendar className="mx-auto h-12 w-12 text-gray-400" />
      <h3 className="mt-2 text-lg font-medium text-gray-900">분석할 퀴즈 활동이 없습니다</h3>
      <p className="mt-1 text-sm text-gray-500">
        아직 종료된 퀴즈 활동이 없습니다. 퀴즈를 진행하고 종료하면 여기에 기록됩니다.
      </p>
      <div className="mt-6">
        <Link
          to="/host/my-quizzes"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          퀴즈 목록으로 이동
        </Link>
      </div>
    </div>
  ), []);
  
  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <HostPageHeader handleNavigation={handleNavigation} />
          <HostNavBar handleNavigation={handleNavigation} />
          <Breadcrumb items={[{ label: '결과 보고서' }]} />
          
          <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-purple-700">결과 보고서</h1>
            </div>
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingAnimation message="활동 기록을 불러오는 중" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <HostPageHeader handleNavigation={handleNavigation} />
        <HostNavBar handleNavigation={handleNavigation} />
        <Breadcrumb items={[{ label: '결과 보고서' }]} />
        
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-purple-700">결과 보고서</h1>
            {sessionHistories.length > 0 && (
              <button 
                onClick={handleRefresh} 
                disabled={refreshing}
                className="flex items-center text-purple-600 hover:text-purple-800 transition-colors"
                title="새로고침"
              >
                <RefreshCw size={18} className={`mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm">새로고침</span>
              </button>
            )}
          </div>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 mb-4 rounded-md flex justify-between items-center">
              <span>{error}</span>
              <button 
                onClick={handleRefresh}
                className="text-red-700 hover:text-red-900 text-sm font-medium"
              >
                다시 시도
              </button>
            </div>
          )}
          
          {refreshing && (
            <div className="mb-4 flex justify-center items-center py-2 bg-purple-50 rounded-md">
              <LoadingAnimation message="최신 데이터를 불러오는 중" />
            </div>
          )}
          
          {!loading && sessionHistories.length === 0 ? (
            emptyStateMessage
          ) : (
            <div className="space-y-2">
              {sessionHistories.map((history, index) => {
                // 마지막 항목인지 확인
                const isLastItem = index === sessionHistories.length - 1;
                
                return (
                  <div 
                    key={history.id}
                    ref={isLastItem ? lastHistoryElementRef : null}
                    className={`border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer border-l-8 ${getColorByQuizId(history.quiz?.id || 'unknown')}`}
                    onClick={() => navigateToHistoryDetail(history.id!)}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">{history.title}</h3>
                        <p className="text-sm text-gray-500">
                          <span className="inline-flex items-center">
                            <Clock size={14} className="mr-1" />
                            {formatRelativeTime(history.endedAt)}
                          </span>
                        </p>
                      </div>
                      <div className="mt-2 sm:mt-0 flex items-center">
                        <div className="flex flex-wrap gap-2 mr-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Users size={12} className="mr-1" />
                            참가자 {history.participantCount}명
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Clock size={12} className="mr-1" />
                            진행 시간: {calculateDuration(history.startedAt, history.endedAt)}
                          </span>
                        </div>
                        <ChevronRight size={18} className="text-gray-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {loadingMore && (
                <div className="pt-4 flex justify-center">
                  <LoadingAnimation message="추가 데이터 불러오는 중" />
                </div>
              )}
              
              {!hasMore && sessionHistories.length > 0 && (
                <div className="pt-4 text-center text-gray-500 text-sm">
                  모든 활동 기록을 불러왔습니다
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