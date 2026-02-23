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
  ".model-response-text",
  "structured-content-container.model-response-text",
  "message-content.model-response-text",
];

var MESSAGE_TEXT_SELECTORS = [
  // Current Gemini structure (2025): structured-content-container.model-response-text
  "structured-content-container.model-response-text",
  "structured-content-container.model-response-text .markdown.markdown-main-panel",
  "structured-content-container.model-response-text .markdown",
  // Fallback: generic .model-response-text (works for both old and new structure)
  ".model-response-text",
  ".model-response-text .markdown.markdown-main-panel",
  ".model-response-text .markdown",
  // Older structure with message-content
  "message-content.model-response-text .markdown.markdown-main-panel",
  "message-content.model-response-text .markdown",
  "message-content.model-response-text",
  "message-content .markdown",
  // Generic markdown selectors
  ".markdown.markdown-main-panel",
  ".markdown-main-panel",
  ".response-container .markdown",
  ".markdown",
  "p",
];

// Selectors to detect streaming is DONE (positive signals - optional)
var STREAMING_DONE_SELECTORS = [
  'message-actions',
  '.response-actions button',
  'button[aria-label="Copy"]',
  'button[aria-label*="copy" i]',
  'button[aria-label*="Good"]',
  'button[aria-label*="Bad"]',
];

// Selectors to detect Gemini is still "thinking" (thinking models like 2.5 Pro)
// During thinking phase, text may briefly stabilize with just the thinking indicator text
var THINKING_SELECTORS = [
  '.thinking-indicator',
  '.thinking',
  '[data-thinking="true"]',
  'thinking-content',
  '.thought-container:not(.thought-collapsed)',
  'model-response .loading-indicator',
  'model-response mat-spinner',
  'model-response .spinner',
  '.response-container .loading',
  'model-response circular-progress',
];

var lastMessageCount = 0;
var lastCapturedText = "";
var promptSentAt = 0;
var assistantSelectorInUse = ASSISTANT_SELECTORS[0];
var currentRunId = null;
var currentRound = null;
var observer = null;
var responseCheckInterval = null;
var responseTimeoutHandle = null;

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
  try {
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
  } catch (e) {
    // Extension context invalidated (extension reloaded) — page needs refresh
    console.warn("[" + PROVIDER + "] chrome.runtime unavailable:", e.message);
  }
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

function getAssistantMessages(preferredSelector) {
  var selectors = [];
  if (preferredSelector) selectors.push(preferredSelector);
  for (var i = 0; i < ASSISTANT_SELECTORS.length; i++) {
    if (ASSISTANT_SELECTORS[i] !== preferredSelector) {
      selectors.push(ASSISTANT_SELECTORS[i]);
    }
  }

  for (var j = 0; j < selectors.length; j++) {
    try {
      var found = document.querySelectorAll(selectors[j]);
      if (found.length > 0) {
        return { selector: selectors[j], nodes: found };
      }
    } catch (e) {
      /* skip */
    }
  }

  return { selector: selectors[0] || ASSISTANT_SELECTORS[0], nodes: [] };
}

// Selectors for elements to REMOVE before extracting text
// These capture thinking indicators, search results, citations, etc.
var GEMINI_NOISE_SELECTORS = [
  // Thinking / thought process sections
  'thinking-content',
  '.thinking-indicator',
  '.thinking',
  '.thought-container',
  '[data-thinking="true"]',
  // Loading / progress elements
  '.loading-indicator',
  'mat-spinner',
  'circular-progress',
  // Action buttons / toolbars inside response
  'message-actions',
  '.response-actions',
  // Code block headers/footers (decoration only)
  '.code-block-decoration.footer',
  '.code-block-decoration.header',
];

