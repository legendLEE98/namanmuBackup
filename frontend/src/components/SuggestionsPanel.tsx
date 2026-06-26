export function SuggestionsPanel({ slide, onApprove, onReject }) {
  const suggestions = slide.aiSuggestions || [];

  return (
    <div className="suggestions-panel">
      <h3 className="suggestions-title">추천 제안</h3>
      {suggestions.length === 0 ? (
        <p className="status-message">제안 없음</p>
      ) : (
        suggestions.map((suggestion) => (
          <div className={`suggestion ${suggestion.status}`} key={suggestion.id}>
            <p><strong>{suggestion.status}</strong> {suggestion.reason}</p>
            <div className="suggestion-actions">
              <button type="button" disabled={suggestion.status !== "pending"} onClick={() => onApprove(suggestion.id)}>적용</button>
              <button type="button" disabled={suggestion.status !== "pending"} onClick={() => onReject(suggestion.id)}>제외</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
