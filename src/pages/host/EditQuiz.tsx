import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Book, Plus } from 'lucide-react';
import { useQuiz } from '../../contexts/QuizContext';
import Button from '../../components/Button';
import Input from '../../components/Input';
import QuestionForm from '../../components/QuestionForm';
import HostNavBar from '../../components/HostNavBar';
import HostPageHeader from '../../components/HostPageHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import Breadcrumb from '../../components/Breadcrumb';

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
  
  const handleUpdateQuestion = (question: any, index: number) => {
    setQuestions(prev => 
      prev.map((q, i) => i === index ? question : q)
    );
    setEditingQuestionIndex(null);
  };
  
  const handleRemoveQuestion = (index: number) => {
    // 삭제하는 문제가 현재 수정 중인 문제인 경우 수정 창 닫기
    if (editingQuestionIndex === index) {
      setEditingQuestionIndex(null);
    } else if (editingQuestionIndex !== null && editingQuestionIndex > index) {
      // 삭제하는 문제가 현재 수정 중인 문제보다 앞에 있는 경우 인덱스 조정
      setEditingQuestionIndex(editingQuestionIndex - 1);
    }
    
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditQuestion = (index: number) => {
    // 이미 수정 중인 문제를 다시 클릭한 경우 수정 취소
    if (editingQuestionIndex === index) {
      setEditingQuestionIndex(null);
    } else {
      setEditingQuestionIndex(index);
    }
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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4">
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

        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold text-purple-700 mb-6">퀴즈 편집하기</h1>
          
          {quizError && (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
              {quizError}
            </div>
          )}
          
          {error && (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          <div className="mb-6">
            <label htmlFor="title" className="block text-lg font-medium text-gray-700 mb-2">
              퀴즈 제목
            </label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="퀴즈 제목을 입력하세요"
              className="w-full"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="description" className="block text-lg font-medium text-gray-700 mb-2">
              퀴즈 설명 (선택사항)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="퀴즈에 대한 설명을 입력하세요"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none h-24"
            />
          </div>
          
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-purple-700 flex items-center">
                <Book size={24} className="mr-2" />
                문제 목록 ({questions.length})
              </h2>
            </div>
            
            {questions.length === 0 && !isAddingQuestion && (
              <div className="bg-purple-50 rounded-lg p-6 text-center">
                <p className="text-purple-700 mb-4">아직 추가된 문제가 없습니다.</p>
                <Button 
                  onClick={() => setIsAddingQuestion(true)} 
                  variant="primary"
                  className="mx-auto"
                >
                  첫 문제 추가하기
                </Button>
              </div>
            )}
            
            {questions.length > 0 && (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div 
                    key={index} 
                    className="border border-gray-200 rounded-lg p-4 bg-white"
                  >
                    {editingQuestionIndex === index ? (
                      // 문제 수정 폼 - 미리보기 대체
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h3 className="text-xl font-medium text-purple-700 mb-4">문제 {index + 1} 수정하기</h3>
                        <QuestionForm 
                          initialData={question}
                          onSave={(updatedQuestion) => handleUpdateQuestion(updatedQuestion, index)}
                          onCancel={() => setEditingQuestionIndex(null)}
                        />
                      </div>
                    ) : (
                      // 문제 미리보기
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium mb-3 break-words hyphens-auto overflow-hidden">
                            문제 {index + 1}: {question.text}
                          </h3>
                          <div className="space-y-2 mb-2">
                            {question.options.map((option: string, optionIndex: number) => (
                              <div 
                                key={optionIndex} 
                                className={`
                                  px-2 py-2 rounded-md border w-full 
                                  ${optionIndex === question.correctAnswerIndex ? 
                                    'border-green-500 bg-green-50' : 
                                    'border-gray-200'}
                                `}
                              >
                                <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-start">
                                  <div className="font-bold text-sm sm:text-base inline-flex items-center justify-center w-6">
                                    {optionIndex + 1}.
                                  </div>
                                  <div className="text-sm sm:text-base break-words hyphens-auto overflow-hidden">
                                    {option}
                                  </div>
                                  {optionIndex === question.correctAnswerIndex && (
                                    <div className="text-green-600 text-xs sm:text-sm whitespace-nowrap border-l border-green-200 pl-2 py-0.5">
                                      (정답)
                                    </div>
                                  )}
                                  {optionIndex !== question.correctAnswerIndex && <div></div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-3">
                          <Button 
                            onClick={() => handleEditQuestion(index)} 
                            variant="secondary"
                            className="flex items-center text-sm"
                            size="small"
                          >
                            수정
                          </Button>
                          <Button 
                            onClick={() => handleRemoveQuestion(index)} 
                            variant="danger"
                            className="text-sm"
                            size="small"
                          >
                            삭제
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* 문제 추가 버튼을 하단에 배치, 문제 생성 프레임이 보일 때는 숨김 */}
                {!isAddingQuestion && (
                  <div className="flex justify-center mt-6">
                    <Button 
                      onClick={() => {
                        setIsAddingQuestion(true);
                      }} 
                      variant="secondary"
                      className="flex items-center"
                    >
                      <Plus size={18} className="mr-1" /> 문제 추가
                    </Button>
                  </div>
                )}
                
                {/* 새 문제 추가하기 프레임을 문제 목록 하단에 배치 */}
                {isAddingQuestion && (
                  <div className="bg-purple-50 rounded-xl p-6 mt-4 animate-fade-in border border-purple-200">
                    <h3 className="text-xl font-medium text-purple-700 mb-4">새 문제 추가하기</h3>
                    <QuestionForm 
                      onSave={handleAddQuestion}
                      onCancel={() => setIsAddingQuestion(false)}
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* 문제가 없을 때 추가하기 프레임은 아래에 표시 */}
            {questions.length === 0 && isAddingQuestion && (
              <div className="bg-purple-50 rounded-xl p-6 mb-4 animate-fade-in border border-purple-200">
                <h3 className="text-xl font-medium text-purple-700 mb-4">새 문제 추가하기</h3>
                <QuestionForm 
                  onSave={handleAddQuestion}
                  onCancel={() => setIsAddingQuestion(false)}
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={handleUpdateQuiz}
            variant="primary"
            size="large"
            disabled={!title || questions.length === 0 || isSubmitting || quizLoading}
            className="flex items-center"
          >
            {isSubmitting ? (
              <span>저장 중...</span>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                변경 사항 저장
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditQuiz; 