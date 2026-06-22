import { describe, expect, it } from "vitest";
import {
  SLIDE_SCRIPT_MAX_LENGTH,
  createSlideScript,
  estimateScriptDurationSeconds,
  validateSlideScriptDraft
} from "./presentation-script";

describe("presentation script validation", () => {
  it("allows an empty script so users can clear a slide script", () => {
    const result = validateSlideScriptDraft({ slideId: "slide-1", body: "" });

    expect(result.isValid).toBe(true);
  });

  it("rejects whitespace-only scripts", () => {
    const result = validateSlideScriptDraft({ slideId: "slide-1", body: "   " });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("공백만 있는 스크립트는 저장할 수 없습니다.");
  });

  it("rejects scripts longer than the maximum length", () => {
    const result = validateSlideScriptDraft({
      slideId: "slide-1",
      body: "가".repeat(SLIDE_SCRIPT_MAX_LENGTH + 1)
    });

    expect(result.isValid).toBe(false);
  });

  it("increments revision when a previous script exists", () => {
    const script = createSlideScript(
      { slideId: "slide-1", body: "핵심 문제를 먼저 설명합니다." },
      {
        slideId: "slide-1",
        body: "이전 스크립트",
        estimatedDurationSeconds: 5,
        speakingTips: ["천천히 말하기"],
        revision: 2,
        source: "USER",
        updatedAt: "2026-06-22T00:00:00.000Z"
      },
      "2026-06-22T01:00:00.000Z"
    );

    expect(script.revision).toBe(3);
    expect(script.speakingTips).toEqual(["천천히 말하기"]);
  });

  it("estimates zero seconds for an empty script", () => {
    expect(estimateScriptDurationSeconds("")).toBe(0);
  });
});
