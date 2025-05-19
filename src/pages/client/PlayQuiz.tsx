import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { XCircle, Loader2 } from 'lucide-react';
import { rtdb } from '../../firebase/config';
import { ref, get, update, onValue, off } from 'firebase/database';
import Button from '../../components/Button';
import QuizQuestion from '../../components/QuizQuestion';
import QuizResults from '../../components/QuizResults';
import QuizStartPage from '../../components/QuizStartPage';
import { getQuizById } from '../../firebase/quizService';

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
}

interface RankingParticipant {
  id: string;
  name: string;
  score: number;
  isCurrentUser: boolean;
}

const PlayQuiz: React.FC = () => {
  // URL에서 sessionId를 가져옵니다 (라우트에 정의된 파라미터 이름은 quizId입니다)
  const { quizId } = useParams<{ quizId: string }>();
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
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState<number | -1>(-1); // -1은 현재 시도
  
  // 새로운 상태 추가 - 퀴즈 시작 여부
  const [quizStarted, setQuizStarted] = useState(false);
  // 타이머 애니메이션을 위한 상태
  const [timerPercentage, setTimerPercentage] = useState(100);
  
  // 랭킹 관련 상태 추가
  const [rankings, setRankings] = useState<RankingParticipant[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);
  
  // 문제 컴포넌트 강제 재렌더링을 위한 키 추가
  const [questionKey, setQuestionKey] = useState(0);
  
  // 로컬 스토리지에서 참가자 정보 확인
  useEffect(() => {
    const storedParticipation = localStorage.getItem('quizParticipation');
    if (storedParticipation) {
      try {
        const participation = JSON.parse(storedParticipation);
        // sessionId가 URL 파라미터의 값과 일치하는지 확인 (URL 파라미터 이름은 quizId지만 실제로는 sessionId 값입니다)
        if (participation.sessionId === quizId) {
          setUserId(participation.participantId);
        } else {
          // 다른 세션의 참여 정보가 있으면 참여 페이지로 이동
          console.log('세션 ID 불일치:', participation.sessionId, quizId);
          navigate('/join');
        }
      } catch (err) {
        console.error('참가자 정보 파싱 오류:', err);
        navigate('/join');
      }
    } else {
      // 참여 정보가 없으면 참여 페이지로
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
        
        // 1. 세션 정보 가져오기 (URL의 quizId 파라미터 값은 실제로 sessionId입니다)
        const sessionRef = ref(rtdb, `sessions/${quizId}`);
        const sessionSnapshot = await get(sessionRef);
        
        if (!sessionSnapshot.exists()) {
          setError('존재하지 않는 세션입니다');
          setLoading(false);
          return;
        }
        
        const sessionData = sessionSnapshot.val();
        sessionData.id = quizId; // ID 추가
        setSession(sessionData);
        
        // 2. 참가자 정보 가져오기
        const participantRef = ref(rtdb, `participants/${quizId}/${userId}`);
        const participantSnapshot = await get(participantRef);
        
        if (!participantSnapshot.exists()) {
          setError('참가자 정보를 찾을 수 없습니다');
          setLoading(false);
          return;
        }
        
        const participantData = participantSnapshot.val();
        participantData.id = userId; // ID 추가
        setParticipant(participantData);
        
        // 3. 퀴즈 정보 가져오기 (수정: quizService의 getQuizById 사용)
        try {
          const quizData = await getQuizById(sessionData.quizId);
          
          if (!quizData) {
            setError('퀴즈 정보를 찾을 수 없습니다');
            setLoading(false);
            return;
          }
          
          setQuiz(quizData);
          console.log('퀴즈 데이터 로드 성공:', quizData);
          
          // 4. 참가자 답변과 퀴즈 데이터가 모두 로드된 후 현재 문제 인덱스 설정
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
            // 답변이 없는 경우 첫 번째 문제부터 시작
            setCurrentQuestionIndex(0);
          }
          
        } catch (quizError) {
          console.error('퀴즈 데이터 로드 오류:', quizError);
          setError('퀴즈 정보를 불러오는데 실패했습니다');
          setLoading(false);
          return;
        }
        
        // 약간의 지연 시간을 두고 로딩 상태 해제
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
        
        // 답변 상태 변경 시 현재 문제 인덱스 업데이트
        if (participantData.answers && Object.keys(participantData.answers).length === 0) {
          setCurrentQuestionIndex(0); // 답변이 모두 지워진 경우 첫 문제로
          setShowQuizEnd(false);
        }
      } else {
        setError('참가자 정보가 삭제되었습니다');
      }
    });
    
    return () => {
      // 구독 취소
      off(sessionRef);
      off(participantRef);
    };
  }, [quizId, userId, navigate]);
  
  // 문제 타이머 설정
  useEffect(() => {
    // 퀴즈가 시작되지 않았거나 showQuizEnd가 true인 경우 타이머를 설정하지 않음
    // showResult가 true일 때도 타이머를 중지
    if (!quiz || !quiz.questions || !quizStarted || currentQuestionIndex >= quiz.questions.length || showQuizEnd || showResult) return;
    
    const questionTimeLimit = 30; // 문제당 30초
    setTimeLeft(questionTimeLimit);
    setTimerPercentage(100); // 타이머 초기화
    
    // 타이머 업데이트 간격 (더 부드러운 애니메이션을 위해 100ms로 설정)
    const updateInterval = 100; // 0.1초
    const decrementPerUpdate = 100 / (questionTimeLimit * 1000 / updateInterval); // 0.1초당 감소할 퍼센트
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0.1) {
          clearInterval(timer);
          // 시간 초과, 자동 제출
          if (!selectedAnswer && !showResult) {
            handleTimeUp();
          }
          return 0;
        }
        return prev - (updateInterval / 1000); // 0.1초씩 감소
      });
      
      // 부드러운 타이머 애니메이션을 위해 퍼센티지 업데이트
      setTimerPercentage(prev => {
        const newValue = prev - decrementPerUpdate;
        return newValue < 0 ? 0 : newValue;
      });
      
    }, updateInterval);
    
    return () => clearInterval(timer);
  }, [quiz, currentQuestionIndex, selectedAnswer, showResult, showQuizEnd, quizStarted]);
  
  // 점수 애니메이션 효과 제거 (관련 코드 삭제)
  
  // 퀴즈 다시 풀기 기능
  const resetQuiz = async () => {
    if (!quizId || !userId) return;
    
    try {
      setLoading(true);
      
      // 참가자의 현재 정보 가져오기
      const participantRef = ref(rtdb, `participants/${quizId}/${userId}`);
      const participantSnapshot = await get(participantRef);
      
      if (participantSnapshot.exists()) {
        const participantData = participantSnapshot.val();
        
        // 이전 시도 데이터 저장
        let attempts = participantData.attempts || [];
        
        // 답변이 있는 경우에만 attempts에 추가
        if (participantData.answers && Object.keys(participantData.answers).length > 0) {
          attempts.push({
            answers: participantData.answers,
            score: participantData.score || 0,
            completedAt: Date.now()
          });
        }
        
        // 업데이트: 이전 답변을 attempts에 보존하고 새로운 시도 시작
        await update(participantRef, {
          attempts: attempts,
          answers: null,  // 새 시도를 위해 초기화
          score: 0
        });
      } else {
        console.error('참가자 정보를 찾을 수 없습니다');
        setError('참가자 정보를 찾을 수 없습니다');
        setLoading(false);
        return;
      }
      
      // 상태 초기화
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setSelectedAnswerIndex(null);
      setShowResult(false);
      setShowQuizEnd(false);
      setQuizStarted(false); // 퀴즈 시작 상태 초기화
      window.scrollTo(0, 0); // 퀴즈 초기화 시 스크롤 최상단으로 이동
      
      // 데이터가 업데이트된 후에 로딩 상태 해제
      setTimeout(() => {
        setLoading(false);
      }, 500); // 약간의 지연 시간을 두어 데이터 업데이트가 반영되도록 함
    } catch (err) {
      console.error('퀴즈 초기화 오류:', err);
      setError('퀴즈를 다시 시작하는데 실패했습니다');
      setLoading(false);
    }
  };
  
  // 퀴즈 시작 핸들러
  const handleStartQuiz = () => {
    setQuizStarted(true);
    window.scrollTo(0, 0); // 퀴즈 시작 시 스크롤 최상단으로 이동
  };
  
  // 답변 제출 처리
  const submitAnswer = async (answerIndex: number, isCorrect: boolean) => {
    if (!quiz || !participant || !quizId || !userId) return;
    
    try {
      const pointsForCorrect = 100; // 정답 시 기본 점수
      const timeBonus = timeLeft ? Math.round((timeLeft / 30) * 50) : 0; // 시간 보너스 (최대 50점)
      
      const points = isCorrect ? pointsForCorrect + timeBonus : 0;
      const newScore = (participant.score || 0) + points;
      
      const answerData = {
        questionIndex: currentQuestionIndex,
        answerIndex: answerIndex,
        isCorrect: isCorrect,
        points: points,
        answeredAt: Date.now()
      };
      
      // Realtime Database에 답변 및 점수 업데이트
      const participantRef = ref(rtdb, `participants/${quizId}/${userId}`);
      const answersRef = ref(rtdb, `participants/${quizId}/${userId}/answers/${currentQuestionIndex}`);
      
      // 답변 및 점수 업데이트
      await update(participantRef, {
        score: newScore
      });
      
      // 답변 추가
      await update(answersRef, answerData);
      
      // 로컬 상태 업데이트
      setParticipant(prev => {
        if (!prev) return null;
        
        // 기존 answers가 없으면 빈 객체로 초기화
        const updatedAnswers = prev.answers || {};
        // 인덱스를 문자열로 사용하여 추가
        updatedAnswers[currentQuestionIndex.toString()] = answerData;
        
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
    
    const currentQuestion = quiz?.questions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    // 수정: 인덱스 기반으로 정답 판별
    const isCorrect = index === currentQuestion.correctAnswer;
    
    // 답변 제출
    submitAnswer(index, isCorrect);
    
    // 결과 표시
    setShowResult(true);
    
    // 2초 후 다음 문제로
    setTimeout(() => {
      // 다음 문제 전환 시 선택 상태 초기화
      setShowResult(false);
      setSelectedAnswer(null);
      setSelectedAnswerIndex(null);
      
      if (currentQuestionIndex >= (quiz?.questions.length || 0) - 1) {
        setShowQuizEnd(true);
        window.scrollTo(0, 0); // 결과화면 표시 시 스크롤 최상단으로 이동
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        // 문제 변경 시 컴포넌트 키를 변경하여 강제 재렌더링
        setQuestionKey(prev => prev + 1);
        window.scrollTo(0, 0); // 다음 문제로 넘어갈 때 스크롤 최상단으로 이동
      }
    }, 2000);
  };
  
  const handleTimeUp = () => {
    // 시간 초과 시 -1 인덱스 제출 (유효하지 않은 선택)
    submitAnswer(-1, false);
    
    // 피드백 표시
    setShowResult(true);
    
    // 1.5초 후 다음 문제로
    setTimeout(() => {
      // 다음 문제 전환 시 선택 상태 초기화
      setShowResult(false);
      setSelectedAnswer(null);
      setSelectedAnswerIndex(null);
      
      if (currentQuestionIndex >= (quiz?.questions.length || 0) - 1) {
        setShowQuizEnd(true);
        window.scrollTo(0, 0); // 결과화면 표시 시 스크롤 최상단으로 이동
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        // 문제 변경 시 컴포넌트 키를 변경하여 강제 재렌더링
        setQuestionKey(prev => prev + 1);
        window.scrollTo(0, 0); // 다음 문제로 넘어갈 때 스크롤 최상단으로 이동
      }
    }, 1500);
  };
  
  // 랭킹 데이터 불러오기 함수
  const fetchRankings = async () => {
    if (!quizId || !userId) return;
    
    try {
      setIsLoadingRankings(true);
      
      // 모든 참가자 정보 가져오기
      const participantsRef = ref(rtdb, `participants/${quizId}`);
      const participantsSnapshot = await get(participantsRef);
      
      if (!participantsSnapshot.exists()) {
        setIsLoadingRankings(false);
        return;
      }
      
      const participantsData = participantsSnapshot.val();
      
      // 참가자 데이터를 배열로 변환하고 점수 기준으로 정렬
      const rankingsList: RankingParticipant[] = Object.entries(participantsData)
        .map(([id, data]: [string, any]) => ({
          id,
          name: data.name,
          score: data.score || 0,
          isCurrentUser: id === userId
        }))
        .sort((a, b) => b.score - a.score); // 높은 점수순으로 정렬
      
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
      window.scrollTo(0, 0); // 퀴즈 결과 표시 시 스크롤 최상단으로 이동
    }
  }, [showQuizEnd, quizId, userId]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-teal-600 mx-auto mb-4" />
          <p className="text-xl text-teal-700">퀴즈 로딩 중...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-blue-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <XCircle size={48} className="mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">오류 발생</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button 
            onClick={() => navigate('/join')}
            variant="primary"
            size="medium"
          >
            퀴즈 참여 페이지로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // 퀴즈 결과 표시
  if (showQuizEnd && quiz && participant) {
    // 선택된 시도에 따라 표시할 답변과 점수 결정
    let displayAnswers = {};
    let displayScore = 0;
    
    if (selectedAttemptIndex === -1) {
      // 현재 시도 데이터 표시
      displayAnswers = participant.answers || {};
      displayScore = participant.score || 0;
    } else if (participant.attempts && participant.attempts[selectedAttemptIndex]) {
      // 선택된 이전 시도 데이터 표시
      const selectedAttempt = participant.attempts[selectedAttemptIndex];
      displayAnswers = selectedAttempt.answers || {};
      displayScore = selectedAttempt.score || 0;
    }
    
    // 답변을 QuizResults 컴포넌트 형식에 맞게 변환
    const formattedAnswers = Object.values(displayAnswers as Record<string, Answer>).map((answer: Answer) => {
      // 인덱스로 저장된 답변을 텍스트로 변환
      const questionIndex = answer.questionIndex;
      const question = quiz.questions[questionIndex];
      const answerText = answer.answerIndex >= 0 && answer.answerIndex < question.options.length 
        ? question.options[answer.answerIndex] 
        : '';
        
      return {
        questionIndex: answer.questionIndex,
        answer: answerText,
        isCorrect: answer.isCorrect,
        points: answer.points,
        answeredAt: new Date(answer.answeredAt).toISOString() // number를 string으로 변환
      };
    });

    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-blue-50 p-4 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <QuizResults 
            quiz={quiz} 
            participant={{
              id: participant.id,
              quizId: participant.quizId,
              nickname: participant.name,
              score: displayScore,
              answers: formattedAnswers
            }}
            rankings={rankings}
            isLoadingRankings={isLoadingRankings}
            onResetQuiz={resetQuiz}
            inviteCode={session?.code}
          />
        </div>
      </div>
    );
  }
  
  // 현재 문제가 없으면 안내 메시지 표시
  if (!quiz || !participant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-blue-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-teal-700">퀴즈 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  // 퀴즈 시작 화면 부분 수정
  if (!quizStarted) {
    if (!quiz || !participant) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-teal-50 to-blue-50 p-4 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-teal-700">퀴즈 정보를 불러오는 중...</p>
          </div>
        </div>
      );
    }
    
    return (
      <QuizStartPage
        quiz={quiz}
        participant={participant}
        currentQuestionIndex={currentQuestionIndex}
        sessionId={quizId || ''}
        onStartQuiz={handleStartQuiz}
      />
    );
  }
  
  // 현재 인덱스가 범위를 벗어나는 경우 첫 문제로 리셋
  if (currentQuestionIndex < 0 || !quiz.questions[currentQuestionIndex]) {
    setCurrentQuestionIndex(0);
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-blue-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-teal-700">문제 인덱스 초기화 중...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-b from-teal-50 to-blue-50 p-4 flex flex-col">
      <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col">
        <div className="bg-white rounded-2xl shadow-md p-4 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <div className="bg-teal-100 px-3 py-1 rounded-full">
                <span className="font-medium text-teal-700">
                  문제 {currentQuestionIndex + 1} / {quiz.questions.length}
                </span>
              </div>
            </div>
            
            <div className="flex items-center">
              <span className="text-base font-medium text-yellow-600 mr-1">점수:</span>
              <span className="text-lg font-bold text-teal-700">{participant.score || 0}</span>
            </div>
          </div>
          
          <div className="bg-gray-100 h-2 rounded-full mb-3 overflow-hidden">
            <div 
              className={`h-2 rounded-full ${timeLeft && timeLeft < 10 ? 'bg-red-500' : 'bg-teal-500'} transition-all duration-100`}
              style={{ width: `${timerPercentage}%` }}
            ></div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <QuizQuestion 
              key={questionKey}
              question={currentQuestion}
              selectedAnswer={selectedAnswer}
              selectedAnswerIndex={selectedAnswerIndex}
              onSelectAnswer={(answer, index) => handleSelectAnswer(answer, index)} 
              showResult={showResult}
              disabled={showResult || timeLeft === 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayQuiz;