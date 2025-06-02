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
            *   `ownerId`: (String) 퀴즈 소유자의 사용자 ID
            *   `isActive`: (Boolean, Optional) 퀴즈 활성 상태 (기본값: true)
            *   `isPublic`: (Boolean, Optional) 퀴즈 공개 여부 (기본값: false)
            *   `questions`: (Array) 퀴즈 질문 목록
                *   `id`: (String) 질문의 고유 ID
                *   `type`: (String) 질문 형식 ('multiple-choice' | 'short-answer' | 'opinion')
                *   `text`: (String) 질문 내용
                *   **객관식 (`type: 'multiple-choice'`) 전용 필드:**
                    *   `options`: (Array of Strings) 객관식 선택지
                    *   `correctAnswer`: (Number) 정답 선택지의 인덱스
                *   **주관식 (`type: 'short-answer'`) 전용 필드:**
                    *   `correctAnswerText`: (String) 주요 정답
                    *   `additionalAnswers`: (Array of Strings, Optional) 추가 정답들
                    *   `answerMatchType`: (String) 정답 인정 방식 ('exact' | 'contains')
                *   **의견 수집 (`type: 'opinion'`) 전용 필드:**
                    *   `isAnonymous`: (Boolean) 익명 수집 여부
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
                *   `questions`: (Array) 퀴즈 질문 목록 (위 질문 구조와 동일)
            *   `participants`: (Object) 세션 참여자 정보 (Key: 참여자 ID)
                *   `id`: (String) 참여자 고유 ID
                *   `name`: (String) 참여자 이름
                *   `joinedAt`: (Number) 세션 참여 시간 (Timestamp)
                *   `score`: (Number) 참여자 최종 점수
                *   `attempts`: (Array, Optional) 참여자의 답변 시도 기록
                    *   `answers`: (Object, Key: 질문 인덱스) 각 질문에 대한 답변 정보
                        *   `questionIndex`: (Number) 질문의 인덱스
                        *   `answerIndex`: (Number, Optional) 객관식: 참여자가 선택한 답변의 인덱스
                        *   `answerText`: (String, Optional) 주관식/의견: 참여자가 입력한 답변 텍스트
                        *   `isCorrect`: (Boolean) 정답 여부 (의견 수집은 항상 true)
                        *   `points`: (Number) 해당 답변으로 획득한 점수 (의견 수집은 0점)
                        *   `answeredAt`: (Number) 답변 제출 시간 (Unix Timestamp)
                    *   `score`: (Number) 해당 시도에서 얻은 총 점수
                    *   `completedAt`: (Number) 해당 시도 완료 시간 (Unix Timestamp)

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

*   `/userSessions/{userId}/active/{sessionId}`: (Boolean) **호스트**가 현재 활성 상태로 가지고 있는 세션 ID를 표시합니다. (Value: `true`)
    *   **주의**: 참가자는 userSessions에 추가되지 않습니다. 호스트만 추가됩니다.
    *   **용도**: 
        *   호스트의 활성 세션 빠른 조회 (`getSessionsByHostId` 함수 최적화)
        *   세션 정리 시 호스트별 데이터 정리
        *   호스트의 활성 세션 개수 확인
        *   특정 퀴즈에 대한 활성 세션 존재 여부 확인

### 세션용 퀴즈 데이터

*   `/quizData/{sessionId}`: 특정 세션 진행에 필요한 퀴즈 데이터를 저장합니다.
    *   `/public`: (Object) 클라이언트(참가자)에게 보여줄 퀴즈 데이터 (정답 제외)
        *   `title`: (String) 퀴즈 제목
        *   `description`: (String, Optional) 퀴즈 설명
        *   `questions`: (Array) 질문 목록
            *   `id`: (String) 질문 고유 ID
            *   `type`: (String) 질문 형식 ('multiple-choice' | 'short-answer' | 'opinion')
            *   `text`: (String) 질문 내용
            *   `options`: (Array of Strings, 객관식만) 선택지 목록
            *   `isAnonymous`: (Boolean, 의견 수집만) 익명 수집 여부
    *   `/answers`: (Array) 호스트 및 정답 확인을 위한 정답 데이터
        *   `questionIndex`: (Number) 질문 인덱스
        *   `type`: (String) 질문 형식 ('multiple-choice' | 'short-answer' | 'opinion')
        *   **객관식 정답 정보:**
            *   `correctAnswer`: (Number) 해당 질문의 정답 인덱스
        *   **주관식 정답 정보:**
            *   `correctAnswerText`: (String) 주요 정답
            *   `additionalAnswers`: (Array of Strings, Optional) 추가 정답들
            *   `answerMatchType`: (String) 정답 인정 방식 ('exact' | 'contains')
        *   **의견 수집 설정 정보:**
            *   `isAnonymous`: (Boolean) 익명 수집 여부

