import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Wand, Calendar, Trash2, Edit, Plus, RefreshCw, Loader, Play, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';
import { getUserQuizzes, deleteQuiz } from '../../firebase/quizService';
import { Quiz } from '../../types';
import Button from '../../components/Button';
import HostNavBar from '../../components/HostNavBar';
import HostPageHeader from '../../components/HostPageHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import LoadingAnimation from '../../components/LoadingAnimation';

interface EnhancedQuiz extends Quiz {
  hasActiveSession?: boolean;
  sessionId?: string;
}

const MyQuizzes: React.FC = () => {
  const [quizzes, setQuizzes] = useState<EnhancedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const [lastLoaded, setLastLoaded] = useState<number>(0);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [refreshCooldown, setRefreshCooldown] = useState(0);
  const [startingQuizId, setStartingQuizId] = useState<string | null>(null);
  const [checkingSessions, setCheckingSessions] = useState(false);
  
  const { currentUser } = useAuth();
  const { 
    error: sessionError, 
    loadSessionsForHost,
    cleanupSession,
    getSessionsByQuizId
  } = useSession();
  
  const navigate = useNavigate();
  const location = useLocation();

  // 퀴즈 목록 로드 및 각 퀴즈의 활성 세션 상태 확인
  const loadQuizzes = useCallback(async (force = false) => {
    if (!currentUser) return;
    
    // 마지막 로드 후 30초가 지나지 않았고, 강제 새로고침이 아니라면 스킵
    const now = Date.now();
    if (!force && lastLoaded > 0 && now - lastLoaded < 30000 && initialLoadDone) {
      console.log('최근에 이미 로드되었습니다. 캐시된 데이터를 사용합니다.');
      setLoading(false);
      setCheckingSessions(false);
      return;
    }

    try {
      // 퀴즈 로딩 시작
      setLoading(true);
      setError(null);
      
      // 퀴즈 목록 로드
      const userQuizzes = await getUserQuizzes(currentUser.uid);
      
      // 세션 정보 로딩 시작
      setCheckingSessions(true);
      // 현재 로딩은 끝났지만 세션 체크는 계속 진행 중
      setLoading(false); 
      
      // 호스트의 모든 세션 로드
      console.log('세션 정보 확인 중...');
      const hostSessions = await loadSessionsForHost();
      console.log('세션 정보 확인 완료');
      
      // 퀴즈와 세션 정보 결합
      const enhancedQuizzes = userQuizzes.map(quiz => {
        const quizSessions = hostSessions.filter(session => session.quizId === quiz.id);
        // 첫 번째 세션만 활성 세션으로 간주
        const activeSession = quizSessions.length > 0 ? quizSessions[0] : null;
        
        return {
          ...quiz,
          hasActiveSession: !!activeSession,
          sessionId: activeSession?.id
        };
      });
      
      // 활성화된 세션이 있는 퀴즈를 상단에 배치하기 위해 정렬
      const sortedQuizzes = [...enhancedQuizzes].sort((a, b) => {
        // 활성 세션이 있는 퀴즈가 먼저 오도록 정렬
        if (a.hasActiveSession && !b.hasActiveSession) return -1;
        if (!a.hasActiveSession && b.hasActiveSession) return 1;
        
        // 둘 다 활성 세션이 있거나 없는 경우 생성일 기준 최신순으로 정렬
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setQuizzes(sortedQuizzes);
      setLastLoaded(now);
      setInitialLoadDone(true);
    } catch (error) {
      console.error('퀴즈 목록 로드 실패:', error);
      setError('퀴즈 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setCheckingSessions(false);
    }
  }, [currentUser, initialLoadDone, lastLoaded, loadSessionsForHost]);

  // 첫 렌더링 또는 사용자 변경 시 로드
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    loadQuizzes();
  }, [currentUser, navigate, loadQuizzes]);

  // 페이지 포커스 획득 시 데이터가 오래된 경우만 다시 로드
  useEffect(() => {
    const handleFocus = () => {
      const now = Date.now();
      // 5분(300000ms) 이상 지났으면 다시 로드
      if (lastLoaded > 0 && now - lastLoaded > 300000) {
        loadQuizzes(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [lastLoaded, loadQuizzes]);

  // location.key가 변경될 때(다른 페이지에서 돌아올 때) 마지막 로드 시간 확인
  useEffect(() => {
    const now = Date.now();
    // 1분(60000ms) 이상 지났으면 다시 로드
    if (lastLoaded > 0 && now - lastLoaded > 60000) {
      loadQuizzes(true);
    }
  }, [location.key, loadQuizzes, lastLoaded]);

  // 세션 에러 처리
  useEffect(() => {
    if (sessionError) {
      setError(sessionError);
    }
  }, [sessionError]);

  const handleDeleteQuiz = async (quizId: string) => {
    if (!currentUser) return;

    try {
      setDeletingQuizId(quizId);
      
      // 삭제하려는 퀴즈의 정보 얻기
      const quizToDelete = quizzes.find(quiz => quiz.id === quizId);
      
      // 퀴즈에 활성화된 세션이 있는 경우, 세션 먼저 삭제
      if (quizToDelete?.hasActiveSession && quizToDelete?.sessionId) {
        try {
          console.log(`활성화된 세션 삭제 중: ${quizToDelete.sessionId}`);
          await cleanupSession(quizToDelete.sessionId);
          console.log('세션 삭제 완료');
        } catch (sessionError) {
          console.error('세션 삭제 실패:', sessionError);
          // 세션 삭제 실패해도 퀴즈 삭제 계속 진행
        }
      } else {
        // 활성화되지 않은 세션이 있는지 확인하고 모두 삭제
        try {
          const sessions = await getSessionsByQuizId(quizId);
          for (const session of sessions) {
            console.log(`관련 세션 삭제 중: ${session.id}`);
            await cleanupSession(session.id);
          }
          console.log(`${sessions.length}개의 세션 삭제 완료`);
        } catch (sessionsError) {
          console.error('세션 목록 조회 또는 삭제 실패:', sessionsError);
          // 세션 삭제 실패해도 퀴즈 삭제 계속 진행
        }
      }
      
      // 퀴즈 삭제
      await deleteQuiz(quizId, currentUser.uid);
      setQuizzes(quizzes.filter(quiz => quiz.id !== quizId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('퀴즈 삭제 실패:', error);
      alert('퀴즈 삭제에 실패했습니다.');
    } finally {
      setDeletingQuizId(null);
    }
  };

  // 퀴즈 시작 핸들러 - 세션 유효성 검사 추가
  const handleStartQuiz = async (quiz: EnhancedQuiz) => {
    try {
      setStartingQuizId(quiz.id);
      setError(null);
      
      // 이미 활성화된 세션이 있는 경우
      if (quiz.hasActiveSession && quiz.sessionId) {
        console.log("기존 활성 세션으로 이동:", quiz.sessionId);
        navigate(`/host/session/${quiz.id}?sessionId=${quiz.sessionId}`);
        return;
      }
      
      // 활성화된 세션이 없으면 세션 관리 페이지만 이동 (세션 자동 생성 X)
      console.log("활성 세션 없음, 세션 관리 페이지로 이동:", quiz.id);
      navigate(`/host/session/${quiz.id}`);
    } catch (err) {
      console.error('퀴즈 세션 페이지 이동 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '세션 페이지 이동에 실패했습니다.';
      setError(errorMessage);
      navigate(`/host/session/${quiz.id}`);
    } finally {
      setStartingQuizId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 수동 새로고침 핸들러
  const handleRefresh = () => {
    loadQuizzes(true);
    setRefreshCooldown(3);
  };

  // 쿨타임 카운트다운
  useEffect(() => {
    if (refreshCooldown <= 0) return;
    
    const timer = setInterval(() => {
      setRefreshCooldown(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [refreshCooldown]);

  // 로딩 상태 확인 함수 - 퀴즈 로딩 또는 세션 체크 중 하나라도 진행 중이면 true
  const isLoading = loading || checkingSessions;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4">
      {/* 삭제 중이거나 세션 생성 중일 때 로딩 오버레이 표시 */}
      {(deletingQuizId || startingQuizId) && (
        <LoadingOverlay 
          message={
            startingQuizId 
              ? "퀴즈 세션을 준비하는 중..." 
              : "퀴즈를 삭제하는 중..."
          } 
        />
      )}
      
      <div className="max-w-4xl mx-auto">
        <HostPageHeader />

        <HostNavBar />

        <div className="flex justify-end items-center mb-4">
          {lastLoaded > 0 && (
            <p className="text-xs text-gray-500 mr-2">
              마지막 업데이트: {new Date(lastLoaded).toLocaleTimeString()}
            </p>
          )}
          <button 
            onClick={handleRefresh} 
            disabled={isLoading || refreshCooldown > 0}
            className={`p-2 rounded-full transition-colors relative ${
              refreshCooldown > 0 
                ? "text-gray-400 bg-gray-100 cursor-not-allowed" 
                : "text-purple-600 hover:text-purple-800 hover:bg-purple-100"
            }`}
            aria-label="새로고침"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6 relative">
          <h1 className="text-3xl font-bold text-purple-700 p-6">내 퀴즈 목록</h1>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingAnimation message={checkingSessions ? "세션 정보를 확인하는 중" : "퀴즈를 불러오는 중"} />
            </div>
          ) : quizzes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <Wand size={48} className="mx-auto text-purple-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">아직 만든 퀴즈가 없습니다</h2>
              <p className="text-gray-600 mb-6">지금 첫 번째 퀴즈를 만들어보세요!</p>
            </div>
          ) : (
            <div className="p-4 md:p-6">
              <div className="grid gap-4">
                {quizzes.map(quiz => (
                  <div 
                    key={quiz.id} 
                    className={`bg-white rounded-xl shadow-sm overflow-hidden border ${
                      quiz.hasActiveSession ? 'border-green-300' : 'border-purple-100'
                    } relative`}
                  >
                    {deleteConfirm === quiz.id ? (
                      <div className="bg-red-50 p-4 border-l-4 border-red-500">
                        <p className="text-red-800 font-medium mb-3">
                          정말로 이 퀴즈를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                        </p>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 transition-colors"
                            disabled={deletingQuizId === quiz.id}
                          >
                            취소
                          </button>
                          <button
                            onClick={() => handleDeleteQuiz(quiz.id)}
                            className="px-3 py-1 bg-red-600 rounded-md text-white hover:bg-red-700 transition-colors flex items-center"
                            disabled={deletingQuizId === quiz.id}
                          >
                            {deletingQuizId === quiz.id ? (
                              <>
                                <Loader size={14} className="animate-spin mr-1" />
                                삭제 중...
                              </>
                            ) : (
                              '삭제 확인'
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {quiz.hasActiveSession && (
                          <div className="absolute top-3 right-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
                              활동 켜짐
                            </span>
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-xl font-bold text-gray-800 mb-1 pr-20">
                                {quiz.title}
                              </h3>
                              <p className="text-gray-600 text-sm">
                                {quiz.description || '설명 없음'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex items-center text-sm text-gray-500">
                            <Calendar size={14} className="mr-1" />
                            <span>{formatDate(quiz.createdAt)}</span>
                          </div>
                        </div>
                        
                        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 flex justify-between">
                          <div className="flex gap-2">
                            <Link 
                              to={`/host/edit/${quiz.id}`}
                              className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center text-sm"
                            >
                              <Edit size={14} className="mr-1" />
                              편집
                            </Link>
                            <button
                              onClick={() => setDeleteConfirm(quiz.id)}
                              className="px-3 py-1 bg-white border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center text-sm"
                              disabled={deletingQuizId !== null || startingQuizId !== null}
                            >
                              <Trash2 size={14} className="mr-1" />
                              삭제
                            </button>
                          </div>
                          <button 
                            onClick={() => handleStartQuiz(quiz)}
                            className={`px-3 py-1 rounded-md flex items-center text-sm ${
                              quiz.hasActiveSession 
                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                : "bg-purple-600 hover:bg-purple-700 text-white"
                            }`}
                            disabled={startingQuizId !== null}
                          >
                            {startingQuizId === quiz.id ? (
                              <>
                                <Loader size={14} className="animate-spin mr-1" />
                                준비 중...
                              </>
                            ) : quiz.hasActiveSession ? (
                              <>
                                <Play size={14} className="mr-1" />
                                계속하기
                              </>
                            ) : (
                              <>
                                <Play size={14} className="mr-1" />
                                시작하기
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-center mt-6">
          <Link to="/host/create">
            <Button variant="primary" className="flex items-center">
              <Plus size={18} className="mr-1" /> 새 퀴즈 만들기
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MyQuizzes; 