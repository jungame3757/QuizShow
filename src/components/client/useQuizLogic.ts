import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get, update, onValue, off } from 'firebase/database';
import { rtdb } from '../../firebase/config';
import { getQuizById } from '../../firebase/quizService';
import { getQuizDataForClient, getAnswersForClient, validateAnswer, submitAnswer } from '../../firebase/sessionService';
import { Quiz as GlobalQuiz, Question } from '../../types';

interface Answer {
  questionIndex: number;
  answerIndex?: number; // 객관식용
  answerText?: string; // 주관식/의견용
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
  
  const [quiz, setQuiz] = useState<GlobalQuiz | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [participant, setParticipant] = useState<RealtimeParticipant | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [selectedAnswerText, setSelectedAnswerText] = useState<string | null>(null);
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
  
  // 현재 문제의 섞인 선택지와 매핑 정보를 저장
  const [currentShuffledOptions, setCurrentShuffledOptions] = useState<{ options: string[], mapping: number[] } | null>(null);

  // 의견 수집용 - 다른 참가자들의 답변
  const [otherOpinions, setOtherOpinions] = useState<string[]>([]);

  // 서버 검증 결과 상태
  const [serverValidationResult, setServerValidationResult] = useState<{ isCorrect: boolean; points: number } | null>(null);

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
          let quizData: GlobalQuiz | null = null;
          let answersData: any[] | null = null;
          
