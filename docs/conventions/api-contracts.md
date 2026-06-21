# API 계약 규칙

이 문서는 API 계약, 공유 타입, NestJS-FastAPI 통신 스키마 관리 기준을 정리한다.
필수 규칙과 충돌하면 `AGENTS.md`를 우선한다.

## 기준 위치

- 공통 DTO, 이벤트 타입, API request/response 타입은 `packages/shared`를 기준으로 정의한다.
- API 계약은 구현 코드와 문서가 함께 갱신되어야 한다.
- API 계약 변경 시 `docs/api`의 명세를 갱신한다.
- `docs/api`는 향후 상세 API 명세를 두는 위치이며, 이 문서는 계약 관리 기준만 다룬다.

## 공유 타입

- 프론트엔드, NestJS, FastAPI 사이에서 공유되는 타입은 임의로 중복 정의하지 않는다.
- 여러 영역에 영향이 필요한 경우 `packages/shared`의 계약을 먼저 수정하고 후속 작업을 분리한다.
- 이벤트 이름은 과거형 또는 명확한 동작명으로 작성한다.
- API 호출부는 백엔드 응답 형태를 임의로 가정하지 않는다.

## NestJS와 FastAPI 통신

- NestJS와 FastAPI 사이에서 주고받는 request/response 스키마는 `docs/api`에 문서화한다.
- FastAPI는 AI 모델 출력을 신뢰하지 말고 스키마 검증을 통과한 값만 반환한다.
- OCR/RAG/컨텍스트 생성 결과는 구조화된 JSON으로 반환한다.
- transcript, intent, slide action은 분리해서 다룬다.
- NestJS는 DB 모델을 API 응답으로 직접 반환하지 않는다.

## 변경 절차

- API 계약 변경 시 구현 코드, 공유 타입, 문서를 같은 작업 범위에서 갱신한다.
- API 계약 변경이 하위 호환성을 깨는 경우 PR 설명에 변경 범위와 영향을 명시한다.
- API 계약 변경 시 관련 테스트를 추가하거나 수정한다.
- 문서 갱신 없이 API request/response 형태를 바꾸지 않는다.
