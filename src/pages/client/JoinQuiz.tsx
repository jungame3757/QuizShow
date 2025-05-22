import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Loader2, Send, User, Brain } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { auth, rtdb } from '../../firebase/config';
import { ref, get, set, update } from 'firebase/database';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const JoinQuiz: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [step, setStep] = useState<'code' | 'nickname'>('code');
  const [inviteCode, setInviteCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [existingParticipant, setExistingParticipant] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Firebase 인증 상태 확인
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (_user) => {
      setAuthChecked(true);
    });
    
    return () => unsubscribe();
  }, []);
  
  // URL에서 초대 코드 가져오기
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const codeFromUrl = searchParams.get('code');
    
    if (codeFromUrl && authChecked) {
      setInviteCode(codeFromUrl.toUpperCase());
      // 코드가 있으면 자동으로 확인 시작
      handleCheckInviteCode(codeFromUrl);
    }
  }, [location, authChecked]);
  
  // 익명 로그인 함수
  const handleAnonymousLogin = async () => {
    try {
      // 이미 로그인 되어 있는 경우 추가 로그인을 하지 않음
      if (auth.currentUser) {
        return true;
      }
      
      await signInAnonymously(auth);
      return true;
    } catch (error: any) {
      console.error('익명 로그인 실패:', error);
      setError('로그인에 실패했습니다. 다시 시도해주세요.');
      return false;
    }
  };
  
  // 세션에 이미 참가한 사용자인지 확인
  const checkExistingParticipation = async (sessionId: string) => {
    if (!auth.currentUser) return null;
    
    try {
      const userId = auth.currentUser.uid;
      const participantRef = ref(rtdb, `participants/${sessionId}/${userId}`);
      const participantSnapshot = await get(participantRef);
      
      if (participantSnapshot.exists()) {
        return participantSnapshot.val();
      }
      
      return null;
    } catch (err) {
      console.error('참가자 정보 확인 오류:', err);
      return null;
    }
  };
  
  // 기존 참가자로 바로 입장
  const handleDirectJoin = async (participantData: any = null, sessionInfo: any = null) => {
    // 직접 전달된 데이터 또는 상태 값 사용
    const participantToUse = participantData || existingParticipant;
    const sessionToUse = sessionInfo || sessionData;
    
    if (!participantToUse || !sessionToUse) return;
    
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        throw new Error('사용자 인증 정보가 없습니다.');
      }
      
      // 세션이 만료되었는지 다시 확인
      const sessionRef = ref(rtdb, `sessions/${sessionToUse.sessionId}`);
      const sessionSnapshot = await get(sessionRef);
      
      if (!sessionSnapshot.exists()) {
        throw new Error('세션 정보를 찾을 수 없습니다.');
      }
      
      const sessionData = sessionSnapshot.val();
      
      // 세션이 만료되었는지 확인
      const now = Date.now();
      if (sessionData.expiresAt && sessionData.expiresAt < now) {
        throw new Error('만료된 퀴즈 세션입니다. 다른 코드를 사용해주세요.');
      }
      
      // 세션이 종료되었는지 확인
      if (sessionData.endedAt && sessionData.endedAt < now) {
        throw new Error('이미 종료된 퀴즈 세션입니다. 다른 코드를 사용해주세요.');
      }
      
      // 참가자 상태 업데이트 (isActive를 true로)
      const participantRef = ref(rtdb, `participants/${sessionToUse.sessionId}/${userId}`);
      await update(participantRef, {
        isActive: true
      });
      
      // 참여 정보 로컬 스토리지에 저장
      localStorage.setItem('quizParticipation', JSON.stringify({
        quizId: sessionToUse.quizId,
        sessionId: sessionToUse.sessionId,
        participantId: userId,
        nickname: participantToUse.name
      }));
      
      // 플레이 페이지로 이동
      navigate(`/play/${sessionToUse.sessionId}`);
    } catch (err: any) {
      console.error('퀴즈 재참여 오류:', err);
      setError(err.message || '퀴즈 재참여에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  // 초대 코드 확인
  const handleCheckInviteCode = async (codeParam?: string) => {
    if (!authChecked) return;
    
    setError('');
    const codeToCheck = codeParam || inviteCode;
    
    if (!codeToCheck.trim()) {
      setError('초대 코드를 입력해주세요');
      return;
    }
    
    try {
      setLoading(true);
      
      // 익명 로그인
      const isLoggedIn = await handleAnonymousLogin();
      if (!isLoggedIn) {
        setLoading(false);
        return;
      }
      
      // Realtime Database에서 세션 코드 검색
      const sessionCodeRef = ref(rtdb, `sessionCodes/${codeToCheck.trim()}`);
      const sessionCodeSnapshot = await get(sessionCodeRef);
      
      if (!sessionCodeSnapshot.exists()) {
        setError('유효하지 않은 초대 코드입니다. 다시 확인해주세요.');
        setLoading(false);
        return;
      }
      
      // 세션 ID 가져오기
      const sessionId = sessionCodeSnapshot.val();
      
      // 세션 데이터 가져오기
      const sessionRef = ref(rtdb, `sessions/${sessionId}`);
      const sessionSnapshot = await get(sessionRef);
      
      if (!sessionSnapshot.exists()) {
        setError('세션 정보를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }
      
      // 세션 데이터 저장
      const sessionDataValue = sessionSnapshot.val();
      
      // 세션이 만료되었는지 확인
      const now = Date.now();
      if (sessionDataValue.expiresAt && sessionDataValue.expiresAt < now) {
        setError('만료된 퀴즈 세션입니다. 다른 코드를 사용해주세요.');
        setLoading(false);
        return;
      }
      
      // 세션이 종료되었는지 확인
      if (sessionDataValue.endedAt && sessionDataValue.endedAt < now) {
        setError('이미 종료된 퀴즈 세션입니다. 다른 코드를 사용해주세요.');
        setLoading(false);
        return;
      }
      
      const sessionInfo = {
        sessionId: sessionId,
        code: sessionDataValue.code,
        quizId: sessionDataValue.quizId,
        hostId: sessionDataValue.hostId,
        participantCount: sessionDataValue.participantCount || 0
      };
      setSessionData(sessionInfo);
      
      // 이미 참가한 사용자인지 확인
      const participant = await checkExistingParticipation(sessionId);
      
      if (participant) {
        // 상태 업데이트는 UI 표시를 위해 여전히 필요
        setExistingParticipant(participant);
        setNickname(participant.name);
        
        // 직접 데이터를 전달하여 즉시 입장하기
        await handleDirectJoin(participant, sessionInfo);
        return;
      }
      
      // 새 참가자는 닉네임 입력 단계로 이동
      setStep('nickname');
    } catch (err: any) {
      console.error('초대 코드 확인 오류:', err);
      setError(err.message || '초대 코드 확인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };
  
  // 닉네임으로 최종 가입
  const handleJoinQuiz = async () => {
    setError('');
    
    if (!nickname.trim()) {
      setError('닉네임을 입력해주세요');
      return;
    }
    
    if (nickname.trim().length < 2 || nickname.trim().length > 15) {
      setError('닉네임은 2~15자 사이여야 합니다');
      return;
    }
    
    try {
      setLoading(true);
      
      if (!sessionData || !sessionData.sessionId) {
        setError('세션 정보가 없습니다.');
        setLoading(false);
        return;
      }
      
      // 세션이 만료되었는지 다시 확인
      const sessionRef = ref(rtdb, `sessions/${sessionData.sessionId}`);
      const sessionSnapshot = await get(sessionRef);
      
      if (!sessionSnapshot.exists()) {
        throw new Error('세션 정보를 찾을 수 없습니다.');
      }
      
      const sessionDataValue = sessionSnapshot.val();
      
      // 세션이 만료되었는지 확인
      const now = Date.now();
      if (sessionDataValue.expiresAt && sessionDataValue.expiresAt < now) {
        throw new Error('만료된 퀴즈 세션입니다. 다른 코드를 사용해주세요.');
      }
      
      // 세션이 종료되었는지 확인
      if (sessionDataValue.endedAt && sessionDataValue.endedAt < now) {
        throw new Error('이미 종료된 퀴즈 세션입니다. 다른 코드를 사용해주세요.');
      }
      
      const userId = auth.currentUser?.uid || 'anonymous_' + Date.now();
      
      // 참가자 정보 저장 (Realtime Database)
      const participantRef = ref(rtdb, `participants/${sessionData.sessionId}/${userId}`);
      const participantData = {
        id: userId,
        name: nickname.trim(),
        joinedAt: Date.now(),
        isActive: true,
        score: 0,
        quizId: sessionData.quizId
      };
      
      await set(participantRef, participantData);
      
      // 세션의 참가자 수 업데이트
      await update(sessionRef, {
        participantCount: sessionDataValue.participantCount + 1 || 1
      });
      
      // 참여 정보 로컬 스토리지에 저장
      localStorage.setItem('quizParticipation', JSON.stringify({
        quizId: sessionData.quizId,
        sessionId: sessionData.sessionId,
        participantId: userId,
        nickname: nickname.trim()
      }));
      
      // 플레이 페이지로 이동 - sessionId를 사용하여 올바른 경로로 이동
      navigate(`/play/${sessionData.sessionId}`);
    } catch (err: any) {
      console.error('퀴즈 참여 오류:', err);
      setError(err.message || '퀴즈 참여에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // URL에 코드 정보 업데이트
  const updateUrlWithCode = (code: string) => {
    const newUrl = `/join?code=${code}`;
    window.history.replaceState(null, '', newUrl);
  };

  // 초대 코드 입력 핸들러
  const handleInviteCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setInviteCode(code);
    if (code) {
      updateUrlWithCode(code);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F0FFFD] via-[#E6FFFC] to-[#E0FFFA] p-4 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 size={40} className="text-teal-600 animate-spin mb-4" />
          <p className="text-teal-700 text-lg">인증 상태 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0FFFD] via-[#E6FFFC] to-[#E0FFFA] p-4 flex flex-col items-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-8 animate-fade-in-up"
          style={{
            boxShadow: '0 3px 0 rgba(20, 184, 166, 0.5)',
            border: '2px solid #0D9488',
            borderRadius: '16px',
            background: 'linear-gradient(to bottom right, #fff, #f0fffc)',
          }}
        >
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center" style={{ border: '2px solid #0D9488' }}>
              {step === 'code' ? (
                <LogIn size={36} className="text-teal-600" />
              ) : (
                <User size={36} className="text-teal-600" />
              )}
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-center text-[#783ae8] mb-6">
            {step === 'code' ? '퀴즈 쇼 참여하기' : '닉네임 정하기'}
          </h1>
          
          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}
          
          {existingParticipant && step === 'nickname' && (
            <div className="bg-green-50 p-4 rounded-lg mb-6" style={{ border: '1px solid #0D9488' }}>
              <p className="text-green-700 font-medium mb-2">이미 참여한 기록이 있습니다</p>
              <p className="text-green-600 mb-3">닉네임: <span className="font-bold">{existingParticipant.name}</span></p>
              <Button 
                onClick={() => handleDirectJoin(existingParticipant, sessionData)}
                variant="success"
                fullWidth
                disabled={loading}
                className="bg-gradient-to-r from-teal-500 to-teal-400"
                style={{
                  boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
                  border: '2px solid #000',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 6px 0 rgba(0,0,0,0.8)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
                }}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 size={20} className="mr-2 animate-spin" />
                    입장 중...
                  </div>
                ) : "기존 닉네임으로 입장하기"}
              </Button>
            </div>
          )}
          
          <div className="space-y-6">
            {step === 'code' ? (
              <>
                <div>
                  <label className="block text-lg font-medium text-gray-700 mb-2">
                    초대 코드
                  </label>
                  <Input
                    type="text"
                    value={inviteCode}
                    onChange={handleInviteCodeChange}
                    placeholder="코드를 입력하세요 (예: ABC123)"
                    className="w-full"
                    maxLength={8}
                  />
                </div>
                
                <Button 
                  onClick={() => handleCheckInviteCode()}
                  variant="primary"
                  size="large"
                  fullWidth
                  className="bg-gradient-to-r from-teal-500 to-teal-400"
                  style={{
                    boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
                    border: '2px solid #000',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 6px 0 rgba(0,0,0,0.8)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 size={20} className="mr-2 animate-spin" />
                      확인 중...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Send size={20} className="mr-2" />
                      코드 확인하기
                    </div>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-lg font-medium text-gray-700">
                      닉네임
                    </label>
                  </div>
                  <Input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="어떻게 불러드릴까요?"
                    className="w-full"
                    maxLength={15}
                  />
                </div>
                
                <Button 
                  onClick={handleJoinQuiz}
                  variant="primary"
                  size="large"
                  fullWidth
                  className="bg-gradient-to-r from-teal-500 to-teal-400"
                  style={{
                    boxShadow: '0 3px 0 rgba(0,0,0,0.8)',
                    border: '2px solid #000',
                    borderRadius: '12px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 6px 0 rgba(0,0,0,0.8)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 3px 0 rgba(0,0,0,0.8)';
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 size={20} className="mr-2 animate-spin" />
                      참여 중...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <LogIn size={20} className="mr-2" />
                      퀴즈 참여하기
                    </div>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Made by 콰직 Footer */}
      <div 
        className="mt-8 mb-4 text-center cursor-pointer"
        onClick={() => navigate('/')}
      >
        <div className="bg-white bg-opacity-90 inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full shadow-md border border-teal-100">
          <img 
            src="/assets/logo/logo-light.svg" 
            alt="콰직 로고" 
            className="w-5 h-5" 
          />
          <p className="text-teal-700 font-medium text-sm hover:text-teal-500 transition-colors">
            made with 콰직
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinQuiz;