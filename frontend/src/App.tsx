import { useEffect, useMemo, useRef, useState } from "react";
import { HISTORY_LIMIT } from "./constants";
import { EditorWorkspace, GeneratorPanel, TopBar } from "./features/deck-editor/components/editor-shell";
import {
  applyJsonPatch,
  clone,
  createBlankSlide,
  createId,
  downloadDataUrl,
  downloadFromUrl,
  nextFrame,
  round,
  sleep,
} from "./utils/document";

export function App() {
  const [form, setForm] = useState({
    prompt: "AI 기반 사내 지식 검색 도입 전략을 임원진에게 설득하는 발표",
    audience: "임원진과 팀 리더",
    durationMinutes: 12,
    slideCount: 6,
    tone: "professional",
    language: "ko",
    referenceText: "",
    templateId: "executive",
  });
  const [status, setStatus] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [presentationId, setPresentationId] = useState(null);
  const [documentModel, setDocumentModel] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const [selectedObjectIds, setSelectedObjectIds] = useState([]);
  const [editingTextObjectId, setEditingTextObjectId] = useState(null);
  const [isShapePaletteOpen, setIsShapePaletteOpen] = useState(false);
  const [activeShapeTool, setActiveShapeTool] = useState(null);
  const [activeTextTool, setActiveTextTool] = useState(false);
  const [shapePalettePosition, setShapePalettePosition] = useState({ left: 0, top: 0 });
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [canPasteObject, setCanPasteObject] = useState(false);
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const nodeRefs = useRef({});
  const snapshotRef = useRef(null);
  const shapeButtonRef = useRef(null);
  const clipboardRef = useRef(null);

  const slide = documentModel?.slides?.[currentSlideIndex] ?? null;
  const selectedObject = useMemo(() => {
    if (!slide || !selectedObjectId) {
      return null;
    }
    return slide.objects.find((object) => object.id === selectedObjectId) ?? null;
  }, [slide, selectedObjectId]);

  function selectObject(objectId, additive = false) {
    if (!objectId) {
      setSelectedObjectId(null);
      setSelectedObjectIds([]);
      return;
    }
    const object = slide?.objects.find((item) => item.id === objectId);
    const groupIds = object?.groupId
      ? (slide?.objects || []).filter((item) => item.groupId === object.groupId).map((item) => item.id)
      : [objectId];
    setSelectedObjectId(objectId);
    setSelectedObjectIds((current) => {
      if (!additive) {
        return groupIds;
      }
      return [...new Set([...current, ...groupIds])];
    });
  }

  function selectObjects(objectIds, additive = false) {
    const ids = [...new Set(objectIds.filter(Boolean))];
    if (ids.length === 0) {
      if (!additive) {
        clearSelection();
      }
      return;
    }
    setSelectedObjectIds((current) => (additive ? [...new Set([...current, ...ids])] : ids));
    setSelectedObjectId(ids[ids.length - 1]);
  }

  function clearSelection() {
    setSelectedObjectId(null);
    setSelectedObjectIds([]);
  }

  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target;
      const isTextInput = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || target?.isContentEditable;
      if (isTextInput || selectedObjectIds.length === 0 || !documentModel) {
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelectedObject();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedObjectIds, documentModel, currentSlideIndex]);

  useEffect(() => {
    if (!isShapePaletteOpen) {
      return undefined;
    }

    function updateShapePalettePosition() {
      const button = shapeButtonRef.current;
      if (!button) {
        return;
      }
      const rect = button.getBoundingClientRect();
      setShapePalettePosition({
        left: Math.min(rect.left, window.innerWidth - 324),
        top: rect.bottom + 10,
      });
    }

    function closeShapePaletteOnOutsidePointer(event) {
      const target = event.target;
      const button = shapeButtonRef.current;
      const palette = target instanceof Element ? target.closest(".shape-palette") : null;
      if (palette || button?.contains(target)) {
        return;
      }
      setIsShapePaletteOpen(false);
    }

    updateShapePalettePosition();
    window.addEventListener("pointerdown", closeShapePaletteOnOutsidePointer, true);
    window.addEventListener("resize", updateShapePalettePosition);
    window.addEventListener("scroll", updateShapePalettePosition, true);
    return () => {
      window.removeEventListener("pointerdown", closeShapePaletteOnOutsidePointer, true);
      window.removeEventListener("resize", updateShapePalettePosition);
      window.removeEventListener("scroll", updateShapePalettePosition, true);
    };
  }, [isShapePaletteOpen]);

  async function handleGenerate(event) {
    event.preventDefault();
    setIsGenerating(true);
    setStatus({ status: "queued", step: "queued", progress: 0 });

    try {
      const response = await fetch("/api/presentations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Generation failed");
      }

      setPresentationId(payload.presentationId);
      await pollGeneration(payload.presentationId);
    } catch (error) {
      setStatus({ status: "failed", step: error.message, progress: 100, errorMessage: error.message });
    } finally {
      setIsGenerating(false);
    }
  }

  async function pollGeneration(id) {
    for (;;) {
      const response = await fetch(`/api/presentations/${id}/generation-status`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Could not read generation status");
      }
      setStatus(payload);

      if (payload.status === "completed") {
        const documentResponse = await fetch(`/api/presentations/${id}`);
        const nextDocument = await documentResponse.json();
        if (!documentResponse.ok) {
          throw new Error(nextDocument.error || "Could not load presentation");
        }
        loadDocument(nextDocument, id);
        return;
      }

      if (payload.status === "failed") {
        throw new Error(payload.errorMessage || "Generation failed");
      }

      await sleep(300);
    }
  }

  function loadDocument(nextDocument, id = nextDocument.id) {
    setDocumentModel(nextDocument);
    setPresentationId(id);
    setCurrentSlideIndex(0);
    clearSelection();
    setUndoStack([]);
    setRedoStack([]);
  }

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function loadReferenceFile(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    setForm((current) => ({
      ...current,
      referenceText: current.referenceText.trim() ? `${current.referenceText}\n\n${text}` : text,
    }));
  }

  function commitDocument(mutator, explicitSnapshot = null) {
    setDocumentModel((current) => {
      if (!current) {
        return current;
      }
      const before = explicitSnapshot ?? clone(current);
      const next = clone(current);
      mutator(next);
      next.updatedAt = new Date().toISOString();
      setUndoStack((history) => [...history.slice(-(HISTORY_LIMIT - 1)), before]);
      setRedoStack([]);
      return next;
    });
  }

  function updateObject(objectId, updater, explicitSnapshot = null) {
    commitDocument((draft) => {
      const object = draft.slides[currentSlideIndex]?.objects.find((item) => item.id === objectId);
      if (object) {
        updater(object, draft.slides[currentSlideIndex]);
      }
    }, explicitSnapshot);
  }

  function undo() {
    if (undoStack.length === 0 || !documentModel) {
      return;
    }
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((history) => history.slice(0, -1));
    setRedoStack((history) => [...history, clone(documentModel)]);
    setDocumentModel(previous);
    clearSelection();
  }

  function redo() {
    if (redoStack.length === 0 || !documentModel) {
      return;
    }
    const next = redoStack[redoStack.length - 1];
    setRedoStack((history) => history.slice(0, -1));
    setUndoStack((history) => [...history.slice(-(HISTORY_LIMIT - 1)), clone(documentModel)]);
    setDocumentModel(next);
    clearSelection();
  }

  function addSlide() {
    if (!documentModel) {
      return;
    }
    const slideId = createId("slide");
    commitDocument((draft) => {
      draft.slides.push(createBlankSlide(slideId, draft.theme));
      setCurrentSlideIndex(draft.slides.length - 1);
      clearSelection();
    });
  }

  function addTextObject() {
    setActiveTextTool((current) => !current);
    setActiveShapeTool(null);
    setIsShapePaletteOpen(false);
  }

  function addShapeObject() {
    if (!documentModel) {
      return;
    }
    const object = {
      id: createId("obj"),
      type: "shape",
      x: 750,
      y: 220,
      width: 260,
      height: 150,
      rotation: 0,
      style: { shape: "roundRect", fill: "#eef2f7", stroke: documentModel.theme.primary, radius: 18 },
    };
    commitDocument((draft) => {
      draft.slides[currentSlideIndex].objects.push(object);
      selectObject(object.id);
    });
  }

  function addChartObject() {
    if (!documentModel) {
      return;
    }
    const object = {
      id: createId("obj"),
      type: "chart",
      x: 710,
      y: 170,
      width: 430,
      height: 320,
      rotation: 0,
      style: { fill: documentModel.theme.surface, stroke: "#d7dee8", barColor: documentModel.theme.accent, text: documentModel.theme.text, radius: 20 },
      chartSpec: {
        chartType: "bar",
        title: "새 차트",
        labels: ["A", "B", "C"],
        values: [60, 42, 76],
        unit: "%",
      },
    };
    commitDocument((draft) => {
      draft.slides[currentSlideIndex].objects.push(object);
      selectObject(object.id);
    });
  }

  function deleteSelectedObject() {
    const ids = selectedObjectIds.length > 0 ? selectedObjectIds : [selectedObjectId].filter(Boolean);
    if (ids.length === 0) {
      return;
    }
    commitDocument((draft) => {
      const activeSlide = draft.slides[currentSlideIndex];
      const idSet = new Set(ids);
      activeSlide.objects = activeSlide.objects.filter((object) => !idSet.has(object.id));
      activeSlide.emphasisPoints = activeSlide.emphasisPoints.filter((point) => !idSet.has(point.targetObjectId));
      clearSelection();
    });
  }

  function deleteObject(objectId = selectedObjectId) {
    if (!objectId) {
      return;
    }
    commitDocument((draft) => {
      const activeSlide = draft.slides[currentSlideIndex];
      const target = activeSlide.objects.find((object) => object.id === objectId);
      const ids = target?.groupId
        ? activeSlide.objects.filter((object) => object.groupId === target.groupId).map((object) => object.id)
        : [objectId];
      const idSet = new Set(ids);
      activeSlide.objects = activeSlide.objects.filter((object) => !idSet.has(object.id));
      activeSlide.emphasisPoints = activeSlide.emphasisPoints.filter((point) => !idSet.has(point.targetObjectId));
      clearSelection();
    });
  }

  function copyObject(objectId = selectedObjectId) {
    const object = slide?.objects.find((item) => item.id === objectId);
    if (!object) {
      return;
    }
    clipboardRef.current = clone(object);
    setCanPasteObject(true);
    selectObject(objectId);
  }

  function cutObject(objectId = selectedObjectId) {
    copyObject(objectId);
    deleteObject(objectId);
  }

  function pasteObject({ plain = false } = {}) {
    if (!clipboardRef.current || !documentModel) {
      return;
    }
    const source = clone(clipboardRef.current);
    const pasted = {
      ...source,
      id: createId("obj"),
      groupId: undefined,
      x: Math.min(1180, Number(source.x || 0) + 24),
      y: Math.min(620, Number(source.y || 0) + 24),
    };
    if (plain) {
      pasted.style = plainStyleForObject(pasted, documentModel.theme);
    }
    commitDocument((draft) => {
      draft.slides[currentSlideIndex].objects.push(pasted);
      selectObject(pasted.id);
    });
  }

  function plainStyleForObject(object, theme) {
    if (object.type === "text") {
      return { fill: theme.text, fontSize: 28, fontWeight: 700, align: "left", lineHeight: 1.25 };
    }
    if (object.type === "chart") {
      return { fill: theme.surface, stroke: "#d7dee8", barColor: theme.accent, text: theme.text, radius: 20 };
    }
    return { shape: object.style?.shape || "roundRect", fill: "#eef2ff", stroke: theme.primary, radius: 18 };
  }

  function reorderObject(objectId, order) {
    commitDocument((draft) => {
      const objects = draft.slides[currentSlideIndex]?.objects;
      if (!objects) {
        return;
      }
      const index = objects.findIndex((object) => object.id === objectId);
      if (index < 1) {
        return;
      }
      const [object] = objects.splice(index, 1);
      const lastIndex = objects.length;
      const nextIndex = {
        front: lastIndex,
        back: 1,
        forward: Math.min(lastIndex, index + 1),
        backward: Math.max(1, index - 1),
      }[order];
      objects.splice(nextIndex, 0, object);
      selectObject(objectId);
    });
  }

  function groupSelectedObjects() {
    const ids = selectedObjectIds.filter(Boolean);
    if (ids.length < 2) {
      return;
    }
    const groupId = createId("grp");
    commitDocument((draft) => {
      const activeSlide = draft.slides[currentSlideIndex];
      activeSlide.objects.forEach((object) => {
        if (ids.includes(object.id)) {
          object.groupId = groupId;
        }
      });
      selectObjects(ids);
    });
  }

  function ungroupObject(objectId = selectedObjectId) {
    if (!objectId || !slide) {
      return;
    }
    const target = slide.objects.find((object) => object.id === objectId);
    if (!target?.groupId) {
      return;
    }
    const groupId = target.groupId;
    const ids = slide.objects.filter((object) => object.groupId === groupId).map((object) => object.id);
    commitDocument((draft) => {
      const activeSlide = draft.slides[currentSlideIndex];
      activeSlide.objects.forEach((object) => {
        if (object.groupId === groupId) {
          delete object.groupId;
        }
      });
      selectObjects(ids);
    });
  }

  function isGroupedObject(objectId) {
    return Boolean(slide?.objects.find((object) => object.id === objectId)?.groupId);
  }

  function approveSuggestion(suggestionId) {
    commitDocument((draft) => {
      const activeSlide = draft.slides[currentSlideIndex];
      const suggestion = activeSlide.aiSuggestions.find((item) => item.id === suggestionId);
      if (!suggestion || suggestion.status !== "pending") {
        return;
      }
      suggestion.patches.forEach((patch) => applyJsonPatch(draft, patch));
      suggestion.status = "approved";
    });
  }

  function rejectSuggestion(suggestionId) {
    commitDocument((draft) => {
      const suggestion = draft.slides[currentSlideIndex].aiSuggestions.find((item) => item.id === suggestionId);
      if (suggestion && suggestion.status === "pending") {
        suggestion.status = "rejected";
      }
    });
  }

  async function saveDocument() {
    if (!documentModel || !presentationId) {
      return null;
    }
    const response = await fetch(`/api/presentations/${presentationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(documentModel),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Save failed");
    }
    setDocumentModel(payload);
    return payload;
  }

  async function exportPptx() {
    await saveDocument();
    downloadFromUrl(`/api/presentations/${presentationId}/export?format=pptx`);
  }

  async function exportJson() {
    await saveDocument();
    downloadFromUrl(`/api/presentations/${presentationId}/export?format=json`);
  }

  async function exportPng() {
    if (!stageRef.current || !documentModel) {
      return;
    }
    const previousSelection = selectedObjectId;
    clearSelection();
    await nextFrame();
    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
    downloadDataUrl(dataUrl, `${documentModel.title || "slide"}-${currentSlideIndex + 1}.png`);
    selectObject(previousSelection);
  }

  async function exportPdf() {
    await saveDocument();
    const previousSelection = selectedObjectId;
    clearSelection();
    await nextFrame();
    window.print();
    selectObject(previousSelection);
  }

  function handleDragStart() {
    snapshotRef.current = clone(documentModel);
  }

  function handleDragEnd(objectId, node) {
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    updateObject(objectId, (object) => {
      object.x = round(node.x());
      object.y = round(node.y());
    }, snapshot);
  }

  function handleMultiDragEnd(positions) {
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    commitDocument((draft) => {
      const activeSlide = draft.slides[currentSlideIndex];
      const positionMap = positions as Record<string, { x: number; y: number }>;
      Object.entries(positionMap).forEach(([objectId, position]) => {
        const object = activeSlide.objects.find((item) => item.id === objectId);
        if (object) {
          object.x = round(position.x);
          object.y = round(position.y);
        }
      });
    }, snapshot);
  }

  function handleTransformStart() {
    snapshotRef.current = clone(documentModel);
  }

  function handleTransformEnd(objectId) {
    const node = nodeRefs.current[objectId];
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;
    if (!node) {
      return;
    }

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const width = Math.max(28, round((node.width?.() || selectedObject?.width || 100) * scaleX));
    const height = Math.max(28, round((node.height?.() || selectedObject?.height || 100) * scaleY));

    node.scaleX(1);
    node.scaleY(1);

    updateObject(objectId, (object) => {
      object.x = round(node.x());
      object.y = round(node.y());
      object.width = width;
      object.height = height;
      object.rotation = round(node.rotation());
    }, snapshot);
  }

  function editTextInline(objectOrId) {
    const object = typeof objectOrId === "string"
      ? slide?.objects.find((item) => item.id === objectOrId)
      : objectOrId;
    if (!object) {
      return;
    }
    if (object.type !== "text") {
      return;
    }
    selectObject(object.id);
    setEditingTextObjectId(object.id);
  }

  function commitInlineText(objectId, content) {
    updateObject(objectId, (target) => {
      target.content = content;
    });
    setEditingTextObjectId(null);
  }

  const progress = Math.max(0, Math.min(100, Number(status?.progress ?? 0)));

  function createShapeObject(shape, rect) {
    const object = {
      id: createId("obj"),
      type: "shape",
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      rotation: 0,
      style: { shape, fill: "#eef2ff", stroke: documentModel.theme.primary, radius: 18 },
    };
    commitDocument((draft) => {
      draft.slides[currentSlideIndex].objects.push(object);
      selectObject(object.id);
    });
  }

  function createTextObject(rect) {
    const object = {
      id: createId("obj"),
      type: "text",
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      rotation: 0,
      style: { fill: documentModel.theme.text, fontSize: 28, fontWeight: 700, align: "left", lineHeight: 1.25 },
      content: "text",
    };
    commitDocument((draft) => {
      draft.slides[currentSlideIndex].objects.push(object);
      selectObject(object.id);
      setEditingTextObjectId(object.id);
    });
  }

  function updateSpeakerScript(speakerScript) {
    commitDocument((draft) => {
      draft.slides[currentSlideIndex].speakerScript = speakerScript;
    });
  }

  return (
    <main className="app-shell">
      <TopBar documentModel={documentModel} onExportPptx={exportPptx} />

      {!documentModel && (
        <GeneratorPanel
          form={form}
          status={status}
          progress={progress}
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
          onUpdateForm={updateForm}
          onLoadReferenceFile={loadReferenceFile}
        />
      )}

      {documentModel && slide && (
        <EditorWorkspace
          documentModel={documentModel}
          slide={slide}
          currentSlideIndex={currentSlideIndex}
          selectedObjectId={selectedObjectId}
          selectedObjectIds={selectedObjectIds}
          editingTextObjectId={editingTextObjectId}
          activeShapeTool={activeShapeTool}
          activeTextTool={activeTextTool}
          isShapePaletteOpen={isShapePaletteOpen}
          shapePalettePosition={shapePalettePosition}
          undoStack={undoStack}
          redoStack={redoStack}
          nodeRefs={nodeRefs}
          stageRef={stageRef}
          transformerRef={transformerRef}
          shapeButtonRef={shapeButtonRef}
          setCurrentSlideIndex={setCurrentSlideIndex}
          setSelectedObjectId={selectObject}
          setSelectedObjectIds={selectObjects}
          setIsShapePaletteOpen={setIsShapePaletteOpen}
          setActiveShapeTool={setActiveShapeTool}
          setActiveTextTool={setActiveTextTool}
          addSlide={addSlide}
          addTextObject={addTextObject}
          addChartObject={addChartObject}
          undo={undo}
          redo={redo}
          saveDocument={saveDocument}
          exportPng={exportPng}
          exportPdf={exportPdf}
          exportJson={exportJson}
          createShapeObject={createShapeObject}
          createTextObject={createTextObject}
          handleDragStart={handleDragStart}
          handleDragEnd={handleDragEnd}
          handleMultiDragEnd={handleMultiDragEnd}
          handleTransformStart={handleTransformStart}
          handleTransformEnd={handleTransformEnd}
          editTextInline={editTextInline}
          commitInlineText={commitInlineText}
          cancelInlineText={() => setEditingTextObjectId(null)}
          reorderObject={reorderObject}
          cutObject={cutObject}
          copyObject={copyObject}
          pasteObject={pasteObject}
          deleteObject={deleteObject}
          groupSelectedObjects={groupSelectedObjects}
          ungroupObject={ungroupObject}
          canGroup={selectedObjectIds.length > 1}
          isGroupedObject={isGroupedObject}
          canPaste={canPasteObject}
          updateSpeakerScript={updateSpeakerScript}
          approveSuggestion={approveSuggestion}
          rejectSuggestion={rejectSuggestion}
        />
      )}
    </main>
  );
}
