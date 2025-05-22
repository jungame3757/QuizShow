import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, update, onValue, off } from 'firebase/database';
import { rtdb } from '../../firebase/config';
import { getQuizById } from '../../firebase/quizService';
import { getQuizDataForClient, getAnswersForClient } from '../../firebase/sessionService';

interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
}

interface Quiz {
  title: string;
  description?: string;
  questions: Question[];
}

interface Answer {
  questionIndex: number;
  answerIndex: number;
  isCorrect: boolean;
  points: number;
  answeredAt: number;
}

interface Attempt {
  answers: Record<string, Answer>;
  score: number;
  completedAt: number;
}

interface RealtimeParticipant {
  id: string;
  name: string;
  score: number;
  isActive: boolean;
  joinedAt: number;
  quizId: string;
  answers?: Record<string, Answer>;
  attempts?: Attempt[];
}

interface Session {
  id: string;
  code: string;
  quizId: string;
  hostId: string;
  createdAt: number;
  participantCount: number;
  currentQuestion: number;
  randomizeQuestions: boolean;
  singleAttempt: boolean;
  questionTimeLimit: number;
  expiresAt: number;
}

interface RankingParticipant {
  id: string;
  name: string;
  score: number;
  isCurrentUser: boolean;
}

export const useQuizLogic = (quizId: string | undefined) => {
  const navigate = useNavigate();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [participant, setParticipant] = useState<RealtimeParticipant | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showQuizEnd, setShowQuizEnd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [quizStarted, setQuizStarted] = useState(false);
  const [timerPercentage, setTimerPercentage] = useState(100);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [rankings, setRankings] = useState<RankingParticipant[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);
  
  const [questionKey, setQuestionKey] = useState(0);
  
  const [questionOrder, setQuestionOrder] = useState<number[]>([]);
  
  const [shuffledOptions, setShuffledOptions] = useState<Record<number, { options: string[], mapping: number[] }>>({});

  // 로컬 스토리지에서 참가자 정보 확인
  useEffect(() => {
    const storedParticipation = localStorage.getItem('quizParticipation');
    if (storedParticipation) {
      try {
        const participation = JSON.parse(storedParticipation);
        if (participation.sessionId === quizId) {
          setUserId(participation.participantId);
        } else {
          console.log('세션 ID 불일치:', participation.sessionId, quizId);
          navigate('/join');
        }
      } catch (err) {
        console.error('참가자 정보 파싱 오류:', err);
        navigate('/join');
      }
    } else {
      console.log('참가자 정보 없음');
      navigate('/join');
    }
  }, [quizId, navigate]);

  // 세션, 퀴즈, 참가자 정보 불러오기
  useEffect(() => {
    if (!quizId || !userId) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 1. 세션 정보 가져오기
        const sessionRef = ref(rtdb, `sessions/${quizId}`);
        const sessionSnapshot = await get(sessionRef);
        
        if (!sessionSnapshot.exists()) {
          setError('존재하지 않는 세션입니다');
          setLoading(false);
          return;
        }
        
        const sessionData = sessionSnapshot.val();
        sessionData.id = quizId;
        setSession(sessionData);
        
        // 세션 만료 확인
        if (sessionData.expiresAt && sessionData.expiresAt < Date.now()) {
          setError('세션이 만료되었습니다');
          setLoading(false);
          return;
        }
        
        // 2. 참가자 정보 가져오기
        const participantRef = ref(rtdb, `participants/${quizId}/${userId}`);
        const participantSnapshot = await get(participantRef);
        
        if (!participantSnapshot.exists()) {
          setError('참가자 정보를 찾을 수 없습니다');
          setLoading(false);
          return;
        }
        
        const participantData = participantSnapshot.val();
        participantData.id = userId;
        setParticipant(participantData);
        
        // 3. 세션에 저장된 퀴즈 데이터 불러오기
        try {
          let quizData: Quiz | null = null;
          
          // 먼저 RTDB에서 퀴즈 데이터 가져오기 시도
          try {
            quizData = await getQuizDataForClient(quizId);
            if (quizData) {
              console.log('RTDB에서 퀴즈 데이터 로드 성공:', quizData);
              
              // 정답 데이터도 함께 가져오기 시도
              try {
                const answersData = await getAnswersForClient(quizId);
                if (answersData) {
                  console.log('정답 데이터 로드 성공:', answersData);
                  
                  // 정답 데이터를 퀴즈 데이터에 통합
                  answersData.forEach((answer: any) => {
                    if (quizData && quizData.questions[answer.questionIndex]) {
                      quizData.questions[answer.questionIndex].correctAnswer = answer.correctAnswer;
                    }
                  });
                } else {
                  console.warn('정답 데이터를 찾을 수 없습니다');
                }
              } catch (answersError) {
                console.error('정답 데이터 로드 실패:', answersError);
              }
            }
          } catch (rtdbError) {
            console.error('RTDB에서 퀴즈 데이터 로드 실패:', rtdbError);
          }
          
          // RTDB에서 데이터를 찾지 못하면 Firestore에서 가져오기
          if (!quizData) {
            console.log('Firestore에서 퀴즈 데이터 로드 시도...');
            quizData = await getQuizById(sessionData.quizId, sessionData.hostId);
            console.log('Firestore에서 퀴즈 데이터 로드 성공:', quizData);
          }
          
          if (!quizData) {
            setError('퀴즈 정보를 찾을 수 없습니다');
            setLoading(false);
            return;
          }
          
          setQuiz(quizData);
          
          // 문제 순서 설정 - 무작위 출제 옵션에 따라 다르게 설정
          if (sessionData.randomizeQuestions) {
            const indices = Array.from({ length: quizData.questions.length }, (_, i) => i);
            for (let i = indices.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            setQuestionOrder(indices);
          } else {
            setQuestionOrder(Array.from({ length: quizData.questions.length }, (_, i) => i));
          }
          
          // 각 문제의 보기 문항을 무작위로 섞기
          shuffleAllQuestionOptions(quizData.questions);
          
          // 4. 현재 문제 인덱스 설정
          if (participantData.answers && Object.keys(participantData.answers).length > 0) {
            const answers = Object.values(participantData.answers);
            const answeredQuestions = answers.map((a: any) => a.questionIndex);
            const maxAnsweredIndex = Math.max(...answeredQuestions);
            
            // 모든 질문에 답변했는지 확인
            if (maxAnsweredIndex >= quizData.questions.length - 1) {
              setShowQuizEnd(true);
            } else {
              setCurrentQuestionIndex(maxAnsweredIndex + 1);
            }
          } else {
            setCurrentQuestionIndex(0);
          }
          
          // 5. 한 번만 참가 가능 설정 확인
          if (sessionData.singleAttempt && participantData.attempts && participantData.attempts.length > 0) {
            setShowQuizEnd(true);
            setError('이미 퀴즈를 완료했습니다. 결과를 확인해주세요.');
          }
          
        } catch (quizError) {
          console.error('퀴즈 데이터 로드 오류:', quizError);
          setError('퀴즈 정보를 불러오는데 실패했습니다');
          setLoading(false);
          return;
        }
        
        setTimeout(() => {
          setLoading(false);
        }, 500);
      } catch (err) {
        console.error('데이터 로딩 오류:', err);
        setError('데이터를 불러오는데 실패했습니다');
        setLoading(false);
      }
    };
    
    fetchData();
    
    // 세션 실시간 감시
    const sessionRef = ref(rtdb, `sessions/${quizId}`);
    onValue(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        const sessionData = snapshot.val();
        sessionData.id = quizId;
        setSession(sessionData);
        
        if (sessionData.expiresAt && sessionData.expiresAt < Date.now()) {
          setError('세션이 만료되었습니다');
          setTimeout(() => navigate('/join'), 3000);
        }
      } else {
        setError('세션이 종료되었습니다');
        setTimeout(() => navigate('/join'), 3000);
      }
    });
    
    // 참가자 정보 실시간 감시
    const participantRef = ref(rtdb, `participants/${quizId}/${userId}`);
    onValue(participantRef, (snapshot) => {
      if (snapshot.exists()) {
        const participantData = snapshot.val();
        participantData.id = userId;
        setParticipant(participantData);
        
        if (participantData.answers && Object.keys(participantData.answers).length === 0) {
          setCurrentQuestionIndex(0);
          setShowQuizEnd(false);
        }
      } else {
        setError('참가자 정보가 삭제되었습니다');
      }
    });
    
    return () => {
      off(sessionRef);
      off(participantRef);
    };
  }, [quizId, userId, navigate]);

  // 문제 타이머 설정
  useEffect(() => {
    if (!quiz || !quiz.questions || !quizStarted || currentQuestionIndex >= quiz.questions.length || showQuizEnd || showResult || !session) return;
    
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    const questionTimeLimit = session.questionTimeLimit || 30;
    setTimeLeft(questionTimeLimit);
    setTimerPercentage(100);
    
    const updateInterval = 100;
    const decrementPerUpdate = 100 / (questionTimeLimit * 1000 / updateInterval);
    
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0.1) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          if (!selectedAnswer && !showResult) {
            handleTimeUp();
          }
          return 0;
        }
        return prev - (updateInterval / 1000);
      });
      
      setTimerPercentage(prev => {
        const newValue = prev - decrementPerUpdate;
        return newValue < 0 ? 0 : newValue;
      });
      
    }, updateInterval);
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [quiz, currentQuestionIndex, selectedAnswer, showResult, showQuizEnd, quizStarted, session]);

  // 문제의 모든 보기 문항을 섞는 함수
  const shuffleAllQuestionOptions = (questions: Question[]) => {
    const shuffledOptionsData: Record<number, { options: string[], mapping: number[] }> = {};
    
    questions.forEach((question, questionIndex) => {
      const originalOptions = [...question.options];
      const shuffledOptions = [...originalOptions];
      const mapping: number[] = Array(originalOptions.length).fill(-1);
      
      for (let i = shuffledOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
      }
      
      originalOptions.forEach((option, origIndex) => {
        const shuffledIndex = shuffledOptions.indexOf(option);
        mapping[origIndex] = shuffledIndex;
      });
      
      shuffledOptionsData[questionIndex] = {
        options: shuffledOptions,
        mapping: mapping
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`문제 ${questionIndex} 섞기 결과:`, {
          originalOptions,
          shuffledOptions,
          mapping,
          correctAnswer: question.correctAnswer,
          mappedCorrectAnswer: mapping[question.correctAnswer]
        });
      }
    });
    
    setShuffledOptions(shuffledOptionsData);
  };

  // 퀴즈 다시 풀기 기능
  const resetQuiz = async () => {
    if (!quizId || !userId || !session) return;
    
    if (session.singleAttempt) {
      setError('이 퀴즈는 한 번만 참여할 수 있습니다.');
      return;
    }
    
    try {
      setLoading(true);
      
      const participantRef = ref(rtdb, `participants/${quizId}/${userId}`);
      const participantSnapshot = await get(participantRef);
      
      if (participantSnapshot.exists()) {
        const participantData = participantSnapshot.val();
        
        let attempts = participantData.attempts || [];
        
        if (participantData.answers && Object.keys(participantData.answers).length > 0) {
          attempts.push({
            answers: participantData.answers,
            score: participantData.score || 0,
            completedAt: Date.now()
          });
        }
        
        await update(participantRef, {
          attempts: attempts,
          answers: null,
          score: 0
        });
      } else {
        console.error('참가자 정보를 찾을 수 없습니다');
        setError('참가자 정보를 찾을 수 없습니다');
        setLoading(false);
        return;
      }
      
      if (session.randomizeQuestions && quiz) {
        const indices = Array.from({ length: quiz.questions.length }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        setQuestionOrder(indices);
        
        shuffleAllQuestionOptions(quiz.questions);
      }
      
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setSelectedAnswerIndex(null);
      setShowResult(false);
      setShowQuizEnd(false);
      setQuizStarted(false);
      window.scrollTo(0, 0);
      
      setTimeout(() => {
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error('퀴즈 초기화 오류:', err);
      setError('퀴즈를 다시 시작하는데 실패했습니다');
      setLoading(false);
    }
  };

  // 퀴즈 시작 핸들러
  const handleStartQuiz = () => {
    setQuizStarted(true);
    window.scrollTo(0, 0);
  };

  // 답변 제출 처리
  const submitAnswer = async (answerIndex: number, isCorrect: boolean) => {
    if (!quiz || !participant || !quizId || !userId) return;
    
    try {
      const pointsForCorrect = 100;
      const timeBonus = timeLeft ? Math.round((timeLeft / (session?.questionTimeLimit || 30)) * 50) : 0;
      
      const points = isCorrect ? pointsForCorrect + timeBonus : 0;
      const newScore = (participant.score || 0) + points;
      
      const realQuestionIndex = questionOrder[currentQuestionIndex] !== undefined 
        ? questionOrder[currentQuestionIndex] 
        : currentQuestionIndex;
      
      const answerData = {
        questionIndex: realQuestionIndex,
        answerIndex: answerIndex,
        isCorrect: isCorrect,
        points: points,
        answeredAt: Date.now()
      };
      
      const participantRef = ref(rtdb, `participants/${quizId}/${userId}`);
      const answersRef = ref(rtdb, `participants/${quizId}/${userId}/answers/${realQuestionIndex}`);
      
      await update(participantRef, {
        score: newScore
      });
      
      await update(answersRef, answerData);
      
      setParticipant(prev => {
        if (!prev) return null;
        
        const updatedAnswers = prev.answers || {};
        updatedAnswers[realQuestionIndex.toString()] = answerData;
        
        return {
          ...prev,
          score: newScore,
          answers: updatedAnswers
        };
      });
    } catch (err) {
      console.error('답변 제출 오류:', err);
    }
  };

  const handleSelectAnswer = (answer: string, index: number) => {
    if (showResult) return;
    
    setSelectedAnswer(answer);
    setSelectedAnswerIndex(index);
    
    const realQuestionIndex = questionOrder[currentQuestionIndex] !== undefined 
      ? questionOrder[currentQuestionIndex] 
      : currentQuestionIndex;
      
    const currentQuestion = quiz?.questions[realQuestionIndex];
    if (!currentQuestion) return;
    
    let isCorrect = false;
    
    // 정답 데이터 검증 로그 추가
    console.log('정답 확인 데이터:', {
      문제번호: realQuestionIndex,
      정답데이터여부: currentQuestion.hasOwnProperty('correctAnswer'),
      정답인덱스: currentQuestion.correctAnswer,
      섞인옵션여부: !!shuffledOptions[realQuestionIndex],
      매핑: shuffledOptions[realQuestionIndex]?.mapping
    });
    
    // correctAnswer 속성이 없을 때 처리
    if (currentQuestion.correctAnswer === undefined) {
      console.warn('정답 데이터가 없습니다. 모든 답변을 임시로 정답으로 처리합니다.');
      submitAnswer(index, true);
    } else {
      // 정답 데이터가 있는 경우 정상 처리
      if (shuffledOptions[realQuestionIndex]) {
        const correctUIIndex = shuffledOptions[realQuestionIndex].mapping[currentQuestion.correctAnswer];
        isCorrect = index === correctUIIndex;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('답안 선택 확인:', {
            선택한UI인덱스: index,
            원본정답인덱스: currentQuestion.correctAnswer,
            변환된정답UI인덱스: correctUIIndex,
            정답여부: isCorrect,
            선택한답안: answer,
            정답텍스트: shuffledOptions[realQuestionIndex].options[correctUIIndex]
          });
        }
      } else {
        isCorrect = index === currentQuestion.correctAnswer;
      }
      
      submitAnswer(index, isCorrect);
    }
    
    setShowResult(true);
    
    setTimeout(() => {
      setShowResult(false);
      setSelectedAnswer(null);
      setSelectedAnswerIndex(null);
      
      if (currentQuestionIndex >= (quiz?.questions.length || 0) - 1) {
        setShowQuizEnd(true);
        window.scrollTo(0, 0);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setQuestionKey(prev => prev + 1);
        window.scrollTo(0, 0);
      }
    }, 2000);
  };

  const handleTimeUp = () => {
    submitAnswer(-1, false);
    
    setShowResult(true);
    
    setTimeout(() => {
      setShowResult(false);
      setSelectedAnswer(null);
      setSelectedAnswerIndex(null);
      
      if (currentQuestionIndex >= (quiz?.questions.length || 0) - 1) {
        setShowQuizEnd(true);
        window.scrollTo(0, 0);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setQuestionKey(prev => prev + 1);
        window.scrollTo(0, 0);
      }
    }, 1500);
  };

  // 랭킹 데이터 불러오기 함수
  const fetchRankings = async () => {
    if (!quizId || !userId) return;
    
    try {
      setIsLoadingRankings(true);
      
      const participantsRef = ref(rtdb, `participants/${quizId}`);
      const participantsSnapshot = await get(participantsRef);
      
      if (!participantsSnapshot.exists()) {
        setIsLoadingRankings(false);
        return;
      }
      
      const participantsData = participantsSnapshot.val();
      
      const rankingsList: RankingParticipant[] = Object.entries(participantsData)
        .map(([id, data]: [string, any]) => ({
          id,
          name: data.name,
          score: data.score || 0,
          isCurrentUser: id === userId
        }))
        .sort((a, b) => b.score - a.score);
      
      setRankings(rankingsList);
      setIsLoadingRankings(false);
    } catch (err) {
      console.error('랭킹 데이터 로드 오류:', err);
      setIsLoadingRankings(false);
    }
  };

  // 퀴즈 결과 표시 시 랭킹 데이터 로드
  useEffect(() => {
    if (showQuizEnd) {
      fetchRankings();
      window.scrollTo(0, 0);
    }
  }, [showQuizEnd, quizId, userId]);

  const getCurrentQuestion = () => {
    if (!quiz || !quiz.questions || currentQuestionIndex >= quiz.questions.length) return null;
    
    const realQuestionIndex = questionOrder[currentQuestionIndex] !== undefined 
      ? questionOrder[currentQuestionIndex] 
      : currentQuestionIndex;
    
    const currentQuestion = quiz.questions[realQuestionIndex];
    
    const currentQuestionOptions = shuffledOptions[realQuestionIndex]?.options || currentQuestion.options;
    
    let currentQuestionCorrectAnswer = currentQuestion.correctAnswer;
    if (shuffledOptions[realQuestionIndex]) {
      currentQuestionCorrectAnswer = shuffledOptions[realQuestionIndex].mapping[currentQuestion.correctAnswer];
    }
    
    return {
      ...currentQuestion,
      options: currentQuestionOptions,
      correctAnswer: currentQuestionCorrectAnswer
    };
  };

  return {
    quiz,
    session,
    participant,
    userId,
    currentQuestionIndex,
    selectedAnswer,
    selectedAnswerIndex,
    timeLeft,
    showResult,
    showQuizEnd,
    loading,
    error,
    quizStarted,
    timerPercentage,
    rankings,
    isLoadingRankings,
    questionKey,
    questionOrder,
    shuffledOptions,
    handleStartQuiz,
    handleSelectAnswer,
    handleTimeUp,
    resetQuiz,
    setError,
    getCurrentQuestion
  };
}; 