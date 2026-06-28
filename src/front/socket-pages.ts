export function renderSocketLobbyPage(): string {
    return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Orbit 소켓 방</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #111418;
        color: #ecf1f7;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 32px;
        background: #111418;
      }

      main {
        max-width: 840px;
        margin: 0 auto;
      }

      header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-end;
        margin-bottom: 24px;
      }

      h1 {
        margin: 0 0 8px;
        font-size: 28px;
        letter-spacing: 0;
      }

      p {
        margin: 0;
        color: #9ca8b8;
      }

      label {
        display: grid;
        gap: 8px;
        color: #cbd5e1;
        font-size: 14px;
        font-weight: 700;
      }

      input {
        width: 100%;
        height: 44px;
        border: 1px solid #2b3543;
        border-radius: 8px;
        padding: 0 12px;
        background: #0f141b;
        color: #ecf1f7;
        font: inherit;
      }

      button {
        height: 44px;
        border: 0;
        border-radius: 8px;
        padding: 0 16px;
        background: #38bdf8;
        color: #082f49;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      a {
        color: #7dd3fc;
      }

      .status {
        display: grid;
        gap: 6px;
        justify-items: end;
        color: #cbd5e1;
        font-size: 14px;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid #2b3543;
        border-radius: 999px;
        padding: 6px 12px;
        background: #161b22;
      }

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #f97316;
      }

      .dot.connected {
        background: #22c55e;
      }

      .panel {
        display: grid;
        gap: 16px;
        border: 1px solid #2b3543;
        border-radius: 8px;
        padding: 20px;
        background: #161b22;
      }

      .actions {
        display: flex;
        gap: 12px;
        align-items: end;
      }

      .actions label {
        flex: 1;
      }

      .result {
        min-height: 48px;
        border: 1px dashed #374151;
        border-radius: 8px;
        padding: 14px;
        color: #9ca8b8;
        overflow-wrap: anywhere;
      }

      .error {
        color: #fca5a5;
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>Orbit 소켓 방</h1>
          <p>랜덤 방 ID와 비밀번호로 공유 Konva 캔버스 방을 만듭니다.</p>
        </div>
        <div class="status">
          <span class="pill"><span id="dot" class="dot"></span><span id="connectionStatus">연결 중</span></span>
        </div>
      </header>

      <section class="panel">
        <div class="actions">
          <label>
            방 비밀번호
            <input id="roomPassword" type="password" autocomplete="new-password" placeholder="캔버스 방 비밀번호" />
          </label>
          <button id="createRoom" type="button" disabled>방 생성</button>
        </div>
        <div id="result" class="result">소켓 서버에 연결되면 방을 만들 수 있습니다.</div>
      </section>
    </main>

    <script src="/socket.io/socket.io.js"></script>
    <script>
      const socket = io({
        path: "/socket.io",
        transports: ["websocket", "polling"],
      });

      const dot = document.querySelector("#dot");
      const connectionStatus = document.querySelector("#connectionStatus");
      const createRoom = document.querySelector("#createRoom");
      const roomPassword = document.querySelector("#roomPassword");
      const result = document.querySelector("#result");

      socket.on("connect", () => {
        dot.classList.add("connected");
        connectionStatus.textContent = "연결됨: " + socket.id;
        createRoom.disabled = false;
      });

      socket.on("disconnect", (reason) => {
        dot.classList.remove("connected");
        connectionStatus.textContent = "dis연결됨: " + reason;
        createRoom.disabled = true;
      });

      socket.on("room:created", (room) => {
        const url = "/socket/canvas/" + encodeURIComponent(room.roomId);
        result.classList.remove("error");
        result.innerHTML =
          "<div>방 생성 완료: <code>" + escapeHtml(room.roomId) + "</code></div>" +
          "<div><a href=\\"" + url + "\\">" + escapeHtml(location.origin + url) + "</a></div>";
      });

      socket.on("room:error", (error) => {
        result.classList.add("error");
        result.textContent = error && error.message ? error.message : "방 요청에 실패했습니다.";
      });

      createRoom.addEventListener("click", () => {
        const password = roomPassword.value.trim();
        if (!password) {
          result.classList.add("error");
          result.textContent = "비밀번호를 입력해 주세요.";
          roomPassword.focus();
          return;
        }

        createRoom.disabled = true;
        result.classList.remove("error");
        result.textContent = "방을 생성하는 중입니다.";
        socket.emit("room:create", { password });

        setTimeout(() => {
          if (socket.connected) {
            createRoom.disabled = false;
          }
        }, 500);
      });

      roomPassword.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          createRoom.click();
        }
      });

      function escapeHtml(value) {
        return String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      }
    </script>
  </body>
