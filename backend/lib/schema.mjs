export const SLIDE_SIZE = {
  width: 1280,
  height: 720,
};

export const presentationDocumentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "title", "theme", "slides", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    theme: {
      type: "object",
      additionalProperties: false,
      required: ["id", "name", "background", "surface", "primary", "accent", "text", "mutedText", "fontFamily"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        background: { type: "string" },
        surface: { type: "string" },
        primary: { type: "string" },
        accent: { type: "string" },
        text: { type: "string" },
        mutedText: { type: "string" },
        fontFamily: { type: "string" },
      },
    },
    slides: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/slide" },
    },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
  },
  $defs: {
    slide: {
      type: "object",
      additionalProperties: false,
      required: ["id", "title", "objects", "speakerScript", "keywords", "emphasisPoints", "aiSuggestions"],
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        objects: {
          type: "array",
          minItems: 1,
          items: { $ref: "#/$defs/slideObject" },
        },
        speakerScript: { type: "string" },
        keywords: { type: "array", items: { type: "string" } },
        emphasisPoints: {
          type: "array",
          items: { $ref: "#/$defs/emphasisPoint" },
        },
        aiSuggestions: {
          type: "array",
          items: { $ref: "#/$defs/aiSuggestion" },
        },
      },
    },
    slideObject: {
      type: "object",
      additionalProperties: false,
      required: ["id", "type", "x", "y", "width", "height", "rotation", "style"],
      properties: {
        id: { type: "string" },
        type: { enum: ["text", "shape", "image", "chart"] },
        x: { type: "number" },
        y: { type: "number" },
        width: { type: "number" },
        height: { type: "number" },
        rotation: { type: "number" },
        style: {
          type: "object",
          additionalProperties: {
            anyOf: [
              { type: "string" },
              { type: "number" },
              { type: "boolean" },
              { type: "null" },
            ],
          },
        },
        content: { type: "string" },
        assetId: { type: "string" },
        chartSpec: { $ref: "#/$defs/chartSpec" },
      },
    },
    chartSpec: {
      type: "object",
      additionalProperties: false,
      required: ["chartType", "title", "labels", "values"],
      properties: {
        chartType: { enum: ["bar", "line", "donut"] },
        title: { type: "string" },
        labels: { type: "array", items: { type: "string" } },
        values: { type: "array", items: { type: "number" } },
        unit: { type: "string" },
      },
    },
    emphasisPoint: {
      type: "object",
      additionalProperties: false,
      required: ["id", "targetObjectId", "type", "triggerKeywords", "description"],
      properties: {
        id: { type: "string" },
        targetObjectId: { type: "string" },
        type: { enum: ["highlight", "zoom", "underline", "spotlight"] },
        triggerKeywords: { type: "array", items: { type: "string" } },
        description: { type: "string" },
      },
    },
    aiSuggestion: {
      type: "object",
      additionalProperties: false,
      required: ["id", "status", "reason", "patches"],
      properties: {
        id: { type: "string" },
        status: { enum: ["pending", "approved", "rejected"] },
        reason: { type: "string" },
        patches: {
          type: "array",
          items: { $ref: "#/$defs/jsonPatch" },
        },
      },
    },
    jsonPatch: {
      type: "object",
      additionalProperties: false,
      required: ["op", "path"],
      properties: {
        op: { enum: ["add", "replace", "remove"] },
        path: { type: "string" },
        value: {},
      },
    },
  },
};

export function normalizeGenerateRequest(input) {
  const request = input && typeof input === "object" ? input : {};
  const prompt = String(request.prompt ?? "").trim();
  if (!prompt) {
    throw new Error("prompt is required");
  }

  const language = request.language === "en" ? "en" : "ko";
  const toneValues = new Set(["professional", "simple", "persuasive", "educational"]);
  const slideCount = clampInteger(request.slideCount, 3, 12, 6);
  const durationMinutes = clampInteger(request.durationMinutes, 1, 120, Math.max(5, slideCount * 2));

  return {
    prompt,
    audience: stringOrUndefined(request.audience),
    durationMinutes,
    slideCount,
    tone: toneValues.has(request.tone) ? request.tone : "professional",
    language,
    referenceFileIds: Array.isArray(request.referenceFileIds)
      ? request.referenceFileIds.filter((value) => typeof value === "string")
      : [],
    referenceText: stringOrUndefined(request.referenceText),
    templateId: stringOrUndefined(request.templateId) ?? "executive",
  };
}

