export function ScriptPanel({ slide, onUpdate }) {
  return (
    <div className="script-panel" key={slide.id}>
      <h3 className="script-title">발표자 노트</h3>
      <label>
        발표자 노트
        <textarea defaultValue={slide.speakerScript || ""} onBlur={(event) => onUpdate(event.target.value)} />
      </label>
      <div className="keyword-list">
        {(slide.keywords || []).map((keyword) => <span className="keyword" key={keyword}>{keyword}</span>)}
      </div>
    </div>
  );
}
