export type DeckId = string;
export type SlideId = string;

export type SlideScriptSource = "AI" | "USER";

export interface DeckSlide {
  slideId: SlideId;
  deckId: DeckId;
  slideNumber: number;
  title: string | null;
  thumbnailLabel: string;
}

export interface SlideScript {
  slideId: SlideId;
  body: string;
  estimatedDurationSeconds: number;
  speakingTips: string[];
  revision: number;
  source: SlideScriptSource;
  updatedAt: string;
}

export interface SlideScriptDraft {
  slideId: SlideId;
  body: string;
}

export interface SlideScriptValidationResult {
  isValid: boolean;
  errors: string[];
}

export const SLIDE_SCRIPT_MAX_LENGTH = 5000;
const AVERAGE_KOREAN_CHARS_PER_MINUTE = 330;

export function validateSlideScriptDraft(draft: SlideScriptDraft): SlideScriptValidationResult {
  const errors: string[] = [];
  const body = draft.body.trim();

  if (!draft.slideId.trim()) {
    errors.push("슬라이드를 선택해야 합니다.");
  }

  if (draft.body.length > SLIDE_SCRIPT_MAX_LENGTH) {
    errors.push(`스크립트는 ${SLIDE_SCRIPT_MAX_LENGTH}자 이하로 입력해야 합니다.`);
  }

  if (body.length === 0 && draft.body.length > 0) {
    errors.push("공백만 있는 스크립트는 저장할 수 없습니다.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function estimateScriptDurationSeconds(body: string): number {
  const meaningfulLength = body.replace(/\s/g, "").length;

  if (meaningfulLength === 0) {
    return 0;
  }

  return Math.max(5, Math.ceil((meaningfulLength / AVERAGE_KOREAN_CHARS_PER_MINUTE) * 60));
}

export function createSlideScript(
  draft: SlideScriptDraft,
  previousScript: SlideScript | null,
  now: string
): SlideScript {
  const validation = validateSlideScriptDraft(draft);

  if (!validation.isValid) {
    throw new Error(validation.errors.join(" "));
  }

  return {
    slideId: draft.slideId,
    body: draft.body.trim(),
    estimatedDurationSeconds: estimateScriptDurationSeconds(draft.body),
    speakingTips: previousScript?.speakingTips ?? [],
    revision: (previousScript?.revision ?? 0) + 1,
    source: "USER",
    updatedAt: now
  };
}
