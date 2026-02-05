/**
 * AI Hub – Local WebSocket Message Bus
 *
 * Broadcast relay between HubAI (Next.js) and the Chrome extension.
 * Every message received from one client is forwarded to all other clients.
 *
 * Usage:  node tools/ws-bus/server.js
 * Port:   3333 (configurable via WS_PORT env var)
 */

const { WebSocketServer } = require("ws");

const PORT = parseInt(process.env.WS_PORT || "3333", 10);

const wss = new WebSocketServer({ port: PORT });

/** @type {Set<import("ws").WebSocket>} */
const clients = new Set();

wss.on("connection", (ws, req) => {
  const origin = req.headers.origin || "unknown";
  console.log(`[ws-bus] client connected (origin: ${origin})  |  total: ${clients.size + 1}`);
  clients.add(ws);

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      console.warn("[ws-bus] received non-JSON message, ignoring");
      return;
    }

    // Built-in PING/PONG for liveness checks
    if (data.type === "PING") {
      ws.send(JSON.stringify({ type: "PING_ACK", timestamp: Date.now() }));
      return;
    }

    // Broadcast to every *other* connected client
    for (const client of clients) {
      if (client !== ws && client.readyState === 1 /* OPEN */) {
        client.send(raw.toString());
      }
    }

    if (data.type) {
      console.log(`[ws-bus] relayed  ${data.type}  →  ${clients.size - 1} client(s)`);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`[ws-bus] client disconnected  |  total: ${clients.size}`);
  });

  ws.on("error", (err) => {
    console.error("[ws-bus] client error:", err.message);
    clients.delete(ws);
  });
});

console.log(`\n🔌 AI Hub WS Bus listening on ws://localhost:${PORT}\n`);