          // 먼저 RTDB에서 퀴즈 데이터 가져오기 시도
          try {
            quizData = await getQuizDataForClient(quizId);
            if (quizData) {
              console.log('RTDB에서 퀴즈 데이터 로드 성공:', quizData);
              
              // 정답 데이터도 함께 가져오기
              try {
                answersData = await getAnswersForClient(quizId);
                if (answersData) {
                  console.log('정답 데이터 로드 성공:', answersData);
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
          
          // 정답 데이터를 퀴즈 데이터에 통합
          if (answersData && Array.isArray(answersData)) {
            answersData.forEach((answer: any) => {
              if (quizData && quizData.questions[answer.questionIndex]) {
                const question = quizData.questions[answer.questionIndex];
                
                // 문제 형식별로 정답 정보 추가
                if (answer.type === 'multiple-choice') {
                  question.correctAnswer = answer.correctAnswer;
                } else if (answer.type === 'short-answer') {
                  question.correctAnswerText = answer.correctAnswerText;
                  question.additionalAnswers = answer.additionalAnswers || [];
                  question.answerMatchType = answer.answerMatchType || 'exact';
                } else if (answer.type === 'opinion') {
                  question.isAnonymous = answer.isAnonymous || false;
                }
              }
            });
          }
          
          setQuiz(quizData);
          
          // 문제 순서 설정 - 무작위 출제 옵션에 따라 다르게 설정
          let orderIndices: number[];
          if (sessionData.randomizeQuestions) {
            orderIndices = Array.from({ length: quizData.questions.length }, (_, i) => i);
            for (let i = orderIndices.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [orderIndices[i], orderIndices[j]] = [orderIndices[j], orderIndices[i]];
            }
          } else {
            orderIndices = Array.from({ length: quizData.questions.length }, (_, i) => i);
          }
          setQuestionOrder(orderIndices);
          
          // 4. 현재 문제 인덱스 설정 및 완료 여부 확인
          let shouldShowQuizEnd = false;
          let nextQuestionIndex = 0;
          
          if (participantData.answers && Object.keys(participantData.answers).length > 0) {
            const answeredQuestionIndices = Object.keys(participantData.answers).map(Number);
            
            // 모든 질문에 답변했는지 확인
            if (answeredQuestionIndices.length >= quizData.questions.length) {
              shouldShowQuizEnd = true;
              setQuizStarted(true); // 이미 퀴즈를 진행했으므로 시작됨으로 표시
            } else {
              // 다음 답변할 문제 찾기 (순서대로)
              const unansweredIndices = orderIndices.filter(index => !answeredQuestionIndices.includes(index));
              if (unansweredIndices.length > 0) {
                // 첫 번째 미답변 문제의 순서를 찾기
                const nextActualIndex = unansweredIndices[0];
                nextQuestionIndex = orderIndices.findIndex(index => index === nextActualIndex);
              } else {
                shouldShowQuizEnd = true;
                setQuizStarted(true);
              }
            }
          }
          
          setCurrentQuestionIndex(nextQuestionIndex);
          setShowQuizEnd(shouldShowQuizEnd);
          
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
        
        // 참가자 데이터가 리셋된 경우에만 퀴즈 상태 초기화
        if (participantData.answers && Object.keys(participantData.answers).length === 0) {
          setCurrentQuestionIndex(0);
          setShowQuizEnd(false);
          setQuizStarted(false);
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
    
    const actualIndex = questionOrder[currentQuestionIndex];
    if (actualIndex === undefined) return;
    
    const question = quiz.questions[actualIndex];
    
    // 의견 수집 문제는 시간 제한 없음
    if (question.type === 'opinion') {
      setTimeLeft(null);
      setTimerPercentage(100);
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      return;
    }

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
  }, [quiz, currentQuestionIndex, selectedAnswer, showResult, showQuizEnd, quizStarted, session, questionOrder]);

  // 선택지 순서 섞기 함수
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

  // 문제가 바뀔 때마다 선택지 순서 섞기
  useEffect(() => {
    if (!quiz || !quiz.questions || currentQuestionIndex >= quiz.questions.length) return;
    
    const actualIndex = questionOrder[currentQuestionIndex];
    if (actualIndex === undefined) return;
    
    const question = quiz.questions[actualIndex];
    
    const shuffledData = shuffleCurrentQuestionOptions(question);
    setCurrentShuffledOptions(shuffledData);
    
    // 선택 상태 초기화
    setSelectedAnswer(null);
    setSelectedAnswerIndex(null);
    setSelectedAnswerText(null);
    setQuestionKey(prev => prev + 1);
    
    // 서버 검증 결과 초기화
    setServerValidationResult(null);
    
    // 의견 수집 문제일 때 다른 참가자들의 답변 가져오기
    if (question.type === 'opinion' && quizId && actualIndex !== undefined) {
      fetchOtherOpinions(actualIndex);
    } else {
      setOtherOpinions([]);
    }
  }, [currentQuestionIndex, quiz, questionOrder, quizId]);

  // 다른 참가자들의 의견 가져오기
  const fetchOtherOpinions = async (questionIndex: number) => {
    if (!quizId || !userId) return;
    
    try {
      const answersRef = ref(rtdb, `sessionAnswers/${quizId}_question_${questionIndex}`);
      const snapshot = await get(answersRef);
      
      if (snapshot.exists()) {
        const answers = snapshot.val();
        const opinions: string[] = [];
        
        Object.keys(answers).forEach(participantId => {
          if (participantId !== userId && answers[participantId].answer) {
            opinions.push(answers[participantId].answer);
          }
        });
        
        // 최신 5개의 의견만 표시
        setOtherOpinions(opinions.slice(-5));
      }
    } catch (error) {
      console.error('다른 참가자 의견 가져오기 오류:', error);
    }
  };

  // 퀴즈 리셋
  const resetQuiz = async () => {
    try {
      if (!quizId || !userId) return;
      
      // 현재 참가자 데이터를 시도 기록으로 저장
      if (participant && participant.answers && Object.keys(participant.answers).length > 0) {
        const participantRef = ref(rtdb, `participants/${quizId}/${userId}`);
        const snapshot = await get(participantRef);
        
        if (snapshot.exists()) {
          const participantData = snapshot.val();
          
          // 현재 데이터를 attempts 배열에 추가
          const currentAttempt = {
            answers: participantData.answers || {},
            score: participantData.score || 0,
            completedAt: Date.now()
          };
          
          // 기존 attempts 가져오기 (없으면 빈 배열)
          const existingAttempts = participantData.attempts || [];
          
          // 새로운 시도를 attempts에 추가
          const updatedAttempts = [...existingAttempts, currentAttempt];
          
          // 참가자 데이터 업데이트 (현재 데이터 초기화 + attempts에 이전 데이터 저장)
          const updatedParticipantData = {
            id: participantData.id || userId,
            name: participantData.name || '익명',
            joinedAt: participantData.joinedAt || Date.now(),
            isActive: true,
            quizId: participantData.quizId || quizId,
            score: 0, // 점수 초기화
            answers: {}, // 답변 초기화
            attempts: updatedAttempts // 이전 시도들 저장
          };
          
          // undefined 값 제거 함수
          const removeUndefinedValues = (obj: any): any => {
            const cleaned: any = {};
            for (const [key, value] of Object.entries(obj)) {
              if (value !== undefined) {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                  cleaned[key] = removeUndefinedValues(value);
                } else {
                  cleaned[key] = value;
                }
              }
            }
            return cleaned;
          };
          
          const cleanedData = removeUndefinedValues(updatedParticipantData);
          
          await update(participantRef, cleanedData);
          
          console.log('일반 모드 - 이전 게임 데이터를 시도 기록으로 저장 완료:', {
            currentScore: currentAttempt.score,
            totalAttempts: updatedAttempts.length
          });
        }
      } else {
        // 기존 방식: 단순 초기화
        const participantRef = ref(rtdb, `participants/${quizId}/${userId}`);
        await update(participantRef, {
          answers: {},
          score: 0
        });
      }
      
      // 로컬 상태 초기화
      setSelectedAnswer(null);
      setSelectedAnswerIndex(null);
      setSelectedAnswerText(null);
      setShowResult(false);
      setShowQuizEnd(false);
      setCurrentQuestionIndex(0);
      setError(null);
      setQuizStarted(false);
      setOtherOpinions([]);
      setServerValidationResult(null);
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      
      // 랭킹 업데이트
      await fetchRankings();
    } catch (err) {
      console.error('퀴즈 리셋 오류:', err);
      setError('퀴즈 리셋에 실패했습니다');
    }
  };

  // 퀴즈 시작
  const handleStartQuiz = () => {
    setQuizStarted(true);
  };

  // 새로운 답변 제출 함수 - 다양한 문제 형식 지원
  const submitAnswerToServer = async (
    answerData: { answerIndex?: number; answerText?: string },
    questionIndex: number
  ) => {
    if (!quizId || !userId) return;

    try {
      // 서버에서 정답 검증 (남은 시간 전달)
      const validationResult = await validateAnswer(quizId, questionIndex, answerData, timeLeft || 0);
      
      // 서버 검증 결과 저장
      setServerValidationResult(validationResult);
      
      // 답변 데이터 저장
      await submitAnswer(
        quizId,
        questionIndex,
        userId,
        answerData,
        validationResult.isCorrect,
        validationResult.points
      );

      // 로컬 상태 업데이트는 실시간 리스너에서 처리됨
      console.log('답변 제출 완료:', {
        questionIndex,
        answerData,
        timeLeft: timeLeft || 0,
        isCorrect: validationResult.isCorrect,
        points: validationResult.points
      });

    } catch (error) {
      console.error('답변 제출 오류:', error);
      setError('답변 제출에 실패했습니다');
    }
  };

  // 답변 선택 핸들러 - 새로운 문제 형식 지원
  const handleSelectAnswer = (answer: string, index: number) => {
    if (!quiz || !quiz.questions || currentQuestionIndex >= quiz.questions.length) return;
    
    const actualIndex = questionOrder[currentQuestionIndex];
    if (actualIndex === undefined) return;
    
    const question = quiz.questions[actualIndex];
    
    // 이미 답변했거나 결과를 보여주는 중이면 return
    if (showResult || participant?.answers?.[actualIndex.toString()]) return;
    
    setSelectedAnswer(answer);
    
    let answerData: { answerIndex?: number; answerText?: string } = {};
    let originalAnswerIndex: number | undefined = undefined;
    
    if (question.type === 'multiple-choice') {
      // 객관식: 선택지 인덱스 처리
      originalAnswerIndex = index;
      
      // 섞인 선택지가 있는 경우, 원본 인덱스로 변환
      if (currentShuffledOptions && currentShuffledOptions.mapping) {
        originalAnswerIndex = currentShuffledOptions.mapping[index];
      }
      
      setSelectedAnswerIndex(originalAnswerIndex);
      answerData = { answerIndex: originalAnswerIndex };
    } else if (question.type === 'short-answer' || question.type === 'opinion') {
      // 주관식 또는 의견 수집: 텍스트 답변 처리
      setSelectedAnswerText(answer);
      setSelectedAnswerIndex(0); // 텍스트 답변은 인덱스 0으로 설정
      answerData = { answerText: answer };
    }
    
    // 클라이언트에서 즉시 검증
    const validationResult = validateAnswerImmediately(question, answerData, timeLeft);
    setServerValidationResult(validationResult);
    
    setShowResult(true);
    
    // 타이머 정지
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    // 서버에 답변 제출 (백그라운드에서)
    submitAnswerToServer(answerData, actualIndex);
    
    // 3초 후 다음 문제로 이동 (의견 수집은 4초)
    const delayTime = question.type === 'opinion' ? 4000 : 3000;
    setTimeout(() => {
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex >= quiz.questions.length) {
        setShowQuizEnd(true);
        fetchRankings();
      } else {
        setCurrentQuestionIndex(nextIndex);
        setShowResult(false);
        setSelectedAnswer(null);
        setSelectedAnswerIndex(null);
        setSelectedAnswerText(null);
      }
    }, delayTime);
  };

  // 시간 초과 처리
  const handleTimeUp = () => {
    if (showResult || !quiz || !quiz.questions) return;
    
    const actualIndex = questionOrder[currentQuestionIndex];
    if (actualIndex === undefined) return;
    
    const question = quiz.questions[actualIndex];
    
    let answerData: { answerIndex?: number; answerText?: string } = {};
    
    // 시간 초과 시 기본 처리
    if (question.type === 'multiple-choice') {
      answerData = { answerIndex: -1 }; // -1은 시간 초과 표시
    } else {
      answerData = { answerText: '' }; // 빈 답변으로 처리
    }
    
    // 클라이언트에서 즉시 검증 (시간 0으로)
    const validationResult = validateAnswerImmediately(question, answerData, 0);
    setServerValidationResult(validationResult);
    
    // 서버에 답변 제출 (백그라운드에서)
    submitAnswerToServer(answerData, actualIndex);
    
    setShowResult(true);
    
    setTimeout(() => {
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex >= quiz.questions.length) {
        setShowQuizEnd(true);
        fetchRankings();
      } else {
        setCurrentQuestionIndex(nextIndex);
        setShowResult(false);
        setSelectedAnswer(null);
        setSelectedAnswerIndex(null);
        setSelectedAnswerText(null);
      }
    }, 2000);
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
    
    const realQuestionIndex = questionOrder[currentQuestionIndex];
    if (realQuestionIndex === undefined) return null;
    
    const currentQuestion = quiz.questions[realQuestionIndex];
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

  // 클라이언트 측 즉시 검증 함수
  const validateAnswerImmediately = (
    question: Question,
    answerData: { answerIndex?: number; answerText?: string },
    currentTimeLeft: number | null
  ): { isCorrect: boolean; points: number } => {
    if (!session) return { isCorrect: false, points: 0 };
    
    const questionTimeLimit = session.questionTimeLimit || 30;
    
    // 시간에 따른 점수 계산 함수
    const calculateTimeBasedPoints = (basePoints: number, timeLeft: number = 0) => {
      if (timeLeft <= 0) return Math.floor(basePoints * 0.3); // 시간 초과 시 30%
      
      // 0.1초 단위로 정밀한 계산
      const timeLeftRounded = Math.round(timeLeft * 10) / 10; // 0.1초 단위로 반올림
      const timeRatio = timeLeftRounded / questionTimeLimit;
      
      // 더 세밀한 점수 계산 (0.1초마다 점수 변화)
      // 최대 100점에서 시작하여 시간이 줄어들수록 점수 감소
      const timeBonus = Math.max(0, timeRatio); // 0~1 사이의 비율
      const finalPoints = Math.floor(basePoints * (0.5 + (timeBonus * 0.5))); // 50%~100% 범위
      
      return Math.max(Math.floor(basePoints * 0.3), finalPoints); // 최소 30% 보장
    };
    
    let isCorrect = false;
    let points = 0;
    
    switch (question.type) {
      case 'multiple-choice':
        if (answerData.answerIndex !== undefined && answerData.answerIndex >= 0) {
          isCorrect = answerData.answerIndex === question.correctAnswer;
          points = isCorrect ? calculateTimeBasedPoints(100, currentTimeLeft || 0) : 0;
        }
        break;
        
      case 'short-answer':
        if (answerData.answerText && typeof answerData.answerText === 'string') {
          const userAnswer = answerData.answerText.toLowerCase().trim();
          const correctAnswer = question.correctAnswerText?.toLowerCase().trim();
          
          if (correctAnswer) {
            if (question.answerMatchType === 'contains') {
              // 정답 단어 포함 방식
              isCorrect = userAnswer.includes(correctAnswer);
              
              // 추가 정답들도 확인
              if (!isCorrect && question.additionalAnswers) {
                isCorrect = question.additionalAnswers.some((answer: string) => 
                  userAnswer.includes(answer.toLowerCase().trim())
                );
              }
            } else {
              // 정확히 일치 방식 (기본값)
              isCorrect = userAnswer === correctAnswer;
              
              // 추가 정답들도 확인
              if (!isCorrect && question.additionalAnswers) {
                isCorrect = question.additionalAnswers.some((answer: string) => 
                  userAnswer === answer.toLowerCase().trim()
                );
              }
            }
          }
          
          points = isCorrect ? calculateTimeBasedPoints(100, currentTimeLeft || 0) : 0;
        }
        break;
        
      case 'opinion':
        if (answerData.answerText && typeof answerData.answerText === 'string' && answerData.answerText.trim()) {
          isCorrect = true; // 의견 수집은 정답/오답 개념이 없음
          points = 50; // 고정 점수 (시간과 무관)
        }
        break;
        
      default:
        break;
    }
    
    return { isCorrect, points };
  };

  return {
    quiz,
    session,
    participant,
    userId,
    currentQuestionIndex,
    selectedAnswer,
    selectedAnswerIndex,
    selectedAnswerText,
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
    currentShuffledOptions,
    otherOpinions,
    serverValidationResult,
    handleStartQuiz,
    handleSelectAnswer,
    handleTimeUp,
    resetQuiz,
    setError,
    getCurrentQuestion
  };
}; 