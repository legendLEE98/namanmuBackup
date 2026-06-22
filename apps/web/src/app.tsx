import { useMemo, useState } from "react";
import { SLIDE_SCRIPT_MAX_LENGTH } from "@ai-ppt/shared";
import { PresenterView } from "./features/presenter/presenter-view";
import { DEMO_DECK_ID, DEMO_SLIDES } from "./features/scripts/sample-deck";
import { useSlideKeywords } from "./features/scripts/use-slide-keywords";
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
  const [viewMode, setViewMode] = useState<"prep" | "presenter">("prep");
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
  const {
    keywordsBySlideId,
    keywordText,
    isRequired,
    keywordErrors,
    setKeywordText,
    setIsRequired,
    addKeyword,
    updateKeywordText,
    toggleKeywordRequired,
    removeKeyword
  } = useSlideKeywords(DEMO_DECK_ID, selectedSlideId);
  const currentScript = scriptsBySlideId[selectedSlideId] ?? null;
  const currentKeywords = keywordsBySlideId[selectedSlideId] ?? [];

  const completedCount = useMemo(
    () => DEMO_SLIDES.filter((slide) => Boolean(scriptsBySlideId[slide.slideId])).length,
    [scriptsBySlideId]
  );

  if (viewMode === "presenter") {
    return (
      <main className="presenter-shell">
        <div className="mode-switcher" aria-label="보기 전환">
          <button type="button" onClick={() => setViewMode("prep")}>
            준비
          </button>
          <button className="is-active" type="button" onClick={() => setViewMode("presenter")}>
            발표
          </button>
        </div>
        <PresenterView slides={DEMO_SLIDES} keywordsBySlideId={keywordsBySlideId} />
      </main>
    );
  }

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
            const keywordCount = keywordsBySlideId[slide.slideId]?.length ?? 0;
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
                  <small>{keywordCount > 0 ? `키워드 ${keywordCount}개` : "키워드 없음"}</small>
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
          <div className="header-actions">
            <div className="mode-switcher" aria-label="보기 전환">
              <button className="is-active" type="button" onClick={() => setViewMode("prep")}>
                준비
              </button>
              <button type="button" onClick={() => setViewMode("presenter")}>
                발표
              </button>
            </div>
            <div className="script-status">
              <span>{currentScript ? `v${currentScript.revision}` : "새 스크립트"}</span>
              <strong>{currentScript ? formatDuration(currentScript.estimatedDurationSeconds) : "0:00"}</strong>
            </div>
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

          <div className="editor-column">
            <section className="keyword-panel" aria-label="핵심 키워드">
              <div className="editor-toolbar">
                <div>
                  <strong>핵심 키워드</strong>
                  <span>
                    필수 {currentKeywords.filter((keyword) => keyword.isRequired).length}개 / 선택{" "}
                    {currentKeywords.filter((keyword) => !keyword.isRequired).length}개
                  </span>
                </div>
              </div>

              {currentKeywords.length > 0 ? (
                <ul className="keyword-list">
                  {currentKeywords.map((keyword) => (
                    <li className="keyword-row" key={keyword.keywordId}>
                      <button
                        className={`keyword-type ${keyword.isRequired ? "is-required" : ""}`}
                        type="button"
                        onClick={() => toggleKeywordRequired(keyword.keywordId)}
                      >
                        {keyword.isRequired ? "필수" : "선택"}
                      </button>
                      <input
                        value={keyword.text}
                        onChange={(event) => updateKeywordText(keyword.keywordId, event.target.value)}
                        aria-label={`${keyword.text} 키워드 수정`}
                      />
                      <button className="icon-action" type="button" onClick={() => removeKeyword(keyword.keywordId)} aria-label="키워드 삭제">
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-keywords">이 슬라이드에는 저장된 핵심 키워드가 없습니다.</div>
              )}

              <div className="keyword-form">
                <input
                  value={keywordText}
                  onChange={(event) => setKeywordText(event.target.value)}
                  placeholder="키워드 추가"
                  aria-label="새 키워드"
                />
                <label>
                  <input type="checkbox" checked={isRequired} onChange={(event) => setIsRequired(event.target.checked)} />
                  필수
                </label>
                <button type="button" onClick={addKeyword}>
                  추가
                </button>
              </div>

              {keywordErrors.length > 0 ? (
                <div className="validation-message" role="alert">
                  {keywordErrors.join(" ")}
                </div>
              ) : null}
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
        </div>
      </section>
    </main>
  );
}
