import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import Button from './Button';
import Input from './Input';

interface QuestionFormProps {
  onSave: (question: any) => void;
  onCancel: () => void;
  initialData?: {
    text: string;
    options: string[];
    correctAnswer: string;
  };
}

const QuestionForm: React.FC<QuestionFormProps> = ({ onSave, onCancel, initialData }) => {
  const [text, setText] = useState(initialData?.text || '');
  const [options, setOptions] = useState(initialData?.options || ['', '', '', '']);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  
  // 초기 데이터가 있는 경우 correctAnswerIndex 설정
  useEffect(() => {
    if (initialData?.correctAnswer) {
      const index = initialData.options.findIndex(
        option => option === initialData.correctAnswer
      );
      if (index !== -1) {
        setCorrectAnswerIndex(index);
      }
    }
  }, [initialData]);
  
  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };
  
  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = [...options];
      newOptions.splice(index, 1);
      setOptions(newOptions);
      
      // 정답이 삭제되면 정답 인덱스 초기화
      if (correctAnswerIndex === index) {
        setCorrectAnswerIndex(null);
      } else if (correctAnswerIndex !== null && correctAnswerIndex > index) {
        // 삭제된 항목 이후의 정답 인덱스 조정
        setCorrectAnswerIndex(correctAnswerIndex - 1);
      }
    }
  };
  
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
    
    // 정답으로 선택된 선택지가 비어있으면 정답 취소
    if (correctAnswerIndex === index && !value.trim()) {
      setCorrectAnswerIndex(null);
    }
  };
  
  const toggleCorrectAnswer = (index: number) => {
    // 비어있는 선택지는 정답으로 선택할 수 없음
    if (!options[index].trim()) {
      return;
    }
    
    // 이미 선택된 정답을 다시 클릭하면 취소
    if (correctAnswerIndex === index) {
      setCorrectAnswerIndex(null);
    } else {
      setCorrectAnswerIndex(index);
    }
  };
  
  const handleSubmit = () => {
    // Validate
    setError('');
    
    if (!text.trim()) {
      setError('문제 내용을 입력해주세요');
      return;
    }
    
    if (options.some(option => !option.trim())) {
      setError('모든 선택지를 입력해주세요');
      return;
    }
    
    if (correctAnswerIndex === null) {
      setError('정답을 선택해주세요');
      return;
    }
    
    onSave({
      text: text.trim(),
      options: options.map(o => o.trim()),
      correctAnswer: options[correctAnswerIndex].trim(),
    });
    
    // Reset form
    setText('');
    setOptions(['', '', '', '']);
    setCorrectAnswerIndex(null);
    setError('');
  };

  // 정답이 선택되어 있는지 확인
  const hasCorrectAnswer = correctAnswerIndex !== null;

  return (
    <div className="bg-purple-50 rounded-xl p-6 mb-8 animate-fade-in">
      <h3 className="text-xl font-bold text-purple-700 mb-4">
        {initialData ? '문제 수정하기' : '새 문제 추가'}
      </h3>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      <div className="space-y-6">
        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">
            문제 내용
          </label>
          <Input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="문제를 입력하세요"
            className="w-full"
          />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-lg font-medium text-gray-700">
              선택지
            </label>
            
            {!hasCorrectAnswer && (
              <div className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded-md flex items-center">
                <span>아직 정답이 선택되지 않았습니다</span>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                <Input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`선택지 ${index + 1} 내용`}
                  className={`flex-1 w-full mb-2 sm:mb-0 ${correctAnswerIndex === index ? 'border-green-500 bg-green-50' : ''}`}
                />
                
                <div className="flex w-full sm:w-auto gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => toggleCorrectAnswer(index)}
                    disabled={!option.trim()}
                    className={`
                      px-4 h-12 rounded-lg flex items-center justify-center transition-colors duration-200
                      flex-1 sm:flex-none
                      ${correctAnswerIndex === index 
                        ? 'bg-green-600 text-white font-medium' 
                        : option.trim() 
                          ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 font-medium border border-indigo-300' 
                          : 'bg-gray-100 text-gray-400 opacity-60 cursor-not-allowed font-medium'}
                    `}
                    title={correctAnswerIndex === index ? "정답 취소하기" : "정답으로 설정하기"}
                  >
                    {correctAnswerIndex === index ? (
                      <div className="flex items-center whitespace-nowrap">
                        <Check size={16} className="mr-1" />
                        <span>정답</span>
                      </div>
                    ) : option.trim() ? (
                      <span className="whitespace-nowrap">정답 선택</span>
                    ) : (
                      <span className="whitespace-nowrap">선택지 입력</span>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    disabled={options.length <= 2}
                    className="bg-red-100 p-2 rounded-lg text-red-600 hover:bg-red-200 disabled:opacity-50 flex-none"
                    title="선택지 삭제"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {options.length < 5 && (
            <button
              type="button"
              onClick={handleAddOption}
              className="flex items-center mt-3 text-purple-700 hover:text-purple-900"
            >
              <Plus size={20} className="mr-1" /> 선택지 추가
            </button>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {/* 정답 선택 안내 텍스트 제거 */}
          </div>
          <div className="flex space-x-3">
            <Button onClick={onCancel} variant="danger">
              취소
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="primary"
              className={hasCorrectAnswer ? '' : 'opacity-70'}
            >
              문제 저장
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionForm;