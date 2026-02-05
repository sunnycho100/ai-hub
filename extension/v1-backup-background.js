/**
 * AI Hub – Chrome Extension Background Service Worker
 *
 * Connects to the local WS bus (ws://localhost:3333) and routes
 * messages between HubAI and provider content scripts.
 *
 * Responsibilities:
 * - Maintain persistent WS connection to the bus
 * - Track which tabs have provider content scripts loaded
 * - Route SEND_PROMPT messages to the correct tab's content script
 * - Forward NEW_MESSAGE / PROMPT_SENT / ERROR from content scripts to the bus
 */

const WS_URL = "ws://localhost:3333";
const RECONNECT_DELAY = 3000;

// ─── State ─────────────────────────────────────────────────
let ws = null;
let wsStatus = "disconnected"; // "connected" | "disconnected" | "connecting"

/**
 * Tab registry: maps provider name → { tabId, url }
 * Populated when content scripts send HELLO_PROVIDER via chrome.runtime.
 */
const tabRegistry = new Map();

// ─── WebSocket Connection ──────────────────────────────────

function connectWS() {
  if (ws && ws.readyState <= 1) return; // already open or connecting

  wsStatus = "connecting";
  broadcastStatus();

  try {
    ws = new WebSocket(WS_URL);
  } catch (err) {
    console.warn("[bg] WebSocket constructor failed:", err.message);
    wsStatus = "disconnected";
    broadcastStatus();
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    console.log("[bg] connected to WS bus");
    wsStatus = "connected";
    broadcastStatus();

    // Re-announce all registered providers
    for (const [provider, info] of tabRegistry.entries()) {
      wsSend({
        type: "HELLO_PROVIDER",
        provider,
        tabId: info.tabId,
        url: info.url,
      });
    }
  };

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    console.log("[bg] ← bus:", msg.type);

    switch (msg.type) {
      case "SEND_PROMPT": {
        // Route to the correct tab's content script
        const info = tabRegistry.get(msg.provider);
        if (!info) {
          wsSend({
            type: "ERROR",
            provider: msg.provider,
            code: "TAB_NOT_FOUND",
            message: `No registered tab for ${msg.provider}`,
          });
          return;
        }
        chrome.tabs.sendMessage(info.tabId, msg, (response) => {
          if (chrome.runtime.lastError) {
            console.warn(
              `[bg] failed to send to ${msg.provider} tab:`,
              chrome.runtime.lastError.message
            );
            wsSend({
              type: "ERROR",
              provider: msg.provider,
              code: "SEND_FAILED",
              message: chrome.runtime.lastError.message,
            });
          }
        });
        break;
      }

      case "FOCUS_TAB": {
        const info = tabRegistry.get(msg.provider);
        if (info) {
          chrome.tabs.update(info.tabId, { active: true });
        }
        break;
      }

      case "PING_ACK":
        // Ignore pong responses
        break;

      default:
        console.log("[bg] unhandled bus message:", msg.type);
    }
  };

  ws.onclose = () => {
    console.log("[bg] WS disconnected");
    ws = null;
    wsStatus = "disconnected";
    broadcastStatus();
    scheduleReconnect();
  };

  ws.onerror = () => {
    // onclose will fire after this
  };
}

function scheduleReconnect() {
  setTimeout(() => connectWS(), RECONNECT_DELAY);
}

function wsSend(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

// ─── Content Script Message Handling ───────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("[bg] ← content script:", msg.type, msg.provider || "");

  switch (msg.type) {
    case "HELLO_PROVIDER": {
      // Register the tab for this provider
      const tabId = sender.tab?.id;
      if (!tabId) break;

      tabRegistry.set(msg.provider, {
        tabId,
        url: msg.url || sender.tab.url,
      });

      console.log(
        `[bg] registered ${msg.provider} → tab ${tabId} (${tabRegistry.size} total)`
      );

      // Forward to HubAI via bus
      wsSend({
        type: "HELLO_PROVIDER",
        provider: msg.provider,
        tabId,
        url: msg.url || sender.tab.url,
      });

      sendResponse({ ok: true });
      break;
    }

    case "NEW_MESSAGE":
    case "PROMPT_SENT":
    case "ERROR":
      // Forward directly to the bus
      wsSend(msg);
      sendResponse({ ok: true });
      break;

    case "GET_STATUS":
      // Popup or content script requesting current state
      sendResponse({
        wsStatus,
        providers: Object.fromEntries(tabRegistry),
      });
      break;

    default:
      sendResponse({ ok: false, error: "unknown message type" });
  }

  return true; // keep sendResponse channel open for async
});

// ─── Tab Lifecycle ─────────────────────────────────────────

// Clean up registry when tabs close
chrome.tabs.onRemoved.addListener((tabId) => {
  for (const [provider, info] of tabRegistry.entries()) {
    if (info.tabId === tabId) {
      tabRegistry.delete(provider);
      console.log(`[bg] tab ${tabId} closed, unregistered ${provider}`);
      broadcastStatus();
    }
  }
});

// ─── Status Broadcasting ──────────────────────────────────

function broadcastStatus() {
  const status = {
    type: "STATUS_UPDATE",
    wsStatus,
    providers: Object.fromEntries(tabRegistry),
  };

  // Notify popup if open
  chrome.runtime
    .sendMessage(status)
    .catch(() => {}); // popup may not be open
}

// ─── Init ──────────────────────────────────────────────────

console.log("[bg] AI Hub extension starting...");
connectWS();
