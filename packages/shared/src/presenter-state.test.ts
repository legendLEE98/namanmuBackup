import { describe, expect, it } from "vitest";
import { createPresenterStateSummary } from "./presenter-state";
import type { DeckSlide } from "./presentation-script";
import type { SlideKeyword } from "./slide-keyword";

const slides: DeckSlide[] = [
  {
    deckId: "deck-1",
    slideId: "slide-1",
    slideNumber: 1,
    title: "문제 정의",
    thumbnailLabel: "문제"
  },
  {
    deckId: "deck-1",
    slideId: "slide-2",
    slideNumber: 2,
    title: "해결 방식",
    thumbnailLabel: "해결"
  }
];

const keywords: SlideKeyword[] = [
  {
    keywordId: "keyword-1",
    slideId: "slide-1",
    text: "기존 발표 도구 한계",
    importance: "HIGH",
    aliases: [],
    isRequired: true,
    source: "AI",
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-22T00:00:00.000Z"
  }
];

describe("presenter state summary", () => {
  it("returns current and next slide summaries", () => {
    const state = createPresenterStateSummary({
      slides,
      currentSlideId: "slide-1",
      elapsedSeconds: 60,
      targetDurationSeconds: 300,
      keywordsBySlideId: {
        "slide-1": keywords
      },
      questions: [],
      status: "LIVE"
    });

    expect(state.currentSlide.slideNumber).toBe(1);
    expect(state.nextSlide?.slideNumber).toBe(2);
    expect(state.remainingSeconds).toBe(240);
  });

  it("keeps required keywords as missed candidates", () => {
    const state = createPresenterStateSummary({
      slides,
      currentSlideId: "slide-1",
      elapsedSeconds: 0,
      targetDurationSeconds: 300,
      keywordsBySlideId: {
        "slide-1": keywords
      },
      questions: [],
      status: "LIVE"
    });

    expect(state.missedKeywordCandidates).toHaveLength(1);
  });

  it("filters questions that need presenter attention", () => {
    const state = createPresenterStateSummary({
      slides,
      currentSlideId: "slide-1",
      elapsedSeconds: 0,
      targetDurationSeconds: 300,
      keywordsBySlideId: {},
      questions: [
        {
          questionId: "question-1",
          slideId: "slide-1",
          body: "근거가 무엇인가요?",
          status: "NEW",
          requiresPresenterAttention: false,
          createdAt: "2026-06-22T00:00:00.000Z"
        },
        {
          questionId: "question-2",
          slideId: "slide-1",
          body: "이미 답변된 질문",
          status: "AI_ANSWERED",
          requiresPresenterAttention: false,
          createdAt: "2026-06-22T00:00:00.000Z"
        }
      ],
      status: "LIVE"
    });

    expect(state.pendingQuestions).toHaveLength(1);
  });
});
