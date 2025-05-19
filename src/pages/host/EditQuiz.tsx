import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Plus, X, Check, Edit } from 'lucide-react';
import { useQuiz } from '../../contexts/QuizContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import QuestionForm from '../../components/host/create/QuestionForm';
import HostNavBar from '../../components/host/HostNavBar';
import HostPageHeader from '../../components/host/HostPageHeader';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import Breadcrumb from '../../components/ui/Breadcrumb';

const EditQuiz: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const { 
    getQuiz, 
    updateQuiz, 
    error: quizError, 
    loading: quizLoading 
  } = useQuiz();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // 퀴즈 정보 불러오기
  useEffect(() => {
    const loadQuiz = async () => {
      if (!quizId) return;
      
      try {
        setIsLoading(true);
        setError('');
        
        const quizData = await getQuiz(quizId);
        
        if (quizData) {
          setTitle(quizData.title || '');
          setDescription(quizData.description || '');
          
          // 문제 데이터 변환 (correctAnswer 필드를 index에서 실제 값으로 변환하되, 인덱스 정보도 유지)
          const formattedQuestions = Array.isArray(quizData.questions) ? 
            quizData.questions.map(q => ({
              text: q.text,
              options: q.options,
              correctAnswerIndex: q.correctAnswer, // 인덱스 정보 유지
              correctAnswer: q.options[q.correctAnswer] || ''
            })) : [];
            
          setQuestions(formattedQuestions);
          setIsFormDirty(false); // 초기 로드 후에는 더티 상태 아님
        } else {
          throw new Error('퀴즈를 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('퀴즈 로드 오류:', err);
        setError(err instanceof Error ? err.message : '퀴즈 정보를 불러오는데 실패했습니다.');
        setTimeout(() => navigate('/host/my-quizzes'), 3000);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadQuiz();
  }, [quizId, getQuiz, navigate]);
  
  // 폼 데이터가 변경될 때마다 isFormDirty 상태 업데이트
  useEffect(() => {
    if (!isLoading) {
      setIsFormDirty(true);
    }
  }, [title, description, questions, isLoading]);
  
  // 페이지를 떠날 때 경고 메시지 처리
  useEffect(() => {
    // beforeunload 이벤트 핸들러 등록
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty && !isSubmitting) {
        // 표준 메시지 (브라우저마다 다를 수 있음)
        const message = '수정 중인 내용이 있습니다. 정말로 페이지를 떠나시겠습니까?';
        e.returnValue = message;
        return message;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isFormDirty, isSubmitting]);

  // 퀴즈 업데이트 처리 - 낙관적 UI 업데이트 추가
  const handleUpdateQuiz = async () => {
    // 입력 검증
    if (!title.trim()) {
      setError('퀴즈 제목은 필수입니다.');
      return;
    }
    
    if (questions.length === 0) {
      setError('최소 1개 이상의 문제가 필요합니다.');
      return;
    }
    
    // 퀴즈 업데이트
    try {
      setIsSubmitting(true);
      setError('');
      
      // 문제 포맷 변환 (correctAnswer 필드를 실제 값에서 인덱스로 변환)
      const formattedQuestions = questions.map(q => {
        // q에 correctAnswerIndex가 있으면 그것을 사용하고, 없으면 findIndex로 계산
        const correctAnswerIndex = q.correctAnswerIndex !== undefined ? 
          q.correctAnswerIndex : 
          q.options.findIndex((opt: string) => opt === q.correctAnswer);
        
        return {
          text: q.text,
          options: q.options,
          correctAnswer: correctAnswerIndex !== -1 ? correctAnswerIndex : 0
        };
      });
      
      // 퀴즈 객체 생성
      const quizData = {
        title: title.trim(),
        description: description.trim(),
        questions: formattedQuestions,
        updatedAt: new Date().toISOString()
      };
      
      if (!quizId) {
        throw new Error('유효하지 않은 퀴즈 ID입니다.');
      }
      
      // 기존 퀴즈 데이터와 비교하여 변경사항이 있는지 확인
      const originalQuizData = await getQuiz(quizId);
      
      // 실제 변경 여부 확인 (제목, 설명, 질문 수 또는 질문 내용)
      const titleChanged = originalQuizData?.title !== title.trim();
      const descriptionChanged = originalQuizData?.description !== description.trim();
      const questionsCountChanged = originalQuizData?.questions?.length !== formattedQuestions.length;
      
      // 질문 내용 비교 (질문 수가 같을 때만)
      let questionsContentChanged = false;
      if (!questionsCountChanged && originalQuizData?.questions) {
        questionsContentChanged = formattedQuestions.some((q, index) => {
          const originalQ = originalQuizData.questions[index];
          return (
            q.text !== originalQ.text ||
            q.correctAnswer !== originalQ.correctAnswer ||
            JSON.stringify(q.options) !== JSON.stringify(originalQ.options)
          );
        });
      }
      
      const hasChanges = titleChanged || descriptionChanged || questionsCountChanged || questionsContentChanged;
      
      // 변경사항이 있을 때만 업데이트 실행
      if (hasChanges) {
        // 낙관적 UI 업데이트를 위해 상태를 미리 다음 상태로 설정
        setIsFormDirty(false);
        
        // API 호출
        await updateQuiz(quizId, quizData);
        
        // 업데이트 성공 후 세션 페이지로 이동
        navigate(`/host/session/${quizId}`);
      } else {
        // 변경사항이 없는 경우
        setIsFormDirty(false);
        navigate(`/host/session/${quizId}`);
      }
    } catch (err) {
      console.error('퀴즈 업데이트 오류:', err);
      setError(err instanceof Error ? err.message : '퀴즈 업데이트 중 오류가 발생했습니다.');
      
      // 에러 발생 시 폼이 변경된 상태로 표시
      setIsFormDirty(true);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 다른 페이지로 이동하기 전에 확인 메시지 표시
  const handleNavigation = (path: string) => {
    if (isFormDirty && !isSubmitting) {
      if (window.confirm('수정 중인 내용이 있습니다. 정말로 페이지를 떠나시겠습니까?')) {
        navigate(path);
      }
    } else {
      navigate(path);
    }
  };
  
  const handleAddQuestion = (question: any) => {
    setQuestions(prev => [...prev, question]);
    setIsAddingQuestion(false);
    setError('');
  };
  
  const handleUpdateQuestion = (question: any) => {
    if (editingQuestionIndex !== null) {
      setQuestions(prev => 
        prev.map((q, i) => i === editingQuestionIndex ? question : q)
      );
      setEditingQuestionIndex(null);
    }
  };
  
  const handleRemoveQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditQuestion = (index: number) => {
    setEditingQuestionIndex(index);
  };
  
  // 로딩 중이거나 오류 발생 시
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4 flex items-center justify-center">
        <LoadingOverlay message="퀴즈 정보를 불러오는 중..." />
      </div>
    );
  }
  
  if (error && !title) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-md max-w-md">
          <div className="text-red-600 mb-4 text-lg font-medium">{error}</div>
          <p className="mb-4 text-gray-600">퀴즈 목록으로 이동합니다...</p>
          <Button onClick={() => navigate('/host/my-quizzes')} variant="primary">
            퀴즈 목록으로 이동
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-2">
      {/* 로딩 오버레이 컴포넌트 사용 */}
      {isSubmitting && <LoadingOverlay message="변경사항을 저장하는 중..." />}
      
      <div className="max-w-4xl mx-auto">
        <HostPageHeader 
          handleNavigation={handleNavigation}
        />

        <HostNavBar handleNavigation={handleNavigation} />

        <Breadcrumb 
          items={[
            { label: '내 퀴즈 목록', path: '/host/my-quizzes' },
            { label: title || '퀴즈', path: `/host/session/${quizId}` },
            { label: '퀴즈 편집하기' }
          ]} 
        />

        <div className="bg-white rounded-xl shadow-md p-4 mb-3">
          <h1 className="text-2xl font-bold text-purple-700 mb-4">퀴즈 편집하기</h1>
          
          {(error || quizError) && (
            <div className="bg-red-100 text-red-700 p-2 rounded-md mb-3 text-sm">
              {error || quizError}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                퀴즈 제목
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="퀴즈를 위한 흥미로운 제목을 입력하세요"
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-lg font-medium text-gray-700 mb-2">
                설명 (선택사항)
              </label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="이 퀴즈는 무엇에 관한 것인가요?"
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-3 mb-3">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-purple-700">문제</h2>
          </div>
          
          {questions.length === 0 && !isAddingQuestion && (
            <div className="text-center py-6 bg-purple-50 rounded-lg">
              <p className="text-gray-600 mb-3 text-sm">아직 추가된 문제가 없습니다</p>
              <Button 
                onClick={() => setIsAddingQuestion(true)}
                variant="primary"
                size="medium"
                className="py-2 px-4"
              >
                <Plus size={16} className="mr-2" /> 첫 문제 추가하기
              </Button>
            </div>
          )}
          
          {questions.length > 0 && (
            <div className="space-y-2 mb-2">
              {questions.map((question, index) => (
                <div 
                  key={index} 
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-purple-100"
                >
                  {editingQuestionIndex === index ? (
                    <div className="border-l-4 border-blue-500 pl-3 p-3">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-medium text-blue-700">문제 {index + 1} 수정</h3>
                        <button 
                          onClick={() => setEditingQuestionIndex(null)}
                          className="text-gray-500 hover:text-gray-700"
                          aria-label="수정 취소"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <QuestionForm 
                        initialData={question}
                        onSave={handleUpdateQuestion}
                        onCancel={() => setEditingQuestionIndex(null)}
                        maxOptions={4}
                      />
                    </div>
                  ) : (
                    <div className="p-3">
                      <div className="flex justify-between items-center mb-2">
                        <div className="inline-block px-2 py-0.5 bg-purple-200 rounded-md font-medium text-purple-800 text-xs">문제 {index + 1}</div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEditQuestion(index)}
                            className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-colors"
                            aria-label="문제 수정"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => handleRemoveQuestion(index)}
                            className="w-7 h-7 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition-colors"
                            aria-label="문제 삭제"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-gray-800 text-base font-medium line-clamp-1 mb-2">{question.text}</div>
                      <div className="bg-purple-50 rounded-md p-3 w-full border border-purple-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {question.options.map((option: string, optIdx: number) => (
                            <div key={optIdx} className="flex items-center">
                              {question.correctAnswerIndex === optIdx ? (
                                <div className="flex items-center px-2 py-1 bg-green-50 border border-green-200 rounded-md text-green-700 w-full">
                                  <Check size={14} className="mr-1 flex-shrink-0" /> 
                                  <span className="truncate">{option}</span>
                                </div>
                              ) : (
                                <div className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-gray-600 ml-4 w-full truncate">
                                  {option}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {questions.length > 0 && !isAddingQuestion && !editingQuestionIndex && (
            <div className="flex justify-center mt-3">
              <Button 
                onClick={() => setIsAddingQuestion(true)}
                variant="secondary"
                size="small"
                className="text-xs py-1 px-3 h-7"
              >
                <Plus size={14} className="mr-1" /> 문제 추가
              </Button>
            </div>
          )}
          
          {isAddingQuestion && (
            <div className="bg-purple-50 rounded-lg overflow-hidden mb-2">
              <div className="bg-purple-200 px-2 py-1 flex justify-between items-center">
                <h3 className="text-sm font-medium text-purple-800">새 문제 추가</h3>
                <button 
                  onClick={() => setIsAddingQuestion(false)}
                  className="text-purple-700 hover:text-purple-900"
                  aria-label="추가 취소"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-2">
                <QuestionForm 
                  onSave={handleAddQuestion}
                  onCancel={() => setIsAddingQuestion(false)}
                  maxOptions={4}
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-center mt-6">
          <Button 
            onClick={handleUpdateQuiz}
            variant="primary"
            disabled={!title || questions.length === 0 || isSubmitting || quizLoading}
          >
            {isSubmitting ? (
              <span>저장 중...</span>
            ) : (
              <>
                <Save size={18} className="mr-2" /> 변경사항 저장
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditQuiz; 