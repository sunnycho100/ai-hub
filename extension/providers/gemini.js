/**
 * AI Hub - Gemini Content Script (v2 - Robust)
 *
 * Injected into gemini.google.com pages.
 * Uses multiple selector strategies, fallback paste mechanisms,
 * MutationObserver for response detection, and detailed error reporting.
 */

var PROVIDER = "gemini";

// Multiple selector strategies
var INPUT_SELECTORS = [
  'rich-textarea .ql-editor[contenteditable="true"]',
  '.ql-editor[contenteditable="true"]',
  'div[contenteditable="true"][aria-label*="Enter a prompt"]',
  'div[contenteditable="true"][aria-label*="prompt"]',
  'div[contenteditable="true"][data-testid*="input"]',
  'div[contenteditable="true"][role="textbox"]',
  'rich-textarea [contenteditable="true"]',
  'textarea[placeholder*="Message Gemini"]',
  'textarea[placeholder*="Enter a prompt"]',
  '.input-area div[contenteditable="true"]',
  ".text-input-field textarea",
  'textarea[aria-label*="prompt"]',
  "div.ql-editor",
  'div[contenteditable="true"]',
];

var SEND_SELECTORS = [
  'button.send-button:not([aria-disabled="true"])',
  'button[aria-label="Send message"]:not([disabled])',
  "button.send-button",
  'button[data-mat-icon-name="send"]',
  'button[aria-label="Send"]',
  'button[mattooltip="Send"]',
  ".send-button-container button",
];

var ASSISTANT_SELECTORS = [
  "model-response",
];

var MESSAGE_TEXT_SELECTORS = [
  "message-content.model-response-text .markdown.markdown-main-panel",
  "message-content.model-response-text .markdown",
  ".markdown.markdown-main-panel",
  ".markdown-main-panel",
  "message-content .markdown",
  ".markdown",
  "p",
];

var lastMessageCount = 0;
var currentRunId = null;
var currentRound = null;
var observer = null;
var responseCheckInterval = null;

// --- Debug overlay ---

function showDebug(text, isError) {
  var el = document.getElementById("aihub-debug");
  if (!el) {
    el = document.createElement("div");
    el.id = "aihub-debug";
    el.style.cssText =
      "position:fixed;top:8px;right:8px;z-index:99999;padding:8px 12px;" +
      "border-radius:8px;font-size:12px;font-family:monospace;max-width:350px;" +
      "word-wrap:break-word;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:opacity 0.3s;";
    document.body.appendChild(el);
  }
  el.textContent = "[AI Hub] " + text;
  el.style.background = isError ? "#fee" : "#efe";
  el.style.color = isError ? "#c00" : "#060";
  el.style.border = "1px solid " + (isError ? "#fcc" : "#afa");
  el.style.opacity = "1";
  clearTimeout(el._fadeTimer);
  el._fadeTimer = setTimeout(function () {
    el.style.opacity = "0.3";
  }, 8000);
}

// --- Register ---

function register() {
  chrome.runtime.sendMessage(
    { type: "HELLO_PROVIDER", provider: PROVIDER, url: window.location.href },
    function (response) {
      if (chrome.runtime.lastError) {
        console.warn(
          "[" + PROVIDER + "] registration failed:",
          chrome.runtime.lastError.message
        );
      } else {
        console.log("[" + PROVIDER + "] registered with background");
        showDebug("Connected to AI Hub");
      }
    }
  );
}

// --- Handle incoming messages ---

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === "PING_CONTENT") {
    sendResponse({ provider: PROVIDER });
    return;
  }
  if (msg.type === "SEND_PROMPT") {
    console.log(
      "[" + PROVIDER + "] received SEND_PROMPT for round " + msg.round
    );
    showDebug("Round " + msg.round + ": Received prompt...");
    currentRunId = msg.runId;
    currentRound = msg.round;
    handleSendPrompt(msg);
    sendResponse({ ok: true });
  }
  return true;
});

// --- Find element ---

function findElement(selectors, label) {
  for (var i = 0; i < selectors.length; i++) {
    try {
      var el = document.querySelector(selectors[i]);
      if (el) {
        console.log(
          "[" + PROVIDER + "] found " + label + " with: " + selectors[i]
        );
        return el;
      }
    } catch (e) {
      /* skip */
    }
  }
  return null;
}

// --- Insert text (robust, editor-aware approach) ---

