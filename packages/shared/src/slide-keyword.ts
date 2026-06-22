import type { SlideId } from "./presentation-script";

export type SlideKeywordImportance = "HIGH" | "MEDIUM" | "LOW";
export type SlideKeywordSource = "AI" | "USER";

export interface SlideKeyword {
  keywordId: string;
  slideId: SlideId;
  text: string;
  importance: SlideKeywordImportance;
  aliases: string[];
  isRequired: boolean;
  source: SlideKeywordSource;
  createdAt: string;
  updatedAt: string;
}

export interface SlideKeywordDraft {
  slideId: SlideId;
  text: string;
  isRequired: boolean;
}

export interface SlideKeywordValidationResult {
  isValid: boolean;
  errors: string[];
}

export const SLIDE_KEYWORD_MAX_LENGTH = 40;

export function validateSlideKeywordDraft(draft: SlideKeywordDraft): SlideKeywordValidationResult {
  const errors: string[] = [];
  const text = draft.text.trim();

  if (!draft.slideId.trim()) {
    errors.push("슬라이드를 선택해야 합니다.");
  }

  if (text.length === 0) {
    errors.push("키워드를 입력해야 합니다.");
  }

  if (text.length > SLIDE_KEYWORD_MAX_LENGTH) {
    errors.push(`키워드는 ${SLIDE_KEYWORD_MAX_LENGTH}자 이하로 입력해야 합니다.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function createSlideKeyword(draft: SlideKeywordDraft, now: string): SlideKeyword {
  const validation = validateSlideKeywordDraft(draft);

  if (!validation.isValid) {
    throw new Error(validation.errors.join(" "));
  }

  return {
    keywordId: `keyword-${now}-${draft.text.trim()}`.replace(/[^a-zA-Z0-9가-힣_-]/g, "-"),
    slideId: draft.slideId,
    text: draft.text.trim(),
    importance: draft.isRequired ? "HIGH" : "MEDIUM",
    aliases: [],
    isRequired: draft.isRequired,
    source: "USER",
    createdAt: now,
    updatedAt: now
  };
}

export function updateSlideKeyword(
  keyword: SlideKeyword,
  updates: Pick<SlideKeywordDraft, "text" | "isRequired">,
  now: string
): SlideKeyword {
  const validation = validateSlideKeywordDraft({
    slideId: keyword.slideId,
    text: updates.text,
    isRequired: updates.isRequired
  });

  if (!validation.isValid) {
    throw new Error(validation.errors.join(" "));
  }

  return {
    ...keyword,
    text: updates.text.trim(),
    importance: updates.isRequired ? "HIGH" : "MEDIUM",
    isRequired: updates.isRequired,
    updatedAt: now
  };
}
