import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile, deleteUser, reauthenticateWithCredential, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useQuiz } from '../contexts/QuizContext';
import { User, ArrowLeft, Edit, LogOut, Trash2, AlertTriangle, Loader } from 'lucide-react';
import { deleteAllUserData } from '../firebase/userDataService';

const Profile = () => {
  const { currentUser, signInWithGoogle, signOut, auth } = useAuth();
  const { clearQuizData } = useQuiz();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const navigate = useNavigate();

  const handleUpdateName = async () => {
    if (!currentUser) return;
    
    try {
      await updateProfile(currentUser, { displayName });
      setIsEditing(false);
      alert('이름이 성공적으로 변경되었습니다.');
    } catch (error) {
      console.error('이름 변경 오류:', error);
      alert('이름 변경 중 오류가 발생했습니다.');
    }
  };

  // 사용자 데이터 삭제 및 계정 삭제 함수
  const deleteUserDataAndAccount = async (userId: string) => {
    setStatusMessage('사용자 데이터 삭제 중...');
    try {
      // 우선 데이터 삭제를 확실히 수행
      await deleteAllUserData(userId);
      setStatusMessage('사용자 데이터 삭제 완료, 계정 삭제 중...');
      
      // 로컬 퀴즈 데이터 초기화
      clearQuizData();
      
      // 데이터 삭제 완료 후 계정 삭제
      await deleteUser(currentUser!);
      
      // 삭제 완료 후 홈으로 이동
      navigate('/');
    } catch (error) {
      console.error('데이터 또는 계정 삭제 오류:', error);
      setStatusMessage('');
      throw error; // 오류를 상위로 전달
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    
    try {
      setIsProcessing(true);
      setStatusMessage('계정 삭제 중...');
      
      // 계정 및 데이터 삭제 시도
      await deleteUserDataAndAccount(currentUser.uid);
      
    } catch (error: any) {
      console.error('계정 삭제 오류:', error);
      setStatusMessage('');
      
      // 재인증이 필요한 경우
      if (error.code === 'auth/requires-recent-login') {
        const confirmReauth = window.confirm('보안상의 이유로 재로그인이 필요합니다. 계속하시겠습니까?');
        
        if (confirmReauth) {
          try {
            // Google 로그인으로 재인증
            if (currentUser.providerData[0]?.providerId === 'google.com') {
              const provider = new GoogleAuthProvider();
              // 팝업으로 Google 로그인
              const result = await signInWithPopup(auth, provider);
              
              // 크레덴셜 가져오기
              const credential = GoogleAuthProvider.credentialFromResult(result);
              
              if (credential) {
                // 재인증 수행
                await reauthenticateWithCredential(currentUser, credential);
                
                // 재인증 성공 후 다시 계정 및 데이터 삭제 시도
                await deleteUserDataAndAccount(currentUser.uid);
              } else {
                throw new Error('인증 정보를 가져오지 못했습니다.');
              }
            } else {
              alert('재로그인 후 다시 시도해 주세요.');
              clearQuizData();
              await signOut();
              navigate('/login');
            }
          } catch (reauthError) {
            console.error('재인증 오류:', reauthError);
            alert('재인증에 실패했습니다. 다시 로그인 후 시도해 주세요.');
          }
        }
      } else {
        alert('계정 삭제 중 오류가 발생했습니다. 재로그인 후 다시 시도해주세요.');
      }
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleLogout = async () => {
    try {
      // 로그아웃 전에 퀴즈 데이터 명시적으로 초기화
      clearQuizData();
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F7FF] via-[#F3F1FF] to-[#F0EEFF] py-8 px-4">
      <div className="container mx-auto max-w-md">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="mr-4 text-[#783ae8] hover:text-purple-800 transition-colors"
            style={{
              transition: 'all 0.2s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateX(-2px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-bold text-[#783ae8]">내 프로필</h1>
        </div>
        
        {/* 프로필 카드 */}
        <div className="bg-white shadow-lg rounded-xl p-6 mb-6" style={{
          border: '1px solid rgba(139, 92, 246, 0.3)', 
          boxShadow: '0 3px 0 rgba(139, 92, 246, 0.15)'
        }}>
          <div className="flex items-center justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center shadow-md">
              <User size={40} className="text-white" />
            </div>
          </div>
          
          {currentUser && !currentUser.isAnonymous ? (
            <>
              <div className="mb-6">
                <p className="text-gray-500 text-sm mb-1">이메일</p>
                <p className="font-medium text-gray-800 bg-gray-50 p-2 rounded">{currentUser.email}</p>
              </div>
              
              {isEditing ? (
                <div className="mb-6">
                  <label htmlFor="displayName" className="block text-gray-500 text-sm mb-1">
                    이름
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="이름을 입력하세요"
                    className="w-full p-2 border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleUpdateName}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors flex-1 flex items-center justify-center"
                      style={{
                        boxShadow: '0 2px 0 rgba(0,0,0,0.5)',
                        border: '1px solid #000',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 0 rgba(0,0,0,0.5)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 0 rgba(0,0,0,0.5)';
                      }}
                    >
                      저장
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-300 transition-colors flex-1"
                      style={{
                        boxShadow: '0 2px 0 rgba(0,0,0,0.1)',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 0 rgba(0,0,0,0.1)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 0 rgba(0,0,0,0.1)';
                      }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <p className="text-gray-500 text-sm mb-1">이름</p>
                  <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                    <p className="font-medium text-gray-800">{currentUser.displayName || '이름 없음'}</p>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-[#783ae8] hover:text-purple-800 transition-colors p-1"
                    >
                      <Edit size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 mb-4">
              <div className="inline-block bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium mb-3">익명 사용자</div>
              <p className="mb-6 text-gray-600">Google 계정으로 연결하여 더 많은 기능을 사용할 수 있습니다.</p>
              <button
                onClick={signInWithGoogle}
                className="bg-white border border-blue-300 text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors w-full flex items-center justify-center"
                style={{
                  boxShadow: '0 2px 0 rgba(0,0,0,0.1)',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 0 rgba(0,0,0,0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 0 rgba(0,0,0,0.1)';
                }}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M21.8,12.1c0-0.7-0.1-1.3-0.2-2H12v3.8h5.5c-0.2,1.2-0.9,2.2-2,2.9v2.4h3.2C20.6,17.1,21.8,14.9,21.8,12.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12,22c2.7,0,5-0.9,6.6-2.4l-3.2-2.4c-0.9,0.6-2,1-3.3,1c-2.6,0-4.8-1.7-5.5-4.1H3.3v2.5C5,19.5,8.3,22,12,22z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.5,14.1c-0.2-0.6-0.3-1.3-0.3-2.1s0.1-1.4,0.3-2.1V7.4H3.3C2.5,9,2,10.9,2,13s0.5,4,1.3,5.6L6.5,14.1z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12,5.8c1.5,0,2.8,0.5,3.8,1.5l2.8-2.8C16.9,2.9,14.6,2,12,2C8.3,2,5,4.5,3.3,8.1l3.2,2.5C7.2,7.5,9.4,5.8,12,5.8z"
                  />
                </svg>
                Google 계정 연결하기
              </button>
            </div>
          )}
        </div>
        
        {/* 처리 중 상태 메시지 */}
        {isProcessing && statusMessage && (
          <div className="bg-blue-50 text-blue-700 p-4 rounded-lg mb-4 flex items-center justify-center">
            <Loader size={18} className="animate-spin mr-2" />
            <p>{statusMessage}</p>
          </div>
        )}
        
        {/* 계정 관리 영역 */}
        <div className="space-y-4">
          <button
            onClick={handleLogout}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 rounded-xl hover:bg-purple-700 transition-colors w-full flex items-center justify-center"
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
            disabled={isProcessing}
          >
            <LogOut size={18} className="mr-2" /> 로그아웃
          </button>
          
          {isDeleting ? (
            <div className="bg-white shadow-lg rounded-xl p-6" style={{
              border: '1px solid rgba(239, 68, 68, 0.3)',
              boxShadow: '0 3px 0 rgba(239, 68, 68, 0.15)'
            }}>
              <div className="flex items-center mb-3 text-red-600">
                <AlertTriangle size={20} className="mr-2" />
                <h3 className="font-bold">계정 삭제 확인</h3>
              </div>
              <p className="text-red-600 mb-4">
                {currentUser?.isAnonymous 
                  ? '익명 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.' 
                  : '정말로 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 퀴즈와 활동 기록이 함께 삭제됩니다.'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors flex-1 flex items-center justify-center"
                  style={{
                    boxShadow: '0 2px 0 rgba(0,0,0,0.5)',
                    border: '1px solid #000',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 0 rgba(0,0,0,0.5)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 0 rgba(0,0,0,0.5)';
                  }}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader size={14} className="animate-spin mr-2" />
                      처리 중...
                    </>
                  ) : (
                    '삭제 확인'
                  )}
                </button>
                <button
                  onClick={() => setIsDeleting(false)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-300 transition-colors flex-1"
                  style={{
                    boxShadow: '0 2px 0 rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 0 rgba(0,0,0,0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 0 rgba(0,0,0,0.1)';
                  }}
                  disabled={isProcessing}
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsDeleting(true)}
              className="bg-white border border-red-300 text-red-600 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors w-full flex items-center justify-center"
              style={{
                boxShadow: '0 2px 0 rgba(239, 68, 68, 0.2)',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 0 rgba(239, 68, 68, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 0 rgba(239, 68, 68, 0.2)';
              }}
              disabled={isProcessing}
            >
              <Trash2 size={18} className="mr-2" /> 계정 삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile; 