function cleanExtractedText(rawText) {
  if (!rawText) return "";
  var text = rawText.trim();

  // Remove "Sources" / citations section at the end
  var sourcesPatterns = [
    /\n\s*Sources\s*\n[\s\S]*$/i,
    /\n\s*Sources\s*·[\s\S]*$/i,
  ];
  for (var i = 0; i < sourcesPatterns.length; i++) {
    var cleaned = text.replace(sourcesPatterns[i], '').trim();
    if (cleaned.length > 0 && cleaned.length < text.length) {
      text = cleaned;
      break;
    }
  }

  return text;
}

function extractMessageText(messageEl) {
  if (!messageEl) return "";

  // Try structured selectors first
  for (var i = 0; i < MESSAGE_TEXT_SELECTORS.length; i++) {
    try {
      var textEl = null;
      if (messageEl.matches && messageEl.matches(MESSAGE_TEXT_SELECTORS[i])) {
        textEl = messageEl;
      } else {
        textEl = messageEl.querySelector(MESSAGE_TEXT_SELECTORS[i]);
      }

      if (textEl) {
        // Clone to avoid modifying actual DOM
        var clone = textEl.cloneNode(true);

        // Remove noise elements from the clone
        for (var n = 0; n < GEMINI_NOISE_SELECTORS.length; n++) {
          try {
            var noiseEls = clone.querySelectorAll(GEMINI_NOISE_SELECTORS[n]);
            for (var k = 0; k < noiseEls.length; k++) {
              noiseEls[k].remove();
            }
          } catch (e) { /* skip invalid selector */ }
        }

        var text = cleanExtractedText(clone.innerText || clone.textContent || "");
        if (text) {
          console.log("[" + PROVIDER + "] text found with: " + MESSAGE_TEXT_SELECTORS[i] + " (" + text.length + " chars)");
          return text;
        }
      }
    } catch (e) {
      /* skip */
    }
  }

  // Fallback: try innerText on the message element directly with noise removal
  var clone = messageEl.cloneNode(true);
  for (var n = 0; n < GEMINI_NOISE_SELECTORS.length; n++) {
    try {
      var noiseEls = clone.querySelectorAll(GEMINI_NOISE_SELECTORS[n]);
      for (var k = 0; k < noiseEls.length; k++) {
        noiseEls[k].remove();
      }
    } catch (e) { /* skip */ }
  }
  var fallbackText = cleanExtractedText(clone.innerText || clone.textContent || "");
  if (fallbackText) {
    console.log("[" + PROVIDER + "] text extracted via fallback innerText (" + fallbackText.length + " chars)");
  } else {
    // Debug: log what children exist to help diagnose selector mismatches
    var childTags = [];
    for (var c = 0; c < messageEl.children.length && c < 10; c++) {
      var child = messageEl.children[c];
      var desc = child.tagName.toLowerCase();
      if (child.className) desc += "." + (typeof child.className === 'string' ? child.className.split(" ").join(".") : '');
      childTags.push(desc);
    }
    console.warn("[" + PROVIDER + "] extractMessageText: NO text found. Children: " + childTags.join(", "));
  }
  return fallbackText;
}

// --- Insert text (robust, editor-aware approach) ---

