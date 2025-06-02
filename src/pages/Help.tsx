import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User, Settings, ChevronDown, ChevronUp, HelpCircle, MessageCircle, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';

const ProfileSkeleton = () => (
  <div className="bg-purple-100 animate-pulse text-white px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 w-28 h-8"></div>
);

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onToggle }) => (
  <div 
    className="bg-white mb-4 cursor-pointer transition-all duration-300"
    style={{
      boxShadow: '0 2px 0 rgba(120, 58, 232, 0.3)',
      border: '1px solid #8B5CF6',
      borderRadius: '12px',
    }}
    onClick={onToggle}
  >
    <div className="p-6 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-purple-800">{question}</h3>
      {isOpen ? <ChevronUp className="text-purple-600" size={20} /> : <ChevronDown className="text-purple-600" size={20} />}
    </div>
    {isOpen && (
      <div className="px-6 pb-6">
        <p className="text-gray-700 leading-relaxed">{answer}</p>
      </div>
    )}
  </div>
);

const Help: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const faqData = [
    {
      question: "콰직은 무엇인가요?",
      answer: "콰직은 온라인 퀴즈를 쉽게 만들고 진행할 수 있는 플랫폼입니다. 교사, 강사, 기업 교육 담당자 등이 간편하게 퀴즈를 제작하고 실시간으로 참가자들과 함께 퀴즈를 진행할 수 있습니다."
    },
    {
      question: "회원가입 없이도 이용할 수 있나요?",
      answer: "네, 퀴즈 참여는 회원가입 없이도 가능합니다. 하지만 퀴즈를 만들고 관리하려면 회원가입이 필요합니다. 구글 계정으로 간편하게 가입할 수 있습니다."
    },
    {
      question: "퀴즈는 어떻게 만들 수 있나요?",
      answer: "로그인 후 '퀴즈 만들기' 버튼을 클릭하면 퀴즈 제작 페이지로 이동합니다. 퀴즈 제목, 설명을 입력하고 문제와 선택지를 추가하면 됩니다. 객관식, 주관식 등 다양한 문제 유형을 지원합니다."
    },
    {
      question: "실시간 퀴즈는 어떻게 진행하나요?",
      answer: "퀴즈를 만든 후 '세션 시작' 버튼을 클릭하면 참가자들이 입장할 수 있는 코드가 생성됩니다. 참가자들은 이 코드를 입력하여 퀴즈에 참여할 수 있습니다. 호스트가 문제를 하나씩 진행하며 실시간으로 결과를 확인할 수 있습니다."
    },
    {
      question: "퀴즈에 몇 명까지 참여할 수 있나요?",
      answer: "현재 한 퀴즈 세션에 최대 100명까지 참여할 수 있습니다. 더 많은 참가자가 필요한 경우 별도로 문의해 주세요."
    },
    {
      question: "퀴즈 결과는 어떻게 확인하나요?",
      answer: "퀴즈가 끝나면 자동으로 결과 페이지가 표시됩니다. 개인별 점수, 문항별 정답률, 순위 등을 확인할 수 있습니다. 호스트는 '활동 기록' 메뉴에서 과거 퀴즈 결과를 다시 볼 수 있습니다."
    },
    {
      question: "모바일에서도 이용할 수 있나요?",
      answer: "네, 콰직은 반응형 웹으로 제작되어 PC, 태블릿, 스마트폰 등 모든 기기에서 원활하게 이용할 수 있습니다."
    },
    {
      question: "퀴즈 데이터를 내보낼 수 있나요?",
      answer: "현재는 웹에서 결과를 확인하는 기능만 제공되고 있습니다. 데이터 내보내기 기능은 향후 업데이트에서 제공될 예정입니다."
    },
    {
      question: "문제가 발생했을 때 어디에 문의하나요?",
      answer: "기술적 문제나 서비스 이용 중 궁금한 점이 있으시면 support@quizshow.com으로 문의해 주세요. 최대한 빠르게 답변드리겠습니다."
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

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
            도움말
          </h1>
          <p className="text-gray-600 text-lg">
            콰직 사용법과 자주 묻는 질문들을 확인해보세요.
          </p>
        </header>

        <main className="pb-12">
          {/* 빠른 도움말 카드들 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div 
              className="bg-white p-6 text-center"
              style={{
                boxShadow: '0 3px 0 rgba(120, 58, 232, 0.3)',
                border: '2px solid #8B5CF6',
                borderRadius: '16px',
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <BookOpen size={24} className="text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-purple-800 mb-2">시작 가이드</h3>
              <p className="text-gray-600 text-sm">
                콰직을 처음 사용하시나요? 기본 사용법을 알아보세요.
              </p>
            </div>

            <div 
              className="bg-white p-6 text-center"
              style={{
                boxShadow: '0 3px 0 rgba(59, 130, 246, 0.3)',
                border: '2px solid #3B82F6',
                borderRadius: '16px',
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <HelpCircle size={24} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-blue-800 mb-2">자주 묻는 질문</h3>
              <p className="text-gray-600 text-sm">
                다른 사용자들이 자주 묻는 질문과 답변을 확인하세요.
              </p>
            </div>

            <div 
              className="bg-white p-6 text-center"
              style={{
                boxShadow: '0 3px 0 rgba(20, 184, 166, 0.3)',
                border: '2px solid #14B8A6',
                borderRadius: '16px',
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={24} className="text-teal-600" />
              </div>
              <h3 className="text-lg font-bold text-teal-800 mb-2">문의하기</h3>
              <p className="text-gray-600 text-sm">
                궁금한 점이 있으시면 언제든 문의해 주세요.
              </p>
            </div>
          </div>

          {/* FAQ 섹션 */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#783ae8] mb-8 text-center" style={{ fontFamily: 'SBAggroB' }}>
              자주 묻는 질문
            </h2>
            
            <div className="space-y-2">
              {faqData.map((faq, index) => (
                <FAQItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={openFAQ === index}
                  onToggle={() => toggleFAQ(index)}
                />
              ))}
            </div>
          </div>

          {/* 연락처 정보 */}
          <div 
            className="bg-white p-8 text-center"
            style={{
              boxShadow: '0 3px 0 rgba(120, 58, 232, 0.3)',
              border: '2px solid #8B5CF6',
              borderRadius: '16px',
            }}
          >
            <h3 className="text-2xl font-bold text-purple-800 mb-4">추가 도움이 필요하신가요?</h3>
            <p className="text-gray-700 mb-6">
              위의 FAQ에서 답변을 찾지 못하셨다면 언제든 문의해 주세요.
            </p>
            <div className="bg-purple-50 p-6 rounded-lg">
              <p className="text-gray-700 mb-2"><strong>고객지원 이메일</strong></p>
              <p className="text-purple-600 font-medium">support@quizshow.com</p>
              <p className="text-sm text-gray-600 mt-2">평일 09:00 - 18:00 (주말 및 공휴일 제외)</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Help; 