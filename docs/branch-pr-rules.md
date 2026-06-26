# develop 브랜치/PR 규칙

## 브랜치 전략

| 브랜치 | 용도 |
| --- | --- |
| `main` | 최종 안정 버전 |
| `develop` | 1차 스프린트 통합 브랜치 |
| `feature/*` | 개별 기능 개발 브랜치 |

결정 사항:

- `develop` 브랜치는 2026-06-27 안에 만든다.
- 기능 브랜치는 `develop`에서 생성한다.
- PR은 `develop`으로 보낸다.
- 공통 구조 PR을 가장 먼저 `develop`에 병합한다.
- 최종 E2E 통과 후 `develop`을 `main`에 병합한다.

## 기능 브랜치 이름

```txt
feature/ORBIT-번호-기능명
```

예시:

- `feature/ORBIT-10-project-upload`
- `feature/ORBIT-14-deck-schema`
- `feature/ORBIT-26-ai-deck-generation`
- `feature/ORBIT-41-live-session`
- `feature/ORBIT-54-final-report`

## PR 규칙

- 모든 기능 PR의 base 브랜치는 `develop`으로 한다.
- PR 제목에는 가능한 경우 ORBIT 이슈 번호와 기능명을 포함한다.
- PR 본문에는 변경 요약, 테스트/검증 내용, 영향 범위를 적는다.
- 공통 계약을 바꾸는 PR은 `docs/contracts.md` 또는 shared schema 변경을 함께 포함한다.
- 공통 구조 변경이 머지되면 전원에게 공유한다.
- 최종 E2E 통과 전에는 `develop`에서 `main`으로 병합하지 않는다.

## PR 본문 템플릿

```md
## 요약
- 

## 테스트
- 

## 영향 및 위험
- 

## 관련 문서
- 
```

## 금지 사항

- 구현 방식 깊은 토론을 PR에서 처음 시작하지 않는다.
- 라이브러리 재선정, 전체 DB schema 확정, 디자인 논의는 공통 계약 PR의 범위로 넣지 않는다.
- 세부 API path 전체 확정을 이유로 공통 데이터 구조 병합을 지연하지 않는다.
