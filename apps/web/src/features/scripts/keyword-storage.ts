import type { DeckId, SlideKeyword } from "@ai-ppt/shared";
import { DEMO_KEYWORDS } from "./sample-deck";

const STORAGE_PREFIX = "ai-ppt-companion:keywords";

function getStorageKey(deckId: DeckId): string {
  return `${STORAGE_PREFIX}:${deckId}`;
}

export function loadKeywords(deckId: DeckId): Record<string, SlideKeyword[]> {
  const storedValue = window.localStorage.getItem(getStorageKey(deckId));

  if (!storedValue) {
    return DEMO_KEYWORDS;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Record<string, SlideKeyword[]>;
    return parsedValue && typeof parsedValue === "object" ? parsedValue : DEMO_KEYWORDS;
  } catch {
    return DEMO_KEYWORDS;
  }
}

export function saveKeywords(deckId: DeckId, keywords: Record<string, SlideKeyword[]>): void {
  window.localStorage.setItem(getStorageKey(deckId), JSON.stringify(keywords));
}
