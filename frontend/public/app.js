const SLIDE = { width: 1280, height: 720 };
const HANDLE_SIZE = 12;
const HISTORY_LIMIT = 50;

const state = {
  presentationId: null,
  document: null,
  currentSlideIndex: 0,
  selectedObjectId: null,
  drag: null,
  undoStack: [],
  redoStack: [],
};

const els = {
  form: document.querySelector("#generationForm"),
  status: document.querySelector("#generationStatus"),
  statusStep: document.querySelector("#statusStep"),
  statusPercent: document.querySelector("#statusPercent"),
  progressFill: document.querySelector("#progressFill"),
  editorPanel: document.querySelector("#editorPanel"),
  slidesList: document.querySelector("#slidesList"),
  propertiesPanel: document.querySelector("#propertiesPanel"),
  scriptPanel: document.querySelector("#scriptPanel"),
  suggestionsPanel: document.querySelector("#suggestionsPanel"),
  canvas: document.querySelector("#slideCanvas"),
  addSlideBtn: document.querySelector("#addSlideBtn"),
  addTextBtn: document.querySelector("#addTextBtn"),
  addShapeBtn: document.querySelector("#addShapeBtn"),
  addChartBtn: document.querySelector("#addChartBtn"),
  deleteObjectBtn: document.querySelector("#deleteObjectBtn"),
  undoBtn: document.querySelector("#undoBtn"),
  redoBtn: document.querySelector("#redoBtn"),
  saveBtn: document.querySelector("#saveBtn"),
  exportPptxBtn: document.querySelector("#exportPptxBtn"),
  exportPngBtn: document.querySelector("#exportPngBtn"),
  exportPdfBtn: document.querySelector("#exportPdfBtn"),
  exportJsonBtn: document.querySelector("#exportJsonBtn"),
  referenceFile: document.querySelector("#referenceFile"),
  referenceText: document.querySelector("#referenceText"),
};

const ctx = els.canvas.getContext("2d");

init();

function init() {
  els.form.addEventListener("submit", handleGenerate);
  els.referenceFile.addEventListener("change", loadReferenceFile);
  els.canvas.addEventListener("pointerdown", handlePointerDown);
  els.canvas.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  els.addSlideBtn.addEventListener("click", addSlide);
  els.addTextBtn.addEventListener("click", addTextObject);
  els.addShapeBtn.addEventListener("click", addShapeObject);
  els.addChartBtn.addEventListener("click", addChartObject);
  els.deleteObjectBtn.addEventListener("click", deleteSelectedObject);
  els.undoBtn.addEventListener("click", undo);
  els.redoBtn.addEventListener("click", redo);
  els.saveBtn.addEventListener("click", saveDocument);
  els.exportPptxBtn.addEventListener("click", exportPptx);
  els.exportPngBtn.addEventListener("click", exportPng);
  els.exportPdfBtn.addEventListener("click", exportPdf);
  els.exportJsonBtn.addEventListener("click", exportJson);
  updateToolbar();
}

async function handleGenerate(event) {
  event.preventDefault();
  const submitButton = els.form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "생성 중";
  setStatus({ step: "queued", progress: 0 });
  els.status.hidden = false;

  try {
    const payload = formPayload();
    const response = await fetch("/api/presentations/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to start generation");
    }
    state.presentationId = data.presentationId;
    await pollGeneration(data.presentationId);
  } catch (error) {
    setStatus({ step: error.message, progress: 100, failed: true });
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "발표자료 생성";
  }
}

function formPayload() {
  const form = new FormData(els.form);
  return {
    prompt: String(form.get("prompt") || ""),
    audience: String(form.get("audience") || ""),
    durationMinutes: Number(form.get("durationMinutes") || 12),
    slideCount: Number(form.get("slideCount") || 6),
    tone: String(form.get("tone") || "professional"),
    language: String(form.get("language") || "ko"),
    referenceText: String(form.get("referenceText") || ""),
    templateId: String(form.get("templateId") || "executive"),
  };
}

async function pollGeneration(presentationId) {
  for (;;) {
    const response = await fetch(`/api/presentations/${presentationId}/generation-status`);
    const status = await response.json();
    if (!response.ok) {
      throw new Error(status.error || "Generation status failed");
    }
    setStatus(status);
    if (status.status === "completed") {
      const documentResponse = await fetch(`/api/presentations/${presentationId}`);
      const document = await documentResponse.json();
      if (!documentResponse.ok) {
        throw new Error(document.error || "Failed to load generated presentation");
      }
      loadDocument(document, presentationId);
      return;
    }
    if (status.status === "failed") {
      throw new Error(status.errorMessage || "Generation failed");
    }
    await sleep(300);
  }
}

function setStatus(status) {
  const stepLabels = {
    queued: "대기 중",
    planning: "기획 중",
    "writing-slides": "슬라이드 작성 중",
    "composing-visuals": "시각 요소 구성 중",
    saving: "저장 중",
    "completed-local": "완료: 로컬 생성",
    "completed-openai": "완료: OpenAI 생성",
    failed: "실패",
  };
  const progress = Math.max(0, Math.min(100, Number(status.progress || 0)));
  els.statusStep.textContent = stepLabels[status.step] || status.step || "진행 중";
  els.statusPercent.textContent = `${progress}%`;
  els.progressFill.style.width = `${progress}%`;
  els.progressFill.style.background = status.failed || status.status === "failed" ? "var(--danger)" : "";
}

async function loadReferenceFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  const text = await file.text();
  const current = els.referenceText.value.trim();
  els.referenceText.value = current ? `${current}\n\n${text}` : text;
}

function loadDocument(document, presentationId) {
  state.document = document;
  state.presentationId = presentationId || document.id;
  state.currentSlideIndex = 0;
  state.selectedObjectId = null;
  state.undoStack = [];
  state.redoStack = [];
  els.editorPanel.hidden = false;
  renderAll();
  els.editorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderAll() {
  renderSlidesList();
  renderCanvas();
  renderProperties();
  renderScript();
  renderSuggestions();
  updateToolbar();
}

function renderSlidesList() {
  if (!state.document) {
    els.slidesList.innerHTML = "";
    return;
  }
  els.slidesList.innerHTML = "";
  state.document.slides.forEach((slide, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `slide-item${index === state.currentSlideIndex ? " active" : ""}`;
    button.innerHTML = `
      <span class="slide-thumb"></span>
      <span class="slide-number">${String(index + 1).padStart(2, "0")}</span>
      <span class="slide-title">${escapeHtml(slide.title)}</span>
    `;
    button.addEventListener("click", () => {
      state.currentSlideIndex = index;
      state.selectedObjectId = null;
      renderAll();
    });
    els.slidesList.appendChild(button);
  });
}

function renderCanvas({ showSelection = true } = {}) {
  ctx.clearRect(0, 0, SLIDE.width, SLIDE.height);
  const slide = currentSlide();
  if (!slide) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SLIDE.width, SLIDE.height);
    return;
  }
  slide.objects.forEach((object) => drawObject(object));
  if (showSelection && state.selectedObjectId) {
    const selected = selectedObject();
    if (selected) {
      drawSelection(selected);
    }
  }
}

function drawObject(object) {
  ctx.save();
  const cx = object.x + object.width / 2;
  const cy = object.y + object.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(degToRad(object.rotation || 0));
  if (object.type === "text") {
    drawTextObject(object);
  } else if (object.type === "chart") {
    drawChartObject(object);
  } else {
    drawShapeObject(object);
  }
  ctx.restore();
}

function drawTextObject(object) {
  const style = object.style || {};
  const x = -object.width / 2;
  const y = -object.height / 2;
  const fontSize = Number(style.fontSize || 22);
  const weight = Number(style.fontWeight || 500);
  const lineHeight = fontSize * Number(style.lineHeight || 1.25);
  ctx.font = `${weight} ${fontSize}px Inter, Pretendard, Arial, sans-serif`;
  ctx.fillStyle = style.fill || "#111827";
  ctx.textBaseline = "top";
  ctx.textAlign = style.align || "left";

  const alignX = style.align === "center" ? x + object.width / 2 : style.align === "right" ? x + object.width : x;
  const lines = wrapText(String(object.content || ""), object.width, ctx);
  lines.slice(0, Math.floor(object.height / lineHeight)).forEach((line, index) => {
    ctx.fillText(line, alignX, y + index * lineHeight);
  });
}

