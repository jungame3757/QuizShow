import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { BarChartBig } from 'lucide-react';
import copy from 'clipboard-copy';
import { useQuiz } from '../../contexts/QuizContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';
import { deleteQuiz } from '../../firebase/quizService';
import HostNavBar from '../../components/host/HostNavBar';
import HostPageHeader from '../../components/host/HostPageHeader';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import LoadingAnimation from '../../components/ui/LoadingAnimation';
import Button from '../../components/ui/Button';
import Breadcrumb from '../../components/ui/Breadcrumb';

// 컴포넌트 임포트
import { QuizHeader, SessionControls, SessionTabs } from '../../components/host/session';

// 모달 컴포넌트 임포트
import { 
  EditWarningModal, 
  DeleteWarningModal, 
  DeleteConfirmModal, 
  EndSessionConfirmModal, 
  QRCodeModal 
} from '../../components/ui/modals';

const SessionQuiz: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getQuiz, loading: quizLoading, error: quizError } = useQuiz();
  const { currentUser } = useAuth();
  const { 
    createSessionForQuiz,
    currentSession,
    participants,
    loading: sessionLoading,
    error: sessionError,
    loadSessionById,
    getSessionsByQuizId,
    cleanupSession,
    resetSessionState
  } = useSession();
  
  const [quiz, setQuiz] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'participants' | 'progress' | 'invite'>('invite');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDataChanged, setIsDataChanged] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);
  const [endingSession, setEndingSession] = useState(false);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  const [sessionDeleted, setSessionDeleted] = useState(false);
  const [loadingActiveSession, setLoadingActiveSession] = useState(false);
  const [quizLoaded, setQuizLoaded] = useState(false);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [loadAttempted, setLoadAttempted] = useState(false);
  const [prevQuizId, setPrevQuizId] = useState<string | null>(null);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  
  const urlSearchParams = new URLSearchParams(location.search);
  const urlSessionId = urlSearchParams.get('sessionId');
  
  useEffect(() => {
    if (!quizId) {
      console.log('퀴즈 ID가 없습니다. 내 퀴즈 목록으로 이동합니다.');
      navigate('/host/my-quizzes');
    }
  }, [quizId, navigate]);

  useEffect(() => {
    if (quizId && quizId !== prevQuizId) {
      console.log(`퀴즈 ID 변경 감지: ${prevQuizId} -> ${quizId}`);
      
      setSessionLoaded(false);
      setLoadAttempted(false);
      setSessionDeleted(false);
      setQuizLoaded(false);
      setQrValue('');
      
      resetSessionState();
      
      setPrevQuizId(quizId);
    }
  }, [quizId, prevQuizId, resetSessionState]);

  // 세션 로드 로직
  const loadSessionData = useCallback(async () => {
    if (!quizId || !currentUser || sessionLoaded || loadAttempted || sessionDeleted) return;
      
    try {
      setLoadAttempted(true);
      setLoadingActiveSession(true);
      console.log(`퀴즈 ID(${quizId})로 세션 정보 로드 중...`);

      const quizSessions = await getSessionsByQuizId(quizId);
      
      const activeSession = quizSessions.length > 0 ? quizSessions[0] : null;
      
      if (activeSession) {
        console.log("활성 세션 발견:", activeSession.id);
        
        if (urlSessionId !== activeSession.id) {
          console.log("세션 ID 업데이트:", urlSessionId, "->", activeSession.id);
          navigate(`/host/session/${quizId}?sessionId=${activeSession.id}`, { replace: true });
        }
        
        await loadSessionById(activeSession.id);
        setSessionLoaded(true);
      } else if (urlSessionId) {
        console.log("URL에 세션 ID가 있지만 활성 세션이 없음:", urlSessionId);
        
        try {
          await loadSessionById(urlSessionId);
          setSessionLoaded(true);
        } catch (error) {
          console.log("세션이 존재하지 않음. 활동 꺼짐 상태로 복구");
          setSessionLoaded(true);
          resetSessionState();
          setSessionDeleted(true);
          // URL에서 세션 ID 제거하여 주소 정리
          navigate(`/host/session/${quizId}`, { replace: true });
        }
      } else {
        console.log("활성 세션이 없고 URL에도 세션 ID가 없음");
        setSessionLoaded(true);
      }
      
      console.log("세션 로딩 완료");
    } catch (err) {
      console.error("세션 로드 실패:", err);
      setSessionLoaded(true);
      resetSessionState();
      // 세션 로드가 실패해도 활동 꺼짐 상태로 UI 복구
      setSessionDeleted(true);
    } finally {
      setLoadingActiveSession(false);
    }
  }, [quizId, currentUser, urlSessionId, loadSessionById, getSessionsByQuizId, navigate, sessionLoaded, loadAttempted, sessionDeleted, resetSessionState]);

  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  // 퀴즈 데이터 로드
  const loadQuizData = useCallback(async () => {
    if (!quizId || quizLoaded || sessionDeleted) return;
    
    try {
      setIsLoading(true);
      setError(null);
      console.log("퀴즈 정보 로드 중...", quizId);
      
      const quizData = await getQuiz(quizId);
      
      if (quizData) {
        console.log("퀴즈 정보 로드 완료:", quizData);
        setQuiz(quizData);
        setQuizLoaded(true);
      } else {
        console.error("퀴즈를 찾을 수 없음:", quizId);
        setError('퀴즈를 찾을 수 없습니다. 세션이 종료되었거나 존재하지 않습니다.');
        setSessionDeleted(true);
      }
    } catch (err) {
      console.error("퀴즈 로드 오류:", err);
      setError(err instanceof Error ? 
        err.message : '퀴즈 정보를 불러오는 중 오류가 발생했습니다. 세션이 종료되었을 수 있습니다.');
      
      setSessionDeleted(true);
    } finally {
      setIsLoading(false);
    }
  }, [quizId, getQuiz, quizLoaded, sessionDeleted]);

  useEffect(() => {
    loadQuizData();
  }, [loadQuizData]);

  // QR 코드 URL 생성
  useEffect(() => {
    if (currentSession?.code) {
      const baseUrl = window.location.origin;
      const joinUrl = `${baseUrl}/join?code=${currentSession.code}`;
      setQrValue(joinUrl);
    } else {
      setQrValue('');
    }
  }, [currentSession]);
  
  // 세션 시작 핸들러
  const handleStartSession = async () => {
    if (!quizId || !currentUser) return;
    
    try {
      setCreatingSession(true);
      setError(null);
      console.log('세션 생성 시작:', quizId);
      
      const sessionOptions = {
        expiresIn: 24 * 60 * 60 * 1000,
      };
      
      const sessionId = await createSessionForQuiz(quizId, sessionOptions);
      console.log('세션 생성 완료:', sessionId);
      
      if (sessionId) {
        setSessionDeleted(false);
        setSessionLoaded(false);
        setLoadAttempted(false);
        
        resetSessionState();
        
        navigate(`/host/session/${quizId}?sessionId=${sessionId}`, { replace: true });
      }
    } catch (err) {
      console.error('세션 생성 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '세션 생성에 실패했습니다.';
      setError(errorMessage);
      // 세션 생성 실패 후에도 UI가 복구되도록 처리
      setSessionDeleted(true);
      setSessionLoaded(true);
    } finally {
      setCreatingSession(false);
    }
  };
  
  // 세션 종료 핸들러
  const handleEndSession = async () => {
    if (!currentSession) return;
    
    try {
      setEndingSession(true);
      setError(null);
      
      setShowEndSessionConfirm(false);
      
      setSessionDeleted(true);
      setSessionLoaded(false);
      
      navigate(`/host/session/${quizId}`, { replace: true });
      
      await cleanupSession(currentSession.id);
      
      resetSessionState();
    } catch (err) {
      console.error('세션 삭제 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '세션 종료에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setEndingSession(false);
    }
  };
  
  // 페이지 이동 핸들러
  const handleNavigation = (path: string) => {
    if (isDataChanged && !isProcessing) {
      if (window.confirm('진행 중인 작업이 있습니다. 정말로 페이지를 떠나시겠습니까?')) {
        navigate(path);
      }
    } else {
      navigate(path);
    }
  };

  // 퀴즈 삭제 핸들러
  const handleDeleteQuiz = async () => {
    if (!currentUser) return;

    try {
      setIsProcessing(true);
      setIsDataChanged(true);

      // 삭제하기 전에 활성화된 세션이 있는지 확인
      if (currentSession) {
        console.log(`활성화된 세션 삭제 중: ${currentSession.id}`);
        await cleanupSession(currentSession.id);
        console.log('세션 삭제 완료');
        resetSessionState();
      } else if (quizId) {
        // 활성화되지 않은 세션이 있는지 확인하고 모두 삭제
        try {
          const sessions = await getSessionsByQuizId(quizId);
          for (const session of sessions) {
            console.log(`관련 세션 삭제 중: ${session.id}`);
            await cleanupSession(session.id);
          }
          console.log(`관련 세션 삭제 완료`);
        } catch (sessionsError) {
          console.error('세션 목록 조회 또는 삭제 실패:', sessionsError);
          // 세션 삭제 실패해도 퀴즈 삭제 계속 진행
        }
      }

      await deleteQuiz(quiz.id, currentUser.uid);
      navigate('/host/my-quizzes');
    } catch (err) {
      console.error("퀴즈 삭제 오류:", err);
      setError(err instanceof Error ? 
        err.message : '퀴즈를 삭제하는데 문제가 발생했습니다.');
    } finally {
      setIsProcessing(false);
      setIsDataChanged(false);
      setShowDeleteConfirm(false);
    }
  };

  // 코드 복사 핸들러
  const copySessionCode = () => {
    if (currentSession?.code) {
      copy(currentSession.code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // URL 복사 핸들러
  const copyJoinUrl = () => {
    if (qrValue) {
      copy(qrValue);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  
  // 로딩 컴포넌트
  const QuizLoadingState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <LoadingAnimation message="퀴즈 정보를 불러오는 중" />
    </div>
  );

  if (isLoading || quizLoading || sessionLoading || loadingActiveSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <HostPageHeader handleNavigation={handleNavigation} />
          <HostNavBar handleNavigation={handleNavigation} />
          <Breadcrumb 
            items={[
              { label: '내 퀴즈 목록', path: '/host/my-quizzes' },
              { label: quiz?.title || '퀴즈' }
            ]} 
          />
          <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
            <QuizLoadingState />
          </div>
        </div>
      </div>
    );
  }
  
  // 오류 발생 시에도 UI를 계속 표시하되 세션이 없는 상태로 처리
  if ((error || quizError || sessionError) && !sessionDeleted) {
    // 세션 불러오기 이외의 에러(퀴즈 불러오기 등)는 바로 내 퀴즈 목록으로 이동
    if (error || quizError) {
      navigate('/host/my-quizzes', { replace: true });
      return null;
    }
    // 세션 에러는 기존처럼 복구
    resetSessionState();
    if (!sessionDeleted) {
      setSessionDeleted(true);
    }
  }
  
  if (!quiz && !sessionDeleted) {
    // 퀴즈 정보가 없으면 복구하지 않고 바로 내 퀴즈 목록으로 이동
    navigate('/host/my-quizzes', { replace: true });
    return null;
  }
  
  const needsSession = !currentSession || sessionDeleted;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <HostPageHeader handleNavigation={handleNavigation} />
        <HostNavBar handleNavigation={handleNavigation} />
        <Breadcrumb 
          items={[
            { label: '내 퀴즈 목록', path: '/host/my-quizzes' },
            { label: quiz?.title || '퀴즈' }
          ]} 
        />

        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          {/* 퀴즈 헤더 컴포넌트 */}
          <QuizHeader
            quiz={quiz}
            currentSession={currentSession}
            onEditClick={() => setShowEditWarning(true)}
            onDeleteClick={() => setShowDeleteWarning(true)}
            isProcessing={isProcessing}
          />

          {/* 세션 컨트롤 컴포넌트 */}
          <SessionControls
            currentSession={currentSession}
            needsSession={needsSession}
            creatingSession={creatingSession}
            endingSession={endingSession}
            onStartSession={handleStartSession}
            onEndSessionClick={() => setShowEndSessionConfirm(true)}
            sessionCode={currentSession?.code}
            isCopied={isCopied}
            onCopyCode={copySessionCode}
            sessionDeleted={sessionDeleted}
          />
        </div>

        {/* 세션 탭 컴포넌트 */}
        {currentSession && !needsSession && (
          <SessionTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            participants={participants}
            quiz={quiz}
            sessionCode={currentSession.code}
            qrValue={qrValue}
            isCopied={isCopied}
            onCopySessionCode={copySessionCode}
            onCopyJoinUrl={copyJoinUrl}
            onShowQRCode={() => setShowQRCode(true)}
          />
        )}

        {needsSession && (
          <div className="p-6 mb-5 text-center">
            <p className="text-gray-600 mb-3">퀴즈의 활동 결과와 분석을 확인해보세요.</p>
            <Button 
              onClick={() => navigate('/host/history')}
              variant="primary"
              className="flex items-center mx-auto"
            >
              <BarChartBig size={18} className="mr-2" />
              활동 결과 보고서 보기
            </Button>
          </div>
        )}

        {/* 모달 컴포넌트들 */}
        <QRCodeModal
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
          qrValue={qrValue}
        />

        <EndSessionConfirmModal
          isOpen={showEndSessionConfirm}
          onClose={() => setShowEndSessionConfirm(false)}
          onConfirm={handleEndSession}
          isProcessing={endingSession}
        />

        <EditWarningModal
          isOpen={showEditWarning}
          onClose={() => setShowEditWarning(false)}
          quizId={quizId || ''}
        />

        <DeleteWarningModal
          isOpen={showDeleteWarning}
          onClose={() => setShowDeleteWarning(false)}
          onConfirm={() => {
            setShowDeleteWarning(false);
            setShowDeleteConfirm(true);
          }}
          hasActiveSession={!!currentSession}
        />

        <DeleteConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteQuiz}
          title={quiz?.title || ''}
          isProcessing={isProcessing}
        />

        {/* 로딩 오버레이 */}
        {isProcessing && (
          <LoadingOverlay message="작업 처리 중..." />
        )}

        {creatingSession && (
          <LoadingOverlay message="활동을 생성하는 중..." />
        )}
        
        {endingSession && (
          <LoadingOverlay message="활동을 종료하는 중..." />
        )}
      </div>
    </div>
  );
};

export default SessionQuiz; 