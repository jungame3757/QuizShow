# QuizShow Firebase Functions

Firebase Functions v2를 사용하여 만료된 세션을 자동으로 정리하는 기능을 구현했습니다.

## 구현된 기능

### 1. `cleanupExpiredSessions` (스케줄된 함수)
- **실행 주기**: 매 시간마다 실행 (한국 시간 기준)
- **기능**: 만료된 세션을 자동으로 찾아 정리
- **동작 과정**:
  1. 현재 시간과 비교하여 만료된 세션 탐지
  2. 참가자가 있는 세션은 기록을 Firestore에 저장
  3. 참가자가 없는 세션은 바로 삭제
  4. Realtime Database에서 모든 관련 데이터 삭제

### 2. `cleanupSessionManually` (HTTP 함수)
- **용도**: 테스트 및 수동 관리 목적
- **HTTP 메서드**: POST
- **요청 본문**: `{ "sessionId": "세션ID" }`
- **응답**: 성공/실패 메시지

## SessionContext.cleanupSession과의 일치성

이 Functions는 `src/contexts/SessionContext.tsx`의 `cleanupSession` 함수와 동일한 로직으로 구현되었습니다:

1. **세션 정보 가져오기**: RTDB에서 세션 데이터 조회
2. **참가자 정보 가져오기**: RTDB에서 참가자 데이터 조회
3. **참가자 수 확인**: 0명이면 기록 저장 없이 바로 삭제
4. **퀴즈 데이터 재구성**: RTDB와 Firestore에서 퀴즈 데이터 로드
5. **세션 기록 저장**: Firestore 사용자 하위 컬렉션에 저장
6. **세션 삭제**: RTDB에서 모든 관련 데이터 삭제

## 데이터베이스 구조

### Realtime Database 구조
```
sessions/
  {sessionId}/
    - id, quizId, hostId, code, currentQuestion
    - createdAt, startedAt, endedAt
    - participantCount, expiresAt
    - randomizeQuestions, singleAttempt, questionTimeLimit

participants/
  {sessionId}/
    {userId}/
      - name, score, joinedAt

sessionQuestions/
  {sessionId}/
    {questionIndex}/
      - revealed, startedAt, endedAt

sessionAnswers/
  {sessionId}_question_{questionIndex}/
    {userId}/
      - answer, answeredAt, isCorrect, score

quizData/
  {sessionId}/
    public/        # 클라이언트용 퀴즈 데이터 (정답 제외)
    answers/       # 정답 데이터 (호스트 전용)

sessionCodes/
  {sessionCode} -> sessionId

userSessions/
  {hostId}/
    active/
      {sessionId} -> true
```

### Firestore 구조
```
users/
  {hostId}/
    sessionHistories/
      {historyId}/
        - hostId, title, participantCount
        - startedAt, endedAt
        - quiz (전체 퀴즈 데이터)
        - participants (참가자 정보)
```

## 배포 방법

### 1. 의존성 설치
```bash
cd functions
npm install
```

### 2. 빌드
```bash
npm run build
```

### 3. 배포
```bash
npm run deploy
```

### 4. 로그 확인
```bash
npm run logs
```

## 환경 설정

### Firebase Project 설정
- Firebase Realtime Database와 Firestore가 모두 활성화되어 있어야 합니다
- Functions v2를 지원하는 Blaze 요금제가 필요합니다

### 스케줄러 권한
- Google Cloud Scheduler API가 활성화되어 있어야 합니다
- IAM 권한이 올바르게 설정되어 있어야 합니다

## 테스트 방법

### 수동 세션 정리 테스트
```bash
curl -X POST https://your-region-your-project.cloudfunctions.net/cleanupSessionManually \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "your-session-id"}'
```

### 로그 모니터링
```bash
firebase functions:log
```

## 주의사항

1. **데이터 손실 방지**: 함수 실행 전 데이터를 백업하는 것을 권장합니다
2. **권한 설정**: Functions가 Firestore와 RTDB 모두에 접근할 수 있는 권한이 필요합니다
3. **비용 관리**: 스케줄된 함수는 매시간 실행되므로 비용을 고려해야 합니다
4. **오류 처리**: 개별 세션 정리 실패가 전체 작업을 중단시키지 않도록 설계되었습니다

## 문제 해결

### 빌드 오류
- `skipLibCheck: true` 옵션으로 외부 라이브러리 타입 체크를 건너뜁니다

### 권한 오류
- Firebase IAM 설정을 확인하고 필요한 권한을 부여합니다

### 스케줄러 오류
- Google Cloud Console에서 Cloud Scheduler API 활성화를 확인합니다 