function drawShapeObject(object) {
  const style = object.style || {};
  const shape = style.shape || "rect";
  if (shape === "timeline") {
    drawTimeline(object);
    return;
  }
  if (shape === "comparison") {
    drawComparison(object);
    return;
  }
  if (shape === "summary") {
    drawSummary(object);
    return;
  }

  const x = -object.width / 2;
  const y = -object.height / 2;
  drawPathForShape(shape, x, y, object.width, object.height, Number(style.radius || 16));
  if (style.fill && style.fill !== "transparent") {
    ctx.fillStyle = withOpacity(style.fill, Number(style.opacity ?? 1));
    ctx.fill();
  }
  if (style.stroke && style.stroke !== "transparent") {
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = Number(style.strokeWidth || 1.5);
    ctx.stroke();
  }
  if (style.label) {
    ctx.fillStyle = style.accent || "#c64f3b";
    ctx.fillRect(x + 34, y + 34, 72, 8);
    ctx.font = `800 ${Number(style.labelSize || 24)}px Inter, Pretendard, Arial, sans-serif`;
    ctx.fillStyle = style.labelColor || "#16212f";
    ctx.textBaseline = "top";
    wrapText(String(style.label), object.width - 68, ctx).slice(0, 3).forEach((line, index) => {
      ctx.fillText(line, x + 34, y + object.height - 116 + index * 32);
    });
  }
}

function drawChartObject(object) {
  const style = object.style || {};
  const spec = object.chartSpec || { labels: [], values: [], title: "", unit: "" };
  const x = -object.width / 2;
  const y = -object.height / 2;
  roundedRect(ctx, x, y, object.width, object.height, Number(style.radius || 20));
  ctx.fillStyle = style.fill || "#ffffff";
  ctx.fill();
  ctx.strokeStyle = style.stroke || "#d7dee8";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = "800 20px Inter, Pretendard, Arial, sans-serif";
  ctx.fillStyle = style.text || "#16212f";
  ctx.textBaseline = "top";
  ctx.fillText(spec.title || "Chart", x + 28, y + 24);

  const values = spec.values || [];
  const max = Math.max(1, ...values);
  const gap = 18;
  const availableWidth = object.width - 74;
  const barWidth = Math.max(34, (availableWidth - gap * Math.max(0, values.length - 1)) / Math.max(1, values.length));
  values.forEach((value, index) => {
    const barHeight = Math.max(18, ((object.height - 150) * value) / max);
    const bx = x + 36 + index * (barWidth + gap);
    const by = y + object.height - 76 - barHeight;
    ctx.fillStyle = style.barColor || "#c64f3b";
    ctx.fillRect(bx, by, barWidth, barHeight);
    ctx.fillStyle = style.text || "#16212f";
    ctx.font = "800 13px Inter, Pretendard, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${value}${spec.unit || ""}`, bx + barWidth / 2, by - 22);
    ctx.font = "700 12px Inter, Pretendard, Arial, sans-serif";
    ctx.fillStyle = "#647184";
    ctx.fillText(spec.labels?.[index] || "", bx + barWidth / 2, y + object.height - 52);
    ctx.textAlign = "left";
  });
}

function drawTimeline(object) {
  const style = object.style || {};
  const x = -object.width / 2;
  const y = -object.height / 2;
  drawPanelBackground(object, style);
  const items = String(style.items || "").split("|").filter(Boolean);
  const lineY = y + object.height / 2;
  ctx.fillStyle = style.accent || "#c64f3b";
  roundedRect(ctx, x + 56, lineY - 3, object.width - 112, 6, 6);
  ctx.fill();
  items.forEach((item, index) => {
    const dotX = x + 62 + index * ((object.width - 124) / Math.max(1, items.length - 1));
    ctx.beginPath();
    ctx.arc(dotX, lineY, 15, 0, Math.PI * 2);
    ctx.fillStyle = style.accent || "#c64f3b";
    ctx.fill();
    ctx.font = "800 15px Inter, Pretendard, Arial, sans-serif";
    ctx.fillStyle = style.text || "#16212f";
    ctx.textAlign = "center";
    wrapText(item, 116, ctx).slice(0, 3).forEach((line, lineIndex) => {
      ctx.fillText(line, dotX, lineY + 34 + lineIndex * 20);
    });
    ctx.textAlign = "left";
  });
}

