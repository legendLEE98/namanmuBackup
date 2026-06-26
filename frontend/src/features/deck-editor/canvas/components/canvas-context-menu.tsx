import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronRight,
  faClipboard,
  faCopy,
  faObjectGroup,
  faObjectUngroup,
  faPaste,
  faScissors,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";

export function CanvasContextMenu({
  contextMenu,
  canPaste,
  canGroup,
  isGroupedObject,
  isOrderSubmenuOpen,
  onAction,
  onOrder,
  onScheduleOrderSubmenu,
  onOpenOrderSubmenu,
}) {
  if (!contextMenu) {
    return null;
  }

  const hasObject = Boolean(contextMenu.objectId);

  return (
    <div
      className="canvas-context-menu"
      style={{ left: Math.max(8, contextMenu.x), top: Math.max(8, contextMenu.y) }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <button type="button" disabled={!hasObject} onClick={() => onAction("cut")}>
        <span className="context-menu-icon"><FontAwesomeIcon icon={faScissors} /></span>
        <span>잘라내기</span>
      </button>
      <button type="button" disabled={!hasObject} onClick={() => onAction("copy")}>
        <span className="context-menu-icon"><FontAwesomeIcon icon={faCopy} /></span>
        <span>복사</span>
      </button>
      <button type="button" disabled={!canPaste} onClick={() => onAction("paste")}>
        <span className="context-menu-icon"><FontAwesomeIcon icon={faPaste} /></span>
        <span>붙여넣기</span>
      </button>
      <button type="button" disabled={!canPaste} onClick={() => onAction("pastePlain")}>
        <span className="context-menu-icon"><FontAwesomeIcon icon={faClipboard} /></span>
        <span>서식 없이 붙여넣기</span>
      </button>
      <button type="button" disabled={!hasObject} onClick={() => onAction("delete")}>
        <span className="context-menu-icon"><FontAwesomeIcon icon={faTrashCan} /></span>
        <span>삭제</span>
      </button>
      <button type="button" disabled={!canGroup} onClick={() => onAction("group")}>
        <span className="context-menu-icon"><FontAwesomeIcon icon={faObjectGroup} /></span>
        <span>그룹화</span>
      </button>
      <button type="button" disabled={!hasObject || !isGroupedObject?.(contextMenu.objectId)} onClick={() => onAction("ungroup")}>
        <span className="context-menu-icon"><FontAwesomeIcon icon={faObjectUngroup} /></span>
        <span>그룹화 해제</span>
      </button>
      <div className="context-menu-separator" />
      <div
        className={`context-menu-item has-submenu ${hasObject ? "" : "disabled"} ${isOrderSubmenuOpen ? "submenu-open" : ""}`}
        onMouseEnter={onScheduleOrderSubmenu}
        onFocus={onScheduleOrderSubmenu}
        onClick={(event) => {
          event.stopPropagation();
          if (!hasObject) return;
          onOpenOrderSubmenu();
        }}
      >
        <span>순서</span>
        <span className="context-menu-arrow"><FontAwesomeIcon icon={faChevronRight} /></span>
        <div className="context-submenu">
          <button type="button" onClick={() => onOrder("front")}>
            <span>맨 앞으로 가져오기</span>
          </button>
          <button type="button" onClick={() => onOrder("forward")}>
            <span>앞으로 가져오기</span>
          </button>
          <button type="button" onClick={() => onOrder("backward")}>
            <span>뒤로 보내기</span>
          </button>
          <button type="button" onClick={() => onOrder("back")}>
            <span>맨 뒤로 보내기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