</html>`;
  }

export function renderCanvasRoomPage(roomId: string): string {
    return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Orbit 캔버스 ${escapeHtml(roomId)}</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #111418;
        color: #ecf1f7;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 24px;
        background: #111418;
      }

      main {
        max-width: 1280px;
        margin: 0 auto;
      }

      header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-end;
        margin-bottom: 20px;
      }

      h1 {
        margin: 0 0 8px;
        font-size: 26px;
        letter-spacing: 0;
      }

      h2 {
        margin: 0;
        font-size: 16px;
        letter-spacing: 0;
      }

      p {
        margin: 0;
        color: #9ca8b8;
      }

      input {
        height: 42px;
        border: 1px solid #2b3543;
        border-radius: 8px;
        padding: 0 12px;
        background: #0f141b;
        color: #ecf1f7;
        font: inherit;
      }

      button {
        height: 42px;
        border: 0;
        border-radius: 8px;
        padding: 0 14px;
        background: #38bdf8;
        color: #082f49;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 10px 0;
        border-bottom: 1px solid #2b3543;
        text-align: left;
        vertical-align: top;
        font-size: 13px;
      }

      th {
        color: #cbd5e1;
      }

      code {
        color: #d7e3f4;
        overflow-wrap: anywhere;
      }

      .status {
        display: grid;
        gap: 6px;
        justify-items: end;
        color: #cbd5e1;
        font-size: 14px;
      }

      .pill {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid #2b3543;
        border-radius: 999px;
        padding: 6px 12px;
        background: #161b22;
      }

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #f97316;
      }

      .dot.connected {
        background: #22c55e;
      }

      .join {
        display: flex;
        gap: 10px;
        margin-bottom: 16px;
      }

      .join input {
        flex: 1;
      }

      .workspace {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 16px;
        align-items: start;
      }

      .sidePanel {
        border: 1px solid #2b3543;
        border-radius: 8px;
        padding: 16px;
        background: #161b22;
      }

      .sidePanelHead {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
      }

      .muted {
        color: #9ca8b8;
      }

      #message {
        min-height: 24px;
        margin-bottom: 12px;
        color: #9ca8b8;
      }

      #message.error {
        color: #fca5a5;
      }

      #konvaStage {
        width: 100%;
        height: 620px;
        border: 1px solid #2b3543;
        border-radius: 8px;
        overflow: hidden;
        background: #f8fafc;
      }

      #konvaStage.locked,
      #roomUsersPanel.locked {
        display: none;
      }

      @media (max-width: 900px) {
        .workspace {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>Orbit 캔버스</h1>
          <p>방 ID: <code id="roomLabel"></code></p>
        </div>
        <div class="status">
          <span class="pill"><span id="dot" class="dot"></span><span id="connectionStatus">연결 중</span></span>
        </div>
      </header>

      <section id="joinPanel" class="join">
        <input id="roomPassword" type="password" autocomplete="current-password" placeholder="방 비밀번호" />
        <button id="joinRoom" type="button" disabled>입장</button>
      </section>
      <div id="message">소켓 서버에 연결 중입니다.</div>

      <section class="workspace">
        <div id="konvaStage" class="locked"></div>
        <aside id="roomUsersPanel" class="sidePanel locked">
          <div class="sidePanelHead">
            <h2>접속 중인 유저</h2>
            <span id="roomUsersCount" class="muted">0</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>소켓</th>
                <th>IP</th>
                <th>환경</th>
              </tr>
            </thead>
            <tbody id="roomUsersBody"></tbody>
          </table>
        </aside>
      </section>
    </main>

    <script src="https://unpkg.com/konva@9/konva.min.js"></script>
    <script src="/socket.io/socket.io.js"></script>
    <script>
      const roomId = ${JSON.stringify(roomId)};
      const socket = io({
        path: "/socket.io",
        transports: ["websocket", "polling"],
      });

      const dot = document.querySelector("#dot");
      const connectionStatus = document.querySelector("#connectionStatus");
      const roomLabel = document.querySelector("#roomLabel");
      const joinPanel = document.querySelector("#joinPanel");
      const joinRoom = document.querySelector("#joinRoom");
      const roomPassword = document.querySelector("#roomPassword");
      const message = document.querySelector("#message");
      const stageHost = document.querySelector("#konvaStage");
      const roomUsersPanel = document.querySelector("#roomUsersPanel");
      const roomUsersCount = document.querySelector("#roomUsersCount");
      const roomUsersBody = document.querySelector("#roomUsersBody");

      roomLabel.textContent = roomId;

      const stage = new Konva.Stage({
        container: "konvaStage",
        width: stageHost.clientWidth,
        height: stageHost.clientHeight,
      });
      const layer = new Konva.Layer();
      stage.add(layer);

      const shapeById = new Map();
      let joined = false;
      let lastCanvasEmitAt = 0;

      window.addEventListener("resize", () => {
        stage.width(stageHost.clientWidth);
        stage.height(stageHost.clientHeight);
      });

      socket.on("connect", () => {
        dot.classList.add("connected");
        connectionStatus.textContent = "연결됨: " + socket.id;
        joinRoom.disabled = false;
      });

      socket.on("disconnect", (reason) => {
        dot.classList.remove("connected");
        connectionStatus.textContent = "dis연결됨: " + reason;
        joinRoom.disabled = true;
        joined = false;
      });

      socket.on("room:joined", (room) => {
        joined = true;
        joinPanel.hidden = true;
        stageHost.classList.remove("locked");
        roomUsersPanel.classList.remove("locked");
        message.classList.remove("error");
        message.textContent = "입장 완료. 도형을 드래그하면 같은 방에 동기화됩니다.";
        socket.emit("canvas:state", { roomId: room.roomId });
        socket.emit("room:users", { roomId: room.roomId });
        setTimeout(() => {
          stage.width(stageHost.clientWidth);
          stage.height(stageHost.clientHeight);
        }, 0);
      });

      socket.on("room:error", (error) => {
        message.classList.add("error");
        message.textContent = error && error.message ? error.message : "방 요청에 실패했습니다.";
        joinRoom.disabled = false;
      });

      socket.on("room:users", renderRoomUsers);
      socket.on("canvas:state", renderCanvasState);
      socket.on("canvas:update", applyCanvasShape);

      joinRoom.addEventListener("click", () => {
        const password = roomPassword.value.trim();
        if (!password) {
          message.classList.add("error");
          message.textContent = "방 비밀번호를 입력해 주세요.";
          roomPassword.focus();
          return;
        }

        joinRoom.disabled = true;
        message.classList.remove("error");
        message.textContent = "방에 입장하는 중입니다.";
        socket.emit("room:join", { roomId, password });
      });

      roomPassword.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          joinRoom.click();
        }
      });

      function renderRoomUsers(users) {
        if (!Array.isArray(users)) {
          return;
        }

        roomUsersCount.textContent = String(users.length);
        roomUsersBody.innerHTML = users.map((user) => {
          return "<tr>" +
            "<td><code>" + escapeHtml(shortId(user.id)) + "</code></td>" +
            "<td><code>" + escapeHtml(user.ip) + "</code></td>" +
            "<td>" +
              "<div>" + escapeHtml(user.environment.browserLabel) + "</div>" +
              "<div class=\\"muted\\">" + escapeHtml(user.transport) + "</div>" +
            "</td>" +
          "</tr>";
        }).join("");
      }

      function renderCanvasState(shapes) {
        if (!joined || !Array.isArray(shapes)) {
          return;
        }

        layer.destroyChildren();
        shapeById.clear();
        shapes.forEach(applyCanvasShape);
      }

      function applyCanvasShape(shape) {
        if (!joined || !shape || shape.roomId !== roomId || !shape.id) {
          return;
        }

        let node = shapeById.get(shape.id);
        if (!node) {
          node = createShapeNode(shape);
          shapeById.set(shape.id, node);
          layer.add(node);
        }

        node.position({ x: shape.x, y: shape.y });
        layer.batchDraw();
      }

      function createShapeNode(shape) {
        const common = {
          id: shape.id,
          x: shape.x,
          y: shape.y,
          draggable: true,
        };

        let node;
        if (shape.kind === "circle") {
          node = new Konva.Circle({
            ...common,
            radius: shape.radius || 42,
            fill: shape.fill || "#38bdf8",
            stroke: "#0f172a",
            strokeWidth: 2,
          });
        } else {
          node = new Konva.Rect({
            ...common,
            width: shape.width || 140,
            height: shape.height || 88,
            fill: shape.fill || "#f97316",
            stroke: "#0f172a",
            strokeWidth: 2,
            cornerRadius: 8,
          });
        }

        node.on("dragmove", () => emitCanvasUpdate(node, shape));
        node.on("dragend", () => emitCanvasUpdate(node, shape, true));
        return node;
      }

      function emitCanvasUpdate(node, shape, force = false) {
        if (!joined) {
          return;
        }

        const now = Date.now();
        if (!force && now - lastCanvasEmitAt < 60) {
          return;
        }
        lastCanvasEmitAt = now;

        socket.emit("canvas:update", {
          ...shape,
          roomId,
          x: Math.round(node.x()),
          y: Math.round(node.y()),
        });
      }

      function shortId(value) {
        const text = String(value ?? "");
        return text.length > 10 ? text.slice(0, 10) : text;
      }

      function escapeHtml(value) {
        return String(value ?? "")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");
      }
    </script>
  </body>
</html>`;
  }

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}





