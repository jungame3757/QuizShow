import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check, X, Edit, Star } from 'lucide-react';
import { useQuiz } from '../../contexts/QuizContext';
import { useSession } from '../../contexts/SessionContext';
import Button from '../../components/Button';
import Input from '../../components/Input';
import QuestionForm from '../../components/QuestionForm';
import HostNavBar from '../../components/HostNavBar';
import HostPageHeader from '../../components/HostPageHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import Breadcrumb from '../../components/Breadcrumb';

const CreateQuiz: React.FC = () => {
  const navigate = useNavigate();
  const { createQuiz, error: quizError, loading: quizLoading } = useQuiz();
  const { createSessionForQuiz, loading: sessionLoading, error: sessionError } = useSession();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  
  // 폼 데이터가 변경될 때마다 isFormDirty 상태 업데이트
  useEffect(() => {
    if (title.trim() !== '' || description.trim() !== '' || questions.length > 0) {
      setIsFormDirty(true);
    }
  }, [title, description, questions]);
  
  // 페이지를 떠날 때 경고 메시지 처리
  useEffect(() => {
    // beforeunload 이벤트 핸들러 등록
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty && !isSubmitting) {
        // 표준 메시지 (브라우저마다 다를 수 있음)
        const message = '작성 중인 내용이 있습니다. 정말로 페이지를 떠나시겠습니까?';
        e.returnValue = message;
        return message;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isFormDirty, isSubmitting]);
  
  const handleCreateQuiz = async () => {
    try {
      setError('');
      setIsSubmitting(true);
      
      if (!title.trim()) {
        setError('퀴즈 제목을 입력해주세요');
        setIsSubmitting(false);
        return;
      }
      
      if (questions.length === 0) {
        setError('최소 한 개의 문제를 추가해주세요');
        setIsSubmitting(false);
        return;
      }
      
      // 퀴즈를 생성할 때 모든 문제를 포함하여 한 번에 저장
      try {
        const quizId = await createQuiz({
          title: title.trim(),
          description: description.trim(),
          questions: questions.map(q => ({
            id: Math.random().toString(36).substring(2, 9),
            text: q.text,
            options: Array.isArray(q.options) ? q.options : [],
            correctAnswer: q.correctAnswer,
            correctAnswerIndex: q.correctAnswerIndex,
          })),
          createdAt: new Date().toISOString()
        });
        
        console.log("퀴즈 생성 완료, ID:", quizId);
        
        // 퀴즈 생성 후 즉시 세션 생성
        const sessionId = await createSessionForQuiz(quizId);
        console.log("세션 생성 완료, ID:", sessionId);
        
        setIsFormDirty(false); // 폼 저장 시 더티 상태 초기화
        
        // 세션 페이지로 이동
        navigate(`/host/session/${quizId}`);
      } catch (createError) {
        console.error("퀴즈/세션 생성 실패:", createError);
        setError(createError instanceof Error ? 
          createError.message : '퀴즈 생성에 실패했습니다. 다시 시도해주세요.');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("퀴즈 생성 중 오류:", err);
      setError('퀴즈 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 다른 페이지로 이동하기 전에 확인 메시지 표시
  const handleNavigation = (path: string) => {
    if (isFormDirty && !isSubmitting) {
      if (window.confirm('작성 중인 내용이 있습니다. 정말로 페이지를 떠나시겠습니까?')) {
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4">
      {/* 로딩 오버레이 컴포넌트 사용 */}
      {isSubmitting && <LoadingOverlay message="퀴즈와 세션을 생성하는 중..." />}
      
      <div className="max-w-4xl mx-auto">
        <HostPageHeader 
          handleNavigation={handleNavigation}
        />
        <HostNavBar handleNavigation={handleNavigation} />
        <Breadcrumb items={[{ label: '새 퀴즈 만들기' }]} />
        
        {(error || quizError || sessionError) && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            {error || quizError || sessionError}
          </div>
        )}
        
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6 relative">
          <h1 className="text-2xl font-bold text-purple-700 p-6">새 퀴즈 만들기</h1>
          
          <div className="p-4 md:p-6">
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
            onClick={handleCreateQuiz}
            variant="primary"
            disabled={!title || questions.length === 0 || isSubmitting || quizLoading || sessionLoading}
          >
            {isSubmitting ? (
              <span>처리 중...</span>
            ) : (
              '퀴즈 만들기'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateQuiz;