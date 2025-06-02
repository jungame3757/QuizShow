import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

const ProfileSkeleton = () => (
  <div className="bg-purple-100 animate-pulse text-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 w-28 h-8"></div>
);

const TermsOfService: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F8F7FF] via-[#F3F1FF] to-[#F0EEFF]">
      <div className="px-4 sm:px-6 lg:px-8 w-full max-w-4xl mx-auto">
        <header className="pt-4 pb-8">
          {/* 상단 메뉴 및 로그인 버튼 */}
          <div className="flex items-center justify-between mb-6">
            <Link to="/" aria-label="홈으로 이동" className="flex items-center gap-2 h-8">
              <img 
                src="/assets/logo/logo-light.svg" 
                alt="콰직 로고" 
                className="h-8 mr-1" 
              />
              <span className="text-xl sm:text-2xl font-bold text-[#783ae8] flex items-center gap-2" style={{ fontFamily: 'SBAggroB' }}>
                콰직
              </span>
            </Link>

            {isLoading ? (
              <ProfileSkeleton />
            ) : currentUser ? (
              <Link 
                to="/profile" 
                className="bg-purple-600 text-white px-3 py-1.5 rounded-full hover:bg-purple-700 transition-colors flex items-center gap-1.5 h-8"
                style={{
                  boxShadow: '0 1px 0 #000',
                  border: '1px solid #000',
                  transition: 'all 0.2s ease',
                  fontSize: '0.875rem',
                }}
              >
                <User size={14} className="text-white" />
                <span className="font-medium">{currentUser.isAnonymous ? '익명 사용자' : (currentUser.displayName || currentUser.email || '사용자')}</span>
                <Settings size={12} />
              </Link>
            ) : (
              <Link to="/login">
                <Button 
                  variant="secondary" 
                  size="small"
                  className="px-3 py-1.5 h-8 rounded-full"
                  style={{
                    boxShadow: '0 1px 0 #000',
                    border: '1px solid #000',
                    transition: 'all 0.2s ease',
                    fontSize: '0.875rem',
                  }}
                >
                  로그인
                </Button>
              </Link>
            )}
          </div>

          {/* 뒤로가기 버튼과 제목 */}
          <div className="flex items-center gap-4 mb-8">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">홈으로</span>
            </Link>
          </div>

          <h1 className="text-4xl font-bold text-[#783ae8] mb-4" style={{ fontFamily: 'SBAggroB' }}>
            이용약관
          </h1>
          <p className="text-gray-600 text-lg">
            콰직 서비스 이용에 관한 약관입니다.
          </p>
        </header>

        <main className="pb-12">
          <div 
            className="bg-white p-8 mb-8"
            style={{
              boxShadow: '0 3px 0 rgba(120, 58, 232, 0.3)',
              border: '2px solid #8B5CF6',
              borderRadius: '16px',
            }}
          >
            <div className="prose prose-purple max-w-none">
              <h2 className="text-2xl font-bold text-purple-800 mb-6">제 1조 (목적)</h2>
              <p className="text-gray-700 mb-6 leading-relaxed">
                이 약관은 콰직(이하 "서비스")이 제공하는 온라인 퀴즈 플랫폼 서비스의 이용과 관련하여 
                서비스 제공자와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>

              <h2 className="text-2xl font-bold text-purple-800 mb-6">제 2조 (정의)</h2>
              <ul className="text-gray-700 mb-6 leading-relaxed space-y-2">
                <li><strong>서비스:</strong> 콰직이 제공하는 온라인 퀴즈 제작, 진행, 참여 플랫폼을 의미합니다.</li>
                <li><strong>이용자:</strong> 서비스에 접속하여 이 약관에 따라 서비스를 받는 회원 및 비회원을 통칭합니다.</li>
                <li><strong>회원:</strong> 서비스에 개인정보를 제공하여 회원등록을 한 자로서, 서비스의 정보를 지속적으로 제공받으며 서비스를 이용할 수 있는 자를 의미합니다.</li>
                <li><strong>비회원:</strong> 회원에 가입하지 않고 서비스를 이용하는 자를 의미합니다.</li>
              </ul>

              <h2 className="text-2xl font-bold text-purple-800 mb-6">제 3조 (약관의 효력 및 변경)</h2>
              <p className="text-gray-700 mb-4 leading-relaxed">
                ① 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.
              </p>
              <p className="text-gray-700 mb-6 leading-relaxed">
                ② 서비스는 합리적인 사유가 발생할 경우에는 이 약관을 변경할 수 있으며, 
                약관이 변경되는 경우에는 변경된 약관의 내용과 시행일을 정하여, 
                시행일로부터 최소 7일 이전에 공지합니다.
              </p>

              <h2 className="text-2xl font-bold text-purple-800 mb-6">제 4조 (서비스의 제공)</h2>
              <p className="text-gray-700 mb-4 leading-relaxed">
                서비스는 다음과 같은 업무를 수행합니다:
              </p>
              <ul className="text-gray-700 mb-6 leading-relaxed space-y-2">
                <li>• 온라인 퀴즈 제작 도구 제공</li>
                <li>• 실시간 퀴즈 진행 플랫폼 제공</li>
                <li>• 퀴즈 결과 분석 및 통계 제공</li>
                <li>• 기타 서비스와 관련된 업무</li>
              </ul>

              <h2 className="text-2xl font-bold text-purple-800 mb-6">제 5조 (서비스 이용)</h2>
              <p className="text-gray-700 mb-4 leading-relaxed">
                ① 서비스 이용은 서비스의 업무상 또는 기술상 특별한 지장이 없는 한 연중무휴, 1일 24시간 운영을 원칙으로 합니다.
              </p>
              <p className="text-gray-700 mb-6 leading-relaxed">
                ② 서비스는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 
                서비스의 제공을 일시적으로 중단할 수 있습니다.
              </p>

              <h2 className="text-2xl font-bold text-purple-800 mb-6">제 6조 (개인정보보호)</h2>
              <p className="text-gray-700 mb-6 leading-relaxed">
                서비스는 관련법령이 정하는 바에 따라서 이용자의 개인정보를 보호하기 위해 노력합니다. 
                개인정보의 보호 및 사용에 대해서는 관련법령 및 서비스의 개인정보처리방침이 적용됩니다.
              </p>

              <h2 className="text-2xl font-bold text-purple-800 mb-6">제 7조 (이용자의 의무)</h2>
              <p className="text-gray-700 mb-4 leading-relaxed">
                이용자는 다음 행위를 하여서는 안 됩니다:
              </p>
              <ul className="text-gray-700 mb-6 leading-relaxed space-y-2">
                <li>• 신청 또는 변경시 허위내용의 등록</li>
                <li>• 타인의 정보 도용</li>
                <li>• 서비스에 게시된 정보의 변경</li>
                <li>• 서비스가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
                <li>• 서비스 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                <li>• 서비스 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                <li>• 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
              </ul>

              <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-500 mt-8">
                <p className="text-sm text-gray-600">
                  <strong>최종 수정일:</strong> 2024년 1월 1일<br />
                  <strong>시행일:</strong> 2024년 1월 1일
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TermsOfService; 