export function validatePresentationDocument(document) {
  const errors = [];
  if (!document || typeof document !== "object") {
    return ["document must be an object"];
  }

  requireString(document, "id", errors);
  requireString(document, "title", errors);
  requireString(document, "createdAt", errors);
  requireString(document, "updatedAt", errors);

  if (!document.theme || typeof document.theme !== "object") {
    errors.push("theme must be an object");
  } else {
    ["id", "name", "background", "surface", "primary", "accent", "text", "mutedText", "fontFamily"]
      .forEach((key) => requireString(document.theme, `theme.${key}`, errors, key));
  }

  if (!Array.isArray(document.slides) || document.slides.length === 0) {
    errors.push("slides must contain at least one slide");
  } else {
    document.slides.forEach((slide, slideIndex) => {
      if (!slide || typeof slide !== "object") {
        errors.push(`slides[${slideIndex}] must be an object`);
        return;
      }
      requireString(slide, `slides[${slideIndex}].id`, errors, "id");
      requireString(slide, `slides[${slideIndex}].title`, errors, "title");
      requireString(slide, `slides[${slideIndex}].speakerScript`, errors, "speakerScript");
      requireArray(slide, `slides[${slideIndex}].keywords`, errors, "keywords");
      requireArray(slide, `slides[${slideIndex}].emphasisPoints`, errors, "emphasisPoints");
      requireArray(slide, `slides[${slideIndex}].aiSuggestions`, errors, "aiSuggestions");
      if (!Array.isArray(slide.objects) || slide.objects.length === 0) {
        errors.push(`slides[${slideIndex}].objects must contain at least one object`);
      } else {
        const objectIds = new Set();
        slide.objects.forEach((object, objectIndex) => {
          const path = `slides[${slideIndex}].objects[${objectIndex}]`;
          if (!object || typeof object !== "object") {
            errors.push(`${path} must be an object`);
            return;
          }
          requireString(object, `${path}.id`, errors, "id");
          objectIds.add(object.id);
          if (!["text", "shape", "image", "chart"].includes(object.type)) {
            errors.push(`${path}.type is invalid`);
          }
          ["x", "y", "width", "height", "rotation"].forEach((key) => {
            if (typeof object[key] !== "number" || !Number.isFinite(object[key])) {
              errors.push(`${path}.${key} must be a finite number`);
            }
          });
          if (!object.style || typeof object.style !== "object" || Array.isArray(object.style)) {
            errors.push(`${path}.style must be an object`);
          }
          if (object.type === "chart" && !object.chartSpec) {
            errors.push(`${path}.chartSpec is required for chart objects`);
          }
        });
        slide.emphasisPoints?.forEach((point, pointIndex) => {
          const path = `slides[${slideIndex}].emphasisPoints[${pointIndex}]`;
          if (!objectIds.has(point.targetObjectId)) {
            errors.push(`${path}.targetObjectId must reference a slide object`);
          }
        });
      }
    });
  }
  return errors;
}

export function assertPresentationDocument(document) {
  const errors = validatePresentationDocument(document);
  if (errors.length > 0) {
    throw new Error(`Invalid PresentationDocument: ${errors.join("; ")}`);
  }
  return document;
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(number)));
}

function stringOrUndefined(value) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function requireString(target, path, errors, key = path) {
  if (typeof target[key] !== "string" || target[key].trim() === "") {
    errors.push(`${path} must be a non-empty string`);
  }
}

function requireArray(target, path, errors, key = path) {
  if (!Array.isArray(target[key])) {
    errors.push(`${path} must be an array`);
  }
}
