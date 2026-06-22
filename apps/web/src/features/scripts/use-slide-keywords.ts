import { useEffect, useState } from "react";
import {
  createSlideKeyword,
  updateSlideKeyword,
  validateSlideKeywordDraft,
  type DeckId,
  type SlideKeyword
} from "@ai-ppt/shared";
import { loadKeywords, saveKeywords } from "./keyword-storage";

interface UseSlideKeywordsResult {
  keywordsBySlideId: Record<string, SlideKeyword[]>;
  keywordText: string;
  isRequired: boolean;
  keywordErrors: string[];
  setKeywordText: (text: string) => void;
  setIsRequired: (isRequired: boolean) => void;
  addKeyword: () => boolean;
  updateKeywordText: (keywordId: string, text: string) => void;
  toggleKeywordRequired: (keywordId: string) => void;
  removeKeyword: (keywordId: string) => void;
}

export function useSlideKeywords(deckId: DeckId, selectedSlideId: string): UseSlideKeywordsResult {
  const [keywordsBySlideId, setKeywordsBySlideId] = useState<Record<string, SlideKeyword[]>>(() => loadKeywords(deckId));
  const [keywordText, setKeywordText] = useState("");
  const [isRequired, setIsRequired] = useState(true);
  const [keywordErrors, setKeywordErrors] = useState<string[]>([]);

  useEffect(() => {
    saveKeywords(deckId, keywordsBySlideId);
  }, [deckId, keywordsBySlideId]);

  useEffect(() => {
    setKeywordText("");
    setIsRequired(true);
    setKeywordErrors([]);
  }, [selectedSlideId]);

  function addKeyword(): boolean {
    const validation = validateSlideKeywordDraft({
      slideId: selectedSlideId,
      text: keywordText,
      isRequired
    });

    if (!validation.isValid) {
      setKeywordErrors(validation.errors);
      return false;
    }

    const now = new Date().toISOString();
    const keyword = createSlideKeyword(
      {
        slideId: selectedSlideId,
        text: keywordText,
        isRequired
      },
      now
    );

    setKeywordsBySlideId((keywords) => ({
      ...keywords,
      [selectedSlideId]: [...(keywords[selectedSlideId] ?? []), keyword]
    }));
    setKeywordText("");
    setIsRequired(true);
    setKeywordErrors([]);
    return true;
  }

  function updateKeywordText(keywordId: string, text: string): void {
    const now = new Date().toISOString();
    const targetKeyword = (keywordsBySlideId[selectedSlideId] ?? []).find((keyword) => keyword.keywordId === keywordId);

    if (!targetKeyword) {
      return;
    }

    const validation = validateSlideKeywordDraft({
      slideId: targetKeyword.slideId,
      text,
      isRequired: targetKeyword.isRequired
    });

    if (!validation.isValid) {
      setKeywordErrors(validation.errors);
      return;
    }

    setKeywordsBySlideId((keywords) => ({
      ...keywords,
      [selectedSlideId]: (keywords[selectedSlideId] ?? []).map((keyword) =>
        keyword.keywordId === keywordId
          ? updateSlideKeyword(keyword, { text, isRequired: keyword.isRequired }, now)
          : keyword
      )
    }));
    setKeywordErrors([]);
  }

  function toggleKeywordRequired(keywordId: string): void {
    const now = new Date().toISOString();

    setKeywordsBySlideId((keywords) => ({
      ...keywords,
      [selectedSlideId]: (keywords[selectedSlideId] ?? []).map((keyword) =>
        keyword.keywordId === keywordId
          ? updateSlideKeyword(keyword, { text: keyword.text, isRequired: !keyword.isRequired }, now)
          : keyword
      )
    }));
  }

  function removeKeyword(keywordId: string): void {
    setKeywordsBySlideId((keywords) => ({
      ...keywords,
      [selectedSlideId]: (keywords[selectedSlideId] ?? []).filter((keyword) => keyword.keywordId !== keywordId)
    }));
  }

  return {
    keywordsBySlideId,
    keywordText,
    isRequired,
    keywordErrors,
    setKeywordText,
    setIsRequired,
    addKeyword,
    updateKeywordText,
    toggleKeywordRequired,
    removeKeyword
  };
}
