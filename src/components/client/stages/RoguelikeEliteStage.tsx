import React, { useState, useEffect } from 'react';
import { Question } from '../../../types';
import { RoguelikeGameSession } from '../../../types/roguelike';
import { Shield, Clock, Star, CheckCircle, XCircle } from 'lucide-react';

interface RoguelikeEliteStageProps {
  questions: Question[];
  questionIndices: number[];
  timeLeft: number | null;
  onAnswer: (answerIndex?: number, answerText?: string, timeSpent?: number) => Promise<void>;
  onStageComplete: (success: boolean, correctCount: number) => Promise<void>;
  gameSession: RoguelikeGameSession;
}

const RoguelikeEliteStage: React.FC<RoguelikeEliteStageProps> = ({
  questions,
  questionIndices,
  timeLeft,
  onAnswer,
  onStageComplete,
  gameSession
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | string | null)[]>([null, null, null]);
  const [results, setResults] = useState<boolean[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState('');

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // 시간 종료 처리
  useEffect(() => {
    if (timeLeft === 0 && !isCompleted) {
      handleTimeUp();
    }
  }, [timeLeft, isCompleted]);

  const handleTimeUp = async () => {
    // 현재 답변이 없으면 null로 처리
    if (answers[currentQuestionIndex] === null) {
      const newAnswers = [...answers];
      newAnswers[currentQuestionIndex] = null;
      setAnswers(newAnswers);
    }
    
    // 모든 문제 완료 처리
    await completeStage();
  };

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleTextAnswer = (text: string) => {
    setAnswerText(text);
  };

  const submitCurrentAnswer = async () => {
    let answer: number | string | null = null;
    
    if (currentQuestion.type === 'multiple-choice') {
      answer = selectedAnswer;
    } else if (currentQuestion.type === 'short-answer') {
      answer = answerText.trim();
    }

    // 답변 저장
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answer;
    setAnswers(newAnswers);

    // 정답 체크
    const isCorrect = checkAnswer(answer);
    const newResults = [...results];
    newResults[currentQuestionIndex] = isCorrect;
    setResults(newResults);

    if (isLastQuestion) {
      // 마지막 문제면 스테이지 완료
      await completeStage(newResults);
    } else {
      // 다음 문제로
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setAnswerText('');
    }
  };

  const checkAnswer = (answer: number | string | null): boolean => {
    if (!currentQuestion || answer === null) return false;

    if (currentQuestion.type === 'multiple-choice') {
      return answer === currentQuestion.correctAnswer;
    } else if (currentQuestion.type === 'short-answer') {
      const answerStr = String(answer).toLowerCase().trim();
      const correctAnswerStr = currentQuestion.correctAnswerText?.toLowerCase().trim() || '';
      
      if (currentQuestion.answerMatchType === 'contains') {
        return correctAnswerStr.includes(answerStr) || answerStr.includes(correctAnswerStr);
      } else {
        return answerStr === correctAnswerStr;
      }
    }
    
    return false;
  };

  const completeStage = async (finalResults?: boolean[]) => {
    const resultToUse = finalResults || results;
    const correctCount = resultToUse.filter(Boolean).length;
    const success = correctCount >= 2; // 3문제 중 2문제 이상 맞춰야 성공
    
    setIsCompleted(true);
    await onStageComplete(success, correctCount);
  };

  const getProgressWidth = () => {
    return ((currentQuestionIndex + 1) / questions.length) * 100;
  };

  if (isCompleted) {
    const correctCount = results.filter(Boolean).length;
    const success = correctCount >= 2;

    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
            success ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {success ? (
              <CheckCircle size={40} className="text-green-600" />
            ) : (
              <XCircle size={40} className="text-red-600" />
            )}
          </div>
          
          <h2 className={`text-3xl font-bold mb-4 ${
            success ? 'text-green-700' : 'text-red-700'
          }`}>
            엘리트 스테이지 {success ? '성공!' : '실패'}
          </h2>
          
          <p className="text-xl text-gray-600 mb-6">
            {correctCount}문제 / {questions.length}문제 정답
          </p>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            {results.map((isCorrect, index) => (
              <div key={index} className={`p-4 rounded-lg border-2 ${
                isCorrect 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-red-300 bg-red-50'
              }`}>
                <div className="text-center">
                  {isCorrect ? (
                    <CheckCircle size={24} className="text-green-600 mx-auto mb-2" />
                  ) : (
                    <XCircle size={24} className="text-red-600 mx-auto mb-2" />
                  )}
                  <p className="font-medium">문제 {index + 1}</p>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-gray-500">잠시 후 다음 스테이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
      {/* 엘리트 스테이지 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="bg-red-100 p-3 rounded-full mr-4">
            <Shield size={24} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-red-700">엘리트 스테이지</h1>
            <p className="text-gray-600">3문제 중 2문제 이상 맞춰야 성공!</p>
          </div>
        </div>
        
        {timeLeft !== null && (
          <div className="flex items-center bg-red-50 px-4 py-2 rounded-lg">
            <Clock size={18} className="text-red-600 mr-2" />
            <span className="font-bold text-red-700">
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}
      </div>

      {/* 진행률 표시 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            문제 {currentQuestionIndex + 1} / {questions.length}
          </span>
          <div className="flex space-x-1">
            {questions.map((_, index) => (
              <Star
                key={index}
                size={16}
                className={`${
                  index < currentQuestionIndex 
                    ? 'text-yellow-400 fill-current' 
                    : index === currentQuestionIndex
                    ? 'text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-red-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${getProgressWidth()}%` }}
          />
        </div>
      </div>

      {/* 현재 문제 */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {currentQuestion?.text}
        </h2>

        {/* 객관식 문제 */}
        {currentQuestion?.type === 'multiple-choice' && currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                  selectedAnswer === index
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300 hover:bg-red-25'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                    selectedAnswer === index
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-gray-700">{option}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* 주관식 문제 */}
        {currentQuestion?.type === 'short-answer' && (
          <div className="space-y-4">
            <textarea
              value={answerText}
              onChange={(e) => handleTextAnswer(e.target.value)}
              placeholder="답변을 입력하세요..."
              className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none resize-none"
              rows={4}
            />
          </div>
        )}
      </div>

      {/* 답변 제출 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={submitCurrentAnswer}
          disabled={
            (currentQuestion?.type === 'multiple-choice' && selectedAnswer === null) ||
            (currentQuestion?.type === 'short-answer' && answerText.trim() === '')
          }
          className="px-8 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLastQuestion ? '스테이지 완료' : '다음 문제'}
        </button>
      </div>
    </div>
  );
};

export default RoguelikeEliteStage; 