function insertText(el, text) {
  var strategies = [];

  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    // React textarea/input: use nativeValueSetter to bypass React's synthetic setter
    try {
      var proto = el.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      var nativeSetter = Object.getOwnPropertyDescriptor(proto, "value").set;
      el.focus();
      nativeSetter.call(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      if (el.value === text) {
        strategies.push("nativeValueSetter OK");
        return { success: true, strategies: strategies };
      }
      strategies.push("nativeValueSetter value mismatch");
    } catch (e) {
      strategies.push("nativeValueSetter FAIL " + e.message);
    }
    // Fallback: direct value
    try {
      el.focus();
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      strategies.push("direct-value OK");
      return { success: true, strategies: strategies };
    } catch (e) {
      strategies.push("direct-value FAIL " + e.message);
    }
  } else {
    // ContentEditable (Quill / rich editor)
    // CRITICAL: Do NOT use el.textContent = "" — it destroys Quill's internal state.
    // Use Selection API + execCommand("delete") to clear content through the editor.

    // Strategy 1: Selection API + delete + insertText (preserves editor state)
    try {
      el.focus();
      var sel = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("delete", false, null);
      var ok = document.execCommand("insertText", false, text);
      if (ok && (el.textContent || "").trim().length > 0) {
        strategies.push("select+delete+insertText OK");
        return { success: true, strategies: strategies };
      }
      strategies.push("select+delete+insertText returned " + ok);
    } catch (e) {
      strategies.push("select+delete+insertText FAIL " + e.message);
    }

    // Strategy 2: Synthetic clipboard paste (Quill handles paste events)
    try {
      el.focus();
      var sel2 = window.getSelection();
      var range2 = document.createRange();
      range2.selectNodeContents(el);
      sel2.removeAllRanges();
      sel2.addRange(range2);
      document.execCommand("delete", false, null);
      var dt = new DataTransfer();
      dt.setData("text/plain", text);
      var pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });
      el.dispatchEvent(pasteEvent);
      strategies.push("synthetic-paste dispatched");
      return { success: true, strategies: strategies };
    } catch (e) {
      strategies.push("synthetic-paste FAIL " + e.message);
    }

    // Strategy 3: innerHTML fallback (last resort, may not update editor state)
    try {
      el.focus();
      el.innerHTML = "<p>" + text.replace(/\n/g, "</p><p>") + "</p>";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      strategies.push("innerHTML-fallback OK");
      return { success: true, strategies: strategies };
    } catch (e) {
      strategies.push("innerHTML FAIL " + e.message);
    }
  }

  return { success: false, strategies: strategies };
}

// --- Find send button ---

function findSendButton(inputEl) {
  var btn = findElement(SEND_SELECTORS, "send button");
  if (btn && !btn.disabled) return btn;

  var container = inputEl
    ? inputEl.closest("form") || inputEl.parentElement
    : null;
  var searchRoot = container || document;
  var attempts = 0;
  while (searchRoot && searchRoot !== document.body && attempts < 5) {
    var buttons = searchRoot.querySelectorAll("button:not([disabled])");
    for (var i = 0; i < buttons.length; i++) {
      var label = (buttons[i].getAttribute("aria-label") || "").toLowerCase();
      if (label.includes("send")) return buttons[i];
    }
    searchRoot = searchRoot.parentElement;
    attempts++;
  }
  return null;
}

// --- Enter key fallback ---

function triggerEnterKey(el) {
  el.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
    })
  );
  el.dispatchEvent(
    new KeyboardEvent("keypress", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
    })
  );
  el.dispatchEvent(
    new KeyboardEvent("keyup", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
    })
  );
}

// --- Paste & Send ---

async function handleSendPrompt(msg) {
  try {
    var existingMsgs = document.querySelectorAll(
      ASSISTANT_SELECTORS.join(", ")
    );
    lastMessageCount = existingMsgs.length;

    var input = findElement(INPUT_SELECTORS, "input");
    if (!input) {
      await sleep(2000);
      input = findElement(INPUT_SELECTORS, "input (retry)");
    }
    if (!input) {
      emitError(
        "INPUT_NOT_FOUND",
        "Could not find input. Tried: " + INPUT_SELECTORS.join(", "),
        "URL: " + window.location.href
      );
      showDebug("Input field not found!", true);
      return;
    }

    showDebug("Found input, inserting text...");
    input.focus();
    input.click();
    await sleep(200);

    var result = insertText(input, msg.text);
    console.log(
      "[" + PROVIDER + "] insert: " + result.strategies.join(" > ")
    );

    if (!result.success) {
      emitError(
        "INSERT_FAILED",
        "All strategies failed: " + result.strategies.join(", ")
      );
      showDebug("Could not insert text!", true);
      return;
    }

    showDebug("Text inserted, waiting for send button...");

    // Poll for send button to become enabled (up to 3 seconds)
    // After text insertion, Quill may need time to update button state
    var sendBtn = null;
    for (var btnAttempt = 0; btnAttempt < 10; btnAttempt++) {
      await sleep(300);
      sendBtn = findSendButton(input);
      if (sendBtn) {
        console.log("[" + PROVIDER + "] send button found on attempt " + (btnAttempt + 1));
        break;
      }
    }

    if (sendBtn) {
      sendBtn.click();
    } else {
      triggerEnterKey(input);
      showDebug("Used Enter key fallback (no send button)");
    }

    chrome.runtime.sendMessage({
      type: "PROMPT_SENT",
      runId: msg.runId,
      provider: PROVIDER,
      round: msg.round,
      timestamp: Date.now(),
    });

    showDebug("Round " + msg.round + ": Sent! Waiting for response...");
    startResponseObserver();
  } catch (err) {
    emitError("SEND_EXCEPTION", err.message, err.stack);
    showDebug("Error: " + err.message, true);
  }
}

