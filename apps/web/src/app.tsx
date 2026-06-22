import { useMemo, useState } from "react";
import { SLIDE_SCRIPT_MAX_LENGTH } from "@ai-ppt/shared";
import { DEMO_DECK_ID, DEMO_SLIDES } from "./features/scripts/sample-deck";
import { useSlideScripts } from "./features/scripts/use-slide-scripts";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function App() {
  const [selectedSlideId, setSelectedSlideId] = useState(DEMO_SLIDES[0].slideId);
  const selectedSlide = DEMO_SLIDES.find((slide) => slide.slideId === selectedSlideId) ?? DEMO_SLIDES[0];
  const {
    scriptsBySlideId,
    draftBody,
    validationErrors,
    hasUnsavedChanges,
    setDraftBody,
    saveDraft,
    cancelDraft,
    clearScript
  } = useSlideScripts(DEMO_DECK_ID, selectedSlideId);
  const currentScript = scriptsBySlideId[selectedSlideId] ?? null;

  const completedCount = useMemo(
    () => DEMO_SLIDES.filter((slide) => Boolean(scriptsBySlideId[slide.slideId])).length,
    [scriptsBySlideId]
  );

  return (
    <main className="app-shell">
      <aside className="slide-rail" aria-label="슬라이드 목록">
        <div className="deck-heading">
          <p>Demo Day</p>
          <strong>{completedCount}/{DEMO_SLIDES.length}</strong>
        </div>
        <nav className="slide-list">
          {DEMO_SLIDES.map((slide) => {
            const script = scriptsBySlideId[slide.slideId];
            const isSelected = selectedSlideId === slide.slideId;

            return (
              <button
                className={`slide-item ${isSelected ? "is-selected" : ""}`}
                type="button"
                key={slide.slideId}
                onClick={() => setSelectedSlideId(slide.slideId)}
                aria-current={isSelected ? "page" : undefined}
              >
                <span className="slide-thumb">{slide.thumbnailLabel}</span>
                <span className="slide-meta">
                  <span>슬라이드 {slide.slideNumber}</span>
                  <strong>{slide.title}</strong>
                </span>
                <span className={`script-dot ${script ? "is-filled" : ""}`} aria-label={script ? "저장됨" : "비어 있음"} />
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="editor-surface" aria-labelledby="script-title">
        <header className="editor-header">
          <div>
            <p>슬라이드 {selectedSlide.slideNumber}</p>
            <h1 id="script-title">{selectedSlide.title}</h1>
          </div>
          <div className="script-status">
            <span>{currentScript ? `v${currentScript.revision}` : "새 스크립트"}</span>
            <strong>{currentScript ? formatDuration(currentScript.estimatedDurationSeconds) : "0:00"}</strong>
          </div>
        </header>

        <div className="workspace-grid">
          <section className="slide-preview" aria-label="슬라이드 미리보기">
            <div className="preview-canvas">
              <span>{selectedSlide.thumbnailLabel}</span>
              <h2>{selectedSlide.title}</h2>
              <p>AI 발표 코파일럿</p>
            </div>
          </section>

          <section className="script-editor" aria-label="스크립트 편집">
            <div className="editor-toolbar">
              <div>
                <strong>발표 스크립트</strong>
                <span>{draftBody.length}/{SLIDE_SCRIPT_MAX_LENGTH}</span>
              </div>
              {currentScript ? <time dateTime={currentScript.updatedAt}>{formatUpdatedAt(currentScript.updatedAt)}</time> : null}
            </div>

            <textarea
              value={draftBody}
              maxLength={SLIDE_SCRIPT_MAX_LENGTH + 1}
              onChange={(event) => setDraftBody(event.target.value)}
              placeholder="이 슬라이드에서 말할 내용을 입력하세요."
              aria-invalid={validationErrors.length > 0}
            />

            {validationErrors.length > 0 ? (
              <div className="validation-message" role="alert">
                {validationErrors.join(" ")}
              </div>
            ) : null}

            <div className="editor-actions">
              <button className="secondary-action" type="button" onClick={cancelDraft} disabled={!hasUnsavedChanges}>
                취소
              </button>
              <button className="danger-action" type="button" onClick={clearScript} disabled={!currentScript && draftBody.length === 0}>
                삭제
              </button>
              <button className="primary-action" type="button" onClick={saveDraft} disabled={!hasUnsavedChanges}>
                저장
              </button>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
