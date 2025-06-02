import React, { useState, useEffect } from 'react';
import { Trophy, CheckCircle, XCircle, ChevronDown, ChevronUp, Copy, Check, LinkIcon } from 'lucide-react';
import QRCode from 'react-qr-code';
import { QuestionType } from '../../../types';

// Realtime Database의 참가자 구조에 맞는 타입 정의
interface RealtimeParticipant {
  id: string;
  name: string;
  score: number;
  isActive: boolean;
  joinedAt: number;
  quizId?: string;
  answers?: Record<string, {
    questionIndex: number;
    answerIndex?: number; // 객관식용
    answerText?: string; // 주관식/의견용
    answer?: string; // 호환성을 위한 필드
    isCorrect: boolean;
    points: number;
    answeredAt: number;
  }>;
}

interface ParticipantListProps {
  participants: Record<string, RealtimeParticipant>;
  quiz?: {
    questions: Array<{
      text: string;
      type?: QuestionType;
      options?: string[];
      correctAnswer?: number;
    }>;
  };
  // 초대 관련 props 추가
  sessionCode?: string;
  qrValue?: string;
  isCopied?: boolean;
  onCopySessionCode?: () => void;
  onCopyJoinUrl?: () => void;
  isSessionExpired?: boolean; // 세션 만료 여부 추가
  currentSession?: any; // 세션 정보 추가
}