function drawComparison(object) {
  const style = object.style || {};
  const x = -object.width / 2;
  const y = -object.height / 2;
  drawPanelBackground(object, style);
  const items = String(style.items || "").split("|").filter(Boolean);
  const columnWidth = (object.width - 74) / 2;
  ["Current", "Improved"].forEach((label, index) => {
    const cx = x + 28 + index * (columnWidth + 18);
    roundedRect(ctx, cx, y + 72, columnWidth, object.height - 112, 18);
    ctx.fillStyle = index === 0 ? "#f1f4f8" : mixWithWhite(style.accent || "#c64f3b", 0.78);
    ctx.fill();
    ctx.font = "800 18px Inter, Pretendard, Arial, sans-serif";
    ctx.fillStyle = style.text || "#16212f";
    ctx.textAlign = "center";
    ctx.fillText(label, cx + columnWidth / 2, y + 96);
    ctx.font = "600 14px Inter, Pretendard, Arial, sans-serif";
    wrapText(items[index] || items[0] || "", columnWidth - 36, ctx).slice(0, 4).forEach((line, lineIndex) => {
      ctx.fillText(line, cx + columnWidth / 2, y + 154 + lineIndex * 20);
    });
    ctx.textAlign = "left";
  });
}

function drawSummary(object) {
  const style = object.style || {};
  const x = -object.width / 2;
  const y = -object.height / 2;
  drawPanelBackground(object, style);
  ctx.font = "800 20px Inter, Pretendard, Arial, sans-serif";
  ctx.fillStyle = style.text || "#16212f";
  ctx.fillText(style.label || "Core message", x + 34, y + 30);
  const items = String(style.items || "").split("|").filter(Boolean);
  items.forEach((item, index) => {
    const py = y + 92 + index * 50;
    roundedRect(ctx, x + 36, py, object.width - 72, 34, 17);
    ctx.fillStyle = index % 2 === 0 ? mixWithWhite(style.accent || "#c64f3b", 0.78) : "#eef2f7";
    ctx.fill();
    ctx.font = "800 14px Inter, Pretendard, Arial, sans-serif";
    ctx.fillStyle = style.text || "#16212f";
    ctx.fillText(item, x + 54, py + 9);
  });
}

function drawPanelBackground(object, style) {
  const x = -object.width / 2;
  const y = -object.height / 2;
  roundedRect(ctx, x, y, object.width, object.height, Number(style.radius || 20));
  ctx.fillStyle = style.fill || "#ffffff";
  ctx.fill();
  ctx.strokeStyle = style.stroke || "#d7dee8";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawPathForShape(shape, x, y, width, height, radius) {
  ctx.beginPath();
  if (shape === "ellipse") {
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  } else if (shape === "roundRect") {
    roundedRect(ctx, x, y, width, height, radius);
  } else {
    ctx.rect(x, y, width, height);
  }
}

function drawSelection(object) {
  ctx.save();
  const cx = object.x + object.width / 2;
  const cy = object.y + object.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(degToRad(object.rotation || 0));
  ctx.strokeStyle = "#235160";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 5]);
  ctx.strokeRect(-object.width / 2, -object.height / 2, object.width, object.height);
  ctx.setLineDash([]);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#235160";
  ctx.lineWidth = 2;
  ctx.fillRect(object.width / 2 - HANDLE_SIZE, object.height / 2 - HANDLE_SIZE, HANDLE_SIZE, HANDLE_SIZE);
  ctx.strokeRect(object.width / 2 - HANDLE_SIZE, object.height / 2 - HANDLE_SIZE, HANDLE_SIZE, HANDLE_SIZE);
  ctx.restore();
}

function handlePointerDown(event) {
  if (!state.document) {
    return;
  }
  const point = canvasPoint(event);
  const selected = selectedObject();
  if (selected && pointInResizeHandle(point, selected)) {
    state.drag = {
      type: "resize",
      id: selected.id,
      start: point,
      original: clone(selected),
      before: clone(state.document),
      changed: false,
    };
    els.canvas.setPointerCapture(event.pointerId);
    return;
  }

  const hit = findObjectAt(point);
  state.selectedObjectId = hit?.id || null;
  renderAll();
  if (hit) {
    state.drag = {
      type: "move",
      id: hit.id,
      start: point,
      original: clone(hit),
      before: clone(state.document),
      changed: false,
    };
    els.canvas.setPointerCapture(event.pointerId);
  }
}

