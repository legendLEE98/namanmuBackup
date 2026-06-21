# AGENTS.md

이 문서는 에이전트가 이 저장소에서 작업할 때 반드시 지켜야 하는 최소 규칙이다.
자세한 설명과 예시는 [docs/conventions/](docs/conventions/) 문서를 따른다.

## 우선순위

- 규칙이 충돌하면 `AGENTS.md`를 `docs/conventions/`보다 우선한다.
- 사용자가 프롬프트에서 명시적으로 요청하지 않는 한 gstack, ouroboros, Ollama의 외부 도구나 스킬을 사용하지 않는다.
- 요청 범위를 벗어난 리팩터링, 파일 이동, 대량 포맷팅을 하지 않는다.

## 프로젝트 개요

AI 기반 실시간 발표 보조 플랫폼이다.

- `apps/web`: React TS 발표자 화면, 청중 화면, 에디터
- `apps/api`: NestJS 제품 API, 인증, 발표자료, 세션, 질문, 리포트
- `apps/ai`: FastAPI 음성인식, OCR, RAG, 발표 컨텍스트 생성
- `packages/shared`: 공통 타입, API DTO, 이벤트 타입
- `packages/ui`: 공통 UI 컴포넌트

## 작업 범위

- 요청받은 범위 밖의 파일을 수정하지 않는다.
- 프론트엔드 작업 시 `apps/api`, `apps/ai`를 수정하지 않는다.
- NestJS 작업 시 `apps/web`, `apps/ai`를 수정하지 않는다.
- FastAPI 작업 시 `apps/web`, `apps/api`를 수정하지 않는다.
- 여러 영역에 영향이 필요한 경우 `packages/shared`의 계약을 먼저 수정하고 후속 작업을 분리한다.
- API 호출, DTO, 이벤트 타입을 임의로 가정하지 않는다.

## API 계약

- 공통 DTO, 이벤트 타입, API request/response 타입은 `packages/shared`를 기준으로 정의한다.
- API 계약을 변경할 때는 구현 코드와 함께 `docs/api`의 명세를 갱신한다.
- NestJS와 FastAPI 사이에서 주고받는 request/response 스키마는 `docs/api`에 문서화한다.
- API 계약 변경이 하위 호환성을 깨는 경우 PR 설명에 변경 범위와 영향을 명시한다.
- 세부 기준은 [docs/conventions/api-contracts.md](docs/conventions/api-contracts.md)를 따른다.

## Git 및 PR

- Git 전략은 GitHub Flow를 따른다.
- `main`에 직접 커밋하지 않는다.
- 모든 작업은 브랜치에서 진행하고 PR로 병합한다.
- 이미 push된 공유 브랜치에는 rebase 또는 force push를 하지 않는다.
- 커밋 메시지는 `<type>: <한국어 제목>` 형식을 사용한다.
- PR에는 실행한 테스트 명령과 결과를 남긴다.
- 세부 기준은 [docs/conventions/git-and-pr.md](docs/conventions/git-and-pr.md)를 따른다.

## Jira 추적

- Jira 프로젝트 키는 `PPT`를 사용한다.
- 상태는 `할 일`, `Selected for Development`, `진행 중`, `검토중`, `완료`를 사용한다.
- 브랜치와 PR은 기능 이슈 단위로 만든다.
- 기능 이슈는 `Epic` 자체가 아니라 `Epic` 바로 아래의 `새 기능` 또는 기능성 `작업`, `버그`, `개선`등을 의미한다. 예: `PPT-37 실시간 음성인식`, `PPT-38 음성 기반 슬라이드 제어`
- 커밋은 해당 기능 이슈에 포함되는 `하위 작업` 단위로 나눈다.
- 브랜치명에는 기능 이슈 키를 포함한다. 예: `feature/PPT-37-realtime-stt`
- PR 제목에는 기능 이슈 키를 포함한다. 예: `[PPT-37] 실시간 음성인식 구현`
- PR 본문에는 기능 이슈와 포함된 하위 작업을 남긴다. 예: `Parent: PPT-37`, `Includes: PPT-142, PPT-170, PPT-183`
- 커밋 본문에는 하위 작업 키와 상위 기능 이슈 키를 남긴다. 예: `Jira: PPT-142`, `Parent: PPT-37`
- 자동 상태 변경 대상은 PR 생성 시 `Parent:` 기능 이슈, 병합 시 `Includes:` 하위 작업 이슈를 기준으로 한다.
- 브랜치명, PR 제목, PR 본문, 커밋 본문 어디에서도 Jira 키를 찾을 수 없으면 에이전트는 커밋하지 않고 사용자에게 이슈 키를 요청한다.
- 작업 시작 전 Jira 담당자를 지정한다. 담당자가 비어 있으면 에이전트는 임의로 선택하지 않고 사용자에게 확인한다.
- Jira 상태 변경은 사용자가 명시적으로 요청했거나 CI/중앙 자동화가 수행할 때만 한다.
- PR 생성 시 `진행 중` 또는 `Selected for Development` 상태의 기능 이슈를 `검토중`으로 전환한다.
- 테스트 통과만으로 `완료`로 전환하지 않는다. `완료` 전환은 PR이 `main`에 병합된 뒤 수행한다.
- CI 실패 시 상태를 되돌리지 않고 Jira 댓글이나 PR 코멘트로 실패 사실만 남긴다.
- 자동화 구현 시 transition id를 하드코딩하지 않고 Jira API로 가능한 전환을 조회한 뒤 상태 이름으로 매칭한다.

## 코드 작성

- 불필요한 추상화보다 명확한 구조를 우선한다.
- 하나의 함수, 클래스, 모듈은 하나의 책임만 갖는다.
- 외부 입력은 반드시 검증한다.
- 에러는 무시하지 않고 호출자가 이해할 수 있는 형태로 처리한다.
- 코드 주석은 한국어로 작성하되, 코드만으로 의도가 명확하면 주석을 쓰지 않는다.
- 세부 기준은 [docs/conventions/engineering.md](docs/conventions/engineering.md)와 [docs/conventions/architecture.md](docs/conventions/architecture.md)를 따른다.

## 테스트

- 공통 로직은 단위 테스트를 작성한다.
- API 계약 변경 시 관련 테스트를 추가하거나 수정한다.
- 버그 수정 시 재발 방지 테스트를 추가한다.
- 테스트를 실행하지 못한 경우 PR에 미실행 사유와 남은 검증 범위를 남긴다.

## 금지 사항

- `.env`, API 키, 토큰을 커밋하지 않는다.
- `node_modules`, `dist`, 빌드 산출물을 커밋하지 않는다.
- 공개 브랜치에 force push하지 않는다.
- 사용자가 요청하지 않은 외부 서비스, Jira, Git 원격 상태 변경을 하지 않는다.
