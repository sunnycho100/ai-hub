/**
 * AI Hub - ChatGPT Content Script (v2 - Robust)
 *
 * Injected into chatgpt.com / chat.openai.com pages.
 * Uses multiple selector strategies, fallback paste mechanisms,
 * MutationObserver for response detection, and detailed error reporting.
 */

var PROVIDER = "chatgpt";

// Multiple selector strategies (ordered by likelihood)
var INPUT_SELECTORS = [
  "#prompt-textarea",
  'div[contenteditable="true"][id="prompt-textarea"]',
  'textarea[data-id="root"]',
  'div[contenteditable="true"][data-placeholder]',
  'div[contenteditable="true"][role="textbox"]',
  "form textarea",
  'div.ProseMirror[contenteditable="true"]',
  'div[contenteditable="true"]',
];

var SEND_SELECTORS = [
  'button[data-testid="send-button"]',
  'button[aria-label="Send prompt"]',
  'button[aria-label="Send"]',
  'form button[type="submit"]',
];

var ASSISTANT_SELECTORS = [
  '[data-message-author-role="assistant"]',
  'div[data-message-author-role="assistant"]',
  '[class*="agent-turn"]',
];

var MESSAGE_TEXT_SELECTORS = [
  ".markdown",
  ".whitespace-pre-wrap",
  ".prose",
  "p",
];

// Positive signals that response generation is complete
// (action buttons that appear only after ChatGPT finishes streaming)
var RESPONSE_DONE_SELECTORS = [
  'button[data-testid="copy-turn-action-button"]',
  'button[aria-label="Copy"]',
  'button[data-testid="thumbs-up-turn-action-button"]',
  'button[data-testid="thumbs-down-turn-action-button"]',
  'button[aria-label*="Good response"]',
  'button[aria-label*="Bad response"]',
  'button[data-testid="read-aloud-turn-action-button"]',
  'button[aria-label="Read aloud"]',
];

var lastMessageCount = 0;
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

// --- Register with background ---

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

// --- Handle incoming messages from background ---

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.type === "PING_CONTENT") {
    sendResponse({ provider: PROVIDER });
    return;
  }
  if (msg.type === "SEND_PROMPT") {
    console.log(
      "[" + PROVIDER + "] received SEND_PROMPT for round " + msg.round
    );
    showDebug("Round " + msg.round + ": Received prompt, inserting...");
    currentRunId = msg.runId;
    currentRound = msg.round;
    handleSendPrompt(msg);
    sendResponse({ ok: true });
  }
  return true;
});

// --- Find element using multiple selectors ---

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
      /* skip invalid selector */
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
// These capture search results, sources, citations, thinking/searching metadata
var NOISE_SELECTORS = [
  // Sources / citations section
  '[class*="sources"]',
  '[class*="citation"]',
  '[data-testid*="source"]',
  '[data-testid*="citation"]',
  // Search result cards / web results
  '[class*="search-result"]',
  '[class*="web-result"]',
  '[class*="SearchResult"]',
  // Thinking / searching collapsible sections
  '[class*="thought"]',
  'details',
  'summary',
  // Link preview cards with favicons/metadata
  'a[class*="group"]',
  // Toolbar / action buttons inside the markdown
  '[class*="toolbar"]',
];

function cleanExtractedText(rawText) {
  if (!rawText) return "";
  var text = rawText.trim();

  // Remove "Sources" / "Sources · N" section and everything after it
  // This pattern catches the common format: "Sources\n·\nN\n" followed by link listings
  var sourcesPatterns = [
    /\n\s*Sources\s*\n[\s\S]*$/i,
    /\n\s*Sources\s*·[\s\S]*$/i,
    /\n\s*Sources$[\s\S]*/im,
  ];
  for (var i = 0; i < sourcesPatterns.length; i++) {
    var cleaned = text.replace(sourcesPatterns[i], '').trim();
    if (cleaned.length > 0 && cleaned.length < text.length) {
      text = cleaned;
      break;
    }
  }

  // Remove thinking/searching status lines at the beginning
  text = text.replace(/^(Thought for \d+s?\s*\n?|Thinking\s*\n?|Searching[^\n]*\n?|Looking up[^\n]*\n?|Searching for[^\n]*\n?)+/i, '').trim();

  // Remove trailing metadata lines like "Read more" links
  text = text.replace(/(\nRead more\s*)+$/gi, '').trim();

  return text;
}

