import React, { useState, useEffect } from 'react';
import { Plus, X, Check, MessageSquare, Edit3, Target } from 'lucide-react';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { Question, QuestionType, AnswerMatchType } from '../../../types';

interface QuestionFormProps {
  onSave: (question: Question) => void;
  onCancel: () => void;
  initialData?: Question;
  maxOptions?: number;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ 
  onSave, 
  onCancel, 
  initialData, 
  maxOptions = 5 
}) => {
  const [questionType, setQuestionType] = useState<QuestionType>(
    initialData?.type || 'multiple-choice'
  );
  const [text, setText] = useState(initialData?.text || '');
  
  // 객관식용 상태
  const [options, setOptions] = useState<string[]>(
    initialData?.options || ['', '', '', '']
  );
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(
    initialData?.correctAnswer ?? null
  );
  
  // 주관식용 상태
  const [correctAnswerText, setCorrectAnswerText] = useState(
    initialData?.correctAnswerText || ''
  );
  const [additionalAnswers, setAdditionalAnswers] = useState<string[]>(
    initialData?.additionalAnswers || []
  );
  const [answerMatchType, setAnswerMatchType] = useState<AnswerMatchType>(
    initialData?.answerMatchType || 'exact'
  );
  
  // 의견 수집용 상태
  const [isAnonymous, setIsAnonymous] = useState(
    initialData?.isAnonymous || false
  );
  
  const [error, setError] = useState('');

  // 문제 형식이 변경될 때 상태 초기화
  useEffect(() => {
    if (!initialData) {
      setError('');
      if (questionType === 'multiple-choice') {
        setOptions(['', '', '', '']);
        setCorrectAnswerIndex(null);
      } else if (questionType === 'short-answer') {
        setCorrectAnswerText('');
        setAdditionalAnswers([]);
        setAnswerMatchType('exact');
      } else if (questionType === 'opinion') {
        setIsAnonymous(false);
      }
    }
  }, [questionType, initialData]);

  // 객관식 관련 함수들
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
      
      if (correctAnswerIndex === index) {
        setCorrectAnswerIndex(null);
      } else if (correctAnswerIndex !== null && correctAnswerIndex > index) {
        setCorrectAnswerIndex(correctAnswerIndex - 1);
      }
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
    
    if (correctAnswerIndex === index && !value.trim()) {
      setCorrectAnswerIndex(null);
    }
  };

  const toggleCorrectAnswer = (index: number) => {
    if (!options[index].trim()) return;
    
    if (correctAnswerIndex === index) {
      setCorrectAnswerIndex(null);
    } else {
      setCorrectAnswerIndex(index);
    }
  };

  // 주관식 추가 정답 관련 함수들
  const handleAddAdditionalAnswer = () => {
    setAdditionalAnswers([...additionalAnswers, '']);
  };

  const handleRemoveAdditionalAnswer = (index: number) => {
    const newAnswers = [...additionalAnswers];
    newAnswers.splice(index, 1);
    setAdditionalAnswers(newAnswers);
  };

  const handleAdditionalAnswerChange = (index: number, value: string) => {
    const newAnswers = [...additionalAnswers];
    newAnswers[index] = value;
    setAdditionalAnswers(newAnswers);
  };

  const handleSubmit = () => {
    setError('');
    
    if (!text.trim()) {
      setError('문제 내용을 입력해주세요');
      return;
    }

    let questionData: Question = {
      id: initialData?.id || Math.random().toString(36).substring(2, 9),
      type: questionType,
      text: text.trim()
    };

    if (questionType === 'multiple-choice') {
      if (options.some(option => !option.trim())) {
        setError('모든 선택지를 입력해주세요');
        return;
      }
      if (correctAnswerIndex === null) {
        setError('정답을 선택해주세요');
        return;
      }
      questionData.options = options.map(o => o.trim());
      questionData.correctAnswer = correctAnswerIndex;
    } else if (questionType === 'short-answer') {
      if (!correctAnswerText.trim()) {
        setError('정답을 입력해주세요');
        return;
      }
      questionData.correctAnswerText = correctAnswerText.trim();
      questionData.answerMatchType = answerMatchType;
      
      // 추가 정답들 중 비어있지 않은 것들만 저장
      const validAdditionalAnswers = additionalAnswers
        .map(answer => answer.trim())
        .filter(answer => answer.length > 0);
      
      if (validAdditionalAnswers.length > 0) {
        questionData.additionalAnswers = validAdditionalAnswers;
      }
    } else if (questionType === 'opinion') {
      questionData.isAnonymous = isAnonymous;
    }

    onSave(questionData);
    
    // Reset form
    setText('');
    setOptions(['', '', '', '']);
    setCorrectAnswerIndex(null);
    setCorrectAnswerText('');
    setAdditionalAnswers([]);
    setAnswerMatchType('exact');
    setIsAnonymous(false);
    setError('');
  };

  const questionTypeOptions = [
    { value: 'multiple-choice', label: '객관식', icon: Target, color: 'bg-blue-100 text-blue-700', bgColor: 'bg-blue-50' },
    { value: 'short-answer', label: '주관식', icon: Edit3, color: 'bg-green-100 text-green-700', bgColor: 'bg-green-50' },
    { value: 'opinion', label: '의견 수집', icon: MessageSquare, color: 'bg-orange-100 text-orange-700', bgColor: 'bg-orange-50' }
  ];

  // 현재 선택된 문제 형식의 배경색 가져오기
  const getCurrentBgColor = () => {
    const selectedOption = questionTypeOptions.find(option => option.value === questionType);
    return selectedOption?.bgColor || 'bg-purple-50';
  };

  return (
    <div className={`${getCurrentBgColor()} rounded-lg p-3 mb-2 animate-fade-in`}>
      <div className="space-y-3">
        {/* 문제 형식 선택 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            문제 형식
          </label>
          <div className="grid grid-cols-3 gap-2">
            {questionTypeOptions.map(({ value, label, icon: Icon, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setQuestionType(value as QuestionType)}
                className={`
                  p-2 rounded-lg border-2 transition-all duration-200 flex flex-col items-center space-y-1
                  ${questionType === value 
                    ? `${color} border-current` 
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }
                `}
              >
                <Icon size={16} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 문제 내용 */}
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

        {/* 문제 형식별 입력 필드 */}
        {questionType === 'multiple-choice' && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">
                선택지
              </label>
              {correctAnswerIndex === null && (
                <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                  정답 선택 필요
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => toggleCorrectAnswer(index)}
                    disabled={!option.trim()}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center transition-colors
                      ${correctAnswerIndex === index 
                        ? 'bg-green-600 text-white' 
                        : option.trim() 
                          ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' 
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                    `}
                  >
                    <Check size={14} />
                  </button>
                  
                  <Input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`선택지 ${index + 1}`}
                    className={`flex-1 ${correctAnswerIndex === index ? 'border-green-500 bg-green-50' : ''}`}
                  />
                  
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    disabled={options.length <= 2}
                    className="text-red-500 hover:text-red-600 disabled:opacity-30"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
            
            {options.length < maxOptions && (
              <div className="flex justify-center mt-3">
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="flex items-center px-3 py-2 text-sm text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-md"
                >
                  <Plus size={16} className="mr-1" /> 선택지 추가
                </button>
              </div>
            )}
          </div>
        )}

        {questionType === 'short-answer' && (
          <div className="space-y-3">
            {/* 주요 정답 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                정답
              </label>
              <Input
                type="text"
                value={correctAnswerText}
                onChange={(e) => setCorrectAnswerText(e.target.value)}
                placeholder="정답을 입력하세요"
                className="w-full"
              />
            </div>

            {/* 추가 정답들 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                추가 정답 (선택사항)
              </label>
              
              {additionalAnswers.length > 0 && (
                <div className="space-y-2 mb-3">
                  {additionalAnswers.map((answer, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        type="text"
                        value={answer}
                        onChange={(e) => handleAdditionalAnswerChange(index, e.target.value)}
                        placeholder={`추가 정답 ${index + 1}`}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveAdditionalAnswer(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {additionalAnswers.length < 5 && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleAddAdditionalAnswer}
                    className="flex items-center px-3 py-2 text-sm text-green-700 bg-green-100 hover:bg-green-200 rounded-md"
                  >
                    <Plus size={16} className="mr-1" /> 추가 정답 추가
                  </button>
                </div>
              )}
            </div>

            {/* 정답 인정 방식 - 맨 아래로 이동 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                정답 인정 방식
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAnswerMatchType('exact')}
                  className={`
                    p-2 rounded-lg border-2 transition-all duration-200 text-sm
                    ${answerMatchType === 'exact' 
                      ? 'bg-green-100 text-green-700 border-green-300' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }
                  `}
                >
                  정확히 일치
                </button>
                <button
                  type="button"
                  onClick={() => setAnswerMatchType('contains')}
                  className={`
                    p-2 rounded-lg border-2 transition-all duration-200 text-sm
                    ${answerMatchType === 'contains' 
                      ? 'bg-green-100 text-green-700 border-green-300' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }
                  `}
                >
                  정답 단어 포함
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {answerMatchType === 'exact' 
                  ? '대소문자를 구분하지 않고 정확히 일치하는 답안만 정답으로 처리됩니다.'
                  : '답안에 정답 단어가 포함되어 있으면 정답으로 처리됩니다.'
                }
              </p>
            </div>
          </div>
        )}

        {questionType === 'opinion' && (
          <div className="space-y-3">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-orange-700 text-sm">
                의견 수집 모드에서는 참가자들의 자유로운 의견을 수집합니다. 정답이 없으며 점수에 영향을 주지 않습니다.
              </p>
            </div>

            {/* 익명 수집 옵션 */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="anonymous"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
              <label htmlFor="anonymous" className="text-sm font-medium text-gray-700">
                익명으로 의견 수집
              </label>
            </div>

            <div className="text-xs text-gray-500">
              <p>• 익명 수집: 참가자 이름 없이 의견만 수집됩니다</p>
            </div>
          </div>
        )}

        {/* 저장 버튼 */}
        <div className="flex space-x-2 pt-2">
          <Button 
            onClick={handleSubmit} 
            variant="primary"
            size="small"
            className="flex-1 text-sm py-2"
          >
            저장
          </Button>
          <Button 
            onClick={onCancel} 
            variant="secondary"
            size="small"
            className="px-4 text-sm py-2"
          >
            취소
          </Button>
        </div>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded-md text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionForm;