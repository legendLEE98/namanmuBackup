import type { DeckId, DeckSlide } from "@ai-ppt/shared";

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
