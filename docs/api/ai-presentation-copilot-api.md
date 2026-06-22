# AI 발표 코파일럿 API 명세서

문서 상태: 초안  
기준 기능: 발표 전 제작/리뷰, 리허설, 실전 발표자 화면, Q&A/설문, 모바일/태블릿 보조, 공유/커뮤니티/동시 편집, 발표 후 리포트

## 1. API 경계

이 문서는 구현 전 계약 초안이다. 구현 시 공통 DTO, 이벤트 타입, request/response 타입은 `packages/shared`에 정의하고, NestJS와 FastAPI의 실제 입출력 스키마는 이 문서를 기준으로 맞춘다.

| 영역 | 담당 앱 | Base URL | 소비자 |
| --- | --- | --- | --- |
| 제품 REST API | `apps/api` | `/api/v1` | 웹, 모바일, 태블릿 클라이언트 |
| 청중 공개 API | `apps/api` | `/api/v1/audience` | QR로 접속한 청중 |
| 실시간 세션 API | `apps/api` | `/ws/v1/presentation-sessions/{sessionId}` | 발표자 화면, 태블릿, 모바일 리모컨, 청중 화면 |
| 내부 AI API | `apps/ai` | `/internal/v1` | `apps/api` 서버만 호출 |

원칙:

- 외부 클라이언트는 `apps/ai`를 직접 호출하지 않는다.
- AI 모델 출력은 `apps/ai`에서 스키마 검증을 통과한 구조화 JSON으로만 `apps/api`에 반환한다.
- `apps/api`는 DB 모델을 그대로 반환하지 않고 DTO로 변환한다.
- 리스트 응답은 모두 페이지네이션을 지원한다.
- API 변경은 추가형 변경을 우선하고, 기존 필드 의미나 타입을 변경하지 않는다.

## 2. 공통 규칙

### 2.1 인증

| 대상 | 방식 | 설명 |
| --- | --- | --- |
| 로그인 사용자 | `Authorization: Bearer {accessToken}` | 프로젝트, 자료, 리허설, 실전 발표, 리포트 관리 |
| 청중 | `audienceToken` | QR URL에 포함된 짧은 수명 토큰. 프로젝트 소유자 정보는 노출하지 않는다. |
| 실시간 연결 | `connectionToken` | 발표 세션별로 발급한 토큰. 역할과 만료 시간을 포함한다. |
| 내부 AI API | 서비스 간 인증 | 서버 간 토큰 또는 mTLS. 외부 네트워크에 공개하지 않는다. |

### 2.2 공통 헤더

| 헤더 | 방향 | 필수 | 설명 |
| --- | --- | --- | --- |
| `Authorization` | Request | 사용자 API 필수 | Bearer token |
| `Idempotency-Key` | Request | POST 권장 | 파일 업로드, 세션 생성, 결제성 없는 중복 생성 방지 |
| `X-Request-Id` | Request/Response | 권장 | 클라이언트 추적용 요청 ID. 없으면 서버가 생성한다. |
| `Content-Type` | Request | 필수 | JSON은 `application/json`, 업로드는 `multipart/form-data` |

### 2.3 공통 응답

단건 응답은 리소스를 직접 반환한다. 리스트 응답은 아래 형태를 사용한다.

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

공통 query parameter:

| 이름 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `page` | number | `1` | 1부터 시작 |
| `pageSize` | number | `20` | 최대 100 |
| `sortBy` | string | 리소스별 기본값 | 예: `createdAt`, `updatedAt` |
| `sortOrder` | enum | `desc` | `asc`, `desc` |

### 2.4 공통 오류

모든 오류 응답은 같은 형태를 사용한다.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "요청 값이 올바르지 않습니다.",
    "details": {
      "fieldErrors": {
        "title": ["title은 필수입니다."]
      }
    },
    "requestId": "req_01J..."
  }
}
```

| HTTP | code 예시 | 의미 |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | 형식이 잘못된 요청 |
| 401 | `UNAUTHENTICATED` | 인증 필요 |
| 403 | `FORBIDDEN` | 권한 없음 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 409 | `CONFLICT` | 버전 충돌, 중복 생성, 상태 전이 충돌 |
| 413 | `PAYLOAD_TOO_LARGE` | 업로드 제한 초과 |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | 허용하지 않는 파일 형식 |
| 422 | `VALIDATION_ERROR` | 스키마 검증 실패 |
| 429 | `RATE_LIMITED` | 요청 제한 |
| 500 | `INTERNAL_ERROR` | 서버 오류. 내부 상세는 노출하지 않는다. |

## 3. 공통 타입

### 3.1 식별자

식별자는 문자열로 전달한다. TypeScript에서는 branded type으로 구분한다.

| 타입 | 예시 필드 |
| --- | --- |
| `UserId` | `userId` |
| `ProjectId` | `projectId` |
| `DeckId` | `deckId` |
| `SlideId` | `slideId` |
| `AiJobId` | `jobId` |
| `RehearsalId` | `rehearsalId` |
| `PresentationSessionId` | `sessionId` |
| `QuestionId` | `questionId` |
| `ReportId` | `reportId` |

### 3.2 Enum

Enum 값은 `UPPER_SNAKE_CASE`를 사용한다.

```ts
type AiJobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELED";
type DeckProcessingStatus = "UPLOADED" | "PARSING" | "ANALYZING" | "READY" | "FAILED";
type RehearsalStatus = "READY" | "RUNNING" | "ENDED" | "FAILED";
type PresentationSessionStatus = "SCHEDULED" | "LIVE" | "PAUSED" | "ENDED";
type QuestionStatus = "NEW" | "AI_ANSWERED" | "NEEDS_PRESENTER" | "DISMISSED" | "ANSWERED_LIVE";
type DeviceRole = "PRESENTER" | "TABLET" | "REMOTE" | "AUDIENCE_DISPLAY";
type AiJobType =
  | "DECK_EXTRACTION"
  | "KEYWORD_EXTRACTION"
  | "SCRIPT_GENERATION"
  | "SLIDE_REVIEW"
  | "SLIDE_IMPROVEMENT"
  | "REHEARSAL_FEEDBACK"
  | "QUESTION_CLUSTERING"
  | "QA_ANSWER_GENERATION"
  | "POST_PRESENTATION_REPORT";
