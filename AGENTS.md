# AGENTS.md

이 파일은 상세 설명이 아니라 에이전트가 이 저장소에서 반드시 지켜야 하는 필수 규칙의 최상위 기준이다.
자세한 설명과 예시는 [docs/conventions/](docs/conventions/) 문서를 따른다.

## 목적과 우선순위

- 규칙이 충돌하면 `AGENTS.md`를 `docs/conventions/`보다 우선한다.
- 요청 범위를 벗어난 리팩터링, 파일 이동, 대량 포맷팅을 하지 않는다.
- 사용자가 명시적으로 요청하지 않은 외부 서비스, Jira, Git 원격 상태 변경을 하지 않는다.

## 작업 범위와 앱 경계

- 요청받은 범위 밖의 파일을 수정하지 않는다.
- 프론트엔드 작업 시 `apps/api`, `apps/ai`를 수정하지 않는다.
- NestJS 작업 시 `apps/web`, `apps/ai`를 수정하지 않는다.
- FastAPI 작업 시 `apps/web`, `apps/api`를 수정하지 않는다.
- 여러 영역에 영향이 필요한 경우 `packages/shared`의 계약을 먼저 수정하고 후속 작업을 분리한다.
- 저장소 구조와 앱 경계의 세부 기준은 [docs/conventions/architecture.md](docs/conventions/architecture.md)를 따른다.

## API 계약 필수 규칙

- 공통 DTO, 이벤트 타입, API request/response 타입은 `packages/shared`를 기준으로 정의한다.
- API 호출, DTO, 이벤트 타입을 임의로 가정하지 않는다.
- API 계약을 변경할 때는 구현 코드와 함께 `docs/api`의 명세를 갱신한다.
- NestJS와 FastAPI 사이에서 주고받는 request/response 스키마는 `docs/api`에 문서화한다.
- API 계약 변경이 하위 호환성을 깨는 경우 PR 설명에 변경 범위와 영향을 명시한다.
- 세부 기준은 [docs/conventions/api-contracts.md](docs/conventions/api-contracts.md)를 따른다.

## Git, PR, Jira 필수 규칙

- Git 전략은 GitHub Flow를 따른다.
- `main`에 직접 커밋하지 않는다.
- 모든 작업은 브랜치에서 진행하고 PR로 병합한다.
- 이미 push된 공유 브랜치에는 rebase 또는 force push를 하지 않는다.
- 커밋 메시지는 `<type>: <한국어 제목>` 형식을 사용한다.
- PR에는 실행한 테스트 명령과 결과를 남긴다.
- 브랜치명, PR 제목, PR 본문, 커밋 본문 어디에서도 Jira 키를 찾을 수 없으면 커밋하지 않고 사용자에게 이슈 키를 요청한다.
- 작업 시작 전 Jira 담당자를 지정한다. 담당자가 비어 있으면 임의로 선택하지 않고 사용자에게 확인한다.
- Jira 상태 변경은 사용자가 명시적으로 요청했거나 CI/중앙 자동화가 수행할 때만 한다.
- Git과 PR 세부 기준은 [docs/conventions/git-and-pr.md](docs/conventions/git-and-pr.md), Jira 추적 세부 기준은 [docs/conventions/jira.md](docs/conventions/jira.md)를 따른다.

## 코드와 테스트 필수 규칙

- 불필요한 추상화보다 명확한 구조를 우선한다.
- 하나의 함수, 클래스, 모듈은 하나의 책임만 갖는다.
- 외부 입력은 반드시 검증한다.
- 에러는 무시하지 않고 호출자가 이해할 수 있는 형태로 처리한다.
- 코드 주석은 한국어로 작성하되, 코드만으로 의도가 명확하면 주석을 쓰지 않는다.
- 공통 로직은 단위 테스트를 작성한다.
- API 계약 변경 시 관련 테스트를 추가하거나 수정한다.
- 버그 수정 시 재발 방지 테스트를 추가한다.
- 테스트를 실행하지 못한 경우 PR에 미실행 사유와 남은 검증 범위를 남긴다.
- 세부 기준은 [docs/conventions/engineering.md](docs/conventions/engineering.md)를 따른다.

## 금지 사항

- `.env`, API 키, 토큰을 커밋하지 않는다.
- `node_modules`, `dist`, 빌드 산출물을 커밋하지 않는다.
- 공개 브랜치에 force push하지 않는다.
- 사용자가 요청하지 않은 외부 서비스, Jira, Git 원격 상태 변경을 하지 않는다.

## 상세 문서

- 앱 경계와 구조: [docs/conventions/architecture.md](docs/conventions/architecture.md)
- API 계약 관리: [docs/conventions/api-contracts.md](docs/conventions/api-contracts.md)
- GitHub Flow, 커밋, PR: [docs/conventions/git-and-pr.md](docs/conventions/git-and-pr.md)
- Jira 추적: [docs/conventions/jira.md](docs/conventions/jira.md)
- 코드 스타일과 테스트: [docs/conventions/engineering.md](docs/conventions/engineering.md)