// --- Response Observer ---

function startResponseObserver() {
  if (observer) observer.disconnect();
  if (responseCheckInterval) clearInterval(responseCheckInterval);

  var checkForResponse = function () {
    // Find model-response elements
    var messages = document.querySelectorAll('model-response');
    console.log("[" + PROVIDER + "] poll: " + messages.length + " model-response elements, lastCount=" + lastMessageCount);

    if (!messages || messages.length <= lastMessageCount) return false;
    var latestMsg = messages[messages.length - 1];

    var text = "";
    for (var j = 0; j < MESSAGE_TEXT_SELECTORS.length; j++) {
      var textEl = latestMsg.querySelector(MESSAGE_TEXT_SELECTORS[j]);
      if (textEl && textEl.textContent.trim()) {
        text = textEl.textContent.trim();
        console.log("[" + PROVIDER + "] text found with: " + MESSAGE_TEXT_SELECTORS[j] + " (" + text.length + " chars)");
        break;
      }
    }
    if (!text) text = (latestMsg.textContent || "").trim();
    if (text.length === 0) {
      console.log("[" + PROVIDER + "] no text content yet");
      return false;
    }

    // Gemini streaming detection (research-backed):
    var hasStopBtn = !!document.querySelector('button[aria-label*="Stop"]');
    var hasSpinner = !!document.querySelector('mat-spinner') || !!document.querySelector('[role="progressbar"]');
    var hasActions = !!latestMsg.querySelector('message-actions');
    console.log("[" + PROVIDER + "] streaming check: stopBtn=" + hasStopBtn + " spinner=" + hasSpinner + " hasActions=" + hasActions);

    if (hasStopBtn || hasSpinner || !hasActions) {
      console.log("[" + PROVIDER + "] still streaming, waiting...");
      return false;
    }

    // Content stability check: wait for text to stop changing
    if (!latestMsg._lastTextLen) {
      latestMsg._lastTextLen = text.length;
      latestMsg._stableCount = 0;
      return false;
    }
    if (text.length !== latestMsg._lastTextLen) {
      latestMsg._lastTextLen = text.length;
      latestMsg._stableCount = 0;
      return false;
    }
    latestMsg._stableCount = (latestMsg._stableCount || 0) + 1;
    if (latestMsg._stableCount < 2) return false; // need 2 stable polls (~4s)

    chrome.runtime.sendMessage({
      type: "NEW_MESSAGE",
      runId: currentRunId,
      provider: PROVIDER,
      round: currentRound,
      role: "assistant",
      text: text,
      timestamp: Date.now(),
    });

    showDebug(
      "Round " + currentRound + ": Got response (" + text.length + " chars)"
    );
    lastMessageCount = messages.length;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (responseCheckInterval) {
      clearInterval(responseCheckInterval);
      responseCheckInterval = null;
    }
    return true;
  };

  try {
    var targetNode = document.querySelector("main") || document.body;
    observer = new MutationObserver(function () {
      checkForResponse();
    });
    observer.observe(targetNode, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  } catch (e) {
    console.warn("[" + PROVIDER + "] MutationObserver failed:", e);
  }

  responseCheckInterval = setInterval(checkForResponse, 2000);

  setTimeout(function () {
    if (responseCheckInterval) {
      clearInterval(responseCheckInterval);
      responseCheckInterval = null;
    }
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    emitError(
      "RESPONSE_TIMEOUT",
      "Timed out waiting for response after 5min"
    );
    showDebug("Response timeout", true);
  }, 5 * 60 * 1000);
}

// --- Utilities ---

function emitError(code, message, details) {
  console.error("[" + PROVIDER + "] error: " + code + " - " + message);
  chrome.runtime.sendMessage({
    type: "ERROR",
    provider: PROVIDER,
    code: code,
    message: message,
    details: details || "",
  });
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

// --- Init ---

console.log("[" + PROVIDER + "] content script loaded (v2)");
if (document.readyState === "complete") {
  register();
} else {
  window.addEventListener("load", function () {
    setTimeout(register, 1000);
  });
}

// Re-register periodically (MV3 service worker may restart and lose tab registry)
setInterval(register, 30000);