```

### 3.3 핵심 리소스

```ts
interface Project {
  projectId: ProjectId;
  ownerId: UserId;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Deck {
  deckId: DeckId;
  projectId: ProjectId;
  title: string;
  sourceFileName: string;
  slideCount: number;
  processingStatus: DeckProcessingStatus;
  defaultDurationSeconds: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Slide {
  slideId: SlideId;
  deckId: DeckId;
  slideNumber: number;
  title: string | null;
  thumbnailUrl: string | null;
  notes: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

interface AiJob {
  jobId: AiJobId;
  jobType: AiJobType;
  targetType: "DECK" | "SLIDE" | "REHEARSAL" | "PRESENTATION_SESSION" | "QUESTION";
  targetId: string;
  status: AiJobStatus;
  progressPercent: number;
  resultRef: string | null;
  error: ApiErrorBody | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
}

interface PresenterSlideSummary {
  slideId: SlideId;
  slideNumber: number;
  title: string | null;
  thumbnailUrl: string | null;
  speakerNotes: string | null;
}

interface SlideTiming {
  slideId: SlideId;
  slideNumber: number;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  targetDurationSeconds: number | null;
  deltaSeconds: number | null;
}

interface MissedKeyword {
  keywordId: string;
  slideId: SlideId;
  text: string;
  expectedBeforeMs: number | null;
  detectedAt: string;
  confidence: number;
}

interface RehearsalMistake {
  mistakeType: "MISSED_KEYWORD" | "TOO_FAST" | "TOO_SLOW" | "LONG_PAUSE" | "SLIDE_TIME_OVER";
  slideId: SlideId | null;
  count: number;
  description: string;
}

interface QnaSummary {
  totalQuestionCount: number;
  unansweredCount: number;
  needsPresenterCount: number;
  aiAnsweredCount: number;
  topClusters: QuestionCluster[];
  latestQuestionAt: string | null;
}

interface QaAnswer {
  answerId: string;
  questionId: QuestionId | null;
  body: string;
  answerConfidence: number;
  sourceSlideIds: SlideId[];
  requiresPresenterAttention: boolean;
  createdAt: string;
}

interface TranscriptSegment {
  segmentId: string;
  rehearsalId: RehearsalId | null;
  sessionId: PresentationSessionId | null;
  slideId: SlideId | null;
  startMs: number;
  endMs: number;
  text: string;
  confidence: number;
}

interface PresenterDevice {
  deviceId: string;
  sessionId: PresentationSessionId;
  deviceRole: DeviceRole;
  displayName: string;
  capabilities: string[];
  lastSeenAt: string;
}

interface Annotation {
  annotationId: string;
  sessionId: PresentationSessionId;
  slideId: SlideId;
  annotationType: "INK" | "HIGHLIGHT" | "LASER";
  points: Array<{ x: number; y: number; pressure?: number }>;
  style: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface AnnotationPatch {
  annotationId: string | null;
  operation: "CREATE" | "UPDATE" | "DELETE";
  annotation: Annotation | null;
}

interface EditPatchRequest {
  baseRevision: number;
  operations: Array<{
    op: "add" | "replace" | "remove";
    path: string;
    value?: unknown;
  }>;
}

interface PollResult {
  pollId: string;
  totalVotes: number;
  options: Array<{
    optionId: string;
    label: string;
    voteCount: number;
    ratio: number;
  }>;
  updatedAt: string;
}
```

## 4. 프로젝트와 발표자료

### 4.1 프로젝트 목록

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/projects` | 내 프로젝트 목록 |
| POST | `/api/v1/projects` | 프로젝트 생성 |
| GET | `/api/v1/projects/{projectId}` | 프로젝트 단건 조회 |
| PATCH | `/api/v1/projects/{projectId}` | 프로젝트 메타데이터 수정 |
| DELETE | `/api/v1/projects/{projectId}` | 프로젝트 삭제 |

`POST /api/v1/projects`

```json
{
  "title": "신제품 발표",
  "description": "2026 상반기 데모데이 발표"
}
```

### 4.2 PPTX 업로드

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/projects/{projectId}/decks` | 프로젝트의 발표자료 목록 |
| POST | `/api/v1/projects/{projectId}/decks` | PPTX 업로드 |
| GET | `/api/v1/decks/{deckId}` | 발표자료 조회 |
| PATCH | `/api/v1/decks/{deckId}` | 제목, 기본 발표 시간 등 수정 |
| DELETE | `/api/v1/decks/{deckId}` | 발표자료 삭제 |
| GET | `/api/v1/decks/{deckId}/slides` | 슬라이드 목록 |
| GET | `/api/v1/slides/{slideId}` | 슬라이드 단건 조회 |

`POST /api/v1/projects/{projectId}/decks`

- Content-Type: `multipart/form-data`
- 허용 파일: `.pptx`
- 서버는 확장자, MIME, 파일 시그니처를 모두 검증한다.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `file` | file | 예 | PPTX 파일 |
| `title` | string | 아니오 | 미입력 시 파일명 기반 생성 |
| `defaultDurationSeconds` | number | 아니오 | 발표 목표 시간 |
| `sourceLocale` | string | 아니오 | 예: `ko-KR` |

응답 `201 Created`

```json
{
  "deckId": "deck_01J...",
  "projectId": "proj_01J...",
  "title": "신제품 발표",
  "sourceFileName": "demo-day.pptx",
  "slideCount": 0,
  "processingStatus": "UPLOADED",
  "defaultDurationSeconds": 900,
  "createdAt": "2026-06-22T00:00:00.000Z",
  "updatedAt": "2026-06-22T00:00:00.000Z"
}
```

업로드 직후 서버는 `DECK_EXTRACTION` AI 작업을 생성할 수 있다. 클라이언트는 `GET /api/v1/decks/{deckId}` 또는 실시간 이벤트로 `processingStatus`를 확인한다.

## 5. 발표 전 AI 제작/리뷰

### 5.1 AI 작업

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/decks/{deckId}/ai-jobs` | 자료 단위 AI 작업 생성 |
| POST | `/api/v1/slides/{slideId}/ai-jobs` | 슬라이드 단위 AI 작업 생성 |
| GET | `/api/v1/ai-jobs/{jobId}` | AI 작업 상태 조회 |
| DELETE | `/api/v1/ai-jobs/{jobId}` | 대기 또는 실행 중 작업 취소 |

`POST /api/v1/decks/{deckId}/ai-jobs`

```json
{
  "jobType": "KEYWORD_EXTRACTION",
  "slideIds": ["slide_01J...", "slide_01K..."],
  "options": {
    "maxKeywordsPerSlide": 5,
    "locale": "ko-KR"
  }
}
```

### 5.2 슬라이드 핵심 키워드

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/decks/{deckId}/keywords` | 자료 전체 키워드 조회 |
| GET | `/api/v1/slides/{slideId}/keywords` | 슬라이드별 키워드 조회 |
| PATCH | `/api/v1/slides/{slideId}/keywords` | 키워드 수정 |

`SlideKeyword`

```ts
interface SlideKeyword {
  keywordId: string;
  slideId: SlideId;
  text: string;
  importance: "HIGH" | "MEDIUM" | "LOW";
  aliases: string[];
  isRequired: boolean;
  source: "AI" | "USER";
  createdAt: string;
  updatedAt: string;
}
```

키워드 누락 감지는 `isRequired=true`인 키워드를 기준으로 한다.

### 5.3 발표 스크립트

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/decks/{deckId}/scripts` | 자료 전체 스크립트 조회 |
| GET | `/api/v1/slides/{slideId}/script` | 슬라이드별 스크립트 조회 |
| PUT | `/api/v1/slides/{slideId}/script` | 슬라이드 스크립트 저장 |

`SlideScript`

```ts
interface SlideScript {
  slideId: SlideId;
  body: string;
  estimatedDurationSeconds: number;
  speakingTips: string[];
  revision: number;
  source: "AI" | "USER";
  updatedAt: string;
}
```

### 5.4 AI 슬라이드 리뷰

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/slides/{slideId}/reviews` | 슬라이드 리뷰 이력 |
| GET | `/api/v1/slides/{slideId}/reviews/latest` | 최신 리뷰 |

`SlideReview`

```ts
interface SlideReview {
  reviewId: string;
  slideId: SlideId;
  overallScore: number;
  categories: {
    font: ReviewFinding[];
    informationDensity: ReviewFinding[];
    logicalFlow: ReviewFinding[];
    visualAid: ReviewFinding[];
  };
  summary: string;
  createdAt: string;
}

interface ReviewFinding {
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  description: string;
  suggestedAction: string;
}
```

### 5.5 한 장 단위 슬라이드 개선

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/slides/{slideId}/improvement-suggestions` | 개선 제안 목록 |
| POST | `/api/v1/slides/{slideId}/improvement-applications` | 개선 제안 적용 |

`POST /api/v1/slides/{slideId}/improvement-applications`

```json
{
  "suggestionId": "sugg_01J...",
  "baseRevision": 12
}
```

응답은 적용 후 `SlideEditState`를 반환한다. `baseRevision`이 현재 revision과 다르면 `409 CONFLICT`를 반환한다.

## 6. 기본 에디터와 인터랙티브 컴포넌트

### 6.1 편집 상태

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/decks/{deckId}/edit-state` | 자료 편집 스냅샷 조회 |
| PATCH | `/api/v1/decks/{deckId}/edit-state` | 편집 패치 적용 |
| POST | `/api/v1/slides/{slideId}/elements` | 텍스트, 이미지, 강조 영역 추가 |
| PATCH | `/api/v1/slide-elements/{elementId}` | 요소 수정 |
| DELETE | `/api/v1/slide-elements/{elementId}` | 요소 삭제 |

`SlideElement`

```ts
interface SlideElement {
  elementId: string;
  slideId: SlideId;
  elementType: "TEXT" | "IMAGE" | "HIGHLIGHT";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  style: Record<string, unknown>;
  content: Record<string, unknown>;
  revision: number;
}
```

`PATCH /api/v1/decks/{deckId}/edit-state`

```json
{
  "baseRevision": 12,
  "operations": [
    {
      "op": "replace",
      "path": "/slides/slide_01J/elements/el_01J/content/text",
      "value": "핵심 메시지"
    }
  ]
}
```

### 6.2 인터랙티브 컴포넌트

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/decks/{deckId}/interactive-components` | 자료 내 컴포넌트 목록 |
| POST | `/api/v1/slides/{slideId}/interactive-components` | Q&A QR, 설문, 투표 컴포넌트 삽입 |
| PATCH | `/api/v1/interactive-components/{componentId}` | 컴포넌트 설정 수정 |
| DELETE | `/api/v1/interactive-components/{componentId}` | 컴포넌트 삭제 |

`InteractiveComponent`

```ts
interface InteractiveComponent {
  componentId: string;
  slideId: SlideId;
  componentType: "QA_QR" | "POLL" | "SURVEY";
  displayName: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

Q&A QR 컴포넌트는 발표 세션이 생성되면 `audienceToken` 기반 URL로 해석된다. 문서 저장 시에는 장기 토큰을 저장하지 않는다.

## 7. 리허설 모드

### 7.1 리허설 세션

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/decks/{deckId}/rehearsals` | 자료별 리허설 이력 |
| POST | `/api/v1/decks/{deckId}/rehearsals` | 리허설 생성 |
| GET | `/api/v1/rehearsals/{rehearsalId}` | 리허설 조회 |
| PATCH | `/api/v1/rehearsals/{rehearsalId}` | 상태 변경 또는 메타데이터 수정 |
| DELETE | `/api/v1/rehearsals/{rehearsalId}` | 리허설 삭제 |

`POST /api/v1/decks/{deckId}/rehearsals`

```json
{
  "targetDurationSeconds": 900,
  "recordingEnabled": true,
  "locale": "ko-KR"
}
```

### 7.2 음성 인식 기반 발표 추적

실시간 음성 스트림은 WebSocket으로 전송한다. 녹화/녹음 파일 업로드가 필요한 경우 아래 REST API를 사용한다.

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/rehearsals/{rehearsalId}/recordings` | 녹화/녹음 파일 업로드 |
| GET | `/api/v1/rehearsals/{rehearsalId}/transcript` | 전체 transcript 조회 |
| GET | `/api/v1/rehearsals/{rehearsalId}/tracking-state` | 현재 추적 상태 조회 |

`RehearsalTrackingState`

```ts
interface RehearsalTrackingState {
  rehearsalId: RehearsalId;
  currentSlideId: SlideId;
  currentSlideNumber: number;
  transcriptCursorMs: number;
  confidence: number;
  matchedKeywords: string[];
  missedKeywords: string[];
  updatedAt: string;
}
```

### 7.3 시간 분석과 피드백

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/rehearsals/{rehearsalId}/slide-timings` | 슬라이드별 시간 분석 |
| GET | `/api/v1/rehearsals/{rehearsalId}/missed-keywords` | 누락 키워드 결과 |
| GET | `/api/v1/rehearsals/{rehearsalId}/feedback` | 반복 실수, 발표 속도 분석 |

`RehearsalFeedback`

```ts
interface RehearsalFeedback {
  rehearsalId: RehearsalId;
  totalDurationSeconds: number;
  speakingRateWpm: number;
  repeatedMistakes: RehearsalMistake[];
  slideTimings: SlideTiming[];
  missedKeywords: MissedKeyword[];
  improvementSuggestions: string[];
  createdAt: string;
}
```

## 8. 실전 발표자 화면

### 8.1 발표 세션

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/decks/{deckId}/presentation-sessions` | 발표 세션 목록 |
| POST | `/api/v1/decks/{deckId}/presentation-sessions` | 발표 세션 생성 |
| GET | `/api/v1/presentation-sessions/{sessionId}` | 발표 세션 조회 |
| PATCH | `/api/v1/presentation-sessions/{sessionId}` | 상태, 목표 시간 수정 |
| DELETE | `/api/v1/presentation-sessions/{sessionId}` | 예정 세션 삭제 |

`POST /api/v1/decks/{deckId}/presentation-sessions`

```json
{
  "title": "데모데이 본 발표",
  "scheduledStartAt": "2026-06-22T10:00:00.000Z",
  "targetDurationSeconds": 900,
  "audienceQnaEnabled": true,
  "pollingEnabled": true
}
```

### 8.2 발표자 상태

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/presentation-sessions/{sessionId}/presenter-state` | 현재/다음 슬라이드, 남은 시간, 키워드, 놓친 포인트 |
| PATCH | `/api/v1/presentation-sessions/{sessionId}/presenter-state` | 현재 슬라이드, 타이머 상태 변경 |
| GET | `/api/v1/presentation-sessions/{sessionId}/prompter` | 전체 스크립트 프롬프터 |
| GET | `/api/v1/presentation-sessions/{sessionId}/qa-summary` | 발표자용 Q&A 상태 요약 |

`PresenterState`

```ts
interface PresenterState {
  sessionId: PresentationSessionId;
  status: PresentationSessionStatus;
  currentSlide: PresenterSlideSummary;
  nextSlide: PresenterSlideSummary | null;
  remainingSeconds: number;
  elapsedSeconds: number;
  currentKeywords: SlideKeyword[];
  frequentlyMissedPoints: MissedKeyword[];
  qnaSummary: QnaSummary;
  updatedAt: string;
}
```

`PATCH /api/v1/presentation-sessions/{sessionId}/presenter-state`

```json
{
  "baseRevision": 31,
  "currentSlideId": "slide_01J...",
  "timer": {
    "status": "RUNNING",
    "elapsedSeconds": 120
  }
}
```

## 9. Q&A, 설문, 청중 참여

### 9.1 청중 입장과 QR

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/presentation-sessions/{sessionId}/audience-links` | 발표자용 청중 입장 링크 생성 |
| GET | `/api/v1/audience/sessions/{audienceToken}` | 청중 입장 정보 조회 |

`POST /api/v1/presentation-sessions/{sessionId}/audience-links`

```json
{
  "expiresInSeconds": 86400,
  "allowedFeatures": ["QUESTION", "CHATBOT", "POLL"]
}
```

응답

```json
{
  "audienceUrl": "https://example.com/a/at_01J...",
  "audienceTokenExpiresAt": "2026-06-23T00:00:00.000Z",
  "qrPayload": "https://example.com/a/at_01J..."
}
```

### 9.2 질문 수집과 발표자 전달

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/audience/sessions/{audienceToken}/questions` | 청중 질문 제출 |
| GET | `/api/v1/audience/sessions/{audienceToken}/questions/{questionId}` | 청중이 본인 질문 상태 조회 |
| GET | `/api/v1/presentation-sessions/{sessionId}/questions` | 발표자 질문 목록 |
| PATCH | `/api/v1/questions/{questionId}` | 질문 상태 변경 |

`AudienceQuestion`

```ts
interface AudienceQuestion {
  questionId: QuestionId;
  sessionId: PresentationSessionId;
  slideId: SlideId | null;
  body: string;
  status: QuestionStatus;
  requiresPresenterAttention: boolean;
  aiAnswer: QaAnswer | null;
  clusterId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

`POST /api/v1/audience/sessions/{audienceToken}/questions`

```json
{
  "body": "시장 규모 산정 근거가 무엇인가요?",
  "slideId": "slide_01J...",
  "anonymousName": "청중 12"
}
```

### 9.3 질문 클러스터링과 AI 챗봇 답변

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/presentation-sessions/{sessionId}/question-cluster-jobs` | 질문 클러스터링 작업 생성 |
| GET | `/api/v1/presentation-sessions/{sessionId}/question-clusters` | 대표 질문 목록 |
| POST | `/api/v1/audience/sessions/{audienceToken}/chat-messages` | 슬라이드/스크립트 기반 AI 챗봇 답변 |
| POST | `/api/v1/questions/{questionId}/answers` | 특정 질문의 AI 답변 생성 또는 발표자 답변 저장 |

`QuestionCluster`

```ts
interface QuestionCluster {
  clusterId: string;
  sessionId: PresentationSessionId;
  representativeQuestion: string;
  questionIds: QuestionId[];
  priority: "HIGH" | "MEDIUM" | "LOW";
  requiresPresenterAttention: boolean;
  reason: string;
  createdAt: string;
}
```

AI 답변은 `answerConfidence`, `sourceSlideIds`, `requiresPresenterAttention`을 포함한다. 근거가 부족하거나 민감한 질문은 청중에게 확정 답변을 반환하지 않고 발표자 전달 대상으로 표시한다.

### 9.4 설문과 투표

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/presentation-sessions/{sessionId}/polls` | 발표자용 설문/투표 목록 |
| POST | `/api/v1/presentation-sessions/{sessionId}/polls` | 설문/투표 생성 |
| PATCH | `/api/v1/polls/{pollId}` | 설문/투표 수정 |
| DELETE | `/api/v1/polls/{pollId}` | 설문/투표 삭제 |
| GET | `/api/v1/audience/sessions/{audienceToken}/polls` | 청중용 설문/투표 목록 |
| POST | `/api/v1/audience/sessions/{audienceToken}/polls/{pollId}/votes` | 청중 투표 제출 |
| GET | `/api/v1/polls/{pollId}/results` | 집계 결과 |

## 10. 모바일/태블릿 발표 보조

### 10.1 발표자 화면 동기화

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/presentation-sessions/{sessionId}/connection-tokens` | 실시간 연결 토큰 발급 |
| POST | `/api/v1/presentation-sessions/{sessionId}/devices` | 태블릿, 리모컨 장치 등록 |
| GET | `/api/v1/presentation-sessions/{sessionId}/devices` | 연결 장치 목록 |
| PATCH | `/api/v1/devices/{deviceId}` | 장치 상태 갱신 |

`POST /api/v1/presentation-sessions/{sessionId}/devices`

```json
{
  "deviceRole": "TABLET",
  "displayName": "iPad Pro",
  "capabilities": ["PRESENTER_VIEW", "ANNOTATION", "LASER_POINTER"]
}
```

### 10.2 모바일 리모컨, 손글씨, 레이저 포인터

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/presentation-sessions/{sessionId}/remote-commands` | 다음/이전 슬라이드, 타이머 제어 |
| GET | `/api/v1/presentation-sessions/{sessionId}/annotations` | 판서 목록 |
| POST | `/api/v1/presentation-sessions/{sessionId}/annotations` | 판서 추가 |
| PATCH | `/api/v1/annotations/{annotationId}` | 판서 수정 |
| DELETE | `/api/v1/annotations/{annotationId}` | 판서 삭제 |

`RemoteCommand`

```ts
interface RemoteCommand {
  commandId: string;
  sessionId: PresentationSessionId;
  commandType: "NEXT_SLIDE" | "PREVIOUS_SLIDE" | "GO_TO_SLIDE" | "START_TIMER" | "PAUSE_TIMER" | "END_SESSION";
  payload: Record<string, unknown>;
  issuedByDeviceId: string;
  createdAt: string;
}
```

포인터 이동은 빈번하므로 REST가 아니라 WebSocket 이벤트 `pointer.moved`로 전달한다.

## 11. 공유, 커뮤니티, 동시 편집

### 11.1 템플릿 갤러리

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/templates` | 발표 템플릿 갤러리 |
| POST | `/api/v1/templates` | 내 자료를 템플릿으로 게시 |
| GET | `/api/v1/templates/{templateId}` | 템플릿 상세 |
| PATCH | `/api/v1/templates/{templateId}` | 게시자 템플릿 수정 |
| DELETE | `/api/v1/templates/{templateId}` | 게시자 템플릿 삭제 |
| POST | `/api/v1/templates/{templateId}/forks` | 템플릿을 내 프로젝트로 복제 |

`GET /api/v1/templates` query:

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `category` | string | 예: `BUSINESS`, `EDUCATION`, `PITCH` |
| `q` | string | 검색어 |
| `license` | string | 사용 조건 |
| `sortBy` | string | `popular`, `createdAt`, `updatedAt` |

### 11.2 동시 편집

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/decks/{deckId}/collaboration-sessions` | 편집 세션 생성 |
| GET | `/api/v1/decks/{deckId}/collaborators` | 현재 협업자 목록 |
| POST | `/api/v1/decks/{deckId}/share-links` | 공유 링크 생성 |
| DELETE | `/api/v1/share-links/{shareLinkId}` | 공유 링크 폐기 |

편집 패치는 REST `PATCH /api/v1/decks/{deckId}/edit-state`와 WebSocket `edit.patch.submitted`를 동일한 `baseRevision` 규칙으로 처리한다.

## 12. 발표 후 리포트와 누적 분석

### 12.1 발표 후 리포트

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/presentation-sessions/{sessionId}/reports` | 발표 후 리포트 생성 |
| GET | `/api/v1/reports/{reportId}` | 리포트 조회 |
| GET | `/api/v1/decks/{deckId}/reports` | 자료별 리포트 목록 |
| DELETE | `/api/v1/reports/{reportId}` | 리포트 삭제 |

`PresentationReport`

```ts
interface PresentationReport {
  reportId: ReportId;
  sessionId: PresentationSessionId;
  deckId: DeckId;
  totalDurationSeconds: number;
  questionSummary: string;
  qnaClusters: QuestionCluster[];
  feedbackSummary: string;
  improvementSuggestions: string[];
  slideTimings: SlideTiming[];
  missedKeywords: MissedKeyword[];
  createdAt: string;
}
```

### 12.2 리허설/실전 데이터 누적 분석

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/analytics/account` | 계정 단위 누적 분석 |
| GET | `/api/v1/decks/{deckId}/analytics` | PPT 자료 단위 누적 분석 |
| GET | `/api/v1/decks/{deckId}/analytics/rehearsal-trends` | 리허설 추이 |
| GET | `/api/v1/decks/{deckId}/analytics/presentation-trends` | 실전 발표 추이 |

`DeckAnalytics`

```ts
interface DeckAnalytics {
  deckId: DeckId;
  rehearsalCount: number;
  presentationCount: number;
  averageDurationSeconds: number;
  averageSpeakingRateWpm: number;
  frequentMissedKeywords: MissedKeyword[];
  frequentQuestionTopics: string[];
  updatedAt: string;
}
```

## 13. 내부 AI API

내부 AI API는 `apps/api`에서만 호출한다. 모든 request/response는 Pydantic schema와 `packages/shared` 타입을 함께 맞춘다.

공통 request 필드:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `requestId` | string | 추적 ID |
| `tenantId` | string | 계정 또는 워크스페이스 ID |
| `locale` | string | 예: `ko-KR` |

공통 response 필드:

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `requestId` | string | 요청 추적 ID |
| `modelInfo` | object | 모델명, 버전 등 내부 진단 정보. 외부 API에는 기본 노출하지 않는다. |
| `warnings` | string[] | 검증은 통과했지만 품질상 주의가 필요한 내용 |

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/internal/v1/deck-extractions` | PPTX 파싱, 슬라이드 텍스트/OCR/썸네일 메타 추출 |
| POST | `/internal/v1/slide-keyword-analyses` | 슬라이드 핵심 키워드 추출 |
| POST | `/internal/v1/script-generations` | 발표 스크립트 생성 |
| POST | `/internal/v1/slide-reviews` | 폰트, 정보량, 논리 흐름, 시각자료 리뷰 |
| POST | `/internal/v1/slide-improvements` | 한 장 단위 개선안 생성 |
| POST | `/internal/v1/context-indexes` | 슬라이드/스크립트 기반 RAG 컨텍스트 생성 |
| POST | `/internal/v1/audio-transcriptions` | 녹음 파일 또는 오디오 청크 STT |
| POST | `/internal/v1/rehearsal-analyses` | 키워드 누락, 시간, 발표 속도 분석 |
| POST | `/internal/v1/question-clusters` | 질문 클러스터링과 대표 질문 생성 |
| POST | `/internal/v1/qa-answers` | 슬라이드/스크립트 기반 AI 답변 생성 |
| POST | `/internal/v1/report-summaries` | 발표 후 리포트 요약과 개선점 생성 |

예시: `POST /internal/v1/slide-keyword-analyses`

```json
{
  "requestId": "req_01J...",
  "tenantId": "tenant_01J...",
  "locale": "ko-KR",
  "deckId": "deck_01J...",
  "slides": [
    {
      "slideId": "slide_01J...",
      "slideNumber": 1,
      "title": "문제 정의",
      "text": "발표 자료에서 추출한 텍스트",
      "speakerNotes": "발표자 노트"
    }
  ],
  "options": {
    "maxKeywordsPerSlide": 5
  }
}
```

응답

```json
{
  "requestId": "req_01J...",
  "results": [
    {
      "slideId": "slide_01J...",
      "keywords": [
        {
          "text": "시장 문제",
          "importance": "HIGH",
          "aliases": ["문제 정의", "고객 문제"],
          "isRequired": true,
          "confidence": 0.91
        }
      ]
    }
  ],
  "warnings": [],
  "modelInfo": {
    "provider": "internal",
    "model": "keyword-extractor",
    "version": "2026-06"
  }
}
```

## 14. 실시간 이벤트

### 14.1 연결

1. 클라이언트가 `POST /api/v1/presentation-sessions/{sessionId}/connection-tokens`로 역할별 토큰을 발급받는다.
2. 클라이언트가 `/ws/v1/presentation-sessions/{sessionId}?token={connectionToken}`에 연결한다.
3. 서버는 연결 직후 현재 `PresenterState`와 장치 동기화 상태를 전송한다.

### 14.2 이벤트 Envelope

```ts
interface RealtimeEvent<TPayload> {
  eventId: string;
  type: string;
  sessionId: PresentationSessionId;
  actor: {
    actorType: "USER" | "DEVICE" | "AUDIENCE" | "SYSTEM";
    actorId: string;
  };
  payload: TPayload;
  revision: number | null;
  occurredAt: string;
}
```

서버는 이벤트 순서를 `revision`으로 보장한다. 재연결한 클라이언트는 마지막으로 처리한 revision 이후 이벤트를 요청하거나, 최신 스냅샷을 다시 받는다.

### 14.3 클라이언트에서 서버로 보내는 이벤트

| type | payload | 설명 |
| --- | --- | --- |
| `slide.change.requested` | `{ "slideId": "slide_01J..." }` | 현재 슬라이드 변경 요청 |
| `timer.update.requested` | `{ "status": "RUNNING", "elapsedSeconds": 120 }` | 타이머 상태 변경 |
| `audio.chunk.submitted` | binary 또는 `{ "chunkId": "...", "offsetMs": 1000 }` | 리허설/실전 STT 오디오 전송 |
| `remote.command.requested` | `RemoteCommand` | 모바일 리모컨 명령 |
| `pointer.moved` | `{ "slideId": "...", "x": 0.5, "y": 0.3 }` | 레이저 포인터 위치 |
| `annotation.changed` | `AnnotationPatch` | 태블릿 판서 |
| `edit.patch.submitted` | `EditPatchRequest` | 동시 편집 패치 |
| `presence.updated` | `{ "status": "ACTIVE" }` | 협업자 또는 장치 presence |

### 14.4 서버에서 클라이언트로 보내는 이벤트

| type | payload | 설명 |
| --- | --- | --- |
| `presenter.state.updated` | `PresenterState` | 발표자 화면 전체 상태 갱신 |
| `slide.changed` | `{ "currentSlideId": "...", "nextSlideId": "..." }` | 현재/다음 슬라이드 변경 |
| `timer.updated` | `{ "remainingSeconds": 780, "elapsedSeconds": 120 }` | 남은 시간 갱신 |
| `transcript.updated` | `TranscriptSegment` | STT 결과 |
| `keyword.missed` | `MissedKeyword` | 누락 가능 키워드 감지 |
| `slide.timing.updated` | `SlideTiming` | 슬라이드별 시간 갱신 |
| `rehearsal.feedback.updated` | `RehearsalFeedback` | 리허설 피드백 갱신 |
| `question.received` | `AudienceQuestion` | 새 질문 수집 |
| `question.clustered` | `QuestionCluster` | 대표 질문 갱신 |
| `qa.summary.updated` | `QnaSummary` | 발표자용 Q&A 요약 갱신 |
| `answer.generated` | `QaAnswer` | AI 답변 생성 |
| `poll.results.updated` | `PollResult` | 설문/투표 결과 갱신 |
| `device.synced` | `PresenterDevice` | 발표자 화면 동기화 |
| `annotation.updated` | `Annotation` | 판서 갱신 |
| `error.occurred` | `ApiErrorBody` | 이벤트 처리 오류 |

## 15. 기능 체크리스트 매핑

| 기능 | 주요 API |
| --- | --- |
| 자료 업로드 PPTX | `POST /api/v1/projects/{projectId}/decks` |
| 슬라이드별 핵심 키워드 추출 | `POST /api/v1/decks/{deckId}/ai-jobs`, `GET /api/v1/slides/{slideId}/keywords` |
| 발표 스크립트 생성 | `SCRIPT_GENERATION` AI job, `GET /api/v1/decks/{deckId}/scripts` |
| AI 슬라이드 리뷰 | `SLIDE_REVIEW` AI job, `GET /api/v1/slides/{slideId}/reviews/latest` |
| 한 장 단위 슬라이드 개선 | `SLIDE_IMPROVEMENT` AI job, `POST /api/v1/slides/{slideId}/improvement-applications` |
| 기본 에디터 | `GET/PATCH /api/v1/decks/{deckId}/edit-state`, slide element APIs |
| Q&A QR, 설문, 투표 삽입 | interactive component APIs, audience link APIs |
| 음성 인식 기반 발표 추적 | WebSocket `audio.chunk.submitted`, `transcript.updated`, tracking state APIs |
| 누락 키워드 감지 | `GET /api/v1/rehearsals/{rehearsalId}/missed-keywords`, `keyword.missed` |
| 슬라이드별 시간 분석 | `GET /api/v1/rehearsals/{rehearsalId}/slide-timings`, `slide.timing.updated` |
| 리허설 후 피드백 | `GET /api/v1/rehearsals/{rehearsalId}/feedback` |
| 녹화/녹음 | `POST /api/v1/rehearsals/{rehearsalId}/recordings` |
| 현재/다음 슬라이드, 남은 시간 | `GET /api/v1/presentation-sessions/{sessionId}/presenter-state` |
| 핵심 키워드와 자주 놓친 포인트 | `PresenterState.currentKeywords`, `PresenterState.frequentlyMissedPoints` |
| Q&A 상태 요약 | `GET /api/v1/presentation-sessions/{sessionId}/qa-summary` |
| 전체 스크립트 프롬프터 | `GET /api/v1/presentation-sessions/{sessionId}/prompter` |
| 질문 자동 수집 | audience question APIs, `question.received` |
| 질문 클러스터링 | question cluster APIs |
| AI 챗봇 답변 | audience chat message API, question answer API |
| 답변 필요 질문만 전달 | `requiresPresenterAttention` |
| 발표 종료 후 Q&A 리포트 | presentation report APIs |
| 모바일 발표 리모컨 | remote command APIs |
| 태블릿 발표자 화면 | device APIs, presenter state WebSocket |
| 손글씨/레이저 포인터 | annotation APIs, `pointer.moved` |
| 발표자 화면 동기화 | connection token, device sync, WebSocket events |
| 내 프로젝트 목록 | `GET /api/v1/projects` |
| 발표 템플릿 갤러리 | template APIs |
| 동시 편집 기능 | collaboration session, edit patch APIs |
| 발표 후 리포트 | report APIs |
| 리허설/실전 데이터 누적 분석 | account/deck analytics APIs |

## 16. 구현 시 검증 기준

- 모든 public request/response DTO를 `packages/shared`에 정의한다.
- `apps/api` Controller 경계에서 사용자 입력을 검증한다.
- `apps/ai`는 모델 출력과 외부 OCR/STT 결과를 Pydantic schema로 검증한다.
- 리스트 API에는 페이지네이션을 포함한다.
- PATCH API는 부분 업데이트와 revision 충돌을 테스트한다.
- 업로드 API는 파일 형식, 크기, 손상 파일, 중복 요청을 테스트한다.
- WebSocket 이벤트는 인증 실패, 재연결, revision 누락, 중복 이벤트 처리를 테스트한다.
- 청중 API는 rate limit, 토큰 만료, 세션 종료 상태를 테스트한다.
