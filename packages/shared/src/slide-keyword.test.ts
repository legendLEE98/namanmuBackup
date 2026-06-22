import { describe, expect, it } from "vitest";
import {
  SLIDE_KEYWORD_MAX_LENGTH,
  createSlideKeyword,
  updateSlideKeyword,
  validateSlideKeywordDraft
} from "./slide-keyword";

describe("slide keyword validation", () => {
  it("rejects empty keyword text", () => {
    const result = validateSlideKeywordDraft({
      slideId: "slide-1",
      text: "",
      isRequired: true
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("키워드를 입력해야 합니다.");
  });

  it("rejects overly long keyword text", () => {
    const result = validateSlideKeywordDraft({
      slideId: "slide-1",
      text: "가".repeat(SLIDE_KEYWORD_MAX_LENGTH + 1),
      isRequired: false
    });

    expect(result.isValid).toBe(false);
  });

  it("creates a required keyword with high importance", () => {
    const keyword = createSlideKeyword(
      {
        slideId: "slide-1",
        text: "문제 정의",
        isRequired: true
      },
      "2026-06-22T00:00:00.000Z"
    );

    expect(keyword.importance).toBe("HIGH");
    expect(keyword.isRequired).toBe(true);
  });

  it("updates text and required state together", () => {
    const keyword = createSlideKeyword(
      {
        slideId: "slide-1",
        text: "문제",
        isRequired: false
      },
      "2026-06-22T00:00:00.000Z"
    );
    const updatedKeyword = updateSlideKeyword(
      keyword,
      {
        text: "기존 발표 도구 한계",
        isRequired: true
      },
      "2026-06-22T01:00:00.000Z"
    );

    expect(updatedKeyword.text).toBe("기존 발표 도구 한계");
    expect(updatedKeyword.importance).toBe("HIGH");
    expect(updatedKeyword.updatedAt).toBe("2026-06-22T01:00:00.000Z");
  });
});
