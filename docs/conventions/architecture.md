# 아키텍처 규칙

이 문서는 저장소 구조, 애플리케이션 경계, 설계 패턴 기준을 정리한다.
필수 규칙과 충돌하면 `AGENTS.md`를 우선한다.

## 저장소 구조

```text
apps/
  web/        # React TS 프론트엔드
  api/        # NestJS 백엔드 API
  ai/         # FastAPI AI 서버

packages/
  shared/     # 공통 타입, API DTO, 이벤트 타입
  ui/         # 공통 UI 컴포넌트

docs/
  api/
  architecture/
  conventions/
```

## 작업 경계

- 프론트엔드 작업 시 `apps/api`, `apps/ai`를 수정하지 않는다.
- NestJS 작업 시 `apps/web`, `apps/ai`를 수정하지 않는다.
- FastAPI 작업 시 `apps/web`, `apps/api`를 수정하지 않는다.
- 여러 영역에 영향이 필요한 경우 `packages/shared`의 계약을 먼저 수정하고 후속 작업을 분리한다.

## React

기능 단위로 분리한다.

```text
features/
  presentation/
    components/
    hooks/
    api/
    types/
    utils/
```

- UI 컴포넌트와 도메인 로직을 분리한다.
- 서버 상태, 클라이언트 상태, 실시간 세션 상태를 구분한다.
- 발표 중 화면은 로딩, 연결 끊김, 재연결 상태를 처리한다.
- 화면 전용 컴포넌트는 해당 feature 내부에 둔다.
- 여러 화면에서 재사용하는 UI는 `packages/ui`에 둔다.
- API 호출 로직은 컴포넌트 안에 직접 작성하지 않는다.
- 백엔드 API 계약 변경 없이 응답 형태를 임의로 가정하지 않는다.

## NestJS

모듈 단위로 분리한다.

```text
presentation/
  presentation.module.ts
  presentation.controller.ts
  presentation.service.ts
  dto/
  entities/
  repositories/
```

- Controller는 요청/응답만 처리한다.
- Service는 비즈니스 로직을 담당한다.
- DTO는 API 입출력 계약으로 사용한다.
- DB 모델을 API 응답으로 직접 반환하지 않는다.
- 인증, 권한, 세션 소유권 검사는 API 경계에서 처리한다.
- API 계약 변경은 `AGENTS.md`와 `docs/conventions/api-contracts.md` 기준에 맞춰 처리한다.

## FastAPI

관심사 기준으로 분리한다.

```text
app/
  routers/
  services/
  schemas/
  models/
  clients/
```

- Router는 HTTP 경계만 담당한다.
- Service는 AI 처리 흐름과 비즈니스 로직을 담당한다.
- Schema는 request/response 검증에 사용한다.
- 외부 모델/API 호출은 `clients/`로 분리한다.
- AI 모델 출력은 신뢰하지 말고 스키마로 검증한다.
- transcript, intent, slide action은 분리해서 다룬다.
- OCR/RAG/컨텍스트 생성 결과는 구조화된 JSON으로 반환한다.
- NestJS와 통신하는 request/response는 문서화된 스키마를 따른다.

## 디자인 패턴 기준

- 기본 구조는 Layered Architecture를 따른다.
- NestJS는 Dependency Injection을 기본으로 사용한다.
- 외부 API, AI 모델, OCR 엔진은 Adapter 패턴으로 감싼다.
- 슬라이드 매칭 알고리즘이나 답변 전략이 여러 개라면 Strategy 패턴을 사용한다.
- 객체 생성 로직이 복잡할 때만 Factory 패턴을 사용한다.
- Repository 패턴은 DB 접근 로직이 복잡하거나 테스트 격리가 필요할 때 사용한다.
- 단순한 기능에 불필요한 패턴을 적용하지 않는다.
