import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import copy from 'clipboard-copy';
import { useQuiz } from '../../contexts/QuizContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';
import HostNavBar from '../../components/host/HostNavBar';
import HostPageHeader from '../../components/host/HostPageHeader';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import LoadingAnimation from '../../components/ui/LoadingAnimation';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { FirestoreError } from 'firebase/firestore';
import { deleteQuiz } from '../../firebase/quizService';

// 컴포넌트 임포트
import { QuizHeader, SessionControls, SessionTabs, SessionSettingsFrame } from '../../components/host/session';
import { SessionSettings } from '../../components/host/session/SessionSettings';

// 모달 컴포넌트 임포트
import { 
  EditWarningModal, 
  DeleteWarningModal, 
  EndSessionConfirmModal, 
  QRCodeModal
} from '../../components/ui/modals';

// 세션 설정 기본값
const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  expiresIn: 24 * 60 * 60 * 1000, // 24시간
  randomizeQuestions: false,
  singleAttempt: true,
  questionTimeLimit: 30 // 30초
};

const SessionQuiz: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getQuiz, loading: quizLoading, error: quizError } = useQuiz();
  const { currentUser, isLoading: authLoading } = useAuth();
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
  
  // 데이터 로딩 상태 참조
  const quizLoadingRef = useRef(false);
  const sessionLoadingRef = useRef(false);
  const authCheckedRef = useRef(false);
  
  const [quiz, setQuiz] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'participants' | 'progress'>('participants');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDataChanged, setIsDataChanged] = useState(false);
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
  const [isOffline, setIsOffline] = useState(false);
  const [waitingForAuth, setWaitingForAuth] = useState(true);
  
  // 세션 설정 관련 상태
  const [sessionSettings, setSessionSettings] = useState<SessionSettings>(DEFAULT_SESSION_SETTINGS);
  
  const urlSearchParams = new URLSearchParams(location.search);
  const urlSessionId = urlSearchParams.get('sessionId');
  
  // 네트워크 상태 모니터링
  useEffect(() => {
    const handleOnlineStatus = () => setIsOffline(false);
    const handleOfflineStatus = () => setIsOffline(true);

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);
    
    // 초기 네트워크 상태 설정
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
    };
  }, []);
  
  // 인증 상태 확인
  useEffect(() => {
    if (!authLoading) {
      // 인증 로딩이 완료되었을 때만 waitingForAuth 상태 해제
      setWaitingForAuth(false);
      authCheckedRef.current = true;
    }
  }, [authLoading]);
  
  // 퀴즈 ID 유효성 검사
  useEffect(() => {
    if (!quizId) {
      console.log('퀴즈 ID가 없습니다. 내 퀴즈 목록으로 이동합니다.');
      navigate('/host/my-quizzes');
    }
  }, [quizId, navigate]);

  // 퀴즈 ID 변경 감지
  useEffect(() => {
    if (quizId && quizId !== prevQuizId) {
      console.log(`퀴즈 ID 변경 감지: ${prevQuizId} -> ${quizId}`);
      
      // 상태 초기화
      setSessionLoaded(false);
      setLoadAttempted(false);
      setSessionDeleted(false);
      setQuizLoaded(false);
      setQrValue('');
      
      // 참조 초기화
      quizLoadingRef.current = false;
      sessionLoadingRef.current = false;
      
      resetSessionState();
      
      setPrevQuizId(quizId);
    }
  }, [quizId, prevQuizId, resetSessionState]);

  // 세션 로드 로직 - 의존성 최소화 및 중복 호출 방지
  const loadSessionData = useCallback(async () => {
      if (!quizId || sessionLoaded || loadAttempted || sessionDeleted || sessionLoadingRef.current || waitingForAuth) {
        return;
      }
      
      // 인증되지 않은 경우 일단 리턴
      if (!currentUser && !authLoading && authCheckedRef.current) {
        console.log("인증되지 않은 사용자가 세션 로드 시도");
        setError('로그인 후 다시 시도해주세요.');
        setLoadAttempted(true);
        setSessionLoaded(true);
        return;
      }
      
      try {
        sessionLoadingRef.current = true;
        setLoadAttempted(true);
        setLoadingActiveSession(true);
        // 세션을 로드할 때 항상 참가자 탭이 선택되도록 설정
        setActiveTab('participants');
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
        handleFirestoreError(err as FirestoreError, '세션 정보를 불러오는데 실패했습니다.');
        setSessionLoaded(true);
        resetSessionState();
        // 세션 로드가 실패해도 활동 꺼짐 상태로 UI 복구
        setSessionDeleted(true);
      } finally {
        setLoadingActiveSession(false);
        sessionLoadingRef.current = false;
      }
  }, [quizId, currentUser, urlSessionId, loadSessionById, getSessionsByQuizId, navigate, sessionLoaded, loadAttempted, sessionDeleted, resetSessionState, authLoading, waitingForAuth]);

  useEffect(() => {
    loadSessionData();
  }, [loadSessionData, currentUser, waitingForAuth]);

  // 퀴즈 데이터 로드 - 중복 호출 방지 로직 추가
  const loadQuizData = useCallback(async () => {
      if (!quizId || quizLoaded || sessionDeleted || quizLoadingRef.current || waitingForAuth) {
        return;
      }
      
      // 인증되지 않은 경우에도 세션 스토리지에서 먼저 데이터 확인
      const cachedQuiz = sessionStorage.getItem(`quiz_${quizId}`);
      if (cachedQuiz) {
        try {
          const quizData = JSON.parse(cachedQuiz);
          console.log("세션 스토리지에서 퀴즈 정보 로드:", quizData);
          setQuiz(quizData);
          setQuizLoaded(true);
          setIsLoading(false);
          
          // 인증 대기 중인 경우 여기서 리턴
          if (!currentUser && authLoading) {
            return;
          }
        } catch (cacheError) {
          console.warn("캐시 사용 실패:", cacheError);
        }
      }
      
      // 인증되지 않은 경우 일단 리턴
      if (!currentUser && !authLoading && authCheckedRef.current) {
        console.log("인증되지 않은 사용자가 퀴즈 로드 시도");
        if (!quiz) {
          setError('로그인 후 다시 시도해주세요.');
          navigate('/host/my-quizzes', { replace: true });
        }
        return;
      }
      
      try {
        quizLoadingRef.current = true;
        setIsLoading(true);
        setError(null);
        console.log("퀴즈 정보 로드 중...", quizId);
        
        if (currentUser) {
          try {
            // getQuiz 함수를 사용하여 퀴즈 정보 로드 (호스트 ID 함께 전달)
            const quizData = await getQuiz(quizId, currentUser.uid);
            
            if (quizData) {
              console.log("퀴즈 정보 로드 완료:", quizData);
              
              // 세션 스토리지에 저장
              try {
                sessionStorage.setItem(`quiz_${quizId}`, JSON.stringify(quizData));
              } catch (storageError) {
                console.warn("퀴즈 캐싱 실패:", storageError);
              }
              
              setQuiz(quizData);
              setQuizLoaded(true);
            } else {
              console.error("퀴즈를 찾을 수 없음:", quizId);
              setError('퀴즈를 찾을 수 없습니다. 세션이 종료되었거나 존재하지 않습니다.');
              setSessionDeleted(true);
            }
          } catch (loadError) {
            console.error("퀴즈 로드 오류:", loadError);
            
            // 캐시된 데이터가 있으면 그것을 사용
            if (quiz) {
              console.log("오류 발생했지만 캐시된 데이터 사용:", quiz);
            } else {
              setError('퀴즈 정보를 불러오는데 실패했습니다.');
              setSessionDeleted(true);
            }
          }
        } else if (!quiz) {
          // 여전히 퀴즈 데이터가 없는 경우 (캐시도 없고 인증도 안됨)
          setError('로그인 후 다시 시도해주세요.');
          navigate('/host/my-quizzes', { replace: true });
        }
      } catch (err) {
        console.error("퀴즈 로드 오류:", err);
        if (!quiz) {
          handleFirestoreError(err as FirestoreError, '퀴즈 정보를 불러오는데 실패했습니다.');
          setSessionDeleted(true);
        }
      } finally {
        setIsLoading(false);
        quizLoadingRef.current = false;
      }
  }, [quizId, getQuiz, quizLoaded, sessionDeleted, isOffline, currentUser, authLoading, quiz, navigate, waitingForAuth]);

  useEffect(() => {
    loadQuizData();
  }, [loadQuizData, currentUser, waitingForAuth]);

  // QR 코드 URL 생성 - 중복 계산 방지
  useEffect(() => {
    if (currentSession?.code && !qrValue) {
      const baseUrl = window.location.origin;
      const joinUrl = `${baseUrl}/join?code=${currentSession.code}`;
      setQrValue(joinUrl);
    } else if (!currentSession?.code && qrValue) {
      setQrValue('');
    }
  }, [currentSession, qrValue]);
  
  // 세션 시작 핸들러
  const handleStartSession = async () => {
    if (!quizId || !currentUser || !quiz) return;
    
    if (isOffline) {
      setError('오프라인 상태에서는 세션을 시작할 수 없습니다.');
      return;
    }
    
    try {
      setCreatingSession(true);
      setError(null);
      console.log('세션 생성 시작:', quizId, sessionSettings);
      
      // 이미 로드된 퀴즈 데이터를 직접 전달
      const sessionId = await createSessionForQuiz(quizId, sessionSettings, quiz);
      console.log('세션 생성 완료:', sessionId);
      
      if (sessionId) {
        setSessionDeleted(false);
        setSessionLoaded(false);
        setLoadAttempted(false);
        
        resetSessionState();
        // 새 활동을 시작할 때 항상 참가자 탭이 선택되도록 설정
        setActiveTab('participants');
        
        navigate(`/host/session/${quizId}?sessionId=${sessionId}`, { replace: true });
      }
    } catch (err) {
      console.error('세션 생성 실패:', err);
      handleFirestoreError(err as FirestoreError, '세션 생성에 실패했습니다.');
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
    
    if (isOffline) {
      setError('오프라인 상태에서는 세션을 종료할 수 없습니다.');
      return;
    }
    
    try {
      setEndingSession(true);
      setError(null);
      
      setShowEndSessionConfirm(false);
      
      setSessionDeleted(true);
      setSessionLoaded(false);
      
      navigate(`/host/session/${quizId}`, { replace: true });
      
      await cleanupSession(currentSession.id);
      
      // 세션 관련 캐시 삭제
      if (quizId) {
        sessionStorage.removeItem(`sessions_${quizId}`);
      }
      
      resetSessionState();
    } catch (err) {
      console.error('세션 삭제 실패:', err);
      handleFirestoreError(err as FirestoreError, '세션 종료에 실패했습니다.');
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

  // Firestore 에러 처리 함수
  const handleFirestoreError = (error: FirestoreError | Error, defaultMessage: string) => {
    console.error('Firestore 에러:', error.message);
    
    let errorMessage = defaultMessage;
    let shouldRedirect = false;
    let redirectPath = '/host/my-quizzes';
    
    if (error instanceof FirestoreError) {
      switch (error.code) {
        case 'permission-denied':
          errorMessage = '이 작업을 수행할 권한이 없습니다. 로그인 페이지로 이동합니다.';
          redirectPath = '/login';
          shouldRedirect = true;
          // 세션 스토리지에서 해당 퀴즈 정보 제거 (새로 로그인 후 다시 로드하도록)
          if (quizId) {
            sessionStorage.removeItem(`quiz_${quizId}`);
          }
          break;
        case 'unavailable':
          errorMessage = '네트워크 연결이 불안정합니다. 퀴즈 목록으로 이동합니다.';
          shouldRedirect = true;
          break;
        case 'not-found':
          errorMessage = '요청하신 데이터를 찾을 수 없습니다. 퀴즈 목록으로 이동합니다.';
          shouldRedirect = true;
          break;
        case 'resource-exhausted':
          errorMessage = '요청량이 너무 많습니다. 잠시 후 다시 시도해주세요.';
          shouldRedirect = true;
          break;
        default:
          // 기본 에러 메시지에 리다이렉트 안내 추가
          errorMessage = `${defaultMessage} 퀴즈 목록으로 이동합니다.`;
          shouldRedirect = true;
          break;
      }
    } else {
      // 일반 Error 객체인 경우에도 리다이렉트
      errorMessage = `${defaultMessage} 퀴즈 목록으로 이동합니다.`;
      shouldRedirect = true;
    }
    
    // 오류 메시지 설정
    setError(errorMessage);
    
    // 리다이렉트 수행 (약간의 지연을 두어 사용자가 오류 메시지를 볼 수 있게 함)
    if (shouldRedirect) {
      setTimeout(() => {
        navigate(redirectPath);
      }, 1500);
    }
  };

  // 퀴즈 삭제 핸들러
  const handleDeleteQuiz = async () => {
    if (!currentUser || !quizId) return;
    
    if (isOffline) {
      setError('오프라인 상태에서는 퀴즈를 삭제할 수 없습니다.');
      return;
    }

    try {
      setIsProcessing(true);
      setIsDataChanged(true);
      
      // 활성화된 세션과 관련 데이터 삭제
      if (currentSession) {
        console.log(`활성화된 세션 삭제 중: ${currentSession.id}`);
        try {
          await cleanupSession(currentSession.id);
          console.log('세션 삭제 완료');
          resetSessionState();
        } catch (sessionError) {
          console.error('세션 삭제 실패:', sessionError);
          // 세션 삭제 실패해도 퀴즈 삭제 계속 진행
        }
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
          console.error('세션 목록 조회 실패:', sessionsError);
          // 세션 조회 실패해도 퀴즈 삭제 계속 진행
        }
      }
      
      // 삭제 전 퀴즈 ID 로깅 추가
      console.log('삭제할 퀴즈 ID 확인:', quizId, '사용자 ID:', currentUser.uid);
      
      // deleteQuiz 함수 직접 호출
      console.log('퀴즈 삭제 시작:', quizId);
      await deleteQuiz(quizId, currentUser.uid);
      console.log('퀴즈 삭제 완료');
      
      // 캐시 정리
      sessionStorage.removeItem(`quiz_${quizId}`);
      sessionStorage.removeItem(`sessions_${quizId}`);
      
      navigate('/host/my-quizzes');
    } catch (err) {
      console.error("퀴즈 삭제 오류:", err);
      handleFirestoreError(err as FirestoreError, '퀴즈를 삭제하는데 문제가 발생했습니다.');
    } finally {
      setIsProcessing(false);
      setIsDataChanged(false);
      setShowDeleteWarning(false);
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
      <LoadingAnimation message={waitingForAuth ? "사용자 인증 확인 중" : "퀴즈 정보를 불러오는 중"} />
    </div>
  );

  // 오프라인 알림 컴포넌트
  const OfflineBanner = () => {
    if (!isOffline) return null;
    
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
        <p className="font-bold">오프라인 모드</p>
        <p>현재 인터넷 연결이 불안정합니다. 일부 기능이 제한될 수 있습니다.</p>
      </div>
    );
  };

  // 오류 메시지 컴포넌트
  const ErrorMessage = () => {
    if (!error) return null;
    
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md">
        <p className="font-bold mb-1">오류가 발생했습니다</p>
        <p>{error}</p>
      </div>
    );
  };

  // 새로운 상태 변수 추가
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // 세션 만료 여부를 확인하는 useEffect 추가
  useEffect(() => {
    if (currentSession && currentSession.expiresAt) {
      const now = Date.now();
      setIsSessionExpired(currentSession.expiresAt < now);
    } else {
      setIsSessionExpired(false);
    }
  }, [currentSession]);

  if (waitingForAuth || isLoading || quizLoading || sessionLoading || loadingActiveSession) {
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
  
  // 오류 발생 시 오류 페이지 표시
  if ((error || quizError || sessionError) && !sessionDeleted && !quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <HostPageHeader handleNavigation={handleNavigation} />
          <HostNavBar handleNavigation={handleNavigation} />
          <Breadcrumb 
            items={[
              { label: '내 퀴즈 목록', path: '/host/my-quizzes' },
              { label: '오류' }
            ]} 
          />
          <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-red-700 mb-2">오류가 발생했습니다</h2>
              <p className="text-gray-600 mb-6">{error || quizError || sessionError || '알 수 없는 오류가 발생했습니다.'}</p>
              <div className="flex justify-center">
                <button 
                  onClick={() => navigate('/host/my-quizzes')} 
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors mr-3"
                >
                  퀴즈 목록으로 이동
                </button>
                <button 
                  onClick={() => window.location.reload()} 
                  className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  새로고침
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // 오류 발생 시에도 UI를 계속 표시하되 세션이 없는 상태로 처리 (이 부분은 오류 메시지만 표시하고 삭제하지 않음)
  if ((error || quizError || sessionError) && !sessionDeleted) {
    // 세션 불러오기 이외의 에러(퀴즈 불러오기 등)는 바로 내 퀴즈 목록으로 이동
    if ((error || quizError) && !quiz) {
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

        {OfflineBanner()}
        
        <ErrorMessage />

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-md p-3 sm:p-6 mb-4 sm:mb-8">
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

        {/* 세션 설정 프레임 - 세션이 없을 때만 표시 */}
        {needsSession && (
          <SessionSettingsFrame 
            settings={sessionSettings}
            setSettings={setSessionSettings}
            isLoading={creatingSession}
            quiz={quiz}
          />
        )}

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
            isSessionExpired={isSessionExpired}
            currentSession={currentSession}
          />
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
            handleDeleteQuiz();
          }}
          hasActiveSession={!!currentSession}
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