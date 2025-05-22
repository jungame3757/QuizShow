# 퀴즈 애플리케이션 데이터베이스 구조

이 문서는 퀴즈 애플리케이션의 Firebase Firestore 및 Realtime Database(RTDB) 데이터 구조를 설명합니다.

## Firebase Firestore

Firestore는 주로 정적인 데이터와 사용자 관련 정보를 저장합니다.

### 사용자 컬렉션

*   `/users/{userId}`: 사용자 계정 정보를 저장하는 문서입니다.
    *   **하위 컬렉션:**
        *   `/users/{userId}/quizzes/{quizId}`: 해당 사용자가 생성한 퀴즈 목록입니다.
            *   `title`: (String) 퀴즈 제목
            *   `description`: (String, Optional) 퀴즈에 대한 설명
            *   `questions`: (Array) 퀴즈 질문 목록
                *   `text`: (String) 질문 내용
                *   `options`: (Array of Strings) 객관식 선택지
                *   `correctAnswer`: (Number) 정답 선택지의 인덱스
            *   `createdAt`: (Timestamp) 퀴즈 생성 시간
            *   `updatedAt`: (Timestamp) 퀴즈 마지막 수정 시간
        *   `/users/{userId}/sessionHistories/{historyId}`: 해당 사용자가 호스트한 퀴즈 세션의 기록입니다.
            *   `hostId`: (String) 세션을 호스트한 사용자 ID
            *   `title`: (String) 진행된 퀴즈의 제목
            *   `startedAt`: (Timestamp) 세션 시작 시간
            *   `endedAt`: (Timestamp) 세션 종료 시간
            *   `participantCount`: (Number) 세션 참여자 수
            *   `quiz`: (Object) 진행된 퀴즈의 전체 데이터 (`/users/{userId}/quizzes/{quizId}` 구조와 유사)
            *   `participants`: (Object) 세션 참여자 정보 (Key: 참여자 ID)
                *   `id`: (String) 참여자 고유 ID
                *   `name`: (String) 참여자 이름
                *   `joinedAt`: (Number) 세션 참여 시간 (Timestamp)
                *   `score`: (Number) 참여자 최종 점수
                *   `attempts`: (Array, Optional) 참여자의 답변 시도 기록
                    *   `answers`: (Object, Key: 질문 인덱스) 각 질문에 대한 답변 정보
                        *   `questionIndex`: (Number) 질문의 인덱스
                        *   `answerIndex`: (Number) 참여자가 선택한 답변의 인덱스
                        *   `isCorrect`: (Boolean) 정답 여부
                        *   `points`: (Number) 해당 답변으로 획득한 점수
                        *   `answeredAt`: (Number) 답변 제출 시간 (Timestamp)
                    *   `score`: (Number) 해당 시도에서 얻은 총 점수
                    *   `completedAt`: (Number) 해당 시도 완료 시간 (Timestamp)

### 공개 퀴즈 컬렉션

*   `/publicQuizzes/{quizId}`: 공개적으로 접근 가능한 퀴즈 목록입니다. (현재는 읽기만 가능하며, 생성/수정은 제한됩니다.)
    *   구조는 `/users/{userId}/quizzes/{quizId}`와 동일합니다.

### 세션 메타데이터 컬렉션

*   `/sessions/{sessionId}`: 실시간 세션(RTDB)에 대한 메타데이터 및 Firestore와의 동기화를 위한 정보를 저장할 수 있습니다. (주로 RTDB의 세션 정보를 가리키는 역할로 보임)
    *   `hostId`: (String) 세션 호스트의 사용자 ID
    *   (기타 필드는 RTDB의 `/sessions/{sessionId}` 데이터와 동기화될 수 있습니다.)

## Firebase Realtime Database (RTDB)

RTDB는 실시간으로 동기화되어야 하는 세션 관련 데이터를 주로 처리합니다.

### 세션 정보

