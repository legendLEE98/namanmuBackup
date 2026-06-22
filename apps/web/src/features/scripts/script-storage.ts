import type { DeckId, SlideScript } from "@ai-ppt/shared";

const STORAGE_PREFIX = "ai-ppt-companion:scripts";

function getStorageKey(deckId: DeckId): string {
  return `${STORAGE_PREFIX}:${deckId}`;
}

export function loadScripts(deckId: DeckId): Record<string, SlideScript> {
  const storedValue = window.localStorage.getItem(getStorageKey(deckId));

  if (!storedValue) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Record<string, SlideScript>;
    return parsedValue && typeof parsedValue === "object" ? parsedValue : {};
  } catch {
    return {};
  }
}

export function saveScripts(deckId: DeckId, scripts: Record<string, SlideScript>): void {
  window.localStorage.setItem(getStorageKey(deckId), JSON.stringify(scripts));
}
