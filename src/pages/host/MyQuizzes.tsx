import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wand, Calendar, Trash2, Edit, Eye, Copy, ArrowLeft, Plus } from 'lucide-react';
import { User } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { getUserQuizzes, deleteQuiz } from '../../firebase/quizService';
import { Quiz } from '../../types';
import Button from '../../components/Button';

const MyQuizzes: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    loadQuizzes();
  }, [currentUser, navigate]);

  const loadQuizzes = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);
      const userQuizzes = await getUserQuizzes(currentUser as User);
      setQuizzes(userQuizzes);
    } catch (error) {
      console.error('Failed to load quizzes:', error);
      setError('퀴즈 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!currentUser) return;

    try {
      await deleteQuiz(quizId, currentUser as User);
      setQuizzes(quizzes.filter(quiz => quiz.id !== quizId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete quiz:', error);
      alert('퀴즈 삭제에 실패했습니다.');
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert(`초대 코드 ${code}가 클립보드에 복사되었습니다.`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting':
        return '대기 중';
      case 'active':
        return '진행 중';
      case 'completed':
        return '완료됨';
      default:
        return '알 수 없음';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link to="/" className="mr-4 text-purple-600 hover:text-purple-800 transition-colors">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-purple-800">내 퀴즈 목록</h1>
          </div>
          <Link to="/host/create">
            <Button variant="primary" size="small" className="flex items-center">
              <Plus size={18} className="mr-1" /> 새 퀴즈 만들기
            </Button>
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {quizzes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <Wand size={48} className="mx-auto text-purple-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">아직 만든 퀴즈가 없습니다</h2>
            <p className="text-gray-600 mb-6">지금 첫 번째 퀴즈를 만들어보세요!</p>
            <Link to="/host/create">
              <Button variant="primary" className="mx-auto">
                퀴즈 만들기 시작하기
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6">
            {quizzes.map(quiz => (
              <div 
                key={quiz.id} 
                className="bg-white rounded-xl shadow-md overflow-hidden border border-purple-100"
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
                      >
                        취소
                      </button>
                      <button
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="px-3 py-1 bg-red-600 rounded-md text-white hover:bg-red-700 transition-colors"
                      >
                        삭제 확인
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-4 md:p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-xl font-bold text-gray-800 mb-1">
                            {quiz.title}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {quiz.description || '설명 없음'}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusClass(quiz.status)}`}>
                          {getStatusText(quiz.status)}
                        </span>
                      </div>
                      
                      <div className="mt-4 flex items-center text-sm text-gray-500">
                        <Calendar size={14} className="mr-1" />
                        <span>생성: {formatDate(quiz.createdAt)}</span>
                      </div>
                      
                      <div className="mt-3 flex items-center text-sm bg-blue-50 p-2 rounded">
                        <span className="font-medium mr-2">초대 코드:</span>
                        <code className="bg-white px-2 py-1 rounded font-mono">{quiz.inviteCode}</code>
                        <button 
                          onClick={() => copyInviteCode(quiz.inviteCode)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                          title="코드 복사"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                      
                      <div className="mt-3">
                        <span className="text-sm text-gray-600">
                          {quiz.questions.length}개 문제
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
                          관리
                        </Link>
                        <button
                          onClick={() => setDeleteConfirm(quiz.id)}
                          className="px-3 py-1 bg-white border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center text-sm"
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
        )}
      </div>
    </div>
  );
};

export default MyQuizzes; 