*   `/sessions/{sessionId}`: 진행 중인 실시간 퀴즈 세션의 상세 정보입니다.
    *   `id`: (String) 세션의 고유 ID
    *   `quizId`: (String) 해당 세션에서 사용되는 퀴즈의 ID (Firestore의 퀴즈 ID)
    *   `hostId`: (String) 세션을 호스트하는 사용자의 ID
    *   `code`: (String) 참가자들이 세션에 참여하기 위한 고유 코드
    *   `currentQuestion`: (Number) 현재 진행 중인 질문의 인덱스
    *   `createdAt`: (Number) 세션 생성 시간 (Unix Timestamp)
    *   `startedAt`: (Number, Nullable) 세션 시작 시간 (Unix Timestamp)
    *   `endedAt`: (Number, Nullable) 세션 종료 시간 (Unix Timestamp)
    *   `participantCount`: (Number) 현재 세션 참여자 수
    *   `expiresAt`: (Number) 세션 만료 시간 (Unix Timestamp)
    *   `randomizeQuestions`: (Boolean) 질문 순서 무작위 여부
    *   `singleAttempt`: (Boolean) 참가자 답변 시도 횟수 제한 여부 (한 번만 가능)
    *   `questionTimeLimit`: (Number) 각 질문당 풀이 제한 시간 (초 단위)

### 세션 코드 인덱스

*   `/sessionCodes/{sessionCode}`: (String) 세션 참여 코드를 실제 세션 ID로 매핑합니다. (Value: `sessionId`)

### 사용자 활성 세션

*   `/userSessions/{userId}/active/{sessionId}`: (Boolean) 특정 사용자가 현재 활성 상태로 가지고 있는 세션 ID를 표시합니다. (Value: `true`)

### 세션용 퀴즈 데이터

*   `/quizData/{sessionId}`: 특정 세션 진행에 필요한 퀴즈 데이터를 저장합니다.
    *   `/public`: (Object) 클라이언트(참가자)에게 보여줄 퀴즈 데이터 (정답 제외)
        *   `title`: (String) 퀴즈 제목
        *   `description`: (String, Optional) 퀴즈 설명
        *   `questions`: (Array) 질문 목록
            *   `text`: (String) 질문 내용
            *   `options`: (Array of Strings) 선택지
    *   `/answers`: (Array) 호스트 및 정답 확인을 위한 정답 데이터
        *   `questionIndex`: (Number) 질문 인덱스
        *   `correctAnswer`: (Number) 해당 질문의 정답 인덱스

### 세션 참여자 정보

*   `/sessionParticipants/{sessionId}/{participantId}`: 특정 세션에 참여한 각 참가자의 실시간 정보입니다.
    *   `id`: (String) 참가자 고유 ID
    *   `name`: (String) 참가자 이름
    *   `joinedAt`: (Number) 세션 참여 시간 (Unix Timestamp)
    *   `isActive`: (Boolean) 현재 참가자의 활성 상태
    *   `score`: (Number) 참가자의 현재 누적 점수

### 세션 질문 상태 (구조 추정)

*   `/sessionQuestionStatus/{sessionId}/{questionIndex}`: 특정 세션의 각 질문 진행 상태를 나타냅니다.
    *   `revealed`: (Boolean) 해당 질문이 참가자에게 공개되었는지 여부
    *   `startedAt`: (Number, Nullable) 질문 시작 시간 (Unix Timestamp)
    *   `endedAt`: (Number, Nullable) 질문 종료 시간 (Unix Timestamp)

### 세션 답변 정보 (구조 추정)

*   `/sessionAnswers/{sessionId}/{questionIndex}/{userId}`: 특정 세션의 각 질문에 대한 사용자별 답변 정보입니다.
    *   `answer`: (String) 사용자가 선택한 답변
    *   `answeredAt`: (Number) 답변 제출 시간 (Unix Timestamp)
    *   `isCorrect`: (Boolean) 정답 여부
    *   `score`: (Number) 해당 답변으로 획득한 점수

---

**참고:**

*   위 구조는 현재 코드 분석을 통해 파악된 내용이며, 실제 구현과 약간의 차이가 있을 수 있습니다.
*   `Timestamp`는 Firestore의 타임스탬프 객체를, `Unix Timestamp`는 숫자 형태의 타임스탬프(밀리초)를 의미할 수 있습니다.
*   일부 RTDB 경로는 `sessionService.ts` 등의 파일에서 동적으로 생성될 수 있습니다. 