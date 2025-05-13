/**
 * 세션 참가 코드를 생성하는 유틸리티 함수
 * 6자리 대문자 영문자와 숫자로 구성된 고유 코드 생성
 * Firebase Realtime Database에서 코드 중복 검사 수행
 */
import { ref, get } from 'firebase/database';
import { rtdb } from '../firebase/config';

export const generateSessionCode = async (): Promise<string> => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동될 수 있는 문자(0, O, 1, I) 제외
  let code = '';
  let isUnique = false;
  
  // 고유한 코드가 생성될 때까지 반복
  while (!isUnique) {
    code = '';
    // 6자리 코드 생성
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars[randomIndex];
    }
    
    // Firebase에서 코드 중복 확인
    try {
      const sessionCodeRef = ref(rtdb, `/sessionCodes/${code}`);
      const snapshot = await get(sessionCodeRef);
      
      // 코드가 존재하지 않으면 고유한 코드
      isUnique = !snapshot.exists();
    } catch (error) {
      console.error('세션 코드 검증 오류:', error);
      // 오류 발생 시 기본값으로 고유하다고 가정하고 진행
      isUnique = true;
    }
  }

  return code;
};

/**
 * 현재 시간을 가독성 있는 포맷으로 변환
 */
export const formatTime = (date: Date | string | number): string => {
  const d = new Date(date);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 소요 시간 계산 (밀리초)
 */
export const calculateDuration = (startTime: number, endTime: number): number => {
  return Math.max(0, endTime - startTime);
};

/**
 * 경과 시간을 mm:ss 형식으로 포맷팅
 */
export const formatDuration = (durationMs: number): string => {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}; 