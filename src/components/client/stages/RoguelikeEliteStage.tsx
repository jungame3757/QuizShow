import React, { useState, useEffect } from 'react';
import { Question } from '../../../types';
import { RoguelikeGameSession } from '../../../types/roguelike';
import { Shield, Clock, Star, CheckCircle, XCircle } from 'lucide-react';
import QuizQuestion from '../QuizQuestion';

// State Machine: 단일 상태로 모든 상태 전환 관리
type EliteStageState = 'PLAYING' | 'SHOWING_RESULT' | 'MOVING_TO_NEXT' | 'COMPLETED';

interface RoguelikeEliteStageProps {
  questions: Question[];
  questionIndices: number[];
  timeLeft: number | null;
  onAnswer: (answerIndex?: number, answerText?: string, timeSpent?: number, eliteAnswers?: Array<{questionIndex: number, answer: string | number, isCorrect: boolean, questionType: 'multiple-choice' | 'short-answer', timeSpent: number}>) => Promise<void>;
  onStageComplete: (
    success: boolean, 
    correctCount: number, 
    lastQuestionAnswerData?: {
      questionIndex: number;
      answer: string | number;
      isCorrect: boolean;
      questionType: 'multiple-choice' | 'short-answer';
      timeSpent: number;
    } | null
  ) => Promise<void>;
  gameSession?: RoguelikeGameSession;
}

