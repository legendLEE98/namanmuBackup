export type GeneratePresentationRequest = {
  prompt: string;
  audience?: string;
  durationMinutes?: number;
  slideCount?: number;
  tone?: "professional" | "simple" | "persuasive" | "educational";
  language: "ko" | "en";
  referenceFileIds?: string[];
  referenceText?: string;
  templateId?: string;
};

export type GeneratePresentationResponse = {
  presentationId: string;
  status: "queued" | "generating" | "completed" | "failed";
};

export type GenerationStatus = {
  status: "queued" | "generating" | "completed" | "failed";
  step: string;
  progress: number;
  errorMessage?: string;
};

export type PresentationTheme = {
  id: string;
  name: string;
  background: string;
  surface: string;
  primary: string;
  accent: string;
  text: string;
  mutedText: string;
  fontFamily: string;
};

export type ChartSpec = {
  chartType: "bar" | "line" | "donut";
  title: string;
  labels: string[];
  values: number[];
  unit?: string;
};

export type JsonPatch = {
  op: "add" | "replace" | "remove";
  path: string;
  value?: unknown;
};

export type PresentationDocument = {
  id: string;
  title: string;
  theme: PresentationTheme;
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
};

export type Slide = {
  id: string;
  title: string;
  objects: SlideObject[];
  speakerScript: string;
  keywords: string[];
  emphasisPoints: EmphasisPoint[];
  aiSuggestions: AiSuggestion[];
};

export type SlideObject = {
  id: string;
  type: "text" | "shape" | "image" | "chart";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  style: Record<string, unknown>;
  content?: string;
  assetId?: string;
  chartSpec?: ChartSpec;
};

export type EmphasisPoint = {
  id: string;
  targetObjectId: string;
  type: "highlight" | "zoom" | "underline" | "spotlight";
  triggerKeywords: string[];
  description: string;
};

export type AiSuggestion = {
  id: string;
  status: "pending" | "approved" | "rejected";
  reason: string;
  patches: JsonPatch[];
};
