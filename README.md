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
            *   `title`: (String) 진행된 퀴즈의 제목
            *   `startedAt`: (Timestamp) 세션 시작 시간
            *   `endedAt`: (Timestamp) 세션 종료 시간
            *   `participantCount`: (Number) 세션 참여자 수
            *   `quiz`: (Object) 진행된 퀴즈의 전체 데이터. 상세 구조는 다음과 같습니다:
                *   `id`: (String) 퀴즈의 고유 ID
                *   `title`: (String) 퀴즈 제목
                *   `description`: (String, Optional) 퀴즈에 대한 설명
                *   `questions`: (Array) 퀴즈 질문 목록
                    *   `text`: (String) 질문 내용
                    *   `options`: (Array of Strings) 객관식 선택지
                    *   `correctAnswer`: (Number) 정답 선택지의 인덱스
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
    *   `startedAt`: (Number) 세션 시작 시간 (Unix Timestamp)
    *   `endedAt`: (Number) 세션 종료 시간 (Unix Timestamp)
    *   `participantCount`: (Number) 현재 세션 참여자 수
    *   `expiresAt`: (Number) 세션 만료 시간 (Unix Timestamp)
    *   `randomizeQuestions`: (Boolean) 질문 순서 무작위 여부
    *   `singleAttempt`: (Boolean) 참가자 답변 시도 횟수 제한 여부 (한 번만 가능)
    *   `questionTimeLimit`: (Number) 각 질문당 풀이 제한 시간 (초 단위)
    *   `maxParticipants`: (Number) 세션당 최대 참가자 수 (기본값: 50명)

### 세션 설정 옵션

세션 생성 시 사용할 수 있는 옵션들입니다. 모든 옵션은 선택사항이며 기본값이 제공됩니다.

*   `SessionOptions`: 세션 생성 시 전달할 수 있는 설정 옵션
    *   `expiresIn`: (Number, Optional) 세션 유효 기간 (밀리초 단위, 기본값: 24시간)
    *   `randomizeQuestions`: (Boolean, Optional) 질문 순서 무작위 여부 (기본값: false)
    *   `singleAttempt`: (Boolean, Optional) 참가자 답변 시도 횟수 제한 (기본값: true - 한 번만 가능)
    *   `questionTimeLimit`: (Number, Optional) 각 질문당 풀이 제한 시간 (초 단위, 기본값: 30초)
    *   `maxParticipants`: (Number, Optional) 세션당 최대 참가자 수 (기본값: 50명, 최소: 5명)

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

*   `/participants/{sessionId}/{participantId}`: 특정 세션에 참여한 각 참가자의 실시간 정보입니다.
    *   `id`: (String) 참가자 고유 ID (일반적으로 `userId`와 동일)
    *   `name`: (String) 참가자 이름
    *   `joinedAt`: (Number) 세션 참여 시간 (Unix Timestamp)
    *   `isActive`: (Boolean) 현재 참가자의 활성 상태 (예: 세션 참여 시 `true`, 이탈 또는 연결 끊김 시 `false`로 업데이트될 수 있음)
    *   `score`: (Number) 참가자의 현재 누적 점수
    *   `answers`: (Object, Optional) 각 질문 인덱스를 키로 가지며, 해당 질문에 대한 참가자의 답변 정보를 저장합니다. (구조는 아래 `Answer` 타입 참고)
        *   `{questionIndex}`: (Object) `Answer` 타입 객체
            *   `questionIndex`: (Number) 질문의 원본 인덱스
            *   `answerIndex`: (Number) 참여자가 선택한 답변의 인덱스 (시간 초과 시 -1)
            *   `isCorrect`: (Boolean) 정답 여부
            *   `points`: (Number) 해당 답변으로 획득한 점수
            *   `answeredAt`: (Number) 답변 제출 시간 (Unix Timestamp)
    *   `attempts`: (Array of `Attempt` Objects, Optional) 퀴즈 재시도 시 이전 시도 기록을 저장합니다.
        *   `Attempt` 객체 구조:
            *   `answers`: (Object) 해당 시도의 `answers` 객체 (위 `answers` 구조와 동일)
            *   `score`: (Number) 해당 시도에서 얻은 총 점수
            *   `completedAt`: (Number) 해당 시도 완료 시간 (Unix Timestamp)
    *   참고: 클라이언트 측 `RealtimeParticipant` 인터페이스에는 `quizId` 필드가 있을 수 있으나, 이는 RTDB 저장 시점에 해당 객체 내에 직접 포함되지 않을 수 있습니다.

---

**참고:**

*   위 구조는 현재 코드 분석을 통해 파악된 내용이며, 실제 구현과 약간의 차이가 있을 수 있습니다.
*   `Timestamp`는 Firestore의 타임스탬프 객체를, `Unix Timestamp`는 숫자 형태의 타임스탬프(밀리초)를 의미할 수 있습니다.
*   일부 RTDB 경로는 `sessionService.ts` 등의 파일에서 동적으로 생성될 수 있습니다.
*   **참가자 수 제한**: 세션당 최대 50명까지 참가할 수 있으며, 호스트가 5명~50명 사이에서 조정 가능합니다. 제한 초과 시 새로운 참가자는 적절한 오류 메시지와 함께 참가가 거부됩니다. 