function handlePointerMove(event) {
  if (!state.drag) {
    return;
  }
  const point = canvasPoint(event);
  const object = selectedObject();
  if (!object) {
    return;
  }
  const dx = point.x - state.drag.start.x;
  const dy = point.y - state.drag.start.y;
  if (state.drag.type === "move") {
    object.x = clamp(state.drag.original.x + dx, -object.width + 24, SLIDE.width - 24);
    object.y = clamp(state.drag.original.y + dy, -object.height + 24, SLIDE.height - 24);
  } else {
    object.width = clamp(state.drag.original.width + dx, 28, SLIDE.width);
    object.height = clamp(state.drag.original.height + dy, 28, SLIDE.height);
  }
  state.drag.changed = Math.abs(dx) > 1 || Math.abs(dy) > 1;
  renderCanvas();
}

function handlePointerUp(event) {
  if (!state.drag) {
    return;
  }
  if (state.drag.changed) {
    state.document.updatedAt = new Date().toISOString();
    pushHistory(state.drag.before);
    renderAll();
  }
  try {
    els.canvas.releasePointerCapture(event.pointerId);
  } catch {
    // Pointer capture can already be released by the browser.
  }
  state.drag = null;
}

function renderProperties() {
  const object = selectedObject();
  els.deleteObjectBtn.disabled = !object;
  if (!object) {
    els.propertiesPanel.innerHTML = "";
    return;
  }
  const style = object.style || {};
  els.propertiesPanel.innerHTML = `
    <div class="property-grid">
      <label>Type<input value="${escapeHtml(object.type)}" disabled /></label>
      <label>ID<input value="${escapeHtml(object.id)}" disabled /></label>
      <label>X<input data-prop="x" type="number" value="${round(object.x)}" /></label>
      <label>Y<input data-prop="y" type="number" value="${round(object.y)}" /></label>
      <label>Width<input data-prop="width" type="number" min="20" value="${round(object.width)}" /></label>
      <label>Height<input data-prop="height" type="number" min="20" value="${round(object.height)}" /></label>
      <label>Rotation<input data-prop="rotation" type="number" value="${round(object.rotation || 0)}" /></label>
      <label>Fill<input data-style="fill" value="${escapeHtml(style.fill || "")}" /></label>
      <label>Stroke<input data-style="stroke" value="${escapeHtml(style.stroke || "")}" /></label>
      <label>Font Size<input data-style="fontSize" type="number" min="8" value="${round(style.fontSize || 22)}" /></label>
      ${object.type === "text" ? `<label class="full">Content<textarea data-prop="content">${escapeHtml(object.content || "")}</textarea></label>` : ""}
      ${object.type === "chart" ? chartEditorHtml(object) : ""}
    </div>
  `;

  els.propertiesPanel.querySelectorAll("[data-prop]").forEach((input) => {
    input.addEventListener("change", () => {
      updateSelectedObject((target) => {
        const prop = input.dataset.prop;
        target[prop] = input.type === "number" ? Number(input.value) : input.value;
      });
    });
  });
  els.propertiesPanel.querySelectorAll("[data-style]").forEach((input) => {
    input.addEventListener("change", () => {
      updateSelectedObject((target) => {
        target.style = target.style || {};
        const key = input.dataset.style;
        target.style[key] = input.type === "number" ? Number(input.value) : input.value;
      });
    });
  });
  els.propertiesPanel.querySelectorAll("[data-chart]").forEach((input) => {
    input.addEventListener("change", () => {
      updateSelectedObject((target) => {
        target.chartSpec = target.chartSpec || { chartType: "bar", title: "Chart", labels: [], values: [] };
        if (input.dataset.chart === "labels") {
          target.chartSpec.labels = input.value.split(",").map((item) => item.trim()).filter(Boolean);
        } else if (input.dataset.chart === "values") {
          target.chartSpec.values = input.value.split(",").map((item) => Number(item.trim())).filter(Number.isFinite);
        } else {
          target.chartSpec[input.dataset.chart] = input.value;
        }
      });
    });
  });
}

