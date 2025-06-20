import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Wand, Calendar, Trash2, Edit, Plus, RefreshCw, Loader, Play, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';
import { getUserQuizzes, deleteQuiz } from '../../firebase/quizService';
import { Quiz } from '../../types';
import Button from '../../components/ui/Button';
import HostNavBar from '../../components/host/HostNavBar';
import HostPageHeader from '../../components/host/HostPageHeader';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import LoadingAnimation from '../../components/ui/LoadingAnimation';
import Breadcrumb from '../../components/ui/Breadcrumb';

// 모달 컴포넌트 임포트
import { 
  EditWarningModal, 
  DeleteWarningModal
} from '../../components/ui/modals';

interface EnhancedQuiz extends Quiz {
  hasActiveSession?: boolean;
  sessionId?: string;
  sessionExpiresAt?: number;
}

const MyQuizzes: React.FC = () => {
  const [quizzes, setQuizzes] = useState<EnhancedQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);
  const [startingQuizId, setStartingQuizId] = useState<string | null>(null);
  const [showEditWarning, setShowEditWarning] = useState<string | null>(null);
  const [showDeleteWarning, setShowDeleteWarning] = useState<string | null>(null);
  
  const { currentUser } = useAuth();
  const { 
    error: sessionError, 
    loadSessionsForHost,
    cleanupSession,
    getSessionsByQuizId
  } = useSession();
  
  const navigate = useNavigate();
  const location = useLocation();

  // 퀴즈 목록 로드 최적화 함수
  const loadQuizzes = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // 병렬로 퀴즈와 세션 데이터 가져오기
      const [quizzesResult, hostSessions] = await Promise.all([
        getUserQuizzes(currentUser.uid),
        loadSessionsForHost()
      ]);
      
      // 세션 데이터를 퀴즈 ID 기준으로 빠르게 조회할 수 있도록 매핑
      const sessionsByQuizId = hostSessions.reduce((acc: Record<string, any>, session: any) => {
        if (session.quizId) {
          if (!acc[session.quizId]) {
            acc[session.quizId] = [];
          }
          acc[session.quizId].push(session);
        }
        return acc;
      }, {});
      
      // getUserQuizzes는 항상 배열을 반환하도록 수정됨
      const userQuizzes: Quiz[] = quizzesResult;
      
      // 퀴즈 정보와 세션 정보 병합
      const enhancedQuizzes = userQuizzes.map((quiz: Quiz) => {
        const quizSessions = sessionsByQuizId[quiz.id] || [];
        const activeSession = quizSessions.length > 0 ? quizSessions[0] : null;
        
        return {
          ...quiz,
          hasActiveSession: !!activeSession,
          sessionId: activeSession?.id,
          sessionExpiresAt: activeSession?.expiresAt || null
        };
      });
      
      // 활성 세션 유무 및 생성일 기준으로 정렬
      const sortedQuizzes = [...enhancedQuizzes].sort((a, b) => {
        if (a.hasActiveSession && !b.hasActiveSession) return -1;
        if (!a.hasActiveSession && b.hasActiveSession) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setQuizzes(sortedQuizzes);
    } catch (error) {
      console.error('퀴즈 목록 로드 실패:', error);
      setError('퀴즈 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, loadSessionsForHost]);

  // 첫 렌더링 또는 사용자 변경 시 로드
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    loadQuizzes();
  }, [currentUser, navigate, loadQuizzes]);

  // location.key가 변경될 때(다른 페이지에서 돌아올 때) 로드
  useEffect(() => {
    loadQuizzes();
  }, [location.key, loadQuizzes]);

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
      
      // deleteConfirm 상태 대신 showDeleteWarning 상태 초기화
      setShowDeleteWarning(null);
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

  // 남은 시간 계산 함수 추가
  const formatRemainingTime = (expiresAt: number) => {
    if (!expiresAt) return null;
    
    const now = Date.now();
    const remaining = expiresAt - now;
    
    // 만료된 경우
    if (remaining <= 0) return "만료됨";
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    // 가장 큰 단위만 표시
    if (days > 0) {
      return `${days}일 남음`;
    } else if (hours > 0) {
      return `${hours}시간 남음`;
    } else {
      return `${minutes}분 남음`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-3 sm:p-4">
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
        <Breadcrumb items={[{ label: '내 퀴즈 목록' }]} />

        {error && (
          <div className="bg-red-100 text-red-700 p-3 sm:p-4 rounded-lg mb-3 sm:mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-4 sm:mb-6 relative">
          <div className="flex justify-between items-center p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-purple-700">내 퀴즈 목록</h1>
            {!loading && quizzes.length > 0 && (
              <button 
                onClick={loadQuizzes} 
                className="flex items-center text-purple-600 hover:text-purple-800 transition-colors"
                title="새로고침"
              >
                <RefreshCw size={16} className="mr-1" />
                <span className="text-sm hidden sm:inline">새로고침</span>
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12">
              <LoadingAnimation message="퀴즈와 세션 정보를 불러오는 중" />
            </div>
          ) : quizzes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 text-center">
              <Wand size={40} className="mx-auto text-purple-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">아직 만든 퀴즈가 없습니다</h2>
              <p className="text-gray-600 mb-6">지금 첫 번째 퀴즈를 만들어보세요!</p>
            </div>
          ) : (
            <div className="p-3 sm:p-6">
              <div className="grid gap-3 sm:gap-4">
                {quizzes.map(quiz => (
                  <div 
                    key={quiz.id} 
                    className="bg-white relative overflow-hidden rounded-lg sm:rounded-xl"
                    style={{
                      boxShadow: quiz.hasActiveSession 
                        ? (quiz.sessionExpiresAt && quiz.sessionExpiresAt < Date.now() 
                          ? '0 3px 0 rgba(249, 115, 22, 0.5)' 
                          : '0 3px 0 rgba(20, 184, 166, 0.5)') 
                        : '0 3px 0 rgba(98, 58, 162, 0.3)',
                      border: quiz.hasActiveSession 
                        ? (quiz.sessionExpiresAt && quiz.sessionExpiresAt < Date.now() 
                          ? '2px solid #F97316' 
                          : '2px solid #0D9488') 
                        : '2px solid rgba(139, 92, 246, 0.5)',
                      borderRadius: '16px',
                      background: quiz.hasActiveSession 
                        ? (quiz.sessionExpiresAt && quiz.sessionExpiresAt < Date.now() 
                          ? 'linear-gradient(to bottom right, #fff, #fff8f0)' 
                          : 'linear-gradient(to bottom right, #fff, #f0fffc)') 
                        : 'linear-gradient(to bottom right, #fff, #fafaff)'
                    }}
                  >
                    <div className="p-4 sm:p-5">
                      {/* 헤더 영역: 퀴즈 제목과 상태 배지 */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 mr-3">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1.5 break-words">
                            {quiz.title}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {quiz.description || '설명 없음'}
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          {quiz.hasActiveSession ? (
                            quiz.sessionExpiresAt && quiz.sessionExpiresAt < Date.now() ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300 whitespace-nowrap">
                                <span className="w-2 h-2 mr-1 bg-orange-500 rounded-full"></span>
                                만료됨
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 border border-teal-300 whitespace-nowrap">
                                <span className="w-2 h-2 mr-1 bg-teal-500 rounded-full animate-pulse"></span>
                                활동 켜짐
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300 whitespace-nowrap">
                              <span className="w-2 h-2 mr-1 bg-gray-500 rounded-full"></span>
                              활동 꺼짐
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* 하단 영역: 날짜 정보, 버튼 그룹 */}
                      <div className="flex flex-wrap items-center justify-between gap-y-3">
                        {/* 날짜 및 시간 정보 */}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar size={14} className="mr-1.5" />
                            <span>{formatDate(quiz.createdAt)}</span>
                          </div>
                          {quiz.hasActiveSession && quiz.sessionExpiresAt && (
                            <div className="flex items-center text-teal-600 font-medium">
                              <Clock size={14} className="mr-1.5" />
                              <span>{formatRemainingTime(quiz.sessionExpiresAt)}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* 버튼 그룹 */}
                        <div className="flex items-center gap-3 ml-auto">
                          {/* 편집/삭제 버튼 */}
                          <div className="flex space-x-2">
                            {quiz.hasActiveSession ? (
                              <button 
                                onClick={() => setShowEditWarning(quiz.id)}
                                className="px-2.5 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center"
                                aria-label="퀴즈 편집"
                              >
                                <Edit size={14} className="mr-1.5" />
                                <span className="whitespace-nowrap text-xs sm:text-sm font-medium">편집</span>
                              </button>
                            ) : (
                              <Link 
                                to={`/host/edit/${quiz.id}`}
                                className="px-2.5 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center"
                                aria-label="퀴즈 편집"
                              >
                                <Edit size={14} className="mr-1.5" />
                                <span className="whitespace-nowrap text-xs sm:text-sm font-medium">편집</span>
                              </Link>
                            )}
                            <button
                              onClick={() => setShowDeleteWarning(quiz.id)}
                              className="px-2.5 py-1.5 bg-white border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center justify-center"
                              disabled={deletingQuizId !== null || startingQuizId !== null}
                              aria-label="퀴즈 삭제"
                            >
                              <Trash2 size={14} className="mr-1.5" />
                              <span className="whitespace-nowrap text-xs sm:text-sm font-medium">삭제</span>
                            </button>
                          </div>
                          
                          {/* 메인 액션 버튼 */}
                          <button
                            onClick={() => handleStartQuiz(quiz)}
                            className={`sm:flex-shrink-0 px-3 py-1.5 rounded-md flex items-center justify-center text-sm font-bold ${
                              quiz.hasActiveSession
                                ? "bg-gradient-to-r from-green-600 to-green-500 text-white"
                                : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                            }`}
                            style={{
                              boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
                              border: '2px solid #000',
                              borderRadius: '8px',
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
                            disabled={startingQuizId !== null}
                            aria-label={quiz.hasActiveSession ? "퀴즈 계속하기" : "퀴즈 시작하기"}
                          >
                            {startingQuizId === quiz.id ? (
                              <>
                                <Loader size={16} className="animate-spin mr-2" />
                                <span className="whitespace-nowrap">준비 중...</span>
                              </>
                            ) : quiz.hasActiveSession ? (
                              <>
                                <Play size={16} className="mr-2" />
                                <span className="whitespace-nowrap">계속하기</span>
                              </>
                            ) : (
                              <>
                                <Play size={16} className="mr-2" />
                                <span className="whitespace-nowrap">시작하기</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-center mt-4 sm:mt-6">
          <Link to="/host/create">
            <Button
              variant="primary"
              className="flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-gradient-to-r from-purple-600 to-indigo-600"
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
              <Plus size={16} className="mr-1 sm:mr-2" /> 새 퀴즈 만들기
            </Button>
          </Link>
        </div>
      </div>

      {/* 편집 경고 모달 */}
      <EditWarningModal
        isOpen={!!showEditWarning}
        onClose={() => setShowEditWarning(null)}
        quizId={showEditWarning || ''}
      />
      
      {/* 삭제 경고 모달 - 여기서 바로 삭제 처리 */}
      {showDeleteWarning && (
        <DeleteWarningModal
          isOpen={true}
          onClose={() => setShowDeleteWarning(null)}
          onConfirm={() => {
            const quizId = showDeleteWarning;
            setShowDeleteWarning(null);
            handleDeleteQuiz(quizId);
          }}
          hasActiveSession={!!quizzes.find(q => q.id === showDeleteWarning)?.hasActiveSession}
        />
      )}
    </div>
  );
};

export default MyQuizzes; 