/**
 * AI Hub – WS Bus Diagnostic Monitor
 *
 * Connects to the WS bus and logs ALL messages flowing through.
 * Run this alongside the main system to see exactly what messages
 * are being relayed and identify pipeline breaks.
 *
 * Usage:  node tools/ws-bus/monitor.js
 */

const WebSocket = require("ws");

const WS_URL = process.env.WS_URL || "ws://localhost:3333";
const LOG_FILE = "terminalog.md";
const fs = require("fs");
const path = require("path");

const logPath = path.join(__dirname, "..", "..", LOG_FILE);

let messageCount = 0;
const startTime = Date.now();

function timestamp() {
  return new Date().toISOString().replace("T", " ").replace("Z", "");
}

function log(text) {
  const line = `[${timestamp()}] ${text}`;
  console.log(line);
  fs.appendFileSync(logPath, line + "\n");
}

function logSection(title) {
  const line = `\n### ${title}\n`;
  console.log(line);
  fs.appendFileSync(logPath, line + "\n");
}

// Initialize log file
fs.writeFileSync(
  logPath,
  `# AI Hub – Pipeline Debug Log\n\nStarted: ${timestamp()}\n\n## Message Flow\n\n`
);

function connect() {
  log("Connecting to WS bus at " + WS_URL);

  const ws = new WebSocket(WS_URL);

  ws.on("open", () => {
    log("✅ MONITOR connected to WS bus");
    log("Listening for all messages...\n");

    // Send a PING to verify bus is alive
    ws.send(JSON.stringify({ type: "PING" }));
  });

  ws.on("message", (raw) => {
    messageCount++;
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      log(`⚠️  MSG #${messageCount}: non-JSON: ${raw.toString().substring(0, 200)}`);
      return;
    }

    const type = msg.type || "UNKNOWN";
    const provider = msg.provider || "";
    const round = msg.round || "";
    const runId = msg.runId ? msg.runId.substring(0, 8) + "..." : "";

    switch (type) {
      case "PING_ACK":
        log(`📡 MSG #${messageCount}: PING_ACK (bus is alive)`);
        break;

      case "HELLO_PROVIDER":
        log(
          `🟢 MSG #${messageCount}: HELLO_PROVIDER | provider=${provider} tabId=${msg.tabId} url=${msg.url}`
        );
        break;

      case "SEND_PROMPT":
        log(
          `📤 MSG #${messageCount}: SEND_PROMPT | provider=${provider} round=${round} runId=${runId} textLen=${(msg.text || "").length}`
        );
        log(`   First 100 chars: "${(msg.text || "").substring(0, 100)}..."`);
        break;

      case "PROMPT_SENT":
        log(
          `✅ MSG #${messageCount}: PROMPT_SENT | provider=${provider} round=${round} runId=${runId}`
        );
        break;

      case "NEW_MESSAGE":
        log(
          `💬 MSG #${messageCount}: NEW_MESSAGE | provider=${provider} round=${round} role=${msg.role} textLen=${(msg.text || "").length}`
        );
        log(`   First 100 chars: "${(msg.text || "").substring(0, 100)}..."`);
        break;

      case "ERROR":
        log(
          `❌ MSG #${messageCount}: ERROR | provider=${provider} code=${msg.code} message="${msg.message}"`
        );
        if (msg.details) {
          log(`   Details: ${msg.details.substring(0, 300)}`);
        }
        break;

      case "STATUS_UPDATE":
        log(
          `📊 MSG #${messageCount}: STATUS_UPDATE | wsStatus=${msg.wsStatus} providers=${JSON.stringify(msg.providers)}`
        );
        break;

      default:
        log(
          `❓ MSG #${messageCount}: ${type} | ${JSON.stringify(msg).substring(0, 200)}`
        );
    }
  });

  ws.on("close", () => {
    log("🔴 MONITOR disconnected from bus. Reconnecting in 3s...");
    setTimeout(connect, 3000);
  });

  ws.on("error", (err) => {
    log(`⚠️  WS error: ${err.message}`);
  });

  // Summary every 30 seconds
  setInterval(() => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    log(
      `--- Summary: ${messageCount} total messages in ${elapsed}s ---`
    );
  }, 30000);
}

connect();

// Graceful shutdown
process.on("SIGINT", () => {
  logSection("Monitor Shutdown");
  log(`Total messages captured: ${messageCount}`);
  log(`Runtime: ${Math.round((Date.now() - startTime) / 1000)}s`);
  process.exit(0);
});