function chartEditorHtml(object) {
  const spec = object.chartSpec || {};
  return `
    <label class="full">Chart Title<input data-chart="title" value="${escapeHtml(spec.title || "")}" /></label>
    <label class="full">Labels<input data-chart="labels" value="${escapeHtml((spec.labels || []).join(", "))}" /></label>
    <label class="full">Values<input data-chart="values" value="${escapeHtml((spec.values || []).join(", "))}" /></label>
  `;
}

function renderScript() {
  const slide = currentSlide();
  if (!slide) {
    els.scriptPanel.innerHTML = "";
    return;
  }
  els.scriptPanel.innerHTML = `
    <h3 class="script-title">Speaker Script</h3>
    <label>Script<textarea id="speakerScriptInput">${escapeHtml(slide.speakerScript || "")}</textarea></label>
    <div class="keyword-list">${(slide.keywords || []).map((keyword) => `<span class="keyword">${escapeHtml(keyword)}</span>`).join("")}</div>
  `;
  els.scriptPanel.querySelector("#speakerScriptInput").addEventListener("change", (event) => {
    mutateDocument((document) => {
      document.slides[state.currentSlideIndex].speakerScript = event.target.value;
    });
  });
}

function renderSuggestions() {
  const slide = currentSlide();
  if (!slide) {
    els.suggestionsPanel.innerHTML = "";
    return;
  }
  const suggestions = slide.aiSuggestions || [];
  els.suggestionsPanel.innerHTML = `
    <h3 class="suggestions-title">AI Suggestions</h3>
    ${suggestions.length === 0 ? `<p class="muted">제안 없음</p>` : suggestions.map((suggestion) => `
      <div class="suggestion ${escapeHtml(suggestion.status)}">
        <p><strong>${escapeHtml(suggestion.status)}</strong> ${escapeHtml(suggestion.reason)}</p>
        <div class="suggestion-actions">
          <button type="button" data-approve="${escapeHtml(suggestion.id)}" ${suggestion.status !== "pending" ? "disabled" : ""}>Approve</button>
          <button type="button" data-reject="${escapeHtml(suggestion.id)}" ${suggestion.status !== "pending" ? "disabled" : ""}>Reject</button>
        </div>
      </div>
    `).join("")}
  `;
  els.suggestionsPanel.querySelectorAll("[data-approve]").forEach((button) => {
    button.addEventListener("click", () => approveSuggestion(button.dataset.approve));
  });
  els.suggestionsPanel.querySelectorAll("[data-reject]").forEach((button) => {
    button.addEventListener("click", () => rejectSuggestion(button.dataset.reject));
  });
}

function approveSuggestion(suggestionId) {
  mutateDocument((document) => {
    const slide = document.slides[state.currentSlideIndex];
    const suggestion = slide.aiSuggestions.find((item) => item.id === suggestionId);
    if (!suggestion || suggestion.status !== "pending") {
      return;
    }
    suggestion.patches.forEach((patch) => applyJsonPatch(document, patch));
    suggestion.status = "approved";
  });
}

function rejectSuggestion(suggestionId) {
  mutateDocument((document) => {
    const slide = document.slides[state.currentSlideIndex];
    const suggestion = slide.aiSuggestions.find((item) => item.id === suggestionId);
    if (suggestion && suggestion.status === "pending") {
      suggestion.status = "rejected";
    }
  });
}

function addSlide() {
  if (!state.document) {
    return;
  }
  const theme = state.document.theme;
  const slideId = createId("slide");
  mutateDocument((document) => {
    document.slides.push({
      id: slideId,
      title: "새 슬라이드",
      speakerScript: "",
      keywords: [],
      emphasisPoints: [],
      aiSuggestions: [],
      objects: [
        {
          id: createId("obj"),
          type: "shape",
          x: 0,
          y: 0,
          width: SLIDE.width,
          height: SLIDE.height,
          rotation: 0,
          style: { shape: "rect", fill: theme.background, stroke: "transparent" },
        },
        {
          id: createId("obj"),
          type: "text",
          x: 82,
          y: 84,
          width: 720,
          height: 80,
          rotation: 0,
          style: { fill: theme.text, fontSize: 42, fontWeight: 800, align: "left" },
          content: "새 슬라이드",
        },
      ],
    });
    state.currentSlideIndex = document.slides.length - 1;
    state.selectedObjectId = null;
  });
}