function extractMessageText(messageEl) {
  if (!messageEl) return "";

  // Try to find the main markdown content first
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
        for (var n = 0; n < NOISE_SELECTORS.length; n++) {
          try {
            var noiseEls = clone.querySelectorAll(NOISE_SELECTORS[n]);
            for (var k = 0; k < noiseEls.length; k++) {
              noiseEls[k].remove();
            }
          } catch (e) { /* skip invalid selector */ }
        }

        var text = cleanExtractedText(clone.innerText || clone.textContent || "");
        if (text) {
          console.log("[" + PROVIDER + "] text extracted with: " + MESSAGE_TEXT_SELECTORS[i] + " (" + text.length + " chars)");
          return text;
        }
      }
    } catch (e) {
      /* skip */
    }
  }

  // Fallback: use innerText with cleanup
  var fallback = cleanExtractedText(messageEl.innerText || messageEl.textContent || "");
  if (fallback) {
    console.log("[" + PROVIDER + "] text extracted via fallback (" + fallback.length + " chars)");
  }
  return fallback;
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
    // ContentEditable (ProseMirror / rich editor)
    // CRITICAL: Do NOT use el.textContent = "" — it destroys ProseMirror's internal state.
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

    // Strategy 2: Synthetic clipboard paste (ProseMirror handles paste events)
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

// --- Find send button with smart fallback ---

function findSendButton(inputEl) {
  var btn = findElement(SEND_SELECTORS, "send button");
  if (btn && !btn.disabled) return btn;

  // Fallback: search near the input
  var container = inputEl
    ? inputEl.closest("form") || inputEl.parentElement
    : null;
  var searchRoot = container || document;
  var attempts = 0;
  while (searchRoot && searchRoot !== document.body && attempts < 5) {
    var buttons = searchRoot.querySelectorAll("button:not([disabled])");
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      var label = (b.getAttribute("aria-label") || "").toLowerCase();
      var testid = (b.getAttribute("data-testid") || "").toLowerCase();
      if (label.includes("send") || testid.includes("send")) {
        return b;
      }
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
    // Capture baseline response count using one consistent selector
    var baseline = getAssistantMessages();
    assistantSelectorInUse = baseline.selector;
    lastMessageCount = baseline.nodes.length;
    console.log(
      "[" + PROVIDER + "] existing assistant messages: " + lastMessageCount + " using selector: " + assistantSelectorInUse
    );

    // Find input element (with retry)
    var input = findElement(INPUT_SELECTORS, "input");
    if (!input) {
      await sleep(2000);
      input = findElement(INPUT_SELECTORS, "input (retry)");
    }
    if (!input) {
      var allEditables = document.querySelectorAll(
        '[contenteditable="true"], textarea'
      );
      emitError(
        "INPUT_NOT_FOUND",
        "Could not find input. Found " +
          allEditables.length +
          " editable elements. Tried: " +
          INPUT_SELECTORS.join(", "),
        "URL: " + window.location.href
      );
      showDebug("Input field not found!", true);
      return;
    }

    showDebug("Found input (" + input.tagName + "), inserting text...");

    // Focus and click the input
    input.focus();
    input.click();
    await sleep(200);

    // Insert the text
    var result = insertText(input, msg.text);
    console.log(
      "[" + PROVIDER + "] insert strategies: " + result.strategies.join(" > ")
    );

    if (!result.success) {
      emitError(
        "INSERT_FAILED",
        "All text insertion strategies failed: " + result.strategies.join(", "),
        "Element: " + input.tagName + "#" + input.id + "." + input.className
      );
      showDebug("Could not insert text!", true);
      return;
    }

    showDebug("Text inserted, waiting for send button...");

    // Poll for send button to become enabled (up to 3 seconds)
    // After text insertion, ProseMirror/React may need time to update button state
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
      console.log("[" + PROVIDER + "] clicking send button");
      sendBtn.click();
    } else {
      console.log("[" + PROVIDER + "] no send button after polling, trying Enter key");
      triggerEnterKey(input);
      showDebug("Used Enter key fallback (no send button)");
    }

    // Notify prompt was sent
    chrome.runtime.sendMessage({
      type: "PROMPT_SENT",
      runId: msg.runId,
      provider: PROVIDER,
      round: msg.round,
      timestamp: Date.now(),
    });

    console.log("[" + PROVIDER + "] prompt sent for round " + msg.round);
    showDebug("Round " + msg.round + ": Sent! Waiting for response...");

    // Start watching for the response
    startResponseObserver();
  } catch (err) {
    emitError("SEND_EXCEPTION", err.message, err.stack);
    showDebug("Error: " + err.message, true);
  }
}

// --- Response Observer (MutationObserver + polling) ---

