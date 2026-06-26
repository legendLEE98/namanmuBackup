# Frontend Structure

이 프론트엔드는 발표자료 편집기를 중심으로 구성되어 있으며, 기능 단위는 `features/deck-editor` 아래에 모았습니다.

## 분류 기준

- `features/`: 화면 단위 기능을 묶는 영역입니다. 현재는 발표자료 편집 기능인 `deck-editor`가 들어 있습니다.
- `components/`: 특정 기능 전체를 조립하는 React UI 컴포넌트입니다.
- `canvas/`: Konva 기반 캔버스 편집 기능입니다. 도형 렌더링, 선택, 드래그, 변형, 우클릭 메뉴 같은 캔버스 내부 상호작용을 담당합니다.
- `model/`: 캔버스에서 사용하는 순수 데이터/계산 로직입니다. React나 Konva에 직접 의존하지 않는 값을 둡니다.
- `tools/`: 선택 도구, 도형 생성 도구처럼 사용자 입력을 특정 편집 동작으로 해석하는 로직입니다.
- `hooks/`: 캔버스에서 반복적으로 쓰는 React 상태/이벤트 훅입니다.

## 주요 경로

### `src/App.tsx`

앱의 최상위 상태와 API 연동을 관리합니다.

- 프레젠테이션 생성/저장/내보내기
- 문서 모델 상태
- 선택 상태
- undo/redo
- 복사/붙여넣기/그룹화 같은 편집 액션

화면 자체는 `features/deck-editor/components/editor-shell.tsx`로 넘깁니다.

### `src/features/deck-editor/components/`

편집기 UI를 조립하는 컴포넌트 영역입니다.

- `editor-shell.tsx`: 편집기 전체 화면을 조립합니다. 상단 바, 슬라이드 목록, 캔버스, 오른쪽 사이드바를 연결합니다.
- `top-toolbar.tsx`: 상단 툴바를 외부에서 따로 import할 수 있도록 export합니다.
- `right-sidebar.tsx`: 오른쪽 Orbit AI 사이드바를 외부에서 따로 import할 수 있도록 export합니다.

### `src/features/deck-editor/canvas/components/`

Konva 캔버스의 렌더링 컴포넌트입니다.

- `canvas.tsx`: 캔버스의 핵심 컴포넌트입니다. Stage, Layer, 객체 렌더링, 선택, 드래그, 우클릭 메뉴, 텍스트 편집 오버레이를 관리합니다.
- `canvas-viewport.tsx`: 캔버스 외곽 래퍼입니다. 스케일된 Stage 크기와 드로잉 커서를 담당합니다.
- `konva-transformer.tsx`: 선택 객체의 resize/rotate Transformer를 담당합니다.

### `src/features/deck-editor/canvas/components/shape/`

도형과 선택 표시처럼 작은 캔버스 요소를 분리한 영역입니다.

- `ellipse-shape.tsx`: ellipse 도형 렌더링입니다.
- `draft-ellipse.tsx`: 드래그 중인 임시 도형/텍스트 영역 표시입니다.
- `selection-rect.tsx`: 드래그 선택 영역 표시입니다.

### `src/features/deck-editor/canvas/tools/`

사용자 입력을 편집 동작으로 바꾸는 도구 로직입니다.

- `tool-types.ts`: 도구 공통 상수입니다. 예를 들어 45도 회전 스냅 값을 둡니다.
- `selection-tool.ts`: 드래그 선택 영역 안에 들어오는 객체 id를 계산합니다.
- `ellipse-tool.ts`: 도형 드래그 생성 시 사용할 사각형 계산 로직입니다.

### `src/features/deck-editor/canvas/model/`

캔버스 도메인의 순수 모델/계산 로직입니다.

- `types.ts`: 캔버스 기본 크기 같은 공통 모델 값을 둡니다.
- `geometry.ts`: 사각형 정규화, 교차 판정 등 좌표 계산을 담당합니다.
- `fill.ts`: 배경 객체 판정처럼 객체 속성 기반의 순수 판정을 담당합니다.

### `src/features/deck-editor/canvas/hooks/`

캔버스 전용 React 훅입니다.

- `use-canvas-shapes.ts`: Stage 스케일 계산을 담당합니다.
- `use-canvas-shortcuts.ts`: Shift 키 상태처럼 캔버스 단축키 상태를 관리합니다.

### `src/components/`

아직 deck-editor feature 안으로 완전히 옮기지 않은 공용/기존 컴포넌트입니다.

- `SpeakerNotes.tsx`: 발표자 노트 패널입니다.
- `SuggestionsPanel.tsx`: AI 추천 제안 목록입니다.
- `Inspector.tsx`: 현재 사이드바에서는 제거되었지만, 객체 속성 편집 UI로 남아 있습니다.

### `src/utils/`

앱 전역에서 쓰는 순수 유틸리티입니다.

- `document.ts`: 문서 생성, JSON patch 적용, 다운로드, clone/id 생성 같은 문서 편집 유틸입니다.

### `src/constants.ts`

프론트 공통 상수입니다.

- 슬라이드 크기
- undo history 제한
- 도형 팔레트 목록
- 생성 상태 라벨

## 현재 방향

현재 구조는 기존 기능을 유지하면서 파일 책임을 나누는 1차 분리입니다.

다음 단계에서 더 정리한다면:

- `editor-shell.tsx` 안의 `SlideRail`, `EditorToolbar`를 별도 파일로 분리
- `canvas.tsx` 안의 우클릭 메뉴를 `context-menu.tsx`로 분리
- `ShapeNode`, `ChartNode`, `InlineTextEditor`를 개별 컴포넌트로 분리
- `App.jsx`의 편집 액션들을 `use-deck-editor-state` 같은 훅으로 분리