function addTextObject() {
  const theme = state.document?.theme;
  if (!theme) {
    return;
  }
  const object = {
    id: createId("obj"),
    type: "text",
    x: 150,
    y: 190,
    width: 460,
    height: 120,
    rotation: 0,
    style: { fill: theme.text, fontSize: 28, fontWeight: 700, align: "left", lineHeight: 1.25 },
    content: "새 텍스트",
  };
  mutateDocument((document) => {
    document.slides[state.currentSlideIndex].objects.push(object);
    state.selectedObjectId = object.id;
  });
}

function addShapeObject() {
  const theme = state.document?.theme;
  if (!theme) {
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
    style: { shape: "roundRect", fill: "#eef2f7", stroke: theme.primary, radius: 18 },
  };
  mutateDocument((document) => {
    document.slides[state.currentSlideIndex].objects.push(object);
    state.selectedObjectId = object.id;
  });
}

function addChartObject() {
  const theme = state.document?.theme;
  if (!theme) {
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
    style: { fill: theme.surface, stroke: "#d7dee8", barColor: theme.accent, text: theme.text, radius: 20 },
    chartSpec: {
      chartType: "bar",
      title: "새 차트",
      labels: ["A", "B", "C"],
      values: [60, 42, 76],
      unit: "%",
    },
  };
  mutateDocument((document) => {
    document.slides[state.currentSlideIndex].objects.push(object);
    state.selectedObjectId = object.id;
  });
}

function deleteSelectedObject() {
  if (!state.selectedObjectId) {
    return;
  }
  mutateDocument((document) => {
    const slide = document.slides[state.currentSlideIndex];
    slide.objects = slide.objects.filter((object) => object.id !== state.selectedObjectId);
    slide.emphasisPoints = slide.emphasisPoints.filter((point) => point.targetObjectId !== state.selectedObjectId);
    state.selectedObjectId = null;
  });
}

function updateSelectedObject(updater) {
  mutateDocument((document) => {
    const object = selectedObject(document);
    if (object) {
      updater(object);
    }
  });
}

function mutateDocument(updater) {
  if (!state.document) {
    return;
  }
  const before = clone(state.document);
  updater(state.document);
  state.document.updatedAt = new Date().toISOString();
  pushHistory(before);
  renderAll();
}

function pushHistory(snapshot) {
  state.undoStack.push(snapshot);
  if (state.undoStack.length > HISTORY_LIMIT) {
    state.undoStack.shift();
  }
  state.redoStack = [];
  updateToolbar();
}

function undo() {
  if (!state.undoStack.length) {
    return;
  }
  const current = clone(state.document);
  state.redoStack.push(current);
  state.document = state.undoStack.pop();
  ensureSelectionStillExists();
  renderAll();
}

function redo() {
  if (!state.redoStack.length) {
    return;
  }
  const current = clone(state.document);
  state.undoStack.push(current);
  state.document = state.redoStack.pop();
  ensureSelectionStillExists();
  renderAll();
}

function ensureSelectionStillExists() {
  if (state.selectedObjectId && !selectedObject()) {
    state.selectedObjectId = null;
  }
  if (state.currentSlideIndex >= state.document.slides.length) {
    state.currentSlideIndex = Math.max(0, state.document.slides.length - 1);
  }
}

function updateToolbar() {
  els.undoBtn.disabled = state.undoStack.length === 0;
  els.redoBtn.disabled = state.redoStack.length === 0;
  els.deleteObjectBtn.disabled = !state.selectedObjectId;
}

