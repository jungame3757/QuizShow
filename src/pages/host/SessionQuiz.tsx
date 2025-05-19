import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Settings, Clock } from 'lucide-react';
import copy from 'clipboard-copy';
import { useQuiz } from '../../contexts/QuizContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';
import HostNavBar from '../../components/host/HostNavBar';
import HostPageHeader from '../../components/host/HostPageHeader';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import LoadingAnimation from '../../components/ui/LoadingAnimation';
import Breadcrumb from '../../components/ui/Breadcrumb';
import { db } from '../../firebase/config';
import { writeBatch, doc, getDoc, FirestoreError } from 'firebase/firestore';

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

// 세션 설정 기본값
const DEFAULT_SESSION_SETTINGS = {
  expiresIn: 24 * 60 * 60 * 1000, // 24시간
  randomizeQuestions: false,
  singleAttempt: true,
  questionTimeLimit: 30 // 30초
};

// 세션 설정 타입 정의
interface SessionSettings {
  expiresIn: number;
  randomizeQuestions: boolean;
  singleAttempt: boolean;
  questionTimeLimit: number;
}

// 세션 설정 컴포넌트 props 타입
interface SessionSettingsFrameProps {
  settings: SessionSettings;
  setSettings: React.Dispatch<React.SetStateAction<SessionSettings>>;
  isLoading: boolean;
}

