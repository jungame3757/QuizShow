import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

const ProfileSkeleton = () => (
  <div className="bg-purple-100 animate-pulse text-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 w-28 h-8"></div>
);

const PrivacyPolicy: React.FC = () => {
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
            개인정보처리방침
          </h1>
          <p className="text-gray-600 text-lg">
            콰직의 개인정보 수집, 이용, 보관에 관한 방침입니다.
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
              <h2 className="text-2xl font-bold text-purple-800 mb-6">제 1조 (개인정보의 처리목적)</h2>
              <p className="text-gray-700 mb-4 leading-relaxed">
                콰직(이하 "서비스")은 다음의 목적을 위하여 개인정보를 처리합니다:
              </p>
              <ul className="text-gray-700 mb-6 leading-relaxed space-y-2">
                <li>• 회원 가입 및 관리</li>
                <li>• 서비스 제공 및 개선</li>
                <li>• 퀴즈 참여 기록 및 결과 관리</li>
                <li>• 고객 지원 및 문의 응답</li>
                <li>• 서비스 이용 통계 분석</li>
              </ul>

              <h2 className="text-2xl font-bold text-purple-800 mb-6">제 2조 (처리하는 개인정보의 항목)</h2>
              <div className="text-gray-700 mb-6 leading-relaxed">
                <p className="mb-4"><strong>필수항목:</strong></p>
                <ul className="space-y-2 mb-4">
                  <li>• 이메일 주소</li>
                  <li>• 비밀번호 (암호화하여 저장)</li>
                  <li>• 닉네임</li>
                </ul>
                <p className="mb-4"><strong>선택항목:</strong></p>
                <ul className="space-y-2">
                  <li>• 프로필 이미지</li>
                  <li>• 기타 사용자가 제공한 정보</li>
                </ul>
              </div>

              <h2 className="text-2xl font-bold text-purple-800 mb-6">제 3조 (개인정보의 처리 및 보유기간)</h2>
              <p className="text-gray-700 mb-4 leading-relaxed">
                ① 서비스는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집시에 
                동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
              </p>
              <p className="text-gray-700 mb-6 leading-relaxed">
                ② 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:
              </p>
              <ul className="text-gray-700 mb-6 leading-relaxed space-y-2">
                <li>• <strong>회원 정보:</strong> 회원 탈퇴시까지</li>
                <li>• <strong>퀴즈 참여 기록:</strong> 5년</li>
                <li>• <strong>서비스 이용 기록:</strong> 3개월</li>
              </ul>

              <h2 className="text-2xl font-bold text-purple-800 mb-6">제 4조 (개인정보 제3자 제공)</h2>
              <p className="text-gray-700 mb-6 leading-relaxed">
                서비스는 개인정보를 제1조(개인정보의 처리목적)에서 명시한 범위 내에서만 처리하며, 
                정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 
                개인정보를 제3자에게 제공합니다.
              </p>

              <h2 className="text-2xl font-bold text-purple-800 mb-6">제 5조 (개인정보 처리의 위탁)</h2>
              <p className="text-gray-700 mb-4 leading-relaxed">
                서비스는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:
              </p>
              <ul className="text-gray-700 mb-6 leading-relaxed space-y-2">
                <li>• <strong>Firebase/Google Cloud:</strong> 데이터 저장 및 인증 서비스</li>
                <li>• <strong>Vercel:</strong> 호스팅 서비스</li>
              </ul>

              <h2 className="text-2xl font-bold text-purple-800 mb-6">제 6조 (정보주체의 권리·의무 및 행사방법)</h2>
              <p className="text-gray-700 mb-4 leading-relaxed">
                정보주체는 서비스에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:
              </p>
              <ul className="text-gray-700 mb-6 leading-relaxed space-y-2">
                <li>• 개인정보 처리현황 통지요구</li>
                <li>• 오류 등이 있을 경우 정정·삭제 요구</li>
                <li>• 처리정지 요구</li>
                <li>• 회원 탈퇴 및 개인정보 삭제 요구</li>
              </ul>

              <h2 className="text-2xl font-bold text-purple-800 mb-6">제 7조 (개인정보의 안전성 확보조치)</h2>
              <p className="text-gray-700 mb-4 leading-relaxed">
                서비스는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:
              </p>
              <ul className="text-gray-700 mb-6 leading-relaxed space-y-2">
                <li>• 개인정보 취급 직원의 최소화 및 교육</li>
                <li>• 개인정보에 대한 접근 제한</li>
                <li>• 개인정보를 저장하는 데이터베이스 시스템에 대한 접근권한의 부여·변경·말소를 통한 개인정보에 대한 접근통제</li>
                <li>• 개인정보의 암호화</li>
                <li>• 해킹이나 컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손을 막기 위한 보안프로그램 설치 및 갱신·점검</li>
              </ul>

              <h2 className="text-2xl font-bold text-purple-800 mb-6">제 8조 (개인정보보호책임자)</h2>
              <p className="text-gray-700 mb-4 leading-relaxed">
                서비스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 
                정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보보호책임자를 지정하고 있습니다:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 mb-2"><strong>개인정보보호책임자</strong></p>
                <p className="text-gray-600">이메일: privacy@quizshow.com</p>
              </div>

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

export default PrivacyPolicy; 