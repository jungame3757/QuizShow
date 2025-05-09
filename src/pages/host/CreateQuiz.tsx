import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, X, Edit } from 'lucide-react';
import { useQuiz } from '../../contexts/QuizContext';
import Button from '../../components/Button';
import Input from '../../components/Input';
import QuestionForm from '../../components/QuestionForm';

const CreateQuiz: React.FC = () => {
  const navigate = useNavigate();
  const { createQuiz, addQuestion, error: quizError, loading } = useQuiz();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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

      console.log("퀴즈 생성 시작...");
      console.log("제목:", title.trim());
      console.log("설명:", description.trim());
      console.log("문제 수:", questions.length);
      
      let quizId: string;
      
      try {
        // 1. 먼저 퀴즈 생성 (비동기 처리)
        quizId = await createQuiz({
          title: title.trim(),
          description: description.trim(),
          inviteCode: '', // Will be generated
          status: 'waiting',
          questions: [], // 빈 배열로 시작
          createdAt: new Date().toISOString()
        });
        
        console.log("퀴즈 생성 완료, ID:", quizId);
      } catch (createError) {
        console.error("퀴즈 생성 실패:", createError);
        setError(createError instanceof Error ? 
          createError.message : '퀴즈 생성에 실패했습니다. 다시 시도해주세요.');
        setIsSubmitting(false);
        return;
      }
      
      console.log("문제 추가 시작, 총 문제 수:", questions.length);
      let hasError = false;
      
      // 2. 모든 문제를 순차적으로 추가 (각 문제 추가 작업을 await로 기다림)
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        console.log(`문제 ${i+1} 추가 중...`, q);
        
        // 문제 데이터 유효성 검사
        if (!q.text || !q.options || !q.correctAnswer) {
          console.error(`문제 ${i+1} 데이터 유효성 검사 실패:`, q);
          setError(`문제 ${i+1}의 내용이 올바르지 않습니다.`);
          hasError = true;
          break;
        }
        
        try {
          await addQuestion(quizId, {
            text: q.text,
            options: Array.isArray(q.options) ? q.options : [],
            correctAnswer: q.correctAnswer,
          });
          console.log(`문제 ${i+1} 추가 완료`);
        } catch (err) {
          console.error(`문제 ${i+1} 추가 실패:`, err);
          setError(`문제 ${i+1} 추가 중 오류가 발생했습니다.`);
          hasError = true;
          break;
        }
      }
      
      if (hasError) {
        console.log("문제 추가 중 오류 발생, 퀴즈 관리 페이지로 이동합니다.");
        // 문제가 있어도 생성된 퀴즈로 이동
        navigate(`/host/manage/${quizId}`);
        return;
      }
      
      console.log("모든 문제 추가 완료, 퀴즈 관리 페이지로 이동");
      navigate(`/host/manage/${quizId}`);
    } catch (err) {
      console.error("퀴즈 생성 중 오류:", err);
      setError('퀴즈 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
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
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-purple-700 mb-6 hover:text-purple-900 transition-colors"
        >
          <ArrowLeft size={20} className="mr-2" /> 홈으로 돌아가기
        </button>

        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h1 className="text-3xl font-bold text-purple-700 mb-6">새 퀴즈 쇼 만들기</h1>
          
          {(error || quizError) && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
              {error || quizError}
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
            disabled={!title || questions.length === 0 || isSubmitting || loading}
          >
            {isSubmitting || loading ? '처리 중...' : '퀴즈 쇼 만들기'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateQuiz;