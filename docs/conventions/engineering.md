# 엔지니어링 규칙

이 문서는 코드 작성, 네이밍, 주석, 테스트에 대한 상세 기준이다.
필수 규칙과 충돌하면 `AGENTS.md`를 우선한다.

## 코드 스타일 공통 규칙

- 불필요한 추상화보다 명확한 구조를 우선한다.
- 하나의 함수, 클래스, 모듈은 하나의 책임만 갖는다.
- 중복 제거보다 가독성이 우선인 경우 과도한 공통화를 피한다.
- 공통 타입과 이벤트 타입은 `packages/shared`를 기준으로 한다.
- 외부 입력은 반드시 검증한다.
- 매직 스트링은 상수 또는 enum/union type으로 분리한다.
- 에러는 무시하지 않고 호출자가 이해할 수 있는 형태로 처리한다.

## 네이밍 규칙

### 공통

- 변수와 함수 이름은 역할이 드러나게 작성한다.
- 축약어는 널리 쓰이는 경우만 사용한다.
- boolean 값은 `is`, `has`, `can`, `should`로 시작한다.
- 이벤트 이름은 과거형 또는 명확한 동작명으로 작성한다.
  - 예: `slideChanged`, `keywordDetected`, `questionSubmitted`

### TypeScript

- 변수/함수: `camelCase`
- 타입/인터페이스/클래스/React 컴포넌트: `PascalCase`
- 상수: `UPPER_SNAKE_CASE`
- 파일명: `kebab-case`
- React Hook: `useSomething`

### Python

- 변수/함수/모듈: `snake_case`
- 클래스: `PascalCase`
- 상수: `UPPER_SNAKE_CASE`
- FastAPI router 파일: `*_router.py`
- Pydantic schema 파일: `*_schema.py`

## 주석 작성 기준

- 모든 코드 주석은 한국어로 작성한다.
- 코드만으로 의도가 명확하면 주석을 쓰지 않는다.
- 복잡한 조건, 예외 처리, 성능 최적화, 임시 우회 로직에는 주석을 작성한다.
- “값을 할당한다”처럼 코드와 같은 말을 반복하는 주석은 쓰지 않는다.
- TODO 주석에는 이유와 후속 작업 기준을 함께 남긴다.

```ts
// 발표 중 중복 알림을 막기 위해 슬라이드 단위로 안내 여부를 기록한다.
const notifiedKeywordIds = new Set<string>();
```

```py
# 모델 응답은 신뢰하지 않고 스키마 검증을 통과한 값만 반환한다.
validated_result = ContextResultSchema.model_validate(raw_result)
```

## 테스트 기준

- 공통 로직은 단위 테스트를 작성한다.
- API 계약 변경 시 관련 테스트를 추가하거나 수정한다.
- 버그 수정 시 재발 방지 테스트를 추가한다.
- 테스트를 실행하지 못한 경우 PR에 미실행 사유와 남은 검증 범위를 남긴다.
