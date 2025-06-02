import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Plus, X, Check, Edit, Target, Edit3, MessageSquare, ArrowUp, ArrowDown } from 'lucide-react';
import { useQuiz } from '../../contexts/QuizContext';
import { Question } from '../../types';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import QuestionForm from '../../components/host/create/QuestionForm';
import HostNavBar from '../../components/host/HostNavBar';
import HostPageHeader from '../../components/host/HostPageHeader';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { getAuth } from 'firebase/auth';

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
  const [questions, setQuestions] = useState<Question[]>([]);
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
        
        // 현재 사용자의 ID를 호스트 ID로 전달
        const auth = getAuth();
        const currentUser = auth.currentUser;
        const hostId = currentUser?.uid;
        
        // 호스트 ID와 함께 퀴즈 로드 시도
        const quizData = await getQuiz(quizId, hostId);
        
        if (quizData) {
          setTitle(quizData.title || '');
          setDescription(quizData.description || '');
          
          // 새로운 Question 타입 구조 지원
          const formattedQuestions = Array.isArray(quizData.questions) ? 
            quizData.questions.map(q => ({
              id: q.id || Math.random().toString(36).substring(2, 9),
              type: q.type || 'multiple-choice',
              text: q.text || '',
              ...(q.type === 'multiple-choice' && {
                options: q.options || [],
                correctAnswer: q.correctAnswer || 0,
              }),
              ...(q.type === 'short-answer' && {
                correctAnswerText: q.correctAnswerText || '',
                additionalAnswers: q.additionalAnswers || [],
                answerMatchType: q.answerMatchType || 'exact',
              }),
              ...(q.type === 'opinion' && {
                isAnonymous: q.isAnonymous || false,
              }),
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

  // 퀴즈 업데이트 처리 - 새로운 Question 타입 지원
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
      
      // 퀴즈 객체 생성 - 새로운 Question 타입 지원
      const quizData = {
        title: title.trim(),
        description: description.trim(),
        questions: questions.map(q => ({
          id: q.id || Math.random().toString(36).substring(2, 9),
          type: q.type,
          text: q.text,
          ...(q.type === 'multiple-choice' && {
            options: q.options,
            correctAnswer: q.correctAnswer,
          }),
          ...(q.type === 'short-answer' && {
            correctAnswerText: q.correctAnswerText,
            additionalAnswers: q.additionalAnswers,
            answerMatchType: q.answerMatchType,
          }),
          ...(q.type === 'opinion' && {
            isAnonymous: q.isAnonymous,
          }),
        })),
        updatedAt: new Date().toISOString()
      };
      
      if (!quizId) {
        throw new Error('유효하지 않은 퀴즈 ID입니다.');
      }
      
      // 현재 사용자 ID 가져오기
      const auth = getAuth();
      const currentUser = auth.currentUser;
      const hostId = currentUser?.uid;
      
      // 기존 퀴즈 데이터와 비교하여 변경사항이 있는지 확인
      const originalQuizData = await getQuiz(quizId, hostId);
      
      // 실제 변경 여부 확인
      const titleChanged = originalQuizData?.title !== title.trim();
      const descriptionChanged = originalQuizData?.description !== description.trim();
      const questionsCountChanged = originalQuizData?.questions?.length !== questions.length;
      
      // 질문 내용 비교 (질문 수가 같을 때만)
      let questionsContentChanged = false;
      if (!questionsCountChanged && originalQuizData?.questions) {
        questionsContentChanged = questions.some((q, index) => {
          const originalQ = originalQuizData.questions[index];
          return (
            q.text !== originalQ.text ||
            q.type !== originalQ.type ||
            JSON.stringify(q) !== JSON.stringify(originalQ)
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
  
  const handleAddQuestion = (question: Question) => {
    setQuestions(prev => [...prev, question]);
    setIsAddingQuestion(false);
    setError('');
  };
  
  const handleUpdateQuestion = (question: Question) => {
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

  // 문제 순서 변경 함수들
  const moveQuestionUp = (index: number) => {
    if (index > 0) {
      const newQuestions = [...questions];
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
      setQuestions(newQuestions);
    }
  };

  const moveQuestionDown = (index: number) => {
    if (index < questions.length - 1) {
      const newQuestions = [...questions];
      [newQuestions[index], newQuestions[index + 1]] = [newQuestions[index + 1], newQuestions[index]];
      setQuestions(newQuestions);
    }
  };

  // 문제 형식별 아이콘과 색상 반환
  const getQuestionTypeDisplay = (question: Question) => {
    switch (question.type) {
      case 'multiple-choice':
        return { 
          icon: Target, 
          label: '객관식', 
          color: 'bg-blue-100 text-blue-700',
          borderColor: 'border-blue-200',
          frameColor: 'bg-blue-50 border-blue-200'
        };
      case 'short-answer':
        return { 
          icon: Edit3, 
          label: '주관식', 
          color: 'bg-green-100 text-green-700',
          borderColor: 'border-green-200',
          frameColor: 'bg-green-50 border-green-200'
        };
      case 'opinion':
        return { 
          icon: MessageSquare, 
          label: '의견 수집', 
          color: 'bg-orange-100 text-orange-700',
          borderColor: 'border-orange-200',
          frameColor: 'bg-orange-50 border-orange-200'
        };
      default:
        return { 
          icon: Target, 
          label: '객관식', 
          color: 'bg-blue-100 text-blue-700',
          borderColor: 'border-blue-200',
          frameColor: 'bg-blue-50 border-blue-200'
        };
    }
  };

  // borderColor 클래스에서 실제 색상 코드를 반환하는 함수
  const getColorCode = (borderColorClass: string) => {
    const colorMap: { [key: string]: string } = {
      'border-blue-200': '#93C5FD',
      'border-green-200': '#86EFAC',
      'border-orange-200': '#FED7AA',
    };
    return colorMap[borderColorClass] || '#93C5FD'; // 기본값은 파란색
  };

  // 문제 미리보기 렌더링
  const renderQuestionPreview = (question: Question) => {
    const { frameColor } = getQuestionTypeDisplay(question);
    
    return (
      <div className={`${frameColor} rounded-md p-2 sm:p-3 w-full border`}>
        {question.type === 'multiple-choice' && question.options && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {question.options.map((option: string, optIdx: number) => (
              <div key={optIdx} className="flex items-center">
                {question.correctAnswer === optIdx ? (
                  <div className="flex items-center px-2 py-1 bg-green-50 border border-green-200 rounded-md text-green-700 w-full">
                    <Check size={14} className="mr-1 flex-shrink-0" /> 
                    <span className="truncate text-sm">{option}</span>
                  </div>
                ) : (
                  <div className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-md text-gray-600 ml-4 w-full truncate text-sm">
                    {option}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {question.type === 'short-answer' && (
          <div className="space-y-2">
            <div className="bg-green-50 border border-green-200 rounded-md p-2">
              <div className="text-xs text-green-600 mb-1">정답:</div>
              <div className="text-sm text-green-700 font-medium">{question.correctAnswerText}</div>
            </div>
            
            {question.additionalAnswers && question.additionalAnswers.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-md p-2">
                <div className="text-xs text-green-600 mb-1">추가 정답:</div>
                <div className="text-sm text-green-700">
                  {question.additionalAnswers.join(', ')}
                </div>
              </div>
            )}
            
            <div className="text-xs text-gray-500">
              정답 인정: {question.answerMatchType === 'exact' ? '정확히 일치' : '정답 단어 포함'}
            </div>
          </div>
        )}
        
        {question.type === 'opinion' && (
          <div className="bg-orange-50 border border-orange-200 rounded-md p-2">
            <div className="text-xs text-orange-600 mb-1">설정:</div>
            <div className="space-y-1 text-sm text-orange-700">
              {question.isAnonymous && (
                <div>• 익명 수집</div>
              )}
              {!question.isAnonymous && (
                <div>• 기본 설정</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-3 sm:p-4">
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

        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-3 sm:mb-6 relative">
          <h1 className="text-xl sm:text-2xl font-bold text-purple-700 p-4 sm:p-6">퀴즈 편집하기</h1>
          
          <div className="p-3 sm:p-6">
            {(error || quizError) && (
              <div className="bg-red-100 text-red-700 p-3 sm:p-4 rounded-lg mb-3 sm:mb-4">
                {error || quizError}
              </div>
            )}
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-base sm:text-lg font-medium text-gray-700 mb-1 sm:mb-2">
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
                <label className="block text-base sm:text-lg font-medium text-gray-700 mb-1 sm:mb-2">
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
            <h2 className="text-base sm:text-lg font-bold text-purple-700">문제</h2>
            <div className="text-xs text-gray-500">
              총 {questions.length}개 문제
            </div>
          </div>
          
          {questions.length === 0 && !isAddingQuestion && (
            <div className="text-center py-4 sm:py-6 bg-purple-50 rounded-lg">
              <p className="text-gray-600 mb-2 sm:mb-3 text-sm">아직 추가된 문제가 없습니다</p>
              <p className="text-xs text-gray-500 mb-3">객관식, 주관식, 의견 수집 등 다양한 형식의 문제를 만들 수 있습니다</p>
              <Button 
                onClick={() => setIsAddingQuestion(true)}
                variant="primary"
                size="medium"
                className="py-1.5 sm:py-2 px-3 sm:px-4 text-sm sm:text-base"
              >
                <Plus size={16} className="mr-1 sm:mr-2" /> 첫 문제 추가하기
              </Button>
            </div>
          )}
          
          {questions.length > 0 && (
            <div className="space-y-2 mb-2">
              {questions.map((question, index) => {
                const { icon: Icon, label, color, borderColor } = getQuestionTypeDisplay(question);
                
                return (
                  <div 
                    key={index} 
                    className={`bg-white rounded-lg overflow-hidden border ${borderColor} transform transition-all duration-300 hover:-translate-y-1`}
                    style={{
                      boxShadow: `0 3px 0 ${getColorCode(borderColor)}`,
                      background: 'linear-gradient(to bottom right, #fff, #fafaff)',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseOver={(e) => {
                      const colorCode = getColorCode(borderColor);
                      e.currentTarget.style.boxShadow = `0 5px 0 ${colorCode}`;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      const colorCode = getColorCode(borderColor);
                      e.currentTarget.style.boxShadow = `0 3px 0 ${colorCode}`;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
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
                          <div className="flex items-center space-x-2">
                            <div className="inline-flex items-center px-2 py-0.5 bg-gray-100 rounded-md font-medium text-gray-700 text-xs">
                              문제 {index + 1}
                            </div>
                            <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${color}`}>
                              <Icon size={12} className="mr-1" />
                              {label}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            {/* 순서 변경 버튼들 */}
                            <button 
                              onClick={() => moveQuestionUp(index)}
                              disabled={index === 0}
                              className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-colors disabled:opacity-30"
                              aria-label="위로 이동"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button 
                              onClick={() => moveQuestionDown(index)}
                              disabled={index === questions.length - 1}
                              className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-colors disabled:opacity-30"
                              aria-label="아래로 이동"
                            >
                              <ArrowDown size={12} />
                            </button>
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
                        
                        <div className="text-gray-800 text-sm sm:text-base font-medium line-clamp-1 mb-2">{question.text}</div>
                        {renderQuestionPreview(question)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          
          {questions.length > 0 && !isAddingQuestion && (
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
        
        <div className="flex justify-end mt-4 sm:mt-6">
          <Button 
            onClick={handleUpdateQuiz}
            variant="primary"
            disabled={!title || questions.length === 0 || isSubmitting || quizLoading}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center"
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
            {isSubmitting ? (
              <span className="flex items-center">
                <Save size={16} className="mr-1 sm:mr-2 animate-spin" />
                저장 중...
              </span>
            ) : (
              <span className="flex items-center">
                <Save size={16} className="mr-1 sm:mr-2" />
                변경사항 저장
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditQuiz; 