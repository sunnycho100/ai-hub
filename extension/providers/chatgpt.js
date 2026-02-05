/**
 * AI Hub – ChatGPT Content Script
 *
 * Injected into chatgpt.com / chat.openai.com pages.
 *
 * Responsibilities:
 * - Send HELLO_PROVIDER on load
 * - Handle SEND_PROMPT: paste text into input, click send
 * - Observe DOM for new assistant messages, emit NEW_MESSAGE
 * - Emit ERROR if selectors break
 */

const PROVIDER = "chatgpt";

// ─── Selectors (will need updating when ChatGPT redesigns) ──
const SELECTORS = {
  // The main textarea/contenteditable input
  input: '#prompt-textarea, textarea[data-id="root"], div[contenteditable="true"][id="prompt-textarea"]',
  // The send button
  sendButton: 'button[data-testid="send-button"], button[aria-label="Send prompt"]',
  // Assistant message containers
  assistantMessage: '[data-message-author-role="assistant"]',
  // The text content within an assistant message
  messageText: ".markdown, .whitespace-pre-wrap",
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
    // Count existing messages before sending
    lastMessageCount = document.querySelectorAll(SELECTORS.assistantMessage).length;

    // Find the input element
    const input = document.querySelector(SELECTORS.input);
    if (!input) {
      emitError("INPUT_NOT_FOUND", "Could not find ChatGPT input field", JSON.stringify(SELECTORS.input));
      return;
    }

    // Paste the prompt text
    if (input.tagName === "TEXTAREA") {
      // Standard textarea
      input.value = msg.text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      // ContentEditable div (newer ChatGPT UI)
      input.focus();
      input.textContent = "";

      // Use execCommand for contenteditable to trigger React's synthetic events
      document.execCommand("insertText", false, msg.text);

      // Fallback: set innerHTML if execCommand didn't work
      if (!input.textContent.trim()) {
        input.innerHTML = `<p>${msg.text}</p>`;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }

    // Small delay to let UI update
    await sleep(300);

    // Click the send button
    const sendBtn = document.querySelector(SELECTORS.sendButton);
    if (!sendBtn) {
      emitError("SEND_BTN_NOT_FOUND", "Could not find ChatGPT send button", JSON.stringify(SELECTORS.sendButton));
      return;
    }

    sendBtn.click();

    // Notify that prompt was sent
    chrome.runtime.sendMessage({
      type: "PROMPT_SENT",
      runId: msg.runId,
      provider: PROVIDER,
      round: msg.round,
      timestamp: Date.now(),
    });

    console.log(`[${PROVIDER}] prompt sent for round ${msg.round}`);

    // Start watching for the response
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
      // New assistant message appeared
      const latestMsg = messages[messages.length - 1];
      const textEl = latestMsg.querySelector(SELECTORS.messageText);
      const text = textEl ? textEl.textContent.trim() : latestMsg.textContent.trim();

      // Check if the message is still being streamed (look for streaming indicators)
      const isStreaming =
        latestMsg.querySelector('[data-testid="stop-button"]') !== null ||
        latestMsg.closest('[class*="streaming"]') !== null;

      if (!isStreaming && text.length > 0) {
        // Message complete – emit
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
  }, 1500); // Poll every 1.5s

  // Timeout after 5 minutes
  setTimeout(() => {
    if (observerActive) {
      clearInterval(checkInterval);
      observerActive = false;
      emitError("RESPONSE_TIMEOUT", "Timed out waiting for ChatGPT response after 5 minutes");
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