const ParticipantList: React.FC<ParticipantListProps> = ({ 
  participants, 
  quiz, 
  sessionCode = "", 
  qrValue = "", 
  isCopied = false,
  onCopySessionCode = () => {}, 
  onCopyJoinUrl = () => {},
  isSessionExpired = false,
  currentSession
}) => {
  // 상세 정보를 확장할 참가자 ID 추적
  const [expandedParticipantId, setExpandedParticipantId] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  // Object를 배열로 변환하고 점수 순으로 정렬
  const participantArray = Object.values(participants);
  
  // 점수 내림차순 정렬
  const sortedParticipants = participantArray.sort((a, b) => b.score - a.score);

  // 확장된 참가자가 여전히 존재하는지 확인하고, 없으면 상태 초기화
  useEffect(() => {
    if (expandedParticipantId) {
      const participantExists = participants[expandedParticipantId];
      if (!participantExists) {
        setExpandedParticipantId(null);
      }
    }
  }, [participants, expandedParticipantId]);

  // 답변 확장/접기 토글
  const toggleExpand = (participantId: string) => {
    if (expandedParticipantId === participantId) {
      setExpandedParticipantId(null);
    } else {
      setExpandedParticipantId(participantId);
    }
  };

  // 특정 참가자의 답변 목록 렌더링
  const renderAnswers = (participant: RealtimeParticipant) => {
    if (!participant.answers || Object.keys(participant.answers).length === 0) {
      return <p className="text-gray-500 text-sm py-2">아직 답변이 없습니다.</p>;
    }

    // 답변을 문제 인덱스 오름차순으로 정렬
    const sortedAnswers = Object.values(participant.answers)
      .sort((a, b) => a.questionIndex - b.questionIndex);

    return (
      <div className="space-y-2 py-2">
        {sortedAnswers.map((answer) => {
          const questionNumber = answer.questionIndex + 1;
          const question = quiz?.questions[answer.questionIndex];
          const questionText = question?.text || `문제 ${questionNumber}`;
          const questionType = question?.type || 'multiple-choice';
          
          // 선택한 답변 텍스트 가져오기
          let selectedAnswer = '';
          
          if (questionType === 'multiple-choice') {
            // 객관식 처리
            const answerIndex = answer.answerIndex ?? (answer.answer ? parseInt(answer.answer) : -1);
            if (answerIndex >= 0 && question?.options && answerIndex < question.options.length) {
              selectedAnswer = `${answerIndex + 1}. ${question.options[answerIndex]}`;
            } else {
              selectedAnswer = `선택지 ${answerIndex + 1}`;
            }
          } else {
            // 주관식/의견 수집 처리
            selectedAnswer = answer.answerText || answer.answer || '답변 없음';
          }

          return (
            <div key={answer.questionIndex} className="bg-white rounded-lg p-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1 mr-3">
                  <p className="font-medium text-gray-700 mb-1">
                    {questionNumber}. {questionText}
                  </p>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">
                      {questionType === 'multiple-choice' ? '선택한 답변: ' : 
                       questionType === 'short-answer' ? '제출한 답변: ' : 
                       '의견: '}
                    </span>
                    <span className="break-words">{selectedAnswer}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  {questionType === 'opinion' ? (
                    <div className="flex items-center text-blue-600">
                      <CheckCircle size={16} className="mr-1" />
                      <span className="font-medium">참여</span>
                    </div>
                  ) : answer.isCorrect ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle size={16} className="mr-1" />
                      <span className="font-medium">정답</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600">
                      <XCircle size={16} className="mr-1" />
                      <span className="font-medium">오답</span>
                    </div>
                  )}
                  <p className="text-sm text-purple-600 font-medium mt-1">
                    +{answer.points} 점
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 초대 섹션 렌더링 - 만료된 경우 표시하지 않음
  const renderInviteSection = () => {
    // 세션이 만료되었거나 세션 코드가 없는 경우 표시하지 않음
    if (isSessionExpired || !sessionCode) return null;
    
    const maxParticipants = currentSession?.maxParticipants || 50;
    const isRoguelikeMode = currentSession?.gameMode === 'roguelike';
    
    return (
      <div className="mb-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-semibold text-gray-800">
            참가자 초대 및 목록
            <span className="ml-2 text-base font-normal text-gray-500">
              (총 {sortedParticipants.length}/{maxParticipants}명)
            </span>
          </h3>
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-3 mb-5">
          <div 
            className="flex justify-center cursor-pointer relative group w-full md:w-2/5"
            onClick={() => setShowQRModal(true)}
          >
            {qrValue ? (
              <div className="relative">
                <QRCode 
                  value={qrValue}
                  size={160}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
                <div className="absolute inset-0 bg-black bg-opacity-10 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-medium rounded transition-opacity">
                </div>
                <p className="text-center text-xs text-gray-500 mt-1">클릭하여 크게보기</p>
              </div>
            ) : (
              <p className="text-gray-500">QR 코드를 생성할 수 없습니다.</p>
            )}
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg w-full md:w-3/5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-xs text-gray-500 mb-0.5">참가 코드</p>
                  <div className="flex items-center bg-white py-1.5 px-3 rounded-lg border border-purple-200">
                    <span className="text-2xl font-bold tracking-wider text-purple-700 flex-grow">{sessionCode}</span>
                    <button
                      onClick={onCopySessionCode}
                      className="p-1.5 ml-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md transition-colors"
                      title="코드 복사"
                    >
                      {isCopied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center">
                  <button
                    onClick={onCopyJoinUrl}
                    className="flex items-center justify-center px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors w-full"
                  >
                    <LinkIcon size={14} className="mr-2" />
                    초대 링크 복사
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 mb-4"></div>
      </div>
    );
  };

  return (
    <div>
      {/* 초대 섹션 */}
      {renderInviteSection()}

      {/* 만료된 경우 안내 메시지 표시 */}
      {isSessionExpired && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-5">
          <h3 className="text-lg font-semibold text-orange-800 mb-1">이 활동은 만료되었습니다</h3>
          <p className="text-orange-700">
            새로운 참가자는 더 이상 참여할 수 없지만, 기존 참가자 데이터는 계속 확인할 수 있습니다.
          </p>
        </div>
      )}

      {/* 참가자 목록 헤더 - 만료된 경우에도 표시 */}
      {!renderInviteSection() && !isSessionExpired && (
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-800">
            참가자 목록
            <span className="ml-2 text-base font-normal text-gray-500">
              (총 {sortedParticipants.length}/{currentSession?.maxParticipants || 50}명)
            </span>
          </h3>
        </div>
      )}

      {/* 참가자 목록 섹션 */}
      {sortedParticipants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          아직 참가자가 없습니다
        </div>
      ) : (
        <div className="space-y-3">
          {sortedParticipants.map((participant, index) => {
            // 답변 진행 상황 계산
            const totalAnswers = participant.answers ? Object.keys(participant.answers).length : 0;
            const correctAnswers = participant.answers 
              ? Object.values(participant.answers).filter(a => a.isCorrect).length
              : 0;

            const isExpanded = expandedParticipantId === participant.id;

            return (
              <div 
                key={participant.id}
                className={`
                  rounded-xl transition-all
                  ${index === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'}
                  ${isExpanded ? 'shadow-md' : 'hover:scale-102'}
                `}
              >
                <div 
                  className="flex items-center justify-between p-3 cursor-pointer"
                  onClick={() => toggleExpand(participant.id)}
                >
                  <div className="flex items-center">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3
                      ${index === 0 ? 'bg-yellow-400 text-white' : 
                        index === 1 ? 'bg-gray-400 text-white' : 
                        index === 2 ? 'bg-amber-600 text-white' : 
                        'bg-purple-100 text-purple-700'}
                    `}>
                      {index < 3 ? <Trophy size={16} /> : index + 1}
                    </div>
                    <div>
                      <div className="font-medium">
                        {participant.name}
                        {totalAnswers > 0 && (
                          <span className="ml-2 text-sm text-gray-500">
                            ({correctAnswers}/{totalAnswers})
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(participant.joinedAt).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} 참여
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="font-bold text-lg text-purple-700 mr-3">
                      {participant.score}
                    </div>
                    {isExpanded ? 
                      <ChevronUp size={18} className="text-gray-500" /> : 
                      <ChevronDown size={18} className="text-gray-500" />}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-gray-200 mt-1">
                    {renderAnswers(participant)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* QR 코드 모달 */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowQRModal(false)}>
          <div className="bg-white p-6 rounded-xl max-w-xl w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-gray-800 mb-3">QR 코드</h3>
            <div className="p-4 bg-white flex justify-center">
              <QRCode 
                value={qrValue}
                size={350}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
            </div>
            <div className="mt-4 text-center">
              <button 
                className="px-5 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                onClick={() => setShowQRModal(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantList; 