import { createPortal } from "react-dom";
import { ACTIVE_SHAPE_TOOLS, STEP_LABELS } from "../../../constants";
import { KonvaSlideEditor } from "../canvas/components/canvas";
import { ScriptPanel } from "../../../components/SpeakerNotes";
import { SuggestionsPanel } from "../../../components/SuggestionsPanel";

export function TopBar({ documentModel, onExportPptx }) {
  return (
    <header className="app-topbar">
      <div className="brand-cluster">
        <img className="brand-mark" src="/brand-icon.png" alt="" />
        <button className="top-icon-button" type="button" title="Home">⌂</button>
        <span className="deck-title">{documentModel?.title || "음성 인식 기술 제안서"}</span>
        <span className="save-state">저장됨</span>
      </div>
      <div className="top-actions">
        <span className="user-label">알렉스</span>
        <span className="avatar">김</span>
        <button className="mode-button active" type="button">편집</button>
        <button className="mode-button" type="button">보기</button>
        <button className="outline-button" type="button">리허설</button>
        <button className="outline-button" type="button">AI 리포트</button>
        <button className="primary-top-button" type="button" onClick={onExportPptx} disabled={!documentModel}>프레젠테이션</button>
      </div>
    </header>
  );
}

export function GeneratorPanel({ form, status, progress, isGenerating, onGenerate, onUpdateForm, onLoadReferenceFile }) {
  return (
    <section className="generator-panel" aria-label="PPT generation">
      <div className="panel-title">
        <h1>새 프레젠테이션 만들기</h1>
        <p>주제를 입력하면 편집 가능한 발표자료 초안을 생성합니다.</p>
      </div>
      <form className="generation-form" onSubmit={onGenerate}>
        <label className="field field-wide">
          <span>발표 주제</span>
          <textarea value={form.prompt} rows={4} required onChange={(event) => onUpdateForm("prompt", event.target.value)} />
        </label>
        <label className="field">
          <span>대상 청중</span>
          <input value={form.audience} onChange={(event) => onUpdateForm("audience", event.target.value)} />
        </label>
        <label className="field">
          <span>발표 시간</span>
          <input type="number" min="1" max="120" value={form.durationMinutes} onChange={(event) => onUpdateForm("durationMinutes", Number(event.target.value))} />
        </label>
        <label className="field">
          <span>슬라이드 수</span>
          <input type="number" min="3" max="12" value={form.slideCount} onChange={(event) => onUpdateForm("slideCount", Number(event.target.value))} />
        </label>
        <label className="field">
          <span>톤</span>
          <select value={form.tone} onChange={(event) => onUpdateForm("tone", event.target.value)}>
            <option value="professional">Professional</option>
            <option value="simple">Simple</option>
            <option value="persuasive">Persuasive</option>
            <option value="educational">Educational</option>
          </select>
        </label>
        <label className="field">
          <span>언어</span>
          <select value={form.language} onChange={(event) => onUpdateForm("language", event.target.value)}>
            <option value="ko">한국어</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="field">
          <span>템플릿</span>
          <select value={form.templateId} onChange={(event) => onUpdateForm("templateId", event.target.value)}>
            <option value="executive">Executive Focus</option>
            <option value="clarity">Clarity Lab</option>
            <option value="pitch">Pitch Room</option>
          </select>
        </label>
        <label className="field field-wide">
          <span>참고자료</span>
          <textarea value={form.referenceText} rows={3} placeholder="요약, 메모, 회의록, 수치 자료를 붙여넣으세요." onChange={(event) => onUpdateForm("referenceText", event.target.value)} />
        </label>
        <label className="file-field">
          <input type="file" accept=".txt,.md,.csv,.json" onChange={onLoadReferenceFile} />
          <span>참고자료 파일 불러오기</span>
        </label>
        <button className="primary-action" type="submit" disabled={isGenerating}>
          {isGenerating ? "생성 중" : "발표자료 생성"}
        </button>
      </form>
      {status && (
        <div className="status-panel">
          <div className="status-row">
            <strong>{STEP_LABELS[status.step] || status.step || "진행 중"}</strong>
            <span>{progress}%</span>
          </div>
          <div className="progress-track">
            <div className={`progress-fill ${status.status === "failed" ? "failed" : ""}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </section>
  );
}

export function EditorWorkspace(props) {
  const {
    documentModel,
    slide,
    currentSlideIndex,
    selectedObjectId,
    selectedObjectIds,
    editingTextObjectId,
    activeShapeTool,
    activeTextTool,
    isShapePaletteOpen,
    shapePalettePosition,
    undoStack,
    redoStack,
    nodeRefs,
    stageRef,
    transformerRef,
    shapeButtonRef,
    setCurrentSlideIndex,
    setSelectedObjectId,
    setSelectedObjectIds,
    setIsShapePaletteOpen,
    setActiveShapeTool,
    setActiveTextTool,
    addSlide,
    addTextObject,
    addChartObject,
    undo,
    redo,
    saveDocument,
    exportPng,
    exportPdf,
    exportJson,
    createShapeObject,
    createTextObject,
    handleDragStart,
    handleDragEnd,
    handleMultiDragEnd,
    handleTransformStart,
    handleTransformEnd,
    editTextInline,
    commitInlineText,
    cancelInlineText,
    reorderObject,
    cutObject,
    copyObject,
    pasteObject,
    deleteObject,
    groupSelectedObjects,
    ungroupObject,
    canGroup,
    isGroupedObject,
    canPaste,
    updateSpeakerScript,
    approveSuggestion,
    rejectSuggestion,
  } = props;

  return (
    <section className="editor-panel" aria-label="Presentation editor">
      <SlideRail
        slides={documentModel.slides}
        currentSlideIndex={currentSlideIndex}
        onAddSlide={addSlide}
        onSelectSlide={(index) => {
          setCurrentSlideIndex(index);
          setSelectedObjectId(null);
        }}
      />

      <section className="stage-pane">
        <EditorToolbar
          undoStack={undoStack}
          redoStack={redoStack}
          activeShapeTool={activeShapeTool}
          activeTextTool={activeTextTool}
          isShapePaletteOpen={isShapePaletteOpen}
          shapePalettePosition={shapePalettePosition}
          shapeButtonRef={shapeButtonRef}
          onUndo={undo}
          onRedo={redo}
          onAddText={addTextObject}
          onAddChart={addChartObject}
          onSave={saveDocument}
          onExportPng={exportPng}
          onExportPdf={exportPdf}
          onExportJson={exportJson}
          onToggleShapePalette={() => {
            setActiveTextTool(false);
            setIsShapePaletteOpen((current) => !current);
          }}
          onSelectShape={(shape) => {
            setActiveShapeTool(shape);
            setActiveTextTool(false);
            setIsShapePaletteOpen(false);
          }}
        />
        <div className="canvas-scroll">
          <KonvaSlideEditor
            currentSlide={slide}
            selectedObjectId={selectedObjectId}
            selectedObjectIds={selectedObjectIds}
            setSelectedObjectId={setSelectedObjectId}
            setSelectedObjectIds={setSelectedObjectIds}
            nodeRefs={nodeRefs}
            stageRef={stageRef}
            transformerRef={transformerRef}
            theme={documentModel.theme}
            editingTextObjectId={editingTextObjectId}
            activeShapeTool={activeShapeTool}
            activeTextTool={activeTextTool}
            onShapeToolDone={() => setActiveShapeTool(null)}
            onCreateShape={createShapeObject}
            onTextToolDone={() => setActiveTextTool(false)}
            onCreateText={createTextObject}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onMultiDragEnd={handleMultiDragEnd}
            onTransformStart={handleTransformStart}
            onTransformEnd={handleTransformEnd}
            onTextDblClick={editTextInline}
            onTextEditCommit={commitInlineText}
            onTextEditCancel={cancelInlineText}
            onOrderObject={reorderObject}
            onCutObject={cutObject}
            onCopyObject={copyObject}
            onPasteObject={pasteObject}
            onDeleteObject={deleteObject}
            onGroupObjects={groupSelectedObjects}
            onUngroupObject={ungroupObject}
            canGroup={canGroup}
            isGroupedObject={isGroupedObject}
            canPaste={canPaste}
          />
          <ScriptPanel slide={slide} onUpdate={updateSpeakerScript} />
        </div>
      </section>

      <RightSidebar
        slide={slide}
        onApprove={approveSuggestion}
        onReject={rejectSuggestion}
      />
    </section>
  );
}

function SlideRail({ slides, currentSlideIndex, onAddSlide, onSelectSlide }) {
  return (
    <aside className="slides-pane">
      <button className="add-slide-button" type="button" onClick={onAddSlide}>+ 슬라이드</button>
      <div className="slides-list">
        {slides.map((item, index) => (
          <button
            className={`slide-item ${index === currentSlideIndex ? "active" : ""}`}
            key={item.id}
            type="button"
            onClick={() => onSelectSlide(index)}
          >
            <span className="slide-number">{index + 1}</span>
            <span className="slide-title">{item.title}</span>
            <span className="slide-thumb" />
          </button>
        ))}
      </div>
      <div className="side-footer">
        <button type="button">▣</button>
        <button type="button">≡</button>
      </div>
    </aside>
  );
}

function EditorToolbar({
  undoStack,
  redoStack,
  activeShapeTool,
  activeTextTool,
  isShapePaletteOpen,
  shapePalettePosition,
  shapeButtonRef,
  onUndo,
  onRedo,
  onAddText,
  onAddChart,
  onSave,
  onExportPng,
  onExportPdf,
  onExportJson,
  onToggleShapePalette,
  onSelectShape,
}) {
  return (
    <div className="editor-toolbar">
      <div className="tool-group">
        <button className="text-tool" type="button">☰ 메뉴</button>
        <span className="toolbar-divider" />
        <button className="icon-button" type="button" title="Undo" disabled={undoStack.length === 0} onClick={onUndo}>‹</button>
        <button className="icon-button" type="button" title="Redo" disabled={redoStack.length === 0} onClick={onRedo}>›</button>
        <button className="icon-button selected-tool" type="button" title="Select">⌖</button>
        <button className={`tool-button ${activeTextTool ? "active" : ""}`} type="button" onClick={onAddText}>Text</button>
        <div className="shape-tool-wrap">
          <button
            ref={shapeButtonRef}
            className={`tool-button ${activeShapeTool ? "active" : ""}`}
            type="button"
            onClick={onToggleShapePalette}
          >
            도형
          </button>
          {isShapePaletteOpen && createPortal(
            <div className="shape-palette" style={{ left: shapePalettePosition.left, top: shapePalettePosition.top }}>
              {ACTIVE_SHAPE_TOOLS.map(([shape]) => (
                <button
                  className={activeShapeTool === shape ? "active" : ""}
                  key={shape}
                  type="button"
                  title={shape}
                  onClick={() => onSelectShape(shape)}
                >
                  <ShapeToolIcon shape={shape} />
                </button>
              ))}
            </div>,
            document.body,
          )}
        </div>
        <button className="tool-button" type="button">선</button>
        <button className="tool-button" type="button">이미지</button>
        <button className="tool-button" type="button">표</button>
        <button className="tool-button" type="button" onClick={onAddChart}>차트</button>
      </div>
      <div className="tool-group">
        <button className="tool-button" type="button" onClick={onSave}>저장</button>
        <button className="tool-button" type="button" onClick={onExportPng}>PNG</button>
        <button className="tool-button" type="button" onClick={onExportPdf}>PDF</button>
        <button className="tool-button" type="button" onClick={onExportJson}>JSON</button>
      </div>
    </div>
  );
}

function ShapeToolIcon({ shape }) {
  return (
    <svg className="shape-tool-icon" viewBox="0 0 24 24" aria-hidden="true">
      {shapeSvg(shape)}
    </svg>
  );
}

function shapeSvg(shape) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinejoin: "round", strokeLinecap: "round" } as const;

  const polygon = (points) => <polygon points={points} {...common} />;
  const path = (d, extra = {}) => <path d={d} {...common} {...extra} />;

  return ({
    rect: <rect x="4" y="5" width="16" height="14" {...common} />,
    roundRect: <rect x="4" y="5" width="16" height="14" rx="3.5" {...common} />,
    ellipse: <ellipse cx="12" cy="12" rx="8" ry="6.5" {...common} />,
    triangle: polygon("12,4 20,20 4,20"),
    rightTriangle: polygon("5,4 20,20 5,20"),
    diamond: polygon("12,3.5 20.5,12 12,20.5 3.5,12"),
    pentagon: polygon("12,3.5 20,9.5 17,20 7,20 4,9.5"),
    hexagon: polygon("8,4 16,4 21,12 16,20 8,20 3,12"),
    octagon: polygon("8,4 16,4 20,8 20,16 16,20 8,20 4,16 4,8"),
    parallelogram: polygon("8,5 21,5 16,19 3,19"),
    trapezoid: polygon("4,5 20,5 17,19 7,19"),
    chevron: polygon("4,5 10,5 20,12 10,19 4,19 14,12"),
    arrowRight: polygon("3,8 13,8 13,4 21,12 13,20 13,16 3,16"),
    arrowLeft: polygon("21,8 11,8 11,4 3,12 11,20 11,16 21,16"),
    plus: path("M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"),
    star: polygon("12,3.5 14.3,9 20.2,9.3 15.7,13.1 17.1,19 12,15.8 6.9,19 8.3,13.1 3.8,9.3 9.7,9"),
    cloud: path("M7.2 18h10.1a4.2 4.2 0 0 0 .1-8.4 6 6 0 0 0-11.1 1.8A3.4 3.4 0 0 0 7.2 18z"),
    heart: path("M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"),
    smile: (
      <>
        <circle cx="12" cy="12" r="8" {...common} />
        <circle cx="9" cy="10" r="0.9" fill="currentColor" />
        <circle cx="15" cy="10" r="0.9" fill="currentColor" />
        {path("M8.7 14.2c1.6 2 5 2 6.6 0")}
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4.2" {...common} />
        {Array.from({ length: 10 }, (_, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 10;
          const x1 = 12 + Math.cos(angle) * 5.4;
          const y1 = 12 + Math.sin(angle) * 5.4;
          const x2 = 12 + Math.cos(angle) * 9;
          const y2 = 12 + Math.sin(angle) * 9;
          return <line key={`sun-ray-${index}`} x1={x1} y1={y1} x2={x2} y2={y2} {...common} />;
        })}
      </>
    ),
  })[shape] || polygon("5,5 19,5 19,19 5,19");
}

export function RightSidebar({ slide, onApprove, onReject }) {
  return (
    <aside className="ai-pane">
      <div className="ai-header">
        <h2>✨ Orbit AI</h2>
        <div>
          <button type="button">···</button>
          <button type="button">×</button>
        </div>
      </div>
      <div className="analysis-card">
        <span className="check-badge">✓</span>
        <div>
          <strong>발표 내용 분석 완료</strong>
          <p>발표 전체를 분석했어요. 개선하면 좋을 요소를 추천해 드릴게요.</p>
        </div>
      </div>
      <SuggestionsPanel slide={slide} onApprove={onApprove} onReject={onReject} />
      <div className="ai-input">
        <textarea placeholder="추가하고 싶은 자동 효과를 입력해주세요." />
        <div>
          <button type="button">+</button>
          <button className="send-button" type="button">➤</button>
        </div>
      </div>
    </aside>
  );
}