const RoguelikeEliteStage: React.FC<RoguelikeEliteStageProps> = ({
  questions,
  questionIndices,
  timeLeft,
  onAnswer,
  onStageComplete,
  gameSession
}) => {
  // State Machine: 단일 상태로 관리
  const [stageState, setStageState] = useState<EliteStageState>('PLAYING');
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | string | null)[]>([null, null, null]);
  const [results, setResults] = useState<boolean[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [serverValidationResult, setServerValidationResult] = useState<{ isCorrect: boolean; points: number } | null>(null);
  const [finalSuccess, setFinalSuccess] = useState<boolean>(false); // 최종 성공 여부 저장
  const [stageCompleted, setStageCompleted] = useState(false); // 스테이지 완료 처리 플래그
  const [lastQuestionAnswerData, setLastQuestionAnswerData] = useState<{
    questionIndex: number;
    answer: string | number;
    isCorrect: boolean;
    questionType: 'multiple-choice' | 'short-answer';
    timeSpent: number;
  } | null>(null); // 마지막 문제 답변 데이터 저장
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now()); // 문제 시작 시간 추가

  // 선택지 섞기 시스템 추가
  const [currentShuffledOptions, setCurrentShuffledOptions] = useState<{ options: string[], mapping: number[] } | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // 선택지 순서 섞기 함수 (Fisher-Yates 알고리즘)
  const shuffleCurrentQuestionOptions = (question: Question) => {
    if (question.type !== 'multiple-choice' || !question.options) {
      return null;
    }
    
    const indices = Array.from({ length: question.options.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    const shuffledOptions = indices.map(i => question.options![i]);
    return { options: shuffledOptions, mapping: indices };
  };

  // 현재 문제 가져오기 (섞인 선택지 적용)
  const getCurrentQuestion = () => {
    if (!currentQuestion) return null;
    
    // 객관식이고 섞인 선택지가 있는 경우에만 적용
    if (currentQuestion.type === 'multiple-choice' && currentShuffledOptions && currentQuestion.options) {
      const currentQuestionOptions = currentShuffledOptions.options;
      const correctAnswerIndex = currentQuestion.correctAnswer;
      
      // 원본 정답 인덱스를 섞인 UI 인덱스로 변환
      let currentQuestionCorrectAnswer = correctAnswerIndex;
      if (correctAnswerIndex !== undefined && currentShuffledOptions.mapping) {
        currentQuestionCorrectAnswer = currentShuffledOptions.mapping.indexOf(correctAnswerIndex);
      }
      
      return {
        ...currentQuestion,
        options: currentQuestionOptions,
        correctAnswer: currentQuestionCorrectAnswer,
        // 원본 인덱스도 포함하여 참조 가능하도록
        originalCorrectAnswer: correctAnswerIndex
      };
    }
    
    // 다른 문제 형식이거나 섞인 선택지가 없으면 원본 그대로 반환
    return currentQuestion;
  };

  // 게임 상태 정보 계산
  const gameStats = React.useMemo(() => {
    if (!gameSession) return null;
    
    return {
      currentScore: gameSession.baseScore || 0,
      correctAnswers: gameSession.correctAnswers || 0,
      totalQuestions: gameSession.totalQuestions || 0,
      currentStreak: gameSession.currentStreak || 0,
      maxStreak: gameSession.maxStreak || 0,
    };
  }, [gameSession]);

  // 문제가 바뀔 때마다 선택지 순서 섞기
  useEffect(() => {
    if (!currentQuestion) return;
    
    const shuffledData = shuffleCurrentQuestionOptions(currentQuestion);
    setCurrentShuffledOptions(shuffledData);
    
    // 선택 상태 초기화
    setSelectedAnswer(null);
    setSelectedAnswerIndex(null);
    setServerValidationResult(null);
    
    console.log('엘리트 스테이지 - 선택지 섞기 완료:', {
      questionIndex: currentQuestionIndex,
      questionType: currentQuestion.type,
      originalOptions: currentQuestion.options,
      shuffledOptions: shuffledData?.options,
      mapping: shuffledData?.mapping
    });
  }, [currentQuestionIndex, currentQuestion]);

  // 시간 종료 처리
  useEffect(() => {
    if (timeLeft === 0 && stageState === 'PLAYING') {
      handleTimeUp();
    }
  }, [timeLeft, stageState]);

  // 문제 변경 시 시간 초기화
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex, currentQuestion]);

  // COMPLETED 상태 시 onStageComplete 호출 (한 번만)
  useEffect(() => {
    if (stageState === 'COMPLETED' && !stageCompleted) {
      setStageCompleted(true);
      const correctCount = results.filter(Boolean).length;
      
      console.log('엘리트 스테이지 완료 처리:', {
        finalSuccess,
        correctCount,
        totalQuestions: questions.length,
        results,
        answers,
        lastQuestionAnswerData,
      });
      
      // 성공/실패 모두 마지막 문제 답변 데이터를 전달 (점수는 성공 시에만)
      onStageComplete(finalSuccess, correctCount, lastQuestionAnswerData);
    }
  }, [stageState, stageCompleted, finalSuccess, results, lastQuestionAnswerData]);

  const handleTimeUp = async () => {
    // 현재 답변이 없으면 null로 처리하고 바로 실패
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = null;
    setAnswers(newAnswers);
    
    const newResults = [...results];
    newResults[currentQuestionIndex] = false;
    setResults(newResults);
    
    // 현재 문제 답변 저장 (시간 초과로 0점)
    await saveCurrentQuestionAnswer(null, false);
    
    // 시간 초과로 바로 실패 처리
    setStageState('COMPLETED');
    setFinalSuccess(false);
  };

  // 현재 문제의 답변을 저장하는 함수
  const saveCurrentQuestionAnswer = async (answer: string | number | null, isCorrect: boolean) => {
    try {
      const questionIndex = questionIndices[currentQuestionIndex];
      console.log(`답변 저장 시도 - 문제 ${currentQuestionIndex + 1}:`, {
        questionIndex,
        answer,
        isCorrect,
        questionType: currentQuestion?.type,
        questionId: currentQuestion?.id,
      });
      
      if (currentQuestion.type === 'multiple-choice' && typeof answer === 'number') {
        // 개별 문제 답변임을 표시하는 특별한 3번째 파라미터와 questionIndex 정보 포함
        await onAnswer(answer, `[엘리트개별문제:${questionIndex}] 답변: ${answer}`, -1, []);
        console.log(`객관식 답변 저장 완료 - 문제 ${currentQuestionIndex + 1}`);
      } else if (currentQuestion.type === 'short-answer' && typeof answer === 'string') {
        // 개별 문제 답변임을 표시하는 특별한 answerText와 questionIndex 정보 포함
        await onAnswer(undefined, `[엘리트개별문제:${questionIndex}] 답변: ${answer}`, -1, []);
        console.log(`주관식 답변 저장 완료 - 문제 ${currentQuestionIndex + 1}`);
      } else {
        // 시간 초과나 빈 답변의 경우
        if (currentQuestion.type === 'multiple-choice') {
          await onAnswer(-1, `[엘리트개별문제:${questionIndex}] 시간초과`, -1, []);
          console.log(`객관식 시간초과 답변 저장 완료 - 문제 ${currentQuestionIndex + 1}`);
        } else {
          await onAnswer(undefined, `[엘리트개별문제:${questionIndex}] 시간초과`, -1, []);
          console.log(`주관식 시간초과 답변 저장 완료 - 문제 ${currentQuestionIndex + 1}`);
        }
      }
    } catch (error) {
      console.error(`엘리트 문제 ${currentQuestionIndex + 1} 답변 저장 실패:`, {
        error,
        questionIndex: questionIndices[currentQuestionIndex],
        answer,
        isCorrect,
        questionType: currentQuestion?.type
      });
      // 에러가 발생해도 게임은 계속 진행하도록 throw하지 않음
    }
  };

  // 주관식 답안 검증 함수
  const validateShortAnswer = (userAnswer: string, question: Question): boolean => {
    if (question.type !== 'short-answer') return false;
    
    const userAnswerClean = userAnswer.toLowerCase().trim();
    const correctAnswer = question.correctAnswerText?.toLowerCase().trim();
    
    if (!correctAnswer) return false;
    
    // 정답 인정 방식에 따른 처리
    if (question.answerMatchType === 'contains') {
      // 정답 단어 포함 방식
      const isMainCorrect = userAnswerClean.includes(correctAnswer);
      const isAdditionalCorrect = question.additionalAnswers?.some(answer => 
        userAnswerClean.includes(answer.toLowerCase().trim())
      ) || false;
      return isMainCorrect || isAdditionalCorrect;
    } else {
      // 정확히 일치 방식 (기본값)
      const isMainCorrect = userAnswerClean === correctAnswer;
      const isAdditionalCorrect = question.additionalAnswers?.some(answer => 
        userAnswerClean === answer.toLowerCase().trim()
      ) || false;
      return isMainCorrect || isAdditionalCorrect;
    }
  };

  const handleSelectAnswer = async (answer: string, index: number) => {
    if (stageState !== 'PLAYING') return;
    
    setStageState('SHOWING_RESULT');

    // 문제 타입에 따라 선택된 답안 저장
    if (currentQuestion.type === 'multiple-choice') {
      // 원본 인덱스로 변환
      let originalAnswerIndex = index;
      if (currentShuffledOptions && currentShuffledOptions.mapping) {
        originalAnswerIndex = currentShuffledOptions.mapping[index];
      }
      
      setSelectedAnswerIndex(originalAnswerIndex);
      setSelectedAnswer(answer);
      
      // 정답 체크 (원본 인덱스 기준)
      const isCorrect = originalAnswerIndex === currentQuestion.correctAnswer;
      
      console.log('엘리트 스테이지 - 객관식 답변 처리:', {
        questionIndex: currentQuestionIndex,
        userSelectedDisplayIndex: index,
        originalAnswerIndex,
        correctAnswerIndex: currentQuestion.correctAnswer,
        isCorrect,
        mapping: currentShuffledOptions?.mapping
      });
      
      // 답변과 결과를 동시에 업데이트
      const newAnswers = [...answers];
      newAnswers[currentQuestionIndex] = originalAnswerIndex; // 원본 인덱스로 저장
      setAnswers(newAnswers);

      const newResults = [...results];
      newResults[currentQuestionIndex] = isCorrect;
      setResults(newResults);
      
      // 클라이언트 검증 (임시로 결과 표시용)
      setServerValidationResult({ isCorrect, points: isCorrect ? 50 : 0 });
      
      // 답변 저장 처리 - 마지막 문제가 아닌 경우에만 즉시 저장
      if (!isLastQuestion) {
        try {
          await saveCurrentQuestionAnswer(originalAnswerIndex, isCorrect);
          console.log(`문제 ${currentQuestionIndex + 1} 답변 저장 완료:`, { originalAnswerIndex, isCorrect });
        } catch (error) {
          console.error(`문제 ${currentQuestionIndex + 1} 답변 저장 실패:`, error);
        }
      } else {
        // 마지막 문제인 경우 상태에 저장하고 보상 선택 시 함께 저장
        setLastQuestionAnswerData({
          questionIndex: questionIndices[currentQuestionIndex],
          answer: originalAnswerIndex,
          isCorrect,
          questionType: 'multiple-choice',
          timeSpent: Date.now() - questionStartTime
        });
        console.log(`마지막 문제 답변 데이터 저장 (보상 선택 시 업로드 예정):`, { originalAnswerIndex, isCorrect });
      }
      
      // 2초 후 상태 전환
      setTimeout(() => {
        console.log(`문제 ${currentQuestionIndex + 1} 처리 완료:`, { 
          isCorrect, 
          isLastQuestion, 
          currentResults: newResults,
          correctCount: newResults.filter(Boolean).length 
        });
        
        if (!isCorrect) {
          // 틀렸을 경우 바로 실패
          console.log('엘리트 스테이지 실패 - 오답');
          setStageState('COMPLETED');
          setFinalSuccess(false);
        } else if (isLastQuestion) {
          // 마지막 문제까지 모두 맞췄으면 성공
          console.log('엘리트 스테이지 성공 - 모든 문제 정답');
          setStageState('COMPLETED');
          setFinalSuccess(true);
        } else {
          // 정답이면 다음 문제로
          console.log(`다음 문제로 이동: ${currentQuestionIndex + 1} → ${currentQuestionIndex + 2}`);
          setStageState('MOVING_TO_NEXT');
          setCurrentQuestionIndex(prev => prev + 1);
          setSelectedAnswerIndex(null);
          setSelectedAnswer(null);
          setServerValidationResult(null);
          setStageState('PLAYING');
        }
      }, 2000);
    } else if (currentQuestion.type === 'short-answer') {
      setSelectedAnswer(answer);
      setSelectedAnswerIndex(null);
      
      // 정답 체크
      const isCorrect = validateShortAnswer(answer, currentQuestion);
      
      // 답변과 결과를 동시에 업데이트
      const newAnswers = [...answers];
      newAnswers[currentQuestionIndex] = answer;
      setAnswers(newAnswers);

      const newResults = [...results];
      newResults[currentQuestionIndex] = isCorrect;
      setResults(newResults);
      
      // 클라이언트 검증 (임시로 결과 표시용)
      setServerValidationResult({ isCorrect, points: isCorrect ? 50 : 0 });
      
      // 답변 저장 처리 - 마지막 문제가 아닌 경우에만 즉시 저장
      if (!isLastQuestion) {
        try {
          await saveCurrentQuestionAnswer(answer, isCorrect);
          console.log(`문제 ${currentQuestionIndex + 1} 답변 저장 완료:`, { answer, isCorrect });
        } catch (error) {
          console.error(`문제 ${currentQuestionIndex + 1} 답변 저장 실패:`, error);
        }
      } else {
        // 마지막 문제인 경우 상태에 저장하고 보상 선택 시 함께 저장
        setLastQuestionAnswerData({
          questionIndex: questionIndices[currentQuestionIndex],
          answer: answer,
          isCorrect,
          questionType: 'short-answer',
          timeSpent: Date.now() - questionStartTime
        });
        console.log(`마지막 문제 답변 데이터 저장 (보상 선택 시 업로드 예정):`, { answer, isCorrect });
      }
      
      // 2초 후 상태 전환
      setTimeout(() => {
        console.log(`문제 ${currentQuestionIndex + 1} 처리 완료:`, { 
          isCorrect, 
          isLastQuestion, 
          currentResults: newResults,
          correctCount: newResults.filter(Boolean).length 
        });
        
        if (!isCorrect) {
          // 틀렸을 경우 바로 실패
          console.log('엘리트 스테이지 실패 - 오답');
          setStageState('COMPLETED');
          setFinalSuccess(false);
        } else if (isLastQuestion) {
          // 마지막 문제까지 모두 맞췄으면 성공
          console.log('엘리트 스테이지 성공 - 모든 문제 정답');
          setStageState('COMPLETED');
          setFinalSuccess(true);
        } else {
          // 정답이면 다음 문제로
          console.log(`다음 문제로 이동: ${currentQuestionIndex + 1} → ${currentQuestionIndex + 2}`);
          setStageState('MOVING_TO_NEXT');
          setCurrentQuestionIndex(prev => prev + 1);
          setSelectedAnswerIndex(null);
          setSelectedAnswer(null);
          setServerValidationResult(null);
          setStageState('PLAYING');
        }
      }, 2000);
    }
  };

  const getProgressWidth = () => {
    return ((currentQuestionIndex + 1) / questions.length) * 100;
  };

  // State Machine 기반 렌더링
  if (stageState === 'COMPLETED') {
    const correctCount = results.filter(Boolean).length;
    const success = finalSuccess;

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
          
          <p className="text-gray-500">
            {success ? '보상을 획득했습니다!' : '잠시 후 다음 스테이지로 이동합니다...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
      {/* 게임 상태 표시 바 */}
      {gameStats && (
        <div className="mb-6 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-3 border border-red-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {/* 현재 점수 */}
            <div className="text-center">
              <div className="text-xl font-bold text-red-600">{gameStats.currentScore.toLocaleString()}</div>
              <div className="text-xs text-gray-600">점수</div>
            </div>
            
            {/* 정답 수 */}
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">{gameStats.correctAnswers}</div>
              <div className="text-xs text-gray-600">정답 수</div>
            </div>
            
            {/* 현재 연속 */}
            <div className="text-center">
              <div className="text-xl font-bold text-orange-600">{gameStats.currentStreak}</div>
              <div className="text-xs text-gray-600">연속 🔥</div>
            </div>
            
            {/* 최대 연속 */}
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">{gameStats.maxStreak}</div>
              <div className="text-xs text-gray-600">최대 🏆</div>
            </div>
          </div>
        </div>
      )}

      {/* 엘리트 스테이지 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <div className="bg-red-100 p-3 rounded-full mr-4">
            <Shield size={24} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-red-700">엘리트 스테이지</h1>
            <p className="text-gray-600">모든 문제를 맞춰야 성공! 한 문제라도 틀리면 실패</p>
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

      {/* QuizQuestion 컴포넌트 사용 */}
      <QuizQuestion
        key={currentQuestionIndex}
        question={getCurrentQuestion() || currentQuestion}
        selectedAnswer={selectedAnswer}
        selectedAnswerIndex={selectedAnswerIndex}
        onSelectAnswer={handleSelectAnswer}
        showResult={stageState === 'SHOWING_RESULT' || stageState === 'MOVING_TO_NEXT'}
        disabled={stageState !== 'PLAYING'}
        serverValidationResult={serverValidationResult}
        currentShuffledOptions={currentShuffledOptions}
      />

      {/* 안내 메시지 */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          ⚔️ 모든 문제를 정확히 맞춰서 엘리트 보상을 획득하세요!
        </p>
      </div>
    </div>
  );
};

export default RoguelikeEliteStage; 