/**
 * AI Hub – Grok Content Script
 *
 * Injected into grok.com and x.com/i/grok pages.
 *
 * Responsibilities:
 * - Send HELLO_PROVIDER on load
 * - Handle SEND_PROMPT: paste text into input, click send
 * - Observe DOM for new assistant messages, emit NEW_MESSAGE
 * - Emit ERROR if selectors break
 */

const PROVIDER = "grok";

// ─── Selectors (Grok-specific, may change with redesigns) ──
const SELECTORS = {
  // Grok's text input
  input: 'textarea[placeholder*="Ask"], div[contenteditable="true"][role="textbox"], textarea[aria-label*="Message"]',
  // Send button
  sendButton: 'button[aria-label="Send"], button[data-testid="send-button"], button[type="submit"]',
  // Assistant response containers
  assistantMessage: '[data-testid="assistant-message"], .assistant-message, [class*="response"][class*="message"]',
  // Text content within response
  messageText: ".markdown, .message-text, p",
};

let lastMessageCount = 0;
let currentRunId = null;
let currentRound = null;
let observerActive = false;

// ─── Register with background ──────────────────────────────

function register() {
  chrome.runtime.sendMessage(
    {
      type: "HELLO_PROVIDER",
      provider: PROVIDER,
      url: window.location.href,
    },
    (response) => {
      if (chrome.runtime.lastError) {
        console.warn(`[${PROVIDER}] registration failed:`, chrome.runtime.lastError.message);
      } else {
        console.log(`[${PROVIDER}] registered with background`);
      }
    }
  );
}

// ─── Handle incoming messages from background ──────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SEND_PROMPT") {
    console.log(`[${PROVIDER}] received SEND_PROMPT for round ${msg.round}`);
    currentRunId = msg.runId;
    currentRound = msg.round;
    handleSendPrompt(msg);
    sendResponse({ ok: true });
  }
  return true;
});

// ─── Paste & Send ──────────────────────────────────────────

async function handleSendPrompt(msg) {
  try {
    lastMessageCount = document.querySelectorAll(SELECTORS.assistantMessage).length;

    const input = document.querySelector(SELECTORS.input);
    if (!input) {
      emitError("INPUT_NOT_FOUND", "Could not find Grok input field", JSON.stringify(SELECTORS.input));
      return;
    }

    // Focus and paste
    input.focus();

    if (input.tagName === "TEXTAREA") {
      input.value = msg.text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      // ContentEditable
      input.textContent = "";
      document.execCommand("insertText", false, msg.text);

      if (!input.textContent.trim()) {
        input.innerHTML = `<p>${msg.text}</p>`;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }

    await sleep(300);

    // Click send
    const sendBtn = document.querySelector(SELECTORS.sendButton);
    if (!sendBtn) {
      emitError("SEND_BTN_NOT_FOUND", "Could not find Grok send button", JSON.stringify(SELECTORS.sendButton));
      return;
    }

    sendBtn.click();

    chrome.runtime.sendMessage({
      type: "PROMPT_SENT",
      runId: msg.runId,
      provider: PROVIDER,
      round: msg.round,
      timestamp: Date.now(),
    });

    console.log(`[${PROVIDER}] prompt sent for round ${msg.round}`);
    startResponseObserver();
  } catch (err) {
    emitError("SEND_EXCEPTION", err.message, err.stack);
  }
}

// ─── Response Observer ─────────────────────────────────────

function startResponseObserver() {
  if (observerActive) return;
  observerActive = true;

  const checkInterval = setInterval(() => {
    const messages = document.querySelectorAll(SELECTORS.assistantMessage);

    if (messages.length > lastMessageCount) {
      const latestMsg = messages[messages.length - 1];
      const textEl = latestMsg.querySelector(SELECTORS.messageText);
      const text = textEl ? textEl.textContent.trim() : latestMsg.textContent.trim();

      // Check if still streaming
      const isStreaming =
        document.querySelector('[class*="streaming"], [class*="loading"], [class*="typing"]') !== null;

      if (!isStreaming && text.length > 0) {
        chrome.runtime.sendMessage({
          type: "NEW_MESSAGE",
          runId: currentRunId,
          provider: PROVIDER,
          round: currentRound,
          role: "assistant",
          text: text,
          timestamp: Date.now(),
        });

        console.log(`[${PROVIDER}] scraped response (${text.length} chars)`);
        lastMessageCount = messages.length;
        observerActive = false;
        clearInterval(checkInterval);
      }
    }
  }, 1500);

  // Timeout after 5 minutes
  setTimeout(() => {
    if (observerActive) {
      clearInterval(checkInterval);
      observerActive = false;
      emitError("RESPONSE_TIMEOUT", "Timed out waiting for Grok response after 5 minutes");
    }
  }, 5 * 60 * 1000);
}

// ─── Utilities ─────────────────────────────────────────────

function emitError(code, message, details) {
  console.error(`[${PROVIDER}] error: ${code} – ${message}`);
  chrome.runtime.sendMessage({
    type: "ERROR",
    provider: PROVIDER,
    code,
    message,
    details: details || "",
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Init ──────────────────────────────────────────────────

console.log(`[${PROVIDER}] content script loaded`);
register();
