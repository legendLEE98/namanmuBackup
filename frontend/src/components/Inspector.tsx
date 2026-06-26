export function Inspector({ object, onUpdate }) {
  if (!object) {
    return <div className="empty-inspector">선택된 요소가 없습니다.</div>;
  }

  const style = object.style || {};

  return (
    <div className="inspector-details">
      <details open>
        <summary>위치</summary>
        <NumberField label="X" defaultValue={object.x} onCommit={(value) => onUpdate((target) => { target.x = value; })} />
        <NumberField label="Y" defaultValue={object.y} onCommit={(value) => onUpdate((target) => { target.y = value; })} />
        <NumberField label="W" defaultValue={object.width} min={1} onCommit={(value) => onUpdate((target) => { target.width = value; })} />
        <NumberField label="H" defaultValue={object.height} min={1} onCommit={(value) => onUpdate((target) => { target.height = value; })} />
        <NumberField label="회전" defaultValue={object.rotation || 0} onCommit={(value) => onUpdate((target) => { target.rotation = value; })} />
      </details>

      <details open>
        <summary>스타일</summary>
        <TextField label="채우기" defaultValue={style.fill || ""} onCommit={(value) => onUpdate((target) => { target.style = { ...(target.style || {}), fill: value }; })} />
        <TextField label="선" defaultValue={style.stroke || ""} onCommit={(value) => onUpdate((target) => { target.style = { ...(target.style || {}), stroke: value }; })} />
        {object.type === "text" && (
          <>
            <NumberField label="크기" defaultValue={style.fontSize || 28} min={1} onCommit={(value) => onUpdate((target) => { target.style = { ...(target.style || {}), fontSize: value }; })} />
            <TextField className="full" label="텍스트" defaultValue={object.content || ""} onCommit={(value) => onUpdate((target) => { target.content = value; })} />
          </>
        )}
      </details>

      {object.type === "chart" && (
        <details open>
          <summary>차트</summary>
          <TextField className="full" label="제목" defaultValue={object.chartSpec?.title || ""} onCommit={(value) => onUpdate((target) => { target.chartSpec = { ...(target.chartSpec || {}), title: value }; })} />
          <TextField className="full" label="라벨" defaultValue={(object.chartSpec?.labels || []).join(", ")} onCommit={(value) => onUpdate((target) => { target.chartSpec = { ...(target.chartSpec || {}), labels: value.split(",").map((item) => item.trim()).filter(Boolean) }; })} />
          <TextField className="full" label="값" defaultValue={(object.chartSpec?.values || []).join(", ")} onCommit={(value) => onUpdate((target) => { target.chartSpec = { ...(target.chartSpec || {}), values: value.split(",").map((item) => Number(item.trim())).filter(Number.isFinite) }; })} />
        </details>
      )}
    </div>
  );
}

function NumberField({ label, defaultValue, min = undefined, onCommit }) {
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        defaultValue={round(defaultValue)}
        min={min}
        onBlur={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onCommit(next);
        }}
      />
    </label>
  );
}

function TextField({ label, defaultValue, onCommit, className = "" }) {
  return (
    <label className={className}>
      <span>{label}</span>
      <input defaultValue={defaultValue} onBlur={(event) => onCommit(event.target.value)} />
    </label>
  );
}

function round(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}
