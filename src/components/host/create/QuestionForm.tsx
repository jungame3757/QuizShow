import React, { useState, useEffect } from 'react';
import { Plus, X, Check } from 'lucide-react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

interface QuestionFormProps {
  onSave: (question: any) => void;
  onCancel: () => void;
  initialData?: {
    text: string;
    options: string[];
    correctAnswer: string;
    correctAnswerIndex?: number;
  };
  maxOptions?: number;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ onSave, initialData, maxOptions = 5 }) => {
  const [text, setText] = useState(initialData?.text || '');
  const [options, setOptions] = useState(initialData?.options || ['', '', '', '']);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  
  // 초기 데이터가 있는 경우 correctAnswerIndex 설정
  useEffect(() => {
    if (initialData?.correctAnswerIndex !== undefined) {
      setCorrectAnswerIndex(initialData.correctAnswerIndex);
    } else if (initialData?.correctAnswer) {
      const index = initialData.options.findIndex(
        option => option === initialData.correctAnswer
      );
      if (index !== -1) {
        setCorrectAnswerIndex(index);
      }
    }
  }, [initialData]);
  
  const handleAddOption = () => {
    if (options.length < maxOptions) {
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
      correctAnswerIndex: correctAnswerIndex,
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
    <div className="bg-purple-50 rounded-lg p-2 mb-2 animate-fade-in">
      <div className="space-y-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
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
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-gray-700">
              선택지
            </label>
            
            {!hasCorrectAnswer && (
              <div className="text-xs text-amber-600 bg-amber-50 px-1 py-0.5 rounded-md flex items-center">
                <span>정답 선택 필요</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
            {options.map((option, index) => (
              <div key={index} className="flex items-center">
                <button
                  type="button"
                  onClick={() => toggleCorrectAnswer(index)}
                  disabled={!option.trim()}
                  className={`
                    min-w-[28px] mr-1 w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center
                    ${correctAnswerIndex === index 
                      ? 'bg-green-600 text-white' 
                      : option.trim() 
                        ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' 
                        : 'bg-gray-100 text-gray-400 opacity-60 cursor-not-allowed'}
                    transition-colors duration-150
                  `}
                  aria-label={correctAnswerIndex === index ? "정답 취소" : "정답으로 선택"}
                >
                  <Check size={14} className={correctAnswerIndex === index ? '' : 'opacity-70'} />
                </button>
                
                <div className="flex-grow">
                  <Input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`선택지 ${index + 1}`}
                    className={`w-full ${correctAnswerIndex === index ? 'border-green-500 bg-green-50' : ''}`}
                  />
                </div>
                  
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  disabled={options.length <= 2}
                  className="ml-1 flex-shrink-0 text-red-500 hover:text-red-600 disabled:opacity-30 transition-colors duration-150"
                  aria-label="선택지 삭제"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          
          {options.length < maxOptions && (
            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={handleAddOption}
                className="flex items-center justify-center px-3 py-2 text-sm text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-md transition-colors duration-150"
              >
                <Plus size={16} className="mr-2" /> 선택지 추가
              </button>
            </div>
          )}
        </div>
        
        <div className="flex flex-col pt-1">
          <Button 
            onClick={handleSubmit} 
            variant="primary"
            size="small"
            className={`w-full text-xs py-1 px-2 h-7 transform hover:scale-[1.02] active:scale-[0.98] transition-transform duration-100 ${hasCorrectAnswer ? '' : 'opacity-70'}`}
          >
            저장
          </Button>
          
          {error && (
            <div className="bg-red-100 text-red-700 p-1 rounded-md mt-2 text-xs text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionForm;