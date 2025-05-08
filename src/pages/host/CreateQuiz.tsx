import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Check, X, Edit } from 'lucide-react';
import { useQuiz } from '../../contexts/QuizContext';
import Button from '../../components/Button';
import Input from '../../components/Input';
import QuestionForm from '../../components/QuestionForm';

const CreateQuiz: React.FC = () => {
  const navigate = useNavigate();
  const { createQuiz, addQuestion } = useQuiz();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  
  const handleCreateQuiz = () => {
    setError('');
    
    if (!title.trim()) {
      setError('퀴즈 제목을 입력해주세요');
      return;
    }
    
    if (questions.length === 0) {
      setError('최소 한 개의 문제를 추가해주세요');
      return;
    }
    
    const quizId = createQuiz({
      title: title.trim(),
      description: description.trim(),
      inviteCode: '', // Will be generated
      status: 'waiting',
      questions: [],
      createdAt: ''
    });
    
    // Add all questions to the quiz
    questions.forEach(q => {
      addQuestion(quizId, {
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
      });
    });
    
    navigate(`/host/manage/${quizId}`);
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
          
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
              {error}
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
            disabled={!title || questions.length === 0}
          >
            퀴즈 쇼 만들기
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateQuiz;