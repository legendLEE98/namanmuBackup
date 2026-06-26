# Prompt Presentation Studio

프롬프트 기반 발표자료 초안을 생성하고, React/Konva 편집기에서 수정한 뒤 PPTX/PNG/PDF/JSON으로 내보내는 앱입니다.

## Structure

- `backend/`: Nest.js API 서버 모듈
  - `server.mjs`: Nest bootstrap
  - `server/`: Nest module, controller, service
  - `lib/`: presentation schema, generator, PPTX writer
  - `data/`: generated presentation JSON storage
  - `tests/`: backend generation/export tests
- `frontend/`: React.js + Konva editor 모듈
  - `src/`: React/Konva source
  - `public/`: static fallback UI assets
  - `dist/`: Vite production build output

## Commands

```powershell
npm.cmd install
npm.cmd run backend:start
npm.cmd run frontend:dev
npm.cmd run frontend:build
npm.cmd test
```

Backend runs on `http://localhost:5173`.
Frontend dev server runs on `http://127.0.0.1:5174` and proxies `/api` to the backend.