export function renderMobilePage(): string {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Orbit 모바일</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #ffffff;
        color: #263238;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background: #ffffff;
      }

      header {
        min-height: 92px;
        padding: 16px 18px 14px;
        background: #ABDEE6;
        color: #17333a;
      }

      main {
        max-width: 560px;
        margin: 0 auto;
      }

      .hero {
        max-width: 560px;
        margin: 0 auto;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
        font-weight: 900;
        color: #17333a;
      }

      .brandMark {
        display: inline-grid;
        place-items: center;
        width: 30px;
        height: 30px;
        border-radius: 999px;
        background: #ffffff;
        color: #17333a;
        box-shadow: 0 6px 18px rgba(23, 51, 58, 0.12);
      }

      h1 {
        margin: 0 0 6px;
        font-size: 30px;
        line-height: 1.15;
        letter-spacing: 0;
      }

      p {
        margin: 0;
        color: #3f5960;
        line-height: 1.6;
      }

      .content {
        display: grid;
        gap: 16px;
        padding: 18px;
      }

      .panel {
        border: 1px solid #d8edf1;
        border-radius: 8px;
        padding: 18px;
        background: #ffffff;
        box-shadow: 0 12px 32px rgba(23, 51, 58, 0.08);
      }

      .panel h2 {
        margin: 0 0 8px;
        font-size: 18px;
        letter-spacing: 0;
        color: #263238;
      }

      .status {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 16px;
        border: 1px solid #c8e6ec;
        border-radius: 999px;
        padding: 8px 12px;
        color: #2f4e55;
        background: #f3fbfc;
        font-size: 14px;
      }

      .dot {
        width: 9px;
        height: 9px;
        border-radius: 999px;
        background: #f59e0b;
      }

      .dot.connected {
        background: #14b8a6;
      }

      .actionGrid {
        display: grid;
        gap: 12px;
        margin-top: 16px;
      }

      .actionButton {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        min-height: 58px;
        border: 1px solid #c8e6ec;
        border-radius: 8px;
        padding: 0 16px;
        background: #ffffff;
        color: #263238;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 8px 20px rgba(23, 51, 58, 0.08);
      }

      .actionButton i {
        display: inline-grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 999px;
        background: #ABDEE6;
        color: #17333a;
        font-size: 16px;
      }

      .actionButton:active {
        transform: translateY(1px);
      }
    </style>
  </head>
  <body>
    <header>
      <div class="hero">
        <div class="brand"><span class="brandMark"><i class="fa-solid fa-circle-nodes"></i></span><span>Orbit</span></div>
        <h1>모바일</h1>
        <p>발표 현장에서 바로 참여할 수 있는 모바일 공간입니다.</p>
      </div>
    </header>

    <main>
      <section class="content">
        <div class="panel">
          <h2>모바일 작업 공간</h2>
          <p>발표자료를 기반으로 질문하고, 실시간으로 답변을 확인합니다.</p>
          <div class="status"><span id="dot" class="dot"></span><span id="connectionStatus">연결 중</span></div>
          <div class="actionGrid">
            <button id="questionButton" class="actionButton" type="button"><i class="fa-solid fa-comments"></i><span>AI 질문하기</span></button>
            <button class="actionButton" type="button"><i class="fa-solid fa-person-chalkboard"></i><span>발표 참관</span></button>
            <button class="actionButton" type="button"><i class="fa-solid fa-square-poll-vertical"></i><span>설문하기</span></button>
          </div>
        </div>
      </section>
    </main>

    <script src="/socket.io/socket.io.js"></script>
    <script>
      const socket = io({
        path: "/socket.io",
        transports: ["websocket", "polling"],
      });

      const dot = document.querySelector("#dot");
      const connectionStatus = document.querySelector("#connectionStatus");
      const questionButton = document.querySelector("#questionButton");

      questionButton.addEventListener("click", () => {
        location.href = "/socket/mobile/question";
      });

      socket.on("connect", () => {
        dot.classList.add("connected");
        connectionStatus.textContent = "연결됨: " + socket.id;
      });

      socket.on("disconnect", (reason) => {
        dot.classList.remove("connected");
        connectionStatus.textContent = "연결 끊김: " + reason;
      });
    </script>
  </body>
</html>`;
}

export function renderMobileQuestionPage(): string {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Orbit 질문하기</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #ffffff;
        color: #263238;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        background: #f7fbfc;
      }

      header {
        padding: 7px 14px;
        background: #ABDEE6;
        color: #17333a;
        position: sticky;
        top: 0;
        z-index: 3;
      }

      main,
      .hero {
        max-width: 560px;
        margin: 0 auto;
      }

      .brand {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 0;
        font-weight: 900;
      }

      .brandMark {
        display: inline-grid;
        place-items: center;
        width: 26px;
        height: 26px;
        border-radius: 999px;
        background: #ffffff;
        box-shadow: 0 6px 18px rgba(23, 51, 58, 0.12);
      }

      .topRow {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      h1 {
        margin: 0 0 4px;
        font-size: 24px;
        line-height: 1.15;
        letter-spacing: 0;
      }

      p {
        margin: 0;
        color: #3f5960;
        line-height: 1.6;
      }

      .content {
        display: grid;
        gap: 16px;
        padding: 14px;
      }

      .summary,
      .chatShell {
        border: 1px solid #d8edf1;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 12px 32px rgba(23, 51, 58, 0.08);
      }

      .summary {
        padding: 14px;
      }

      .summaryTitle {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        color: #263238;
        font-weight: 800;
      }

      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: 1px solid #c8e6ec;
        border-radius: 999px;
        padding: 7px 10px;
        color: #2f4e55;
        background: #f3fbfc;
        font-size: 13px;
        font-weight: 700;
      }

      .chatShell {
        display: grid;
        grid-template-rows: minmax(320px, 1fr) auto;
        min-height: calc(100vh - 246px);
        overflow: hidden;
      }

      .messages {
        display: grid;
        align-content: start;
        gap: 12px;
        padding: 14px;
        overflow-y: auto;
      }

      .message {
        max-width: 88%;
        border-radius: 8px;
        padding: 12px;
        line-height: 1.55;
        word-break: keep-all;
        overflow-wrap: anywhere;
      }

      .message.bot {
        justify-self: start;
        border: 1px solid #d8edf1;
        background: #ffffff;
      }

      .message.user {
        justify-self: end;
        background: #ABDEE6;
        color: #17333a;
        font-weight: 700;
      }

      .messageMeta {
        display: block;
        margin-bottom: 4px;
        color: #5b7379;
        font-size: 12px;
        font-weight: 800;
      }

      .composer {
        display: grid;
        grid-template-columns: 1fr 46px;
        gap: 8px;
        border-top: 1px solid #d8edf1;
        padding: 10px;
        background: #ffffff;
      }

      textarea {
        width: 100%;
        min-height: 46px;
        max-height: 120px;
        border: 1px solid #c8e6ec;
        border-radius: 8px;
        padding: 11px 12px;
        resize: vertical;
        font: inherit;
        color: #263238;
        background: #fbfeff;
      }

      button,
      a.backLink {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px;
        border: 1px solid #c8e6ec;
        border-radius: 8px;
        padding: 0 14px;
        background: #ffffff;
        color: #263238;
        font: inherit;
        font-weight: 800;
        text-decoration: none;
        cursor: pointer;
      }

      .sendButton {
        min-width: 46px;
        padding: 0;
        border-color: #ABDEE6;
        background: #ABDEE6;
        color: #17333a;
      }

      a.backLink {
        min-height: 36px;
        padding: 0 10px;
        background: rgba(255, 255, 255, 0.7);
      }
    </style>
  </head>
  <body>
    <header>
      <div class="hero">
        <div class="brand"><span class="brandMark"><i class="fa-solid fa-circle-nodes"></i></span><span>Orbit</span></div>
      </div>
    </header>

    <main>
      <section class="content">
        <section class="summary">
          <div class="summaryTitle"><i class="fa-solid fa-book-open-reader"></i><span>발표자료 RAG 응답 모드</span></div>
          <p>현재 발표 덱과 슬라이드 내용을 기준으로 질문을 해석합니다.</p>
          <div class="chips">
            <span class="chip"><i class="fa-solid fa-file-lines"></i>슬라이드 검색</span>
            <span class="chip"><i class="fa-solid fa-quote-left"></i>근거 요약</span>
            <span class="chip"><i class="fa-solid fa-bolt"></i>실시간 답변</span>
          </div>
        </section>

        <section class="chatShell">
          <div id="messages" class="messages">
            <div class="message bot">
              <span class="messageMeta">Orbit AI</span>
              발표자료에 대해 궁금한 점을 물어보세요. 예: "이번 발표의 핵심 결론이 뭐야?" 또는 "3번 슬라이드 내용을 쉽게 설명해줘."
            </div>
          </div>
          <form id="questionForm" class="composer">
            <textarea id="questionInput" rows="1" placeholder="발표자료에 대해 질문하기"></textarea>
            <button class="sendButton" type="submit" aria-label="질문 보내기"><i class="fa-solid fa-paper-plane"></i></button>
          </form>
        </section>
      </section>
    </main>
    <script>
      const form = document.querySelector("#questionForm");
      const input = document.querySelector("#questionInput");
      const messages = document.querySelector("#messages");

      function addMessage(role, text) {
        const message = document.createElement("div");
        message.className = "message " + role;
        const meta = document.createElement("span");
        meta.className = "messageMeta";
        meta.textContent = role === "user" ? "나" : "Orbit AI";
        message.append(meta, document.createTextNode(text));
        messages.append(message);
        messages.scrollTop = messages.scrollHeight;
      }

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const question = input.value.trim();
        if (!question) {
          return;
        }
        addMessage("user", question);
        input.value = "";
        addMessage("bot", "발표자료에서 관련 내용을 찾는 중입니다. RAG API가 연결되면 이 위치에 근거 기반 답변이 표시됩니다.");
      });
    </script>
  </body>
</html>`;
}


