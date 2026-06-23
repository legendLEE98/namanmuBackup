import { SLIDE_SCRIPT_MAX_LENGTH } from "@ai-ppt/shared";
import type { SlideKeyword, SlideScript } from "@ai-ppt/shared";

interface RightSidebarProps {
  currentKeywords: SlideKeyword[];
  currentScript: SlideScript | null;
  draftBody: string;
  hasUnsavedChanges: boolean;
  isRequired: boolean;
  keywordErrors: string[];
  keywordText: string;
  validationErrors: string[];
  addKeyword: () => void;
  cancelDraft: () => void;
  clearScript: () => void;
  formatUpdatedAt: (value: string) => string;
  removeKeyword: (keywordId: string) => void;
  saveDraft: () => void;
  setDraftBody: (value: string) => void;
  setIsRequired: (value: boolean) => void;
  setKeywordText: (value: string) => void;
  toggleKeywordRequired: (keywordId: string) => void;
  updateKeywordText: (keywordId: string, value: string) => void;
}

export function RightSidebar({
  currentKeywords,
  currentScript,
  draftBody,
  hasUnsavedChanges,
  isRequired,
  keywordErrors,
  keywordText,
  validationErrors,
  addKeyword,
  cancelDraft,
  clearScript,
  formatUpdatedAt,
  removeKeyword,
  saveDraft,
  setDraftBody,
  setIsRequired,
  setKeywordText,
  toggleKeywordRequired,
  updateKeywordText
}: RightSidebarProps) {
  return (
    <aside className="editor-column editor-sidebar" aria-label="Presentation info">
      <section className="keyword-panel" aria-label="Keywords">
        <div className="editor-toolbar">
          <div>
            <strong>Keywords</strong>
            <span>
              Required {currentKeywords.filter((keyword) => keyword.isRequired).length} / Optional{" "}
              {currentKeywords.filter((keyword) => !keyword.isRequired).length}
            </span>
          </div>
        </div>

        {currentKeywords.length > 0 ? (
          <ul className="keyword-list">
            {currentKeywords.map((keyword) => (
              <li className="keyword-row" key={keyword.keywordId}>
                <button
                  className={`keyword-type ${keyword.isRequired ? "is-required" : ""}`}
                  type="button"
                  onClick={() => toggleKeywordRequired(keyword.keywordId)}
                >
                  {keyword.isRequired ? "Req" : "Opt"}
                </button>
                <input
                  value={keyword.text}
                  onChange={(event) => updateKeywordText(keyword.keywordId, event.target.value)}
                  aria-label={`${keyword.text} keyword`}
                />
                <button className="icon-action" type="button" onClick={() => removeKeyword(keyword.keywordId)} aria-label="Remove keyword">
                  x
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-keywords">No keywords saved for this page.</div>
        )}

        <div className="keyword-form">
          <input value={keywordText} onChange={(event) => setKeywordText(event.target.value)} placeholder="Add keyword" aria-label="New keyword" />
          <label>
            <input type="checkbox" checked={isRequired} onChange={(event) => setIsRequired(event.target.checked)} />
            Req
          </label>
          <button type="button" onClick={addKeyword}>
            Add
          </button>
        </div>

        {keywordErrors.length > 0 ? (
          <div className="validation-message" role="alert">
            {keywordErrors.join(" ")}
          </div>
        ) : null}
      </section>

      <section className="script-editor" aria-label="Script editor">
        <div className="editor-toolbar">
          <div>
            <strong>Script</strong>
            <span>{draftBody.length}/{SLIDE_SCRIPT_MAX_LENGTH}</span>
          </div>
          {currentScript ? <time dateTime={currentScript.updatedAt}>{formatUpdatedAt(currentScript.updatedAt)}</time> : null}
        </div>

        <textarea
          value={draftBody}
          maxLength={SLIDE_SCRIPT_MAX_LENGTH + 1}
          onChange={(event) => setDraftBody(event.target.value)}
          placeholder="Write speaker notes for this page."
          aria-invalid={validationErrors.length > 0}
        />

        {validationErrors.length > 0 ? (
          <div className="validation-message" role="alert">
            {validationErrors.join(" ")}
          </div>
        ) : null}

        <div className="editor-actions">
          <button className="secondary-action" type="button" onClick={cancelDraft} disabled={!hasUnsavedChanges}>
            Cancel
          </button>
          <button className="danger-action" type="button" onClick={clearScript} disabled={!currentScript && draftBody.length === 0}>
            Clear
          </button>
          <button className="primary-action" type="button" onClick={saveDraft} disabled={!hasUnsavedChanges}>
            Save
          </button>
        </div>
      </section>
    </aside>
  );
}
