import React from 'react';
import { Quiz } from '../../types';
import { Session, RealtimeParticipant } from '../../types';

interface RoguelikeGameStartProps {
  quiz: Quiz;
  onStartGame: () => void;
  onBack: () => void;
  currentSession?: Session | null;
  participants?: Record<string, RealtimeParticipant>;
  creatingSession?: boolean;
  sessionCreated?: boolean;
  isCopied?: boolean;
  onCopyInviteCode?: () => void;
  onCopyInviteUrl?: () => void;
}

const RoguelikeGameStart: React.FC<RoguelikeGameStartProps> = ({
  quiz,
  onStartGame,
  onBack,
  currentSession,
  participants = {},
  creatingSession = false,
  isCopied = false,
  onCopyInviteCode,
  onCopyInviteUrl
}) => {
  const getQuestionCounts = () => {
    const multipleChoice = quiz.questions.filter(q => q.type === 'multiple-choice').length;
    const shortAnswer = quiz.questions.filter(q => q.type === 'short-answer').length;
    const opinion = quiz.questions.filter(q => q.type === 'opinion').length;
    
    return { multipleChoice, shortAnswer, opinion };
  };

  const { multipleChoice, shortAnswer, opinion } = getQuestionCounts();
  const participantCount = Object.keys(participants).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎮</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">로그라이크 퀴즈 모험</h1>
            <p className="text-gray-600">새로운 퀴즈 경험을 만나보세요!</p>
          </div>

          {/* 퀴즈 정보 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6 border border-blue-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{quiz.title}</h2>
            {quiz.description && (
              <p className="text-gray-600 mb-4">{quiz.description}</p>
            )}
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-white rounded-lg p-3">
                <div className="text-2xl font-bold text-blue-600">{multipleChoice}</div>
                <div className="text-sm text-gray-600">기본 문제</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-2xl font-bold text-purple-600">{shortAnswer}</div>
                <div className="text-sm text-gray-600">엘리트 문제</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-2xl font-bold text-orange-600">{opinion}</div>
                <div className="text-sm text-gray-600">의견 문제</div>
              </div>
            </div>
          </div>

          {/* 세션 정보 및 초대 */}
          {currentSession && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 mb-6 border border-green-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🎯 멀티플레이 세션</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">초대 코드</div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-green-600">{currentSession.code}</span>
                    <button
                      onClick={onCopyInviteCode}
                      className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                    >
                      {isCopied ? '복사됨!' : '복사'}
                    </button>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">참가자 수</div>
                  <div className="text-2xl font-bold text-blue-600">{participantCount}명</div>
                </div>
              </div>
              
              <button
                onClick={onCopyInviteUrl}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {isCopied ? '초대 링크 복사됨!' : '초대 링크 복사'}
              </button>
            </div>
          )}

          {/* 게임 설명 */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">🎮 게임 방식</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start">
                <span className="text-blue-500 mr-2">🎯</span>
                <span><strong>기본 스테이지:</strong> 객관식 문제를 풀고 보상 상자를 획득하세요</span>
              </div>
              <div className="flex items-start">
                <span className="text-purple-500 mr-2">⚔️</span>
                <span><strong>엘리트 스테이지:</strong> 주관식 문제 3개를 연속으로 맞춰 고급 보상 상자를 획득하세요</span>
              </div>
              <div className="flex items-start">
                <span className="text-orange-500 mr-2">🔥</span>
                <span><strong>모닥불 스테이지:</strong> 의견을 나누고 특별한 버프를 획득하세요</span>
              </div>
              <div className="flex items-start">
                <span className="text-green-500 mr-2">🎰</span>
                <span><strong>룰렛 스테이지:</strong> 최종 보너스 점수를 결정하세요</span>
              </div>
              <div className="flex items-start">
                <span className="text-yellow-500 mr-2">💰</span>
                <span><strong>점수 획득:</strong> 보상 상자를 통해서만 점수를 얻을 수 있습니다!</span>
              </div>
            </div>
          </div>

          {/* 버튼 영역 */}
          <div className="flex space-x-4">
            <button
              onClick={onBack}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              돌아가기
            </button>
            <button
              onClick={onStartGame}
              disabled={creatingSession}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creatingSession ? '세션 생성 중...' : '모험 시작!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoguelikeGameStart; 