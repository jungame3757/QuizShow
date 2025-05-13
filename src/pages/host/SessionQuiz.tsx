import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Edit, Trash2, Loader, Users, BarChart2,
  Copy, Share2, QrCode, Check, Link as LinkIcon, Play, StopCircle, Calendar, AlertCircle
} from 'lucide-react';
import QRCode from 'react-qr-code';
import copy from 'clipboard-copy';
import { useQuiz } from '../../contexts/QuizContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSession } from '../../contexts/SessionContext';
import { deleteQuiz } from '../../firebase/quizService';
import ParticipantList from '../../components/ParticipantList';
import QuizProgress from '../../components/QuizProgress';
import HostNavBar from '../../components/HostNavBar';
import HostPageHeader from '../../components/HostPageHeader';
import LoadingOverlay from '../../components/LoadingOverlay';
import LoadingAnimation from '../../components/LoadingAnimation';
import Button from '../../components/Button';
import Breadcrumb from '../../components/Breadcrumb';

const SessionQuiz: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getQuiz, participants, loading, error: quizError } = useQuiz();
  const { currentUser } = useAuth();
  const { 
    createSessionForQuiz, 
    currentSession, 
    loading: sessionLoading, 
    error: sessionError,
    loadSessionById,
    getSessionsByQuizId,
    cleanupSession,
    resetSessionState
  } = useSession();
  
  const [quiz, setQuiz] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'participants' | 'progress' | 'invite'>('participants');
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
  const [sessionDeleted, setSessionDeleted] = useState(false); // 세션 삭제 상태 추적
  const [loadingActiveSession, setLoadingActiveSession] = useState(false);
  const [quizLoaded, setQuizLoaded] = useState(false); // 퀴즈 로드 완료 추적
  const [sessionLoaded, setSessionLoaded] = useState(false); // 세션 로드 완료 추적
  const [loadAttempted, setLoadAttempted] = useState(false); // 세션 로드 시도 추적
  const [prevQuizId, setPrevQuizId] = useState<string | null>(null); // 이전 퀴즈 ID 추적
  
  // URL에서 sessionId 파라미터 추출
  const urlSearchParams = new URLSearchParams(location.search);
  const urlSessionId = urlSearchParams.get('sessionId');
  
  // quizId가 없으면 MyQuizzes 페이지로 리다이렉트
  useEffect(() => {
    if (!quizId) {
      console.log('퀴즈 ID가 없습니다. 내 퀴즈 목록으로 이동합니다.');
      navigate('/host/my-quizzes');
    }
  }, [quizId, navigate]);

  // quizId가 변경되면 세션 관련 상태 초기화
  useEffect(() => {
    if (quizId && quizId !== prevQuizId) {
      console.log(`퀴즈 ID 변경 감지: ${prevQuizId} -> ${quizId}`);
      
      // 컴포넌트 상태 초기화
      setSessionLoaded(false);
      setLoadAttempted(false);
      setSessionDeleted(false);
      setQuizLoaded(false);
      setQrValue('');
      
      // 세션 컨텍스트 상태 초기화
      resetSessionState();
      
      // 새 퀴즈 ID 저장
      setPrevQuizId(quizId);
    }
  }, [quizId, prevQuizId, resetSessionState]);

  // 퀴즈 ID를 직접 사용해 세션 로드 - 최적화 버전
  useEffect(() => {
    const loadSessionByQuizId = async () => {
      // 이미 세션이 삭제된 상태라면 로드 시도 스킵
      if (!quizId || !currentUser || sessionLoaded || loadAttempted || sessionDeleted) return;
      
      try {
        setLoadAttempted(true); // 로드 시도 표시
        setLoadingActiveSession(true);
        console.log(`퀴즈 ID(${quizId})로 세션 정보 로드 중...`);

        // 퀴즈 ID로 세션 목록 로드 - 직접적인 쿼리로 효율성 향상
        const quizSessions = await getSessionsByQuizId(quizId);
        
        // 활성 세션 찾기
        const activeSession = quizSessions.length > 0 ? quizSessions[0] : null;
        
        if (activeSession) {
          console.log("활성 세션 발견:", activeSession.id);
          
          // URL의 세션 ID와 발견된 세션 ID가 다른 경우 URL 업데이트
          if (urlSessionId !== activeSession.id) {
            console.log("세션 ID 업데이트:", urlSessionId, "->", activeSession.id);
            navigate(`/host/session/${quizId}?sessionId=${activeSession.id}`, { replace: true });
          }
          
          // 세션 상세 정보 로드
          await loadSessionById(activeSession.id);
          setSessionLoaded(true);
        } else if (urlSessionId) {
          // URL에 세션 ID가 있지만 활성 세션이 없는 경우
          console.log("URL에 세션 ID가 있지만 활성 세션이 없음:", urlSessionId);
          
          // 세션 ID가 존재하는지 확인
          try {
            await loadSessionById(urlSessionId);
            setSessionLoaded(true);
          } catch (error) {
            // 세션이 존재하지 않으면 URL에서 세션 ID 제거
            console.log("세션이 존재하지 않음. URL에서 세션 ID 제거");
            navigate(`/host/session/${quizId}`, { replace: true });
          }
        } else {
          // 활성 세션이 없고 URL에도 세션 ID가 없는 경우
          console.log("활성 세션이 없고 URL에도 세션 ID가 없음");
          setSessionLoaded(true); // 세션 로드 완료로 표시
        }
        
        console.log("세션 로딩 완료");
      } catch (err) {
        console.error("세션 로드 실패:", err);
        // 세션 로드 실패 시에도 상태 업데이트
        setSessionLoaded(true);
      } finally {
        setLoadingActiveSession(false);
      }
    };
    
    loadSessionByQuizId();
  }, [quizId, currentUser, urlSessionId, loadSessionById, getSessionsByQuizId, navigate, sessionLoaded, loadAttempted, sessionDeleted]);

  // 퀴즈 정보 로드 - 최적화 버전
  useEffect(() => {
    const loadQuiz = async () => {
      // 세션이 삭제된 상태이거나 이미 로드된 경우 스킵
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
          // 세션 종료 상태로 처리 (MyQuizzes로 리다이렉트 하지 않음)
          setSessionDeleted(true);
        }
      } catch (err) {
        console.error("퀴즈 로드 오류:", err);
        setError(err instanceof Error ? 
          err.message : '퀴즈 정보를 불러오는 중 오류가 발생했습니다. 세션이 종료되었을 수 있습니다.');
        
        // 오류 발생 시에도 세션 종료 상태로 처리
        setSessionDeleted(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadQuiz();
  }, [quizId, getQuiz, quizLoaded, sessionDeleted]);

  // 참가 URL 및 QR 코드 생성
  useEffect(() => {
    if (currentSession?.code) {
      const baseUrl = window.location.origin;
      const joinUrl = `${baseUrl}/join?code=${currentSession.code}`;
      setQrValue(joinUrl);
    } else {
      // 세션이 없는 경우 QR 코드 초기화
      setQrValue('');
    }
  }, [currentSession]);
  
  // 세션 시작 처리 함수
  const handleStartSession = async () => {
    if (!quizId || !currentUser) return;
    
    try {
      setCreatingSession(true);
      setError(null);
      console.log('세션 생성 시작:', quizId);
      
      // 유효기간을 고정 1일로 설정
      const sessionOptions = {
        expiresIn: 24 * 60 * 60 * 1000, // 1일을 밀리초로 변환
      };
      
      const sessionId = await createSessionForQuiz(quizId, sessionOptions);
      console.log('세션 생성 완료:', sessionId);
      
      // URL 업데이트 (페이지 리로드 없이)
      if (sessionId) {
        navigate(`/host/session/${quizId}?sessionId=${sessionId}`, { replace: true });
      }
    } catch (err) {
      console.error('세션 생성 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '세션 생성에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setCreatingSession(false);
    }
  };
  
  // 세션 종료 처리 함수 - 최적화 버전
  const handleEndSession = async () => {
    if (!currentSession) return;
    
    try {
      setEndingSession(true);
      setError(null);
      
      // 즉시 UI 상태 업데이트하여 사용자 경험 개선
      setShowEndSessionConfirm(false);
      
      // 세션 로드 관련 상태 미리 변경하여 불필요한 데이터 로드 방지
      setSessionDeleted(true);
      setSessionLoaded(false);
      
      // URL 파라미터 즉시 제거 (replace로 이동하여 히스토리에 남지 않도록)
      navigate(`/host/session/${quizId}`, { replace: true });
      
      // 세션 삭제 작업은 백그라운드에서 진행
      await cleanupSession(currentSession.id);
      
      // 세션 상태 초기화
      resetSessionState();
    } catch (err) {
      console.error('세션 삭제 실패:', err);
      const errorMessage = err instanceof Error ? err.message : '세션 종료에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setEndingSession(false);
    }
  };
  
  // 다른 페이지로 이동하기 전에 확인 메시지 표시
  const handleNavigation = (path: string) => {
    if (isDataChanged && !isProcessing) {
      if (window.confirm('진행 중인 작업이 있습니다. 정말로 페이지를 떠나시겠습니까?')) {
        navigate(path);
      }
    } else {
      navigate(path);
    }
  };

  const handleDeleteQuiz = async () => {
    if (!currentUser) return;

    try {
      setIsProcessing(true);
      setIsDataChanged(true);

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

  // 클립보드에 참가 코드 복사
  const copySessionCode = () => {
    if (currentSession?.code) {
      copy(currentSession.code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // 클립보드에 참가 URL 복사
  const copyJoinUrl = () => {
    if (qrValue) {
      copy(qrValue);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };
  
  // 로딩 상태 컴포넌트
  const QuizLoadingState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <LoadingAnimation message="퀴즈 정보를 불러오는 중" />
    </div>
  );

  // 퀴즈 정보 로딩 중이거나 오류 발생 시
  if (isLoading || loading || sessionLoading || loadingActiveSession) {
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
  
  if ((error || quizError || sessionError) && !sessionDeleted) {
    return <div className="p-8 text-center text-red-600">{error || quizError || sessionError}</div>;
  }
  
  if (!quiz && !sessionDeleted) {
    return <div className="p-8 text-center">퀴즈 정보를 찾을 수 없습니다.</div>;
  }
  
  const quizParticipants = participants.filter(p => p.quizId === quiz?.id || '');
  const needsSession = !currentSession || sessionDeleted;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        <HostPageHeader 
          handleNavigation={handleNavigation}
        />

        <HostNavBar handleNavigation={handleNavigation} />

        <Breadcrumb 
          items={[
            { label: '내 퀴즈 목록', path: '/host/my-quizzes' },
            { label: quiz?.title || '퀴즈' }
          ]} 
        />

        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          {showDeleteConfirm ? (
            <div className="bg-red-50 p-4 border-l-4 border-red-500 rounded-md mb-4">
              <p className="text-red-800 font-medium mb-3">
                정말로 이 퀴즈를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 transition-colors"
                  disabled={isProcessing}
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteQuiz}
                  className="px-3 py-1 bg-red-600 rounded-md text-white hover:bg-red-700 transition-colors flex items-center"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader size={14} className="animate-spin mr-1" />
                      삭제 중...
                    </>
                  ) : (
                    '삭제 확인'
                  )}
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row justify-between items-start mb-6">
            <div className="mb-4 sm:mb-0 w-full">
              <div className="flex flex-wrap items-start sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-purple-700 break-words overflow-hidden">{quiz.title}</h1>
                  {/* 세션 상태 표시 */}
                  {currentSession ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                      <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
                      활동 켜짐
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 whitespace-nowrap">
                      <span className="w-2 h-2 mr-1 bg-gray-500 rounded-full"></span>
                      활동 꺼짐
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                  <Link 
                    to={`/host/edit/${quizId}`}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center text-sm whitespace-nowrap"
                  >
                    <Edit size={14} className="mr-1" />
                    편집
                  </Link>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-1.5 bg-white border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors flex items-center text-sm whitespace-nowrap"
                    disabled={isProcessing}
                  >
                    <Trash2 size={14} className="mr-1" />
                    삭제
                  </button>
                </div>
              </div>
              
              {quiz.description && (
                <p className="text-gray-600 mt-2 break-words overflow-hidden text-ellipsis">{quiz.description}</p>
              )}
              
              <div className="flex flex-wrap items-center mt-3 space-x-4">
                {/* 생성일자 표시 */}
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar size={14} className="mr-1" />
                  <span>생성일: {new Date(quiz.createdAt).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 세션 정보 섹션 - 통합 UI */}
          {currentSession && !needsSession ? (
            <div className={`mt-4 p-4 rounded-xl bg-green-100 border-2 border-green-300`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-green-800 mb-1">초대 코드</h3>
                  <div className="flex items-center">
                    <span className="text-3xl font-bold tracking-wider text-green-700">{currentSession.code}</span>
                    <button 
                      onClick={copySessionCode}
                      className="ml-2 p-1 text-green-600 hover:text-green-800 hover:bg-green-200 rounded-full transition-colors"
                      aria-label="초대 코드 복사"
                    >
                      {isCopied ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>
                <div className="mt-4 md:mt-0">
                  <Button 
                    onClick={() => setShowEndSessionConfirm(true)}
                    variant="danger"
                    disabled={endingSession}
                    className="flex items-center"
                  >
                    {endingSession ? (
                      <>
                        <Loader size={18} className="animate-spin mr-2" />
                        종료 중...
                      </>
                    ) : (
                      <>
                        <StopCircle size={18} className="mr-2" />
                        활동 종료하기
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : needsSession ? (
            <div className={`mt-4 p-4 rounded-xl bg-gray-100 border-2 border-gray-300`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-1">
                    활동이 꺼져있음
                  </h3>
                  <div className="flex items-center">
                    <p className="text-gray-700">활동을 시작하면 참가자들이 퀴즈에 참여할 수 있습니다.</p>
                  </div>
                </div>
                <div className="mt-4 md:mt-0">
                  <Button 
                    onClick={handleStartSession}
                    variant={"success"}
                    disabled={creatingSession}
                    className="flex items-center"
                  >
                    {creatingSession ? (
                      <>
                        <Loader size={18} className="animate-spin mr-2" />
                        활동 생성 중...
                      </>
                    ) : (
                      <>
                        <Play size={18} className="mr-2" />
                        {sessionDeleted ? "새 활동 시작하기" : "활동 시작하기"}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {currentSession && !needsSession ? (
          <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-8">
            <div className="flex border-b border-gray-200">
              <button
                className={`
                  flex-1 py-4 px-6 text-center font-medium
                  ${activeTab === 'participants' ? 
                    'text-purple-700 border-b-2 border-purple-500' : 
                    'text-gray-600 hover:text-purple-700'}
                `}
                onClick={() => setActiveTab('participants')}
              >
                <div className="flex items-center justify-center">
                  <Users size={20} className="mr-2" /> 참가자
                </div>
              </button>
              <button
                className={`
                  flex-1 py-4 px-6 text-center font-medium
                  ${activeTab === 'progress' ? 
                    'text-purple-700 border-b-2 border-purple-500' : 
                    'text-gray-600 hover:text-purple-700'}
                `}
                onClick={() => setActiveTab('progress')}
              >
                <div className="flex items-center justify-center">
                  <BarChart2 size={20} className="mr-2" /> 퀴즈 진행 상황
                </div>
              </button>
              <button
                className={`
                  flex-1 py-4 px-6 text-center font-medium
                  ${activeTab === 'invite' ? 
                    'text-purple-700 border-b-2 border-purple-500' : 
                    'text-gray-600 hover:text-purple-700'}
                `}
                onClick={() => setActiveTab('invite')}
              >
                <div className="flex items-center justify-center">
                  <Share2 size={20} className="mr-2" /> 초대하기
                </div>
              </button>
            </div>
            
            <div className="p-6">
              {activeTab === 'participants' && (
                <ParticipantList participants={quizParticipants} />
              )}
              
              {activeTab === 'progress' && (
                <QuizProgress quiz={quiz} participants={quizParticipants} />
              )}

              {activeTab === 'invite' && (
                <div className="flex flex-col items-center">
                  <div className="mb-6 text-center">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">참가자 초대하기</h3>
                    <p className="text-gray-600 mb-4">아래 방법 중 하나로 참가자들을 초대하세요</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    {/* 세션 코드 */}
                    <div className="bg-gray-50 p-6 rounded-xl text-center">
                      <h4 className="font-medium text-lg text-gray-800 mb-3">참가 코드</h4>
                      <div className="bg-white py-3 px-4 rounded-lg border border-purple-200 mb-4">
                        <span className="text-3xl font-bold tracking-wider text-purple-700">{currentSession.code}</span>
                      </div>
                      <button
                        onClick={copySessionCode}
                        className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                      >
                        {isCopied ? <Check size={16} className="mr-2" /> : <Copy size={16} className="mr-2" />}
                        코드 복사하기
                      </button>
                    </div>
                    
                    {/* QR 코드 */}
                    <div className="bg-gray-50 p-6 rounded-xl text-center">
                      <h4 className="font-medium text-lg text-gray-800 mb-3">QR 코드</h4>
                      <div className="bg-white p-4 rounded-lg border border-purple-200 mb-4 flex justify-center">
                        {qrValue ? (
                          <div className="p-2 bg-white">
                            <QRCode 
                              value={qrValue}
                              size={150}
                              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                              viewBox={`0 0 256 256`}
                            />
                          </div>
                        ) : (
                          <p className="text-gray-500">QR 코드를 생성할 수 없습니다.</p>
                        )}
                      </div>
                      <button
                        onClick={() => setShowQRCode(!showQRCode)}
                        className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                      >
                        <QrCode size={16} className="mr-2" />
                        크게 보기
                      </button>
                    </div>

                    {/* 참가 링크 */}
                    <div className="bg-gray-50 p-6 rounded-xl text-center md:col-span-2">
                      <h4 className="font-medium text-lg text-gray-800 mb-3">참가 링크</h4>
                      <div className="bg-white py-3 px-4 rounded-lg border border-purple-200 mb-4 overflow-hidden">
                        <p className="text-purple-600 truncate">{qrValue}</p>
                      </div>
                      <button
                        onClick={copyJoinUrl}
                        className="inline-flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                      >
                        {isCopied ? <Check size={16} className="mr-2" /> : <LinkIcon size={16} className="mr-2" />}
                        링크 복사하기
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {/* QR 코드 모달 */}
        {showQRCode && qrValue && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">QR 코드</h3>
                <button 
                  onClick={() => setShowQRCode(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>
              <div className="p-4 bg-white flex justify-center mb-4">
                <QRCode 
                  value={qrValue}
                  size={256}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
              </div>
              <p className="text-sm text-gray-600 text-center mb-4">
                이 QR 코드를 스캔하여 퀴즈에 참여하세요
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => setShowQRCode(false)}
                  className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 세션 종료 확인 모달 - 단순화 */}
        {showEndSessionConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <div className="flex items-center mb-4">
                <StopCircle size={24} className="text-orange-600 mr-2" />
                <h3 className="text-xl font-bold text-gray-800">활동 종료 확인</h3>
              </div>
              <p className="text-gray-700 mb-4">
                활동을 완전히 종료하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEndSessionConfirm(false)}
                  className="px-4 py-2 bg-gray-200 rounded-md text-gray-800 hover:bg-gray-300 transition-colors"
                  disabled={endingSession}
                >
                  취소
                </button>
                <button
                  onClick={handleEndSession}
                  className="px-4 py-2 bg-orange-600 rounded-md text-white hover:bg-orange-700 transition-colors flex items-center"
                  disabled={endingSession}
                >
                  {endingSession ? (
                    <>
                      <Loader size={16} className="animate-spin mr-2" />
                      종료 중...
                    </>
                  ) : (
                    '활동 종료'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          <LoadingOverlay 
            message="작업 처리 중..." 
          />
        )}

        {creatingSession && (
          <LoadingOverlay 
            message="활동을 생성하는 중..." 
          />
        )}
        
        {endingSession && (
          <LoadingOverlay 
            message="활동을 종료하는 중..." 
          />
        )}
      </div>
    </div>
  );
};

export default SessionQuiz; 