import { useEffect, useMemo, useState } from "react";
import { createSlideScript, validateSlideScriptDraft, type DeckId, type SlideScript } from "@ai-ppt/shared";
import { loadScripts, saveScripts } from "./script-storage";

interface UseSlideScriptsResult {
  scriptsBySlideId: Record<string, SlideScript>;
  draftBody: string;
  validationErrors: string[];
  hasUnsavedChanges: boolean;
  setDraftBody: (body: string) => void;
  saveDraft: () => boolean;
  cancelDraft: () => void;
  clearScript: () => void;
}

export function useSlideScripts(deckId: DeckId, selectedSlideId: string): UseSlideScriptsResult {
  const [scriptsBySlideId, setScriptsBySlideId] = useState<Record<string, SlideScript>>(() => loadScripts(deckId));
  const [draftBody, setDraftBody] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const currentScript = scriptsBySlideId[selectedSlideId] ?? null;

  useEffect(() => {
    setDraftBody(currentScript?.body ?? "");
    setValidationErrors([]);
  }, [currentScript?.body, selectedSlideId]);

  useEffect(() => {
    saveScripts(deckId, scriptsBySlideId);
  }, [deckId, scriptsBySlideId]);

  const hasUnsavedChanges = useMemo(() => draftBody !== (currentScript?.body ?? ""), [currentScript?.body, draftBody]);

  function saveDraft(): boolean {
    const validation = validateSlideScriptDraft({
      slideId: selectedSlideId,
      body: draftBody
    });

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return false;
    }

    const nextScript = createSlideScript(
      {
        slideId: selectedSlideId,
        body: draftBody
      },
      currentScript,
      new Date().toISOString()
    );

    setScriptsBySlideId((scripts) => ({
      ...scripts,
      [selectedSlideId]: nextScript
    }));
    setValidationErrors([]);
    return true;
  }

  function cancelDraft(): void {
    setDraftBody(currentScript?.body ?? "");
    setValidationErrors([]);
  }

  function clearScript(): void {
    setScriptsBySlideId((scripts) => {
      const nextScripts = { ...scripts };
      delete nextScripts[selectedSlideId];
      return nextScripts;
    });
    setDraftBody("");
    setValidationErrors([]);
  }

  return {
    scriptsBySlideId,
    draftBody,
    validationErrors,
    hasUnsavedChanges,
    setDraftBody,
    saveDraft,
    cancelDraft,
    clearScript
  };
}
