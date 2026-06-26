import { SLIDE } from "../constants";

export function createBlankSlide(slideId, theme) {
  const titleObjectId = createId("obj");
  return {
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
        id: titleObjectId,
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
  };
}

export function applyJsonPatch(root, patch) {
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

export function downloadFromUrl(url) {
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = "";
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function downloadDataUrl(dataUrl, filename) {
  const anchor = window.document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename.replace(/[\\/:*?"<>|]+/g, "_");
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function round(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}
