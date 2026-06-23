import { useState } from "react";
import { useSlideKeywords } from "../scripts/use-slide-keywords";
import { useSlideScripts } from "../scripts/use-slide-scripts";
import { CanvasViewport } from "./canvas/components/canvas-viewport";
import { useCanvasShapes } from "./canvas/hooks/use-canvas-shapes";
import { useCanvasShortcuts } from "./canvas/hooks/use-canvas-shortcuts";
import type { CanvasTool } from "./canvas/model/types";
import { RightSidebar } from "./components/right-sidebar";
import { TopToolbar } from "./components/top-toolbar";

const EDITOR_DECK_ID = "deck-editor";
const EDITOR_PAGE_ID = "page-1";

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function DeckEditorPage() {
  const selectedSlideId = EDITOR_PAGE_ID;
  const [activeTool, setActiveTool] = useState<CanvasTool>("select");
  const [isFillPopoverOpen, setIsFillPopoverOpen] = useState(false);
  const {
    activeFill,
    activeOpacity,
    activeRgb,
    addEllipse,
    deleteSelectedEllipses,
    duplicateSelectedEllipses,
    ellipses,
    selectedEllipseIds,
    setEllipses,
    setSelectedEllipseIds,
    shapeFill,
    updateShapeFill
  } = useCanvasShapes();
  const {
    scriptsBySlideId,
    draftBody,
    validationErrors,
    hasUnsavedChanges,
    setDraftBody,
    saveDraft,
    cancelDraft,
    clearScript
  } = useSlideScripts(EDITOR_DECK_ID, selectedSlideId);
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
  } = useSlideKeywords(EDITOR_DECK_ID, selectedSlideId);
  const currentScript = scriptsBySlideId[selectedSlideId] ?? null;
  const currentKeywords = keywordsBySlideId[selectedSlideId] ?? [];

  useCanvasShortcuts({
    hasSelection: selectedEllipseIds.length > 0,
    onDeleteSelection: deleteSelectedEllipses
  });

  return (
    <main className="app-shell">
      <aside className="slide-rail page-rail" aria-label="Add page">
        <button className="add-page-button" type="button" aria-label="Add page">
          +
        </button>
      </aside>

      <section className="editor-surface" aria-labelledby="script-title">
        <header className="editor-header">
          <div>
            <p>Page 1</p>
            <h1 id="script-title">Editor canvas</h1>
          </div>
          <div className="header-actions">
            <div className="script-status">
              <span>{currentScript ? `v${currentScript.revision}` : "New script"}</span>
              <strong>{ellipses.length}</strong>
            </div>
          </div>
        </header>

        <TopToolbar
          activeFill={activeFill}
          activeOpacity={activeOpacity}
          activeRgb={activeRgb}
          activeTool={activeTool}
          hasSelection={selectedEllipseIds.length > 0}
          isFillPopoverOpen={isFillPopoverOpen}
          onDuplicate={duplicateSelectedEllipses}
          onFillPopoverOpenChange={setIsFillPopoverOpen}
          onToolChange={setActiveTool}
          onUpdateFill={updateShapeFill}
        />

        <div className="workspace-grid">
          <CanvasViewport
            activeTool={activeTool}
            addEllipse={addEllipse}
            ellipses={ellipses}
            selectedEllipseIds={selectedEllipseIds}
            setActiveTool={setActiveTool}
            setEllipses={setEllipses}
            setSelectedEllipseIds={setSelectedEllipseIds}
            shapeFill={shapeFill}
          />

          <RightSidebar
            currentKeywords={currentKeywords}
            currentScript={currentScript}
            draftBody={draftBody}
            hasUnsavedChanges={hasUnsavedChanges}
            isRequired={isRequired}
            keywordErrors={keywordErrors}
            keywordText={keywordText}
            validationErrors={validationErrors}
            addKeyword={addKeyword}
            cancelDraft={cancelDraft}
            clearScript={clearScript}
            formatUpdatedAt={formatUpdatedAt}
            removeKeyword={removeKeyword}
            saveDraft={saveDraft}
            setDraftBody={setDraftBody}
            setIsRequired={setIsRequired}
            setKeywordText={setKeywordText}
            toggleKeywordRequired={toggleKeywordRequired}
            updateKeywordText={updateKeywordText}
          />
        </div>
      </section>
    </main>
  );
}
