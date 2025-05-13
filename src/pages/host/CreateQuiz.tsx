import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check, X, Edit} from 'lucide-react';
import { useQuiz } from '../../contexts/QuizContext';
import { useSession } from '../../contexts/SessionContext';
import Button from '../../components/Button';
import Input from '../../components/Input';
import QuestionForm from '../../components/QuestionForm';
import HostNavBar from '../../components/HostNavBar';
import HostPageHeader from '../../components/HostPageHeader';
import LoadingOverlay from '../../components/LoadingOverlay';

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

        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold text-purple-700 mb-6">새 퀴즈 만들기</h1>
          
          {(error || quizError || sessionError) && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
              {error || quizError || sessionError}
            </div>
          )}
          
          <div className="space-y-6">
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

        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-purple-700 mb-6">문제</h2>
          
          {questions.length === 0 && !isAddingQuestion && editingQuestionIndex === null && (
            <div className="text-center py-8 bg-purple-50 rounded-xl">
              <p className="text-gray-600 mb-4">아직 추가된 문제가 없습니다</p>
              <Button 
                onClick={() => setIsAddingQuestion(true)}
                variant="primary"
              >
                <Plus size={20} className="mr-2" /> 첫 번째 문제 추가하기
              </Button>
            </div>
          )}
          
          {questions.length > 0 && editingQuestionIndex === null && (
            <div className="space-y-4 mb-6">
              {questions.map((question, index) => (
                <div 
                  key={index} 
                  className="bg-purple-50 rounded-xl p-4 flex items-start justify-between"
                >
                  <div>
                    <div className="font-medium text-purple-800">문제 {index + 1}</div>
                    <div className="text-gray-700">{question.text}</div>
                    <div className="mt-2 flex items-center">
                      <span className="text-green-600 flex items-center">
                        <Check size={16} className="mr-1" /> {question.correctAnswer}
                      </span>
                    </div>
                  </div>
                  <div className="flex">
                    <button 
                      onClick={() => handleEditQuestion(index)}
                      className="text-blue-500 hover:text-blue-700 p-1 mr-1"
                    >
                      <Edit size={20} />
                    </button>
                    <button 
                      onClick={() => handleRemoveQuestion(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!isAddingQuestion && editingQuestionIndex === null && questions.length > 0 && (
            <Button 
              onClick={() => setIsAddingQuestion(true)}
              variant="secondary"
              className="mb-8"
            >
              <Plus size={20} className="mr-2" /> 다른 문제 추가하기
            </Button>
          )}
          
          {isAddingQuestion && (
            <QuestionForm 
              onSave={handleAddQuestion}
              onCancel={() => setIsAddingQuestion(false)}
            />
          )}

          {editingQuestionIndex !== null && (
            <div>
              <h3 className="text-xl font-medium text-purple-700 mb-4">문제 {editingQuestionIndex + 1} 수정하기</h3>
              <QuestionForm 
                initialData={questions[editingQuestionIndex]}
                onSave={handleUpdateQuestion}
                onCancel={() => setEditingQuestionIndex(null)}
              />
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={handleCreateQuiz}
            variant="primary"
            size="large"
            disabled={!title || questions.length === 0 || isSubmitting || quizLoading || sessionLoading}
            className="flex items-center"
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