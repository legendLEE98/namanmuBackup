import type { DeckId, DeckSlide } from "@ai-ppt/shared";
import type { SlideKeyword } from "@ai-ppt/shared";

export const DEMO_DECK_ID: DeckId = "deck-demo-day";

export const DEMO_SLIDES: DeckSlide[] = [
  {
    slideId: "slide-1",
    deckId: DEMO_DECK_ID,
    slideNumber: 1,
    title: "문제 정의",
    thumbnailLabel: "문제"
  },
  {
    slideId: "slide-2",
    deckId: DEMO_DECK_ID,
    slideNumber: 2,
    title: "해결 방식",
    thumbnailLabel: "해결"
  },
  {
    slideId: "slide-3",
    deckId: DEMO_DECK_ID,
    slideNumber: 3,
    title: "서비스 흐름",
    thumbnailLabel: "흐름"
  },
  {
    slideId: "slide-4",
    deckId: DEMO_DECK_ID,
    slideNumber: 4,
    title: "기대 효과",
    thumbnailLabel: "효과"
  }
];

export const DEMO_KEYWORDS: Record<string, SlideKeyword[]> = {
  "slide-1": [
    {
      keywordId: "keyword-slide-1-problem",
      slideId: "slide-1",
      text: "기존 발표 도구 한계",
      importance: "HIGH",
      aliases: ["발표 도구 문제"],
      isRequired: true,
      source: "AI",
      createdAt: "2026-06-22T00:00:00.000Z",
      updatedAt: "2026-06-22T00:00:00.000Z"
    },
    {
      keywordId: "keyword-slide-1-audience",
      slideId: "slide-1",
      text: "청중 질문 단절",
      importance: "MEDIUM",
      aliases: [],
      isRequired: false,
      source: "AI",
      createdAt: "2026-06-22T00:00:00.000Z",
      updatedAt: "2026-06-22T00:00:00.000Z"
    }
  ],
  "slide-2": [
    {
      keywordId: "keyword-slide-2-state",
      slideId: "slide-2",
      text: "상태 기반 발표 보조",
      importance: "HIGH",
      aliases: ["발표자 상태"],
      isRequired: true,
      source: "AI",
      createdAt: "2026-06-22T00:00:00.000Z",
      updatedAt: "2026-06-22T00:00:00.000Z"
    }
  ],
  "slide-3": [
    {
      keywordId: "keyword-slide-3-rehearsal",
      slideId: "slide-3",
      text: "리허설 피드백",
      importance: "HIGH",
      aliases: [],
      isRequired: true,
      source: "AI",
      createdAt: "2026-06-22T00:00:00.000Z",
      updatedAt: "2026-06-22T00:00:00.000Z"
    },
    {
      keywordId: "keyword-slide-3-qna",
      slideId: "slide-3",
      text: "Q&A 요약",
      importance: "MEDIUM",
      aliases: [],
      isRequired: false,
      source: "AI",
      createdAt: "2026-06-22T00:00:00.000Z",
      updatedAt: "2026-06-22T00:00:00.000Z"
    }
  ],
  "slide-4": []
};