// 세션 설정 컴포넌트
const SessionSettingsFrame: React.FC<SessionSettingsFrameProps> = ({ settings, setSettings }) => {
  // 만료 시간 옵션들
  const expiryOptions = [
    { label: '1시간', value: 1 * 60 * 60 * 1000 },
    { label: '3시간', value: 3 * 60 * 60 * 1000 },
    { label: '6시간', value: 6 * 60 * 60 * 1000 },
    { label: '12시간', value: 12 * 60 * 60 * 1000 },
    { label: '24시간', value: 24 * 60 * 60 * 1000 },
    { label: '48시간', value: 48 * 60 * 60 * 1000 },
    { label: '7일', value: 7 * 24 * 60 * 60 * 1000 },
  ];

  // 문제 시간 옵션들 (초 단위)
  const timeOptions = [
    { label: '15초', value: 15 },
    { label: '30초', value: 30 },
    { label: '45초', value: 45 },
    { label: '60초', value: 60 },
    { label: '90초', value: 90 },
    { label: '120초', value: 120 }
  ];

  return (
    <div className="bg-white rounded-xl shadow-md mb-6 overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center">
          <Settings size={20} className="mr-2 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">활동 설정</h3>
        </div>
      </div>

      <div className="p-6 border-t border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 만료 기간 설정 */}
          <div className="space-y-2">
            <label htmlFor="expiry" className="block text-sm font-medium text-gray-700">
              만료 기간
            </label>
            <select
              id="expiry"
              value={settings.expiresIn}
              onChange={(e) => setSettings({...settings, expiresIn: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {expiryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              지정된 시간이 지나면 활동이 자동으로 종료됩니다.
            </p>
          </div>

          {/* 문제 시간 설정 */}
          <div className="space-y-2">
            <label htmlFor="questionTime" className="block text-sm font-medium text-gray-700 flex items-center">
              <Clock size={16} className="mr-1 text-blue-600" />
              문제 시간 설정
            </label>
            <select
              id="questionTime"
              value={settings.questionTimeLimit}
              onChange={(e) => setSettings({...settings, questionTimeLimit: Number(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {timeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              참가자가 각 문제를 풀 수 있는 제한 시간입니다.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* 문제 무작위 출제 */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="randomize"
              checked={settings.randomizeQuestions}
              onChange={(e) => setSettings({...settings, randomizeQuestions: e.target.checked})}
              className="h-4 w-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <label htmlFor="randomize" className="text-sm font-medium text-gray-700">
                문제 무작위 출제
              </label>
              <p className="text-xs text-gray-500">
                참가자마다 문제가 다른 순서로 표시됩니다.
              </p>
            </div>
          </div>

          {/* 참가 횟수 제한 */}
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="singleAttempt"
              checked={settings.singleAttempt}
              onChange={(e) => setSettings({...settings, singleAttempt: e.target.checked})}
              className="h-4 w-4 mt-1 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div>
              <label htmlFor="singleAttempt" className="text-sm font-medium text-gray-700">
                한 번만 참가 가능
              </label>
              <p className="text-xs text-gray-500">
                참가자가 한 번만 퀴즈에 참여할 수 있습니다. 체크 해제 시 여러 번 참여 가능합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
  
  // 데이터 로딩 상태 참조
  const quizLoadingRef = useRef(false);
  const sessionLoadingRef = useRef(false);
  
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
  const [isOffline, setIsOffline] = useState(false);
  
  // 세션 설정 관련 상태
  const [sessionSettings, setSessionSettings] = useState(DEFAULT_SESSION_SETTINGS);
  
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
      if (!quizId || !currentUser || sessionLoaded || loadAttempted || sessionDeleted || sessionLoadingRef.current) {
        return;
      }
      
      try {
        sessionLoadingRef.current = true;
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
        handleFirestoreError(err as FirestoreError, '세션 정보를 불러오는데 실패했습니다.');
        setSessionLoaded(true);
        resetSessionState();
        // 세션 로드가 실패해도 활동 꺼짐 상태로 UI 복구
        setSessionDeleted(true);
      } finally {
        setLoadingActiveSession(false);
        sessionLoadingRef.current = false;
      }
  }, [quizId, currentUser, urlSessionId, loadSessionById, getSessionsByQuizId, navigate, sessionLoaded, loadAttempted, sessionDeleted, resetSessionState]);

  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  // 퀴즈 데이터 로드 - 중복 호출 방지 로직 추가
  const loadQuizData = useCallback(async () => {
      if (!quizId || quizLoaded || sessionDeleted || quizLoadingRef.current) {
        return;
      }
      
      try {
        quizLoadingRef.current = true;
        setIsLoading(true);
        setError(null);
        console.log("퀴즈 정보 로드 중...", quizId);
        
        // 로컬 캐싱 체크 (sessionStorage 활용)
        const cachedQuiz = sessionStorage.getItem(`quiz_${quizId}`);
        if (cachedQuiz && !isOffline) {
          try {
            const quizData = JSON.parse(cachedQuiz);
            const quizDocRef = doc(db, 'quizzes', quizId);
            const quizDoc = await getDoc(quizDocRef);
            
            // 캐시된 데이터가 최신인지 확인 (lastUpdated 필드 등을 활용할 수 있음)
            if (quizDoc.exists() && quizDoc.data().updatedAt === quizData.updatedAt) {
              console.log("캐시된 퀴즈 정보 사용:", quizData);
              setQuiz(quizData);
              setQuizLoaded(true);
              setIsLoading(false);
              return;
            }
          } catch (cacheError) {
            // 캐시 처리 실패 시 조용히 실패하고 원래 로직으로 진행
            console.warn("캐시 사용 실패:", cacheError);
          }
        }
        
        const quizData = await getQuiz(quizId);
        
        if (quizData) {
          console.log("퀴즈 정보 로드 완료:", quizData);
          // 로컬 캐싱 (sessionStorage 활용)
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
      } catch (err) {
        console.error("퀴즈 로드 오류:", err);
        handleFirestoreError(err as FirestoreError, '퀴즈 정보를 불러오는데 실패했습니다.');
        setSessionDeleted(true);
      } finally {
        setIsLoading(false);
        quizLoadingRef.current = false;
      }
  }, [quizId, getQuiz, quizLoaded, sessionDeleted, isOffline]);

  useEffect(() => {
    loadQuizData();
  }, [loadQuizData]);

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
    if (!quizId || !currentUser) return;
    
    if (isOffline) {
      setError('오프라인 상태에서는 세션을 시작할 수 없습니다.');
      return;
    }
    
    try {
      setCreatingSession(true);
      setError(null);
      console.log('세션 생성 시작:', quizId, sessionSettings);
      
      const sessionId = await createSessionForQuiz(quizId, sessionSettings);
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
    
    if (error instanceof FirestoreError) {
      switch (error.code) {
        case 'permission-denied':
          errorMessage = '이 작업을 수행할 권한이 없습니다.';
          break;
        case 'unavailable':
          errorMessage = '네트워크 연결이 불안정합니다. 다시 시도해주세요.';
          break;
        case 'not-found':
          errorMessage = '요청하신 데이터를 찾을 수 없습니다.';
          break;
        case 'resource-exhausted':
          errorMessage = '요청량이 너무 많습니다. 잠시 후 다시 시도해주세요.';
          break;
        default:
          // 기본 에러 메시지 사용
          break;
      }
    }
    
    setError(errorMessage);
  };

  // 퀴즈 삭제 핸들러 (배치 작업 사용)
  const handleDeleteQuiz = async () => {
    if (!currentUser || !quizId) return;
    
    if (isOffline) {
      setError('오프라인 상태에서는 퀴즈를 삭제할 수 없습니다.');
      return;
    }

    try {
      setIsProcessing(true);
      setIsDataChanged(true);
      
      const batch = writeBatch(db);
      
      // 활성화된 세션과 관련 데이터 삭제 준비
      if (currentSession) {
        console.log(`활성화된 세션 삭제 준비 중: ${currentSession.id}`);
        
        // 세션 삭제 처리
        await cleanupSession(currentSession.id);
        
        // 세션 문서 삭제를 배치에 추가
        const sessionRef = doc(db, 'sessions', currentSession.id);
        batch.delete(sessionRef);
        
        console.log('세션 삭제 준비 완료');
        resetSessionState();
      } else if (quizId) {
        // 활성화되지 않은 세션 삭제 준비
        try {
          const sessions = await getSessionsByQuizId(quizId);
          
          for (const session of sessions) {
            console.log(`관련 세션 삭제 준비 중: ${session.id}`);
            
            // 세션 삭제 처리
            await cleanupSession(session.id);
            
            // 세션 문서 삭제를 배치에 추가
            const sessionRef = doc(db, 'sessions', session.id);
            batch.delete(sessionRef);
          }
          
          console.log(`관련 세션 삭제 준비 완료`);
        } catch (sessionsError) {
          console.error('세션 목록 조회 실패:', sessionsError);
          // 세션 조회 실패해도 퀴즈 삭제 계속 진행
        }
      }
      
      // 퀴즈 문서 삭제를 배치에 추가
      const quizRef = doc(db, 'quizzes', quizId);
      batch.delete(quizRef);
      
      // 배치 작업 실행
      await batch.commit();
      console.log('퀴즈 및 관련 데이터 삭제 완료');
      
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

        {OfflineBanner()}

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p>{error}</p>
          </div>
        )}

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

        {/* 세션 설정 프레임 - 세션이 없을 때만 표시 */}
        {needsSession && (
          <SessionSettingsFrame 
            settings={sessionSettings}
            setSettings={setSessionSettings}
            isLoading={creatingSession}
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
            onShowQRCode={() => setShowQRCode(true)}
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