async function saveDocument() {
  if (!state.document || !state.presentationId) {
    return;
  }
  const response = await fetch(`/api/presentations/${state.presentationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state.document),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Save failed");
  }
  state.document = data;
  renderAll();
}

async function exportPptx() {
  await saveDocument();
  downloadFromUrl(`/api/presentations/${state.presentationId}/export?format=pptx`);
}

async function exportJson() {
  await saveDocument();
  downloadFromUrl(`/api/presentations/${state.presentationId}/export?format=json`);
}

function exportPng() {
  if (!state.document) {
    return;
  }
  const selected = state.selectedObjectId;
  state.selectedObjectId = null;
  renderCanvas({ showSelection: false });
  els.canvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, `${state.document.title || "slide"}-${state.currentSlideIndex + 1}.png`);
    }
    state.selectedObjectId = selected;
    renderCanvas();
  }, "image/png");
}

async function exportPdf() {
  await saveDocument();
  const selected = state.selectedObjectId;
  state.selectedObjectId = null;
  renderCanvas({ showSelection: false });
  window.print();
  state.selectedObjectId = selected;
  renderCanvas();
}

function downloadFromUrl(url) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.replace(/[\\/:*?"<>|]+/g, "_");
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function applyJsonPatch(root, patch) {
  const parts = patch.path.split("/").slice(1).map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
  const key = parts.pop();
  let target = root;
  for (const part of parts) {
    target = Array.isArray(target) ? target[Number(part)] : target[part];
    if (target === undefined || target === null) {
      return;
    }
  }
  if (Array.isArray(target)) {
    const index = key === "-" ? target.length : Number(key);
    if (patch.op === "remove") {
      target.splice(index, 1);
    } else if (patch.op === "add") {
      target.splice(index, 0, clone(patch.value));
    } else {
      target[index] = clone(patch.value);
    }
  } else if (target && typeof target === "object") {
    if (patch.op === "remove") {
      delete target[key];
    } else {
      target[key] = clone(patch.value);
    }
  }
}

function currentSlide() {
  return state.document?.slides?.[state.currentSlideIndex] || null;
}

function selectedObject(documentOverride) {
  const documentValue = documentOverride || state.document;
  if (!documentValue || !state.selectedObjectId) {
    return null;
  }
  return documentValue.slides[state.currentSlideIndex]?.objects.find((object) => object.id === state.selectedObjectId) || null;
}

function findObjectAt(point) {
  const slide = currentSlide();
  if (!slide) {
    return null;
  }
  for (let index = slide.objects.length - 1; index >= 0; index -= 1) {
    const object = slide.objects[index];
    if (isBackgroundObject(object)) {
      continue;
    }
    if (point.x >= object.x && point.x <= object.x + object.width && point.y >= object.y && point.y <= object.y + object.height) {
      return object;
    }
  }
  return null;
}

function pointInResizeHandle(point, object) {
  return point.x >= object.x + object.width - HANDLE_SIZE * 2
    && point.x <= object.x + object.width + HANDLE_SIZE
    && point.y >= object.y + object.height - HANDLE_SIZE * 2
    && point.y <= object.y + object.height + HANDLE_SIZE;
}

function canvasPoint(event) {
  const rect = els.canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (SLIDE.width / rect.width),
    y: (event.clientY - rect.top) * (SLIDE.height / rect.height),
  };
}

function isBackgroundObject(object) {
  return object.type === "shape"
    && object.x <= 0
    && object.y <= 0
    && object.width >= SLIDE.width
    && object.height >= SLIDE.height;
}

function wrapText(text, maxWidth, context) {
  const lines = [];
  const paragraphs = String(text).split(/\n/);
  paragraphs.forEach((paragraph) => {
    const tokens = paragraph.includes(" ") ? paragraph.split(/(\s+)/) : [...paragraph];
    let line = "";
    tokens.forEach((token) => {
      const candidate = line + token;
      if (context.measureText(candidate).width > maxWidth && line.trim()) {
        lines.push(line.trimEnd());
        line = token.trimStart();
      } else {
        line = candidate;
      }
    });
    lines.push(line.trimEnd());
  });
  return lines;
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function withOpacity(color, opacity) {
  if (opacity >= 1 || !color.startsWith("#")) {
    return color;
  }
  const rgb = hexToRgb(color);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

function mixWithWhite(color, amount) {
  const rgb = hexToRgb(color);
  const mixed = {
    r: Math.round(rgb.r + (255 - rgb.r) * amount),
    g: Math.round(rgb.g + (255 - rgb.g) * amount),
    b: Math.round(rgb.b + (255 - rgb.b) * amount),
  };
  return `rgb(${mixed.r}, ${mixed.g}, ${mixed.b})`;
}

function hexToRgb(color) {
  const hex = color.replace("#", "");
  const normalized = hex.length === 3 ? [...hex].map((char) => char + char).join("") : hex;
  return {
    r: parseInt(normalized.slice(0, 2), 16) || 0,
    g: parseInt(normalized.slice(2, 4), 16) || 0,
    b: parseInt(normalized.slice(4, 6), 16) || 0,
  };
}

function degToRad(degrees) {
  return (Number(degrees) * Math.PI) / 180;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
