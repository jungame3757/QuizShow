import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Wand, Calendar, Trash2, Edit, Plus, ArrowLeft, RefreshCw, Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserQuizzes, deleteQuiz } from '../../firebase/quizService';
import { Quiz } from '../../types';
import Button from '../../components/Button';
import HostNavBar from '../../components/HostNavBar';
import HostPageHeader from '../../components/HostPageHeader';

const MyQuizzes: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null); // 삭제 중인 퀴즈 ID 추적
  const [lastLoaded, setLastLoaded] = useState<number>(0); // 마지막 로드 시간 추적
  const [initialLoadDone, setInitialLoadDone] = useState(false); // 초기 로드 완료 여부 추적
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 퀴즈 목록 로드 함수를 useCallback으로 메모이제이션
  const loadQuizzes = useCallback(async (force = false) => {
    if (!currentUser) return;
    
    // 마지막 로드 후 30초가 지나지 않았고, 강제 새로고침이 아니라면 스킵
    const now = Date.now();
    if (!force && lastLoaded > 0 && now - lastLoaded < 30000 && initialLoadDone) {
      console.log('최근에 이미 로드되었습니다. 캐시된 데이터를 사용합니다.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const userQuizzes = await getUserQuizzes(currentUser.uid);
      setQuizzes(userQuizzes);
      setLastLoaded(now); // 로드 시간 업데이트
      setInitialLoadDone(true); // 초기 로드 완료 표시
    } catch (error) {
      console.error('Failed to load quizzes:', error);
      setError('퀴즈 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, initialLoadDone, lastLoaded]);

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

  const handleDeleteQuiz = async (quizId: string) => {
    if (!currentUser) return;

    try {
      setDeletingQuizId(quizId); // 삭제 시작 시 ID 설정
      await deleteQuiz(quizId, currentUser.uid);
      setQuizzes(quizzes.filter(quiz => quiz.id !== quizId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete quiz:', error);
      alert('퀴즈 삭제에 실패했습니다.');
    } finally {
      setDeletingQuizId(null); // 삭제 완료/실패 시 ID 초기화
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
  };

  // 바운싱 도트 로딩 애니메이션 컴포넌트
  const LoadingAnimation = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
        <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
        <div className="w-4 h-4 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
        <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '450ms'}}></div>
        <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '600ms'}}></div>
      </div>
      <p className="text-purple-700 font-medium">퀴즈를 불러오는 중...</p>
    </div>
  );
  
  // 비어있는 퀴즈 목록 컴포넌트
  const EmptyQuizList = () => (
    <div className="bg-white rounded-xl shadow-md p-8 text-center">
      <Wand size={48} className="mx-auto text-purple-400 mb-4" />
      <h2 className="text-xl font-semibold mb-2">아직 만든 퀴즈가 없습니다</h2>
      <p className="text-gray-600 mb-6">지금 첫 번째 퀴즈를 만들어보세요!</p>
    </div>
  );

  // 퀴즈 표시 로직
  const renderQuizList = () => {
    // 로딩 중이면 로딩 애니메이션 표시
    if (loading && !initialLoadDone) {
      return <LoadingAnimation />;
    }
    
    // 퀴즈가 없으면 빈 리스트 표시
    if (quizzes.length === 0) {
      return <EmptyQuizList />;
    }

    // 퀴즈 리스트 표시
    return (
      <div className="p-4 md:p-6">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-10 backdrop-blur-sm">
            <div className="bg-white p-4 rounded-xl shadow-md">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-4 h-4 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                <div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '450ms'}}></div>
                <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '600ms'}}></div>
              </div>
            </div>
          </div>
        )}
        <div className="grid gap-4">
          {quizzes.map(quiz => (
            <div 
              key={quiz.id} 
              className="bg-white rounded-xl shadow-sm overflow-hidden border border-purple-100 relative"
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
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 mb-1">
                          {quiz.title}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {quiz.description || '설명 없음'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center text-sm text-gray-500">
                      <Calendar size={14} className="mr-1" />
                      <span>생성: {formatDate(quiz.createdAt)}</span>
                    </div>
                    
                    <div className="mt-3">
                      <span className="text-sm text-gray-600">
                        {quiz.questions?.length || 0}개 문제
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 flex justify-between">
                    <div className="flex gap-2">
                      <Link 
                        to={`/host/manage/${quiz.id}`}
                        className="px-3 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center text-sm"
                      >
                        <Edit size={14} className="mr-1" />
                        편집
                      </Link>
                      <button
                        onClick={() => setDeleteConfirm(quiz.id)}
                        className="px-3 py-1 bg-white border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center text-sm"
                        disabled={deletingQuizId !== null} // 다른 퀴즈 삭제 중일 때 모든 삭제 버튼 비활성화
                      >
                        <Trash2 size={14} className="mr-1" />
                        삭제
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <HostPageHeader title="내 퀴즈 목록" />

        <HostNavBar />

        <div className="flex justify-end items-center mb-4">
          {lastLoaded > 0 && (
            <p className="text-xs text-gray-500 mr-2">
              마지막 업데이트: {new Date(lastLoaded).toLocaleTimeString()}
            </p>
          )}
          <button 
            onClick={handleRefresh} 
            disabled={loading}
            className="text-purple-600 hover:text-purple-800 p-2 rounded-full hover:bg-purple-100 transition-colors relative"
            aria-label="새로고침"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* 리스트 영역 */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6 relative">
          {renderQuizList()}
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