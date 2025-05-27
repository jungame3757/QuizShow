import React, { useState } from 'react';
import { Settings, Clock, Eye, CalendarClock, Shuffle, UserCheck, Plus, Minus, Users } from 'lucide-react';
import { Quiz } from '../../../types';

// 세션 설정 타입 정의
export interface SessionSettings {
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
  quiz?: Quiz;
}

// 세션 설정 컴포넌트
const SessionSettingsFrame: React.FC<SessionSettingsFrameProps> = ({ settings, setSettings, isLoading, quiz }) => {
  // 탭 상태 관리
  const [activeTab, setActiveTab] = useState<'settings' | 'preview'>('settings');

  // 퀴즈에 문제가 있는지 확인하는 헬퍼 함수
  const hasQuestions = () => {
    return quiz && quiz.questions && Array.isArray(quiz.questions) && quiz.questions.length > 0;
  };
  
  // 만료 시간 표시 함수
  const formatExpiryTime = (milliseconds: number): string => {
    const hours = milliseconds / (60 * 60 * 1000);
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.floor(hours % 24);
      if (remainingHours === 0) {
        return `${days}일`;
      }
      return `${days}일 ${remainingHours}시간`;
    }
    
    return `${Math.floor(hours)}시간`;
  };
  
  // 만료 시간 업데이트 함수
  const updateExpiryTime = (increment: boolean) => {
    const currentHours = settings.expiresIn / (60 * 60 * 1000);
    let newHours;
    
    if (increment) {
      // 증가 로직
      if (currentHours < 12) {
        // 12시간 미만: 1시간씩 증가
        newHours = currentHours + 1;
      } else if (currentHours < 24) {
        // 12~24시간: 12시간씩 증가
        newHours = 24;
      } else {
        // 24시간 이상: 24시간(1일)씩 증가
        newHours = Math.min(168, currentHours + 24); // 최대 7일(168시간)
      }
    } else {
      // 감소 로직
      if (currentHours > 24) {
        // 24시간 초과: 24시간(1일)씩 감소
        newHours = currentHours - 24;
      } else if (currentHours > 12) {
        // 12~24시간: 12시간씩 감소
        newHours = 12;
      } else {
        // 12시간 이하: 1시간씩 감소, 최소 1시간
        newHours = Math.max(1, currentHours - 1);
      }
    }
    
    setSettings({...settings, expiresIn: newHours * 60 * 60 * 1000});
  };
  
  // 문제 시간 업데이트 함수
  const updateQuestionTime = (increment: boolean) => {
    const currentSeconds = settings.questionTimeLimit;
    let newSeconds;
    
    if (increment) {
      // 5초씩 증가, 최대 60초
      newSeconds = Math.min(60, currentSeconds + 5);
    } else {
      // 5초씩 감소, 최소 10초
      newSeconds = Math.max(10, currentSeconds - 5);
    }
    
    setSettings({...settings, questionTimeLimit: newSeconds});
  };

  // 시간 조작 버튼 컴포넌트 - 공통 스타일 적용
  const TimeControlButton = ({ 
    onClick, 
    disabled = false, 
    color = "purple", 
    icon 
  }: { 
    onClick: () => void, 
    disabled?: boolean, 
    color?: "purple" | "blue", 
    icon: "plus" | "minus" 
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-full
        text-gray-500 hover:text-${color}-600 hover:bg-${color}-50
        focus:outline-none disabled:opacity-50 transition-colors
      `}
    >
      {icon === "plus" ? <Plus size={16} /> : <Minus size={16} />}
    </button>
  );

  // 설정 탭 렌더링
  const renderSettingsTab = () => {
    return (
      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {/* 설정 카드들 */}
          <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 grid gap-3 sm:gap-4">
            {/* 만료 기간 설정 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-nowrap">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 text-purple-600 mr-2">
                  <CalendarClock size={18} />
                </div>
                <span className="font-medium whitespace-nowrap">만료 기간</span>
              </div>
              
              <div className="flex items-center space-x-1 sm:space-x-2">
                <TimeControlButton 
                  onClick={() => updateExpiryTime(false)}
                  disabled={isLoading || settings.expiresIn <= 60 * 60 * 1000}
                  color="purple"
                  icon="minus"
                />
                <div className="w-[60px] sm:w-[75px] text-center font-medium text-sm sm:text-base">
                  {formatExpiryTime(settings.expiresIn)}
                </div>
                <TimeControlButton 
                  onClick={() => updateExpiryTime(true)}
                  disabled={isLoading || settings.expiresIn >= 7 * 24 * 60 * 60 * 1000}
                  color="purple"
                  icon="plus"
                />
              </div>
            </div>

            {/* 구분선 */}
            <div className="border-t border-gray-100"></div>

            {/* 문제 시간 설정 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-nowrap">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 text-blue-600 mr-2">
                  <Clock size={18} />
                </div>
                <span className="font-medium whitespace-nowrap">문제 시간</span>
              </div>
              
              <div className="flex items-center space-x-1 sm:space-x-2">
                <TimeControlButton 
                  onClick={() => updateQuestionTime(false)}
                  disabled={isLoading || settings.questionTimeLimit <= 10}
                  color="blue"
                  icon="minus"
                />
                <div className="w-[60px] sm:w-[75px] text-center font-medium text-sm sm:text-base">
                  {settings.questionTimeLimit}초
                </div>
                <TimeControlButton 
                  onClick={() => updateQuestionTime(true)}
                  disabled={isLoading || settings.questionTimeLimit >= 60}
                  color="blue"
                  icon="plus"
                />
              </div>
            </div>

            {/* 구분선 */}
            <div className="border-t border-gray-100"></div>

            {/* 추가 설정 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* 문제 무작위 출제 */}
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 text-green-600 mr-2 sm:mr-3">
                  <Shuffle size={16} className="sm:h-[18px] sm:w-[18px]" />
                </div>
                <span className="font-medium flex-grow whitespace-nowrap text-sm sm:text-base">문제 랜덤 출제</span>
                <div className="relative inline-block w-10 h-6 ml-2">
                  <input
                    type="checkbox"
                    id="randomize"
                    className="opacity-0 w-0 h-0"
                    checked={settings.randomizeQuestions}
                    onChange={(e) => setSettings({...settings, randomizeQuestions: e.target.checked})}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="randomize"
                    className={`
                      absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full
                      transition-colors duration-200 ease-in-out
                      ${settings.randomizeQuestions ? 'bg-green-500' : 'bg-gray-300'}
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <span
                      className={`
                        absolute left-0.5 bottom-0.5 bg-white w-5 h-5 rounded-full
                        transition-transform duration-200 ease-in-out
                        ${settings.randomizeQuestions ? 'transform translate-x-4' : ''}
                      `}
                    ></span>
                  </label>
                </div>
              </div>

              {/* 참가 횟수 제한 */}
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-100 text-amber-600 mr-2 sm:mr-3">
                  <UserCheck size={16} className="sm:h-[18px] sm:w-[18px]" />
                </div>
                <span className="font-medium flex-grow whitespace-nowrap text-sm sm:text-base">한 번만 참가</span>
                <div className="relative inline-block w-10 h-6 ml-2">
                  <input
                    type="checkbox"
                    id="singleAttempt"
                    className="opacity-0 w-0 h-0"
                    checked={settings.singleAttempt}
                    onChange={(e) => setSettings({...settings, singleAttempt: e.target.checked})}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="singleAttempt"
                    className={`
                      absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full
                      transition-colors duration-200 ease-in-out
                      ${settings.singleAttempt ? 'bg-amber-500' : 'bg-gray-300'}
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <span
                      className={`
                        absolute left-0.5 bottom-0.5 bg-white w-5 h-5 rounded-full
                        transition-transform duration-200 ease-in-out
                        ${settings.singleAttempt ? 'transform translate-x-4' : ''}
                      `}
                    ></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 문제 미리보기 탭 렌더링
  const renderPreviewTab = () => {
    // 질문 데이터가 없으면 빈 배열 반환하도록 안전하게 처리
    const questions = hasQuestions() ? quiz!.questions : [];

    return (
      <div className="p-3 sm:p-4">
        {!hasQuestions() ? (
          <div className="text-center py-10 sm:py-12 bg-white rounded-xl shadow-sm text-gray-500 flex flex-col items-center">
            <Eye size={32} className="text-gray-400 mb-2" />
            <span>등록된 문제가 없습니다</span>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {questions.map((question, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
                <div className="mb-3">
                  <div className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md mb-2">문제 {index + 1}</div>
                  <div className="font-bold text-gray-800 mb-3">{question.text}</div>
                </div>
                
                <div className="space-y-2">
                  {question.options && Array.isArray(question.options) ? question.options.map((option, optionIndex) => (
                    <div 
                      key={optionIndex} 
                      className={`relative border rounded-lg p-2 sm:p-3 transition-colors
                        ${optionIndex === question.correctAnswer 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center">
                        <div className={`
                          w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center mr-2 text-xs font-bold
                          ${optionIndex === question.correctAnswer ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}
                        `}>
                          {optionIndex + 1}
                        </div>
                        <span className="text-xs sm:text-sm">{option}</span>
                        {optionIndex === question.correctAnswer && (
                          <div className="ml-auto bg-green-100 text-green-800 text-xs px-2 py-0.5 sm:py-1 rounded-full">
                            정답
                          </div>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-gray-500">
                      보기 목록을 불러올 수 없습니다
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-gray-50 rounded-xl shadow-sm overflow-hidden">
      <div className="flex bg-white border-b border-gray-100">
        <button
          className={`
            flex-1 py-2 sm:py-3 px-3 sm:px-4 text-center font-medium transition-colors
            ${activeTab === 'settings' ? 
              'text-purple-700 border-b-2 border-purple-500 bg-purple-50' : 
              'text-gray-600 hover:text-purple-700 hover:bg-gray-50'}
          `}
          onClick={() => setActiveTab('settings')}
          aria-label="퀴즈 규칙"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center">
            <Settings size={16} className="sm:h-[18px] sm:w-[18px] sm:mr-2" /> 
            <span className="text-xs sm:text-base mt-1 sm:mt-0">퀴즈 규칙</span>
          </div>
        </button>
        <button
          className={`
            flex-1 py-2 sm:py-3 px-3 sm:px-4 text-center font-medium transition-colors
            ${activeTab === 'preview' ? 
              'text-purple-700 border-b-2 border-purple-500 bg-purple-50' : 
              'text-gray-600 hover:text-purple-700 hover:bg-gray-50'}
          `}
          onClick={() => setActiveTab('preview')}
          aria-label="문제 미리보기"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center">
            <Eye size={16} className="sm:h-[18px] sm:w-[18px] sm:mr-2" /> 
            <span className="text-xs sm:text-base mt-1 sm:mt-0">문제 미리보기</span>
          </div>
        </button>
      </div>

      {activeTab === 'settings' && renderSettingsTab()}
      {activeTab === 'preview' && renderPreviewTab()}
    </div>
  );
};

export default SessionSettingsFrame; 