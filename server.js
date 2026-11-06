import { WebSocketServer } from "ws";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { serveApp } from "./server/http.mjs";
import { allowsOrigin } from "./server/origin.mjs";
const bound = (raw, fallback, min, max) => {
  const value = Number(raw);
  return Number.isFinite(value) && value >= min
    ? Math.min(Math.trunc(value), max)
    : fallback;
};
const maxClients = bound(process.env.MAX_CLIENTS, 24, 1, 128),
  heartbeatMs = bound(process.env.HEARTBEAT_MS, 30000, 100, 120000);
const server = createServer((req, res) => {
  void serveApp(req, res, { clientCount: clients.size });
});
const wss = new WebSocketServer({
    server,
    path: "/realtime",
    maxPayload: 1024,
    verifyClient: (info) =>
      clients.size < maxClients &&
      allowsOrigin(info.origin, info.req.headers.host),
  }),
  clients = new Map();
const demos = new Set([1, 4, 7, 10, 13, 16, 19, 20, 22, 3]),
  actions = new Set(["idle", "tea", "read", "stretch"]);
let serial = 0,
  broadcastTimer;
const traffic = new WeakMap();
function sendRaw(ws, payload) {
  if (ws.readyState !== 1) return;
  if (ws.bufferedAmount > 65536) {
    ws.terminate();
    return;
  }
  ws.send(payload);
}
function send(ws, value) {
  sendRaw(ws, JSON.stringify(value));
}
function broadcast() {
  if (stopping || broadcastTimer) return;
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null;
    const users = [...clients.values()].map(
      ({ last, greetAt, ...user }) => user,
    );
    const payload = JSON.stringify({ type: "state", users });
    for (const ws of clients.keys()) sendRaw(ws, payload);
  }, 16);
  broadcastTimer.unref();
}
wss.on("connection", (ws) => {
  const num = ++serial;
  const user = {
    id: randomUUID(),
    name:
      ["잔잔한 바람", "느긋한 파도", "다정한 구름", "고요한 노을"][
        (num - 1) % 4
      ] +
      " " +
      num,
    seat: null,
    x: 0,
    z: 4.8,
    yaw: Math.PI,
    mode: "standing",
    action: "idle",
    last: 0,
    greetAt: 0,
  };
  traffic.set(ws, { since: Date.now(), count: 0 });
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });
  clients.set(ws, user);
  send(ws, { type: "welcome", id: user.id });
  broadcast();
  ws.on("message", (data) => {
    const budget = traffic.get(ws),
      now = Date.now();
    if (now - budget.since >= 1000) {
      budget.since = now;
      budget.count = 0;
    }
    if (++budget.count > 60) {
      ws.close(1008, "Message limit");
      return;
    }
    try {
      const m = JSON.parse(data);
      if (m.type === "greet" && Date.now() - user.greetAt > 1500) {
        user.greetAt = Date.now();
        for (const other of clients.keys())
          send(other, { type: "greet", id: user.id, name: user.name });
      } else if (
        m.type === "seat" &&
        Number.isInteger(m.seat) &&
        m.seat >= 0 &&
        m.seat < 24
      ) {
        if (
          demos.has(m.seat) ||
          [...clients.values()].some((u) => u !== user && u.seat === m.seat)
        ) {
          send(ws, { type: "seat-rejected", requestId: m.requestId });
          return;
        }
        user.seat = m.seat;
        user.mode = "walking";
        user.action = "idle";
        send(ws, {
          type: "seat-granted",
          seat: m.seat,
          requestId: m.requestId,
        });
        broadcast();
      } else if (m.type === "settle" && user.seat !== null) {
        user.mode = "seated";
        user.yaw = 0;
        broadcast();
      } else if (m.type === "leave") {
        user.seat = null;
        user.mode = "standing";
        user.action = "idle";
        broadcast();
      } else if (
        m.type === "action" &&
        actions.has(m.action) &&
        user.mode === "seated"
      ) {
        user.action = m.action;
        broadcast();
      } else if (
        m.type === "move" &&
        Number.isFinite(m.x) &&
        Number.isFinite(m.z) &&
        Number.isFinite(m.yaw) &&
        Date.now() - user.last > 75
      ) {
        user.x = Math.max(-3.45, Math.min(3.45, m.x));
        user.z = Math.max(-8.8, Math.min(9, m.z));
        user.yaw = m.yaw;
        user.mode = "walking";
        user.last = Date.now();
        broadcast();
      } else if (m.type === "stop" && user.seat === null) {
        user.mode = "standing";
        broadcast();
      }
    } catch {}
  });
  ws.on("close", () => {
    clients.delete(ws);
    broadcast();
  });
  ws.on("error", () => {});
});
const heartbeat = setInterval(() => {
  for (const ws of clients.keys()) {
    if (ws.isAlive === false || ws.readyState !== 1) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, heartbeatMs);
heartbeat.unref();
wss.on("close", () => clearInterval(heartbeat));
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  clearInterval(heartbeat);
  clearTimeout(broadcastTimer);
  for (const ws of clients.keys()) ws.terminate();
  wss.close();
  server.close();
  server.closeIdleConnections?.();
  const deadline = setTimeout(() => server.closeAllConnections?.(), 3000);
  deadline.unref();
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
server.listen(process.env.PORT || 3001, process.env.HOST || "127.0.0.1", () =>
  console.log("Sea Train listening " + server.address().port),
);