function startResponseObserver() {
  if (observer) observer.disconnect();
  if (responseCheckInterval) clearInterval(responseCheckInterval);
  if (responseTimeoutHandle) {
    clearTimeout(responseTimeoutHandle);
    responseTimeoutHandle = null;
  }

  var checkForResponse = function () {
    var snapshot = getAssistantMessages(assistantSelectorInUse);
    assistantSelectorInUse = snapshot.selector;
    var messages = snapshot.nodes;

    if (!messages.length || messages.length <= lastMessageCount) return false;

    var latestMsg = messages[messages.length - 1];
    var text = extractMessageText(latestMsg);
    if (text.length === 0) return false;

    // Check if still streaming (negative signals)
    var isStreaming =
      !!document.querySelector('button[aria-label="Stop generating"]') ||
      !!document.querySelector('[data-testid="stop-button"]') ||
      !!latestMsg.querySelector('[class*="result-streaming"]');

    if (isStreaming) {
      // Reset stability when streaming
      latestMsg._lastTextLen = undefined;
      latestMsg._stableCount = 0;
      return false;
    }

    // Check for positive completion signals (action buttons that appear when done)
    // Look in the parent article/turn container as action buttons may be outside the message div
    var searchRoot = latestMsg.closest('article') || latestMsg.closest('[data-testid*="conversation-turn"]') || latestMsg;
    var hasDoneSignal = false;
    for (var di = 0; di < RESPONSE_DONE_SELECTORS.length; di++) {
      try {
        if (searchRoot.querySelector(RESPONSE_DONE_SELECTORS[di])) {
          hasDoneSignal = true;
          console.log("[" + PROVIDER + "] done signal found: " + RESPONSE_DONE_SELECTORS[di]);
          break;
        }
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

    // If we have a done signal (copy/thumbs buttons visible), need 1 stable poll
    // Otherwise need 3 stable polls to be sure streaming is truly complete
    var requiredStable = hasDoneSignal ? 1 : 3;
    if (latestMsg._stableCount < requiredStable) {
      console.log("[" + PROVIDER + "] stability: " + latestMsg._stableCount + "/" + requiredStable + (hasDoneSignal ? " (done signal found)" : " (waiting for text stability)"));
      return false;
    }

    console.log("[" + PROVIDER + "] response complete! " + text.length + " chars, stable=" + latestMsg._stableCount + ", doneSignal=" + hasDoneSignal);

    // Complete response
    chrome.runtime.sendMessage({
      type: "NEW_MESSAGE",
      runId: currentRunId,
      provider: PROVIDER,
      round: currentRound,
      role: "assistant",
      text: text,
      timestamp: Date.now(),
    });

    console.log(
      "[" + PROVIDER + "] scraped response (" + text.length + " chars)"
    );
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
    if (responseTimeoutHandle) {
      clearTimeout(responseTimeoutHandle);
      responseTimeoutHandle = null;
    }
    return true;
  };

  // MutationObserver
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

  // Polling fallback
  responseCheckInterval = setInterval(checkForResponse, 2000);

  // 5 minute timeout
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
    showDebug("Response timeout (5min)", true);
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

// --- Auto-dismiss "I prefer this response" comparison dialog ---
// ChatGPT sometimes shows a preference UI when it regenerates or A/B tests.
// We auto-click the left option to dismiss it and unblock the pipeline.

function dismissPreferenceDialog() {
  try {
    // Look for the preference/comparison buttons
    // ChatGPT uses buttons with text like "I prefer this response" or
    // a comparison card with two response options
    var prefButtons = document.querySelectorAll(
      'button[data-testid*="prefer"], ' +
      'button[data-testid*="comparison"], ' +
      '[data-testid*="thumbs"] button'
    );
    if (prefButtons.length >= 2) {
      console.log("[" + PROVIDER + "] found preference buttons (" + prefButtons.length + "), clicking left");
      prefButtons[0].click();
      showDebug("Auto-dismissed preference dialog (left)");
      return;
    }

    // Alternative: look for the comparison container with two side-by-side choices
    var comparisonCards = document.querySelectorAll(
      '[class*="comparison"] button, ' +
      '[class*="prefer"] button'
    );
    if (comparisonCards.length >= 2) {
      console.log("[" + PROVIDER + "] found comparison cards (" + comparisonCards.length + "), clicking first");
      comparisonCards[0].click();
      showDebug("Auto-dismissed comparison (left)");
      return;
    }

    // Search by button text content
    var allButtons = document.querySelectorAll('button');
    for (var i = 0; i < allButtons.length; i++) {
      var btnText = (allButtons[i].textContent || "").trim().toLowerCase();
      if (
        btnText.includes("i prefer this response") ||
        btnText.includes("prefer response") ||
        btnText.includes("choose this response") ||
        btnText === "choose"
      ) {
        console.log("[" + PROVIDER + "] found preference button by text: '" + btnText + "'");
        allButtons[i].click();
        showDebug("Auto-dismissed preference dialog");
        return;
      }
    }
  } catch (e) {
    /* ignore errors in preference dismissal */
  }
}

// Check every 2 seconds for preference dialogs
setInterval(dismissPreferenceDialog, 2000);