async function insertText(el, text) {
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
    // IMPORTANT: Use synthetic paste FIRST for Gemini. execCommand("insertText") with
    // newlines causes Quill to interpret \n as Enter keypresses, which triggers
    // Gemini's send-on-Enter behavior and splits the message.

    // Strategy 1: Synthetic clipboard paste (Quill handles paste events, preserves newlines)
    try {
      el.focus();
      var sel = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand("delete", false, null);
      var dt = new DataTransfer();
      dt.setData("text/plain", text);
      var pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });
      el.dispatchEvent(pasteEvent);
      // Verify text actually appeared
      await sleep(200);
      var currentText = (el.textContent || "").trim();
      if (currentText.length > 0) {
        strategies.push("synthetic-paste OK (" + currentText.length + " chars)");
        return { success: true, strategies: strategies };
      }
      strategies.push("synthetic-paste dispatched but no text appeared");
    } catch (e) {
      strategies.push("synthetic-paste FAIL " + e.message);
    }

    // Strategy 2: Selection API + delete + insertText (fallback — may split on newlines)
    try {
      el.focus();
      var sel2 = window.getSelection();
      var range2 = document.createRange();
      range2.selectNodeContents(el);
      sel2.removeAllRanges();
      sel2.addRange(range2);
      document.execCommand("delete", false, null);
      // Replace newlines with spaces to prevent send-on-Enter
      var sanitized = text.replace(/\n/g, "  ");
      var ok = document.execCommand("insertText", false, sanitized);
      if (ok && (el.textContent || "").trim().length > 0) {
        strategies.push("select+delete+insertText OK (newlines replaced)");
        return { success: true, strategies: strategies };
      }
      strategies.push("select+delete+insertText returned " + ok);
    } catch (e) {
      strategies.push("select+delete+insertText FAIL " + e.message);
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
    var baseline = getAssistantMessages();
    assistantSelectorInUse = baseline.selector;
    lastMessageCount = baseline.nodes.length;
    console.log(
      "[" + PROVIDER + "] baseline responses: " + lastMessageCount + " using selector: " + assistantSelectorInUse
    );

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

    var result = await insertText(input, msg.text);
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
    promptSentAt = Date.now();
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
  if (responseTimeoutHandle) {
    clearTimeout(responseTimeoutHandle);
    responseTimeoutHandle = null;
  }

  var checkForResponse = function () {
    // Ignore responses during the post-send cooldown (2 seconds)
    if (promptSentAt && (Date.now() - promptSentAt) < 2000) return false;

    var snapshot = getAssistantMessages(assistantSelectorInUse);
    assistantSelectorInUse = snapshot.selector;
    var messages = snapshot.nodes;
    console.log("[" + PROVIDER + "] poll: " + messages.length + " response elements, lastCount=" + lastMessageCount + ", selector=" + assistantSelectorInUse);

    if (!messages.length) return false;

    var latestMsg = messages[messages.length - 1];

    // Gemini often updates responses in-place without adding new DOM nodes.
    // If message count hasn't increased, check whether text content has appeared.
    if (messages.length <= lastMessageCount) {
      var earlyText = extractMessageText(latestMsg);
      if (!earlyText || earlyText.length < 20) return false;
      console.log("[" + PROVIDER + "] in-place update detected (" + earlyText.length + " chars)");
    }

    // Check if Gemini is still in "thinking" phase.
    // IMPORTANT: Scope detection to the current response container only.
    // Global document-level checks latch onto unrelated spinners/loading
    // elements elsewhere on the page and block completion forever.
    var isThinking = false;
    var responseContainer = latestMsg.closest('model-response') || latestMsg;
    var thinkingRoots = [latestMsg];
    if (responseContainer && responseContainer !== latestMsg) {
      thinkingRoots.push(responseContainer);
    }

    for (var ti = 0; ti < THINKING_SELECTORS.length; ti++) {
      try {
        for (var tr = 0; tr < thinkingRoots.length; tr++) {
          if (thinkingRoots[tr].querySelector(THINKING_SELECTORS[ti])) {
            isThinking = true;
            console.log("[" + PROVIDER + "] thinking phase detected: " + THINKING_SELECTORS[ti]);
            break;
          }
        }
        if (isThinking) break;
      } catch (e) { /* skip */ }
    }

    // Scoped loading check — only match specific loading indicators inside
    // the current response container, not broad class wildcards
    if (!isThinking) {
      try {
        var loadingEls = responseContainer.querySelectorAll(
          '.loading-indicator, mat-spinner, circular-progress, thinking-content'
        );
        if (loadingEls.length > 0) {
          isThinking = true;
          console.log("[" + PROVIDER + "] scoped loading indicator detected");
        }
      } catch (e) { /* skip */ }
    }

    if (isThinking) {
      latestMsg._lastTextLen = undefined;
      latestMsg._stableCount = 0;
      return false;
    }

    var text = extractMessageText(latestMsg);
    if (text.length === 0) {
      console.log("[" + PROVIDER + "] no text content yet (selector: " + assistantSelectorInUse + ")");
      return false;
    }

    // Guard against stale re-reads from earlier rounds.
    // Use prefix + length similarity instead of strict equality to handle
    // minor whitespace/formatting differences between polls.
    if (lastCapturedText) {
      var prefixLen = Math.min(200, lastCapturedText.length, text.length);
      var samePrefix = text.substring(0, prefixLen) === lastCapturedText.substring(0, prefixLen);
      var lenRatio = text.length / lastCapturedText.length;
      if (samePrefix && lenRatio > 0.9 && lenRatio < 1.1) {
        return false;
      }
    }

    var normalized = text.trim().toLowerCase();
    var looksPlaceholder =
      normalized === "gemini said" ||
      normalized === "thinking" ||
      normalized === "..." ||
      normalized === "…";
    if (looksPlaceholder) {
      console.log("[" + PROVIDER + "] placeholder text detected, waiting for real response");
      latestMsg._lastTextLen = undefined;
      latestMsg._stableCount = 0;
      return false;
    }

    // Check for DONE indicators (optional positive signal)
    // Search in latestMsg and also in the parent model-response element
    var hasDoneSignal = false;
    var doneSearchRoots = [latestMsg];
    try {
      var modelResponseParent = latestMsg.closest('model-response');
      if (modelResponseParent && modelResponseParent !== latestMsg) {
        doneSearchRoots.push(modelResponseParent);
      }
    } catch (e) { /* skip */ }
    for (var di = 0; di < STREAMING_DONE_SELECTORS.length; di++) {
      try {
        for (var ri = 0; ri < doneSearchRoots.length; ri++) {
          if (doneSearchRoots[ri].querySelector(STREAMING_DONE_SELECTORS[di])) {
            hasDoneSignal = true;
            console.log("[" + PROVIDER + "] done signal found: " + STREAMING_DONE_SELECTORS[di]);
            break;
          }
        }
        if (hasDoneSignal) break;
      } catch (e) { /* skip */ }
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

    // If a stop/cancel button is visible, Gemini is still streaming — override done signal
    var hasStopButton = false;
    try {
      hasStopButton = !!responseContainer.querySelector('button[aria-label*="Stop"]') ||
                      !!responseContainer.querySelector('button[aria-label*="Cancel"]');
    } catch (e) { /* skip */ }
    if (hasStopButton) {
      hasDoneSignal = false;
    }

    var requiredStable = hasDoneSignal ? 1 : 2;
    if (latestMsg._stableCount < requiredStable) {
      console.log("[" + PROVIDER + "] stability: " + latestMsg._stableCount + "/" + requiredStable + (hasDoneSignal ? " (done signal found)" : " (no done signal, using stability only)"));
      return false;
    }

    console.log("[" + PROVIDER + "] response complete! " + text.length + " chars, stable=" + latestMsg._stableCount + ", doneSignal=" + hasDoneSignal);

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
    lastCapturedText = text;
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (responseCheckInterval) {
      clearInterval(responseCheckInterval);
      responseCheckInterval = null;
    }
    if (responseTimeoutHandle) {
      clearTimeout(responseTimeoutHandle);
      responseTimeoutHandle = null;
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

  responseCheckInterval = setInterval(checkForResponse, 1000);

  responseTimeoutHandle = setTimeout(function () {
    var stillWaiting = !!responseCheckInterval || !!observer;
    if (!stillWaiting) {
      responseTimeoutHandle = null;
      return;
    }
    if (responseCheckInterval) {
      clearInterval(responseCheckInterval);
      responseCheckInterval = null;
    }
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    responseTimeoutHandle = null;
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

// Fast registration bursts for first 30s (every 2s), then every 30s.
// This ensures the MV3 service worker is woken quickly after startup.
var _regCount = 0;
(function _scheduleReg() {
  var delay = _regCount < 15 ? 2000 : 30000;
  setTimeout(function () {
    register();
    _regCount++;
    _scheduleReg();
  }, delay);
})();
