import React from 'react';
import { useParams } from 'react-router-dom';
import QuizLoading from '../../components/client/QuizLoading';
import QuizError from '../../components/client/QuizError';
import QuizContainer from '../../components/client/QuizContainer';
import QuizStartPage from '../../components/client/QuizStartPage';
import QuizResults from '../../components/client/QuizResults';
import { useQuizLogic } from '../../components/client/useQuizLogic';

const PlayQuiz: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const {
    quiz,
    session,
    participant,
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
    handleStartQuiz,
    handleSelectAnswer,
    resetQuiz,
    getCurrentQuestion
  } = useQuizLogic(quizId);
  
  if (loading) {
    return <QuizLoading />;
  }
  
  if (error) {
    return <QuizError errorMessage={error} />;
  }

  // 퀴즈 결과 표시
  if (showQuizEnd && quiz && participant) {
      // 현재 시도 데이터 표시
    const displayAnswers = participant.answers || {};
    const displayScore = participant.score || 0;
    
    // 답변을 QuizResults 컴포넌트 형식에 맞게 변환
    const formattedAnswers = Object.values(displayAnswers).map((answer: any) => {
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
        answeredAt: new Date(answer.answeredAt).toISOString()
      };
    });

    return (
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
            canRetry={session?.singleAttempt === false}
          />
    );
  }
  
  // 현재 문제가 없으면 안내 메시지 표시
  if (!quiz || !participant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F0FFFD] via-[#E6FFFC] to-[#E0FFFA] p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-teal-700">퀴즈 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  // 퀴즈 시작 화면 표시
  if (!quizStarted) {
    return (
      <QuizStartPage
        quiz={quiz}
        participant={participant}
        currentQuestionIndex={currentQuestionIndex}
        sessionId={quizId || ''}
        onStartQuiz={handleStartQuiz}
        timeLimit={session?.questionTimeLimit || 30}
      />
    );
  }
  
  // 현재 문제 가져오기
  const currentQuestion = getCurrentQuestion();
  
  if (!currentQuestion) {
    return <QuizLoading />;
  }

  return (
    <QuizContainer
      currentQuestionIndex={currentQuestionIndex}
      totalQuestions={quiz.questions.length}
      question={currentQuestion}
      score={participant.score || 0}
      timeLeft={timeLeft}
      timerPercentage={timerPercentage}
              selectedAnswer={selectedAnswer}
              selectedAnswerIndex={selectedAnswerIndex}
              showResult={showResult}
      onSelectAnswer={handleSelectAnswer}
            />
  );
};

export default PlayQuiz;