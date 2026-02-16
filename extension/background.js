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
const RECONNECT_DELAY = 1000; // fast reconnect for startup reliability

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

    // Send initial EXTENSION_READY (may have empty providers if service worker just woke)
    wsSend({
      type: "EXTENSION_READY",
      providers: Object.fromEntries(tabRegistry),
      timestamp: Date.now(),
    });

    // Re-announce all registered providers
    for (const [provider, info] of tabRegistry.entries()) {
      wsSend({
        type: "HELLO_PROVIDER",
        provider,
        tabId: info.tabId,
        url: info.url,
      });
    }

    // Re-discover content script tabs (in case service worker restarted and lost registry)
    // Track completion so we can send an updated EXTENSION_READY after all tabs are pinged
    // Also re-inject content scripts to catch already-open tabs that may have lost their scripts
    reinjectContentScripts().then(() => {
      // After re-injection completes, discover tabs to build registry
      discoverTabs();
    });
  };

  ws.onmessage = (event) => {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    console.log("[bg] ← bus:", msg.type, msg.provider || "");

    switch (msg.type) {
      case "SEND_PROMPT": {
        // Route to the correct tab's content script
        const info = tabRegistry.get(msg.provider);
        if (!info) {
          console.error("[bg] ❌ No tab registered for " + msg.provider);
          console.log("[bg] Registry:", JSON.stringify(Object.fromEntries(tabRegistry)));
          wsSend({
            type: "ERROR",
            provider: msg.provider,
            runId: msg.runId,
            round: msg.round,
            code: "TAB_NOT_FOUND",
            message: `No registered tab for ${msg.provider}. Open ${msg.provider} in a tab and make sure you're logged in.`,
          });
          return;
        }

        // Verify tab still exists before sending
        chrome.tabs.get(info.tabId, (tab) => {
          if (chrome.runtime.lastError || !tab) {
            console.error("[bg] ❌ Tab " + info.tabId + " for " + msg.provider + " no longer exists");
            tabRegistry.delete(msg.provider);
            wsSend({
              type: "ERROR",
              provider: msg.provider,
              runId: msg.runId,
              round: msg.round,
              code: "TAB_CLOSED",
              message: `${msg.provider} tab was closed. Please reopen it.`,
            });
            return;
          }

          console.log("[bg] 📤 Sending SEND_PROMPT to " + msg.provider + " tab " + info.tabId);
          chrome.tabs.sendMessage(info.tabId, msg, (response) => {
            if (chrome.runtime.lastError) {
              console.error("[bg] ❌ Failed to send to " + msg.provider + ":", chrome.runtime.lastError.message);
              wsSend({
                type: "ERROR",
                provider: msg.provider,
                runId: msg.runId,
                round: msg.round,
                code: "SEND_FAILED",
                message: `Could not reach ${msg.provider} content script: ${chrome.runtime.lastError.message}. Try refreshing the tab.`,
              });
            } else {
              console.log("[bg] ✅ SEND_PROMPT delivered to " + msg.provider);
            }
          });
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

      case "DISCOVER_EXTENSION": {
        // Web app is asking if the extension is alive
        console.log("[bg] received DISCOVER_EXTENSION, responding...");
        // Send immediate response with current registry
        wsSend({
          type: "EXTENSION_READY",
          providers: Object.fromEntries(tabRegistry),
          timestamp: Date.now(),
        });
        // Also re-discover tabs (will send updated EXTENSION_READY when done)
        discoverTabs();
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

/**
 * Discover all tabs with content scripts and register them.
 * Sends individual HELLO_PROVIDER messages as tabs respond,
 * then a final EXTENSION_READY with the complete registry.
 */
function discoverTabs() {
  chrome.tabs.query({}, (tabs) => {
    let pending = 0;
    let found = 0;
    const tabsWithIds = tabs.filter((t) => t.id);
    pending = tabsWithIds.length;

    if (pending === 0) {
      // No tabs to ping — send updated EXTENSION_READY anyway
      wsSend({
        type: "EXTENSION_READY",
        providers: Object.fromEntries(tabRegistry),
        timestamp: Date.now(),
      });
      return;
    }

    for (const tab of tabsWithIds) {
      chrome.tabs.sendMessage(tab.id, { type: "PING_CONTENT" }, (response) => {
        pending--;
        if (!chrome.runtime.lastError && response && response.provider) {
          const existing = tabRegistry.get(response.provider);
          if (!existing || existing.tabId !== tab.id) {
            tabRegistry.set(response.provider, { tabId: tab.id, url: tab.url || "" });
            console.log("[bg] re-discovered " + response.provider + " in tab " + tab.id);
            wsSend({
              type: "HELLO_PROVIDER",
              provider: response.provider,
              tabId: tab.id,
              url: tab.url || "",
            });
            found++;
          }
        }

        // After all tabs responded, send a consolidated EXTENSION_READY
        if (pending === 0 && found > 0) {
          broadcastStatus();
          wsSend({
            type: "EXTENSION_READY",
            providers: Object.fromEntries(tabRegistry),
            timestamp: Date.now(),
          });
        }
      });
    }

    // Safety timeout — if some tabs never respond, send EXTENSION_READY after 3s
    setTimeout(() => {
      if (tabRegistry.size > 0) {
        wsSend({
          type: "EXTENSION_READY",
          providers: Object.fromEntries(tabRegistry),
          timestamp: Date.now(),
        });
      }
    }, 3000);
  });
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
        `[bg] ✅ registered ${msg.provider} → tab ${tabId} (${tabRegistry.size} total)`
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
      console.log("[bg] → forwarding " + msg.type + " from " + (msg.provider || "?") + " to bus");
      wsSend(msg);
      sendResponse({ ok: true });
      break;

    case "HUB_PAGE_OPENED":
      // Hub page content script woke us up — ensure WS is connected
      console.log("[bg] Hub page opened, ensuring WS connection");
      connectWS();
      sendResponse({
        wsStatus,
        providers: Object.fromEntries(tabRegistry),
      });
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

// ─── Keepalive (prevents MV3 service worker termination) ──

// Chrome terminates MV3 service workers after ~30s of inactivity,
// killing WebSocket connections. Alarms keep it alive.
// Use delayInMinutes for FIRST alarm to fire quickly after extension loads
chrome.alarms.create("ws-keepalive", { delayInMinutes: 0.083, periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "ws-keepalive") {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log("[bg] keepalive: reconnecting WS...");
      connectWS();
    }
  }
});

// ─── Init ──────────────────────────────────────────────────

/**
 * Re-inject content scripts into matching tabs.
 * Handles the case where the extension was reloaded and existing tabs
 * have orphaned (stale) content scripts that can't talk to the new service worker.
 */
async function reinjectContentScripts() {
  const scripts = [
    { patterns: ["https://chatgpt.com/*", "https://chat.openai.com/*"], file: "providers/chatgpt.js" },
    { patterns: ["https://gemini.google.com/*"], file: "providers/gemini.js" },
    { patterns: ["https://claude.ai/*"], file: "providers/claude.js" },
  ];
  for (const { patterns, file } of scripts) {
    try {
      const tabs = await chrome.tabs.query({ url: patterns });
      for (const tab of tabs) {
        if (!tab.id) continue;
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [file],
          });
          console.log("[bg] re-injected " + file + " into tab " + tab.id);
        } catch (e) {
          // Tab may not be accessible (e.g. devtools, special pages)
        }
      }
    } catch (e) {
      // Query may fail for restricted URL patterns
    }
  }
}

// Ensure WS connects on extension install/update and Chrome startup
chrome.runtime.onInstalled.addListener(() => {
  console.log("[bg] Extension installed/updated – connecting WS + re-injecting content scripts");
  connectWS();
  reinjectContentScripts();
});

chrome.runtime.onStartup.addListener(() => {
  console.log("[bg] Chrome started – connecting WS + re-injecting content scripts");
  connectWS();
  reinjectContentScripts();
});

console.log("[bg] AI Hub extension starting...");
// Re-inject content scripts into any already-open provider tabs
reinjectContentScripts();
connectWS();