### 세션 참여자 정보

*   `/participants/{sessionId}/{participantId}`: 특정 세션에 참여한 각 참가자의 실시간 정보입니다.
    *   `id`: (String) 참가자 고유 ID (일반적으로 `userId`와 동일)
    *   `name`: (String) 참가자 이름
    *   `joinedAt`: (Number) 세션 참여 시간 (Unix Timestamp)
    *   `isActive`: (Boolean) 현재 참가자의 활성 상태
    *   `score`: (Number) 참가자의 현재 누적 점수 (의견 수집 문제는 점수에 영향 없음)
    *   `answers`: (Object, Optional) 각 답변 인덱스를 키로 가지며, 해당 답변에 대한 참가자의 답변 정보를 저장합니다.
        *   `{answerSequenceIndex}`: (Object) `Answer` 타입 객체 (순차적으로 증가하는 답변 시퀀스 인덱스)
            *   `questionIndex`: (Number) 질문의 인덱스
            *   `answerIndex`: (Number, Optional) 객관식: 참여자가 선택한 답변의 인덱스
            *   `answerText`: (String, Optional) 주관식/의견: 참여자가 입력한 답변 텍스트
            *   `isCorrect`: (Boolean) 정답 여부 (의견 수집은 항상 true)
            *   `points`: (Number) 해당 답변으로 획득한 점수 (의견 수집은 항상 0)
            *   `answeredAt`: (Number) 답변 제출 시간 (Unix Timestamp)
            *   `timeSpent`: (Number, Optional) 답변에 소요된 시간 (밀리초)
            *   `stageType`: (String, Optional) 로그라이크 모드에서의 스테이지 타입
            *   `mode`: (String, Optional) 게임 모드 ('normal' | 'roguelike')
    *   `attempts`: (Array of `Attempt` Objects, Optional) 퀴즈 재시도 시 이전 시도 기록을 저장합니다.
        *   `Attempt` 객체 구조:
            *   `answers`: (Object) 해당 시도의 `answers` 객체 (위 `answers` 구조와 동일)
            *   `score`: (Number) 해당 시도에서 얻은 총 점수
            *   `completedAt`: (Number) 해당 시도 완료 시간 (Unix Timestamp)

### 세션 답변 데이터

*   `/sessionAnswers/{sessionId}_question_{questionIndex}/{participantId}`: 세션 중 제출된 참가자별 답변 데이터입니다.
    *   `answer`: (String) 답변 내용 (객관식은 인덱스의 문자열, 주관식/의견은 텍스트)
    *   `answeredAt`: (Number) 답변 제출 시간 (Unix Timestamp)
    *   `isCorrect`: (Boolean) 정답 여부
    *   `score`: (Number) 획득한 점수

### 세션 질문 상태

*   `/sessionQuestions/{sessionId}/{questionIndex}`: 각 질문의 진행 상태를 추적합니다.
    *   `revealed`: (Boolean) 질문이 공개되었는지 여부
    *   `startedAt`: (Number, Nullable) 질문 시작 시간 (Unix Timestamp)
    *   `endedAt`: (Number, Nullable) 질문 종료 시간 (Unix Timestamp)

---

**참고:**

*   위 구조는 현재 코드 분석을 통해 파악된 내용이며, 실제 구현과 약간의 차이가 있을 수 있습니다.
*   `Timestamp`는 Firestore의 타임스탬프 객체를, `Unix Timestamp`는 숫자 형태의 타임스탬프(밀리초)를 의미합니다.
*   일부 RTDB 경로는 `sessionService.ts` 등의 파일에서 동적으로 생성됩니다.
*   **참가자 수 제한**: 세션당 최대 50명까지 참가할 수 있으며, 호스트가 5명~50명 사이에서 조정 가능합니다.
*   **문제 형식**: 현재 세 가지 문제 형식을 지원합니다:
    *   **객관식 (multiple-choice)**: 선택지에서 하나의 정답을 선택, 정답 시 10점 획득
    *   **주관식 (short-answer)**: 텍스트로 답변을 입력, 정확한 일치 또는 키워드 포함 방식으로 정답 판정, 정답 시 10점 획득
    *   **의견 수집 (opinion)**: 점수 없이 참가자들의 자유로운 의견을 수집, 익명 수집 옵션 지원, 모든 답변이 정답으로 처리되며 0점 