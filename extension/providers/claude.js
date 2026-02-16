/**
 * AI Hub - Claude Content Script (v1 - Robust)
 *
 * Injected into claude.ai pages.
 * Uses multiple selector strategies, fallback paste mechanisms,
 * MutationObserver for response detection, and detailed error reporting.
 *
 * DOM selectors cross-referenced from 6+ independent production extensions/userscripts.
 */

var PROVIDER = "claude";

// Multiple selector strategies for input (ordered by specificity)
var INPUT_SELECTORS = [
  'div[contenteditable="true"][role="textbox"]',
  '.ProseMirror[contenteditable="true"]',
  'fieldset div[contenteditable="true"]',
  'div[contenteditable="true"]',
  "fieldset textarea",
  "textarea",
];

var SEND_SELECTORS = [
  'button[aria-label="Send Message"]',
  'button[aria-label="Send message"]',
  'button[aria-label*="Send"]',
  'button[type="submit"]',
  'form button[type="submit"]',
];

// Claude response containers (try newer class first, then older)
var ASSISTANT_SELECTORS = [
  ".font-claude-response",
  "div.font-claude-response",
  ".font-claude-message",
  "div.font-claude-message",
  'div[data-test-render-count]',
];

// Text extraction within a response
var MESSAGE_TEXT_SELECTORS = [
  ".markdown",
  '[class*="markdown"]',
  '[class*="prose"]',
  "p",
];

// Streaming indicators - Claude uses a stop button during generation
var STREAMING_ACTIVE_SELECTORS = [
  'button[aria-label="Stop Response"]',
  'button[aria-label="Stop response"]',
  'button[aria-label*="Stop"]',
  'button[aria-label*="stop"]',
];

var lastMessageCount = 0;
var assistantSelectorInUse = ASSISTANT_SELECTORS[0];
var currentRunId = null;
var currentRound = null;
var observer = null;
var responseCheckInterval = null;
var responseTimeoutHandle = null;
var lastResponseText = "";
var stableTextCount = 0;

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
        // For data-test-render-count, filter to only turns that have assistant content
        if (selectors[j] === 'div[data-test-render-count]') {
          var assistantTurns = [];
          for (var k = 0; k < found.length; k++) {
            if (
              found[k].querySelector(".font-claude-response") ||
              found[k].querySelector(".font-claude-message")
            ) {
              assistantTurns.push(found[k]);
            }
          }
          if (assistantTurns.length > 0) {
            return { selector: selectors[j], nodes: assistantTurns };
          }
          continue;
        }
        return { selector: selectors[j], nodes: Array.from(found) };
      }
    } catch (e) {
      /* skip */
    }
  }

  return { selector: selectors[0] || ASSISTANT_SELECTORS[0], nodes: [] };
}

function extractMessageText(messageEl) {
  if (!messageEl) return "";

  // For turn containers, look for the response element inside
  var responseEl =
    messageEl.querySelector(".font-claude-response") ||
    messageEl.querySelector(".font-claude-message") ||
    messageEl;

  // Try specific text selectors first
  for (var i = 0; i < MESSAGE_TEXT_SELECTORS.length; i++) {
    try {
      if (responseEl.matches && responseEl.matches(MESSAGE_TEXT_SELECTORS[i])) {
        var ownText = (responseEl.textContent || "").trim();
        if (ownText) return ownText;
      }

      var textEl = responseEl.querySelector(MESSAGE_TEXT_SELECTORS[i]);
      if (textEl) {
        var text = (textEl.textContent || "").trim();
        if (text) return text;
      }
    } catch (e) {
      /* skip */
    }
  }

  // Fallback: use innerText for better formatting
  return (responseEl.innerText || responseEl.textContent || "").trim();
}

// --- Insert text (Claude uses contenteditable with ProseMirror) ---

function insertText(el, text) {
  var strategies = [];

  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    // Textarea approach
    try {
      var proto =
        el.tagName === "TEXTAREA"
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
    // Claude-specific: create a <p> element with the text (confirmed by AI Chat Assistant userscript)

    // Strategy 1: Selection API + delete + insertText
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

    // Strategy 2: Synthetic clipboard paste
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

    // Strategy 3: Claude-specific innerHTML with <p> tag (per AI Chat Assistant userscript)
    try {
      el.focus();
      el.innerHTML = "";
      var p = document.createElement("p");
      p.textContent = text;
      el.appendChild(p);
      el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      strategies.push("claude-p-element OK");
      return { success: true, strategies: strategies };
    } catch (e) {
      strategies.push("claude-p-element FAIL " + e.message);
    }

    // Strategy 4: innerHTML fallback
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
    ? inputEl.closest("form") || inputEl.closest("fieldset") || inputEl.parentElement
    : null;
  var searchRoot = container || document;
  var attempts = 0;
  while (searchRoot && searchRoot !== document.body && attempts < 5) {
    var buttons = searchRoot.querySelectorAll("button:not([disabled])");
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      var label = (b.getAttribute("aria-label") || "").toLowerCase();
      var testid = (b.getAttribute("data-testid") || "").toLowerCase();
      var type = (b.getAttribute("type") || "").toLowerCase();
      if (
        label.includes("send") ||
        testid.includes("send") ||
        type === "submit"
      ) {
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
    // Capture baseline response count
    var baseline = getAssistantMessages();
    assistantSelectorInUse = baseline.selector;
    lastMessageCount = baseline.nodes.length;
    console.log(
      "[" +
        PROVIDER +
        "] existing assistant messages: " +
        lastMessageCount +
        " using selector: " +
        assistantSelectorInUse
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
    var sendBtn = null;
    for (var btnAttempt = 0; btnAttempt < 10; btnAttempt++) {
      await sleep(300);
      sendBtn = findSendButton(input);
      if (sendBtn) {
        console.log(
          "[" +
            PROVIDER +
            "] send button found on attempt " +
            (btnAttempt + 1)
        );
        break;
      }
    }

    if (sendBtn) {
      console.log("[" + PROVIDER + "] clicking send button");
      sendBtn.click();
    } else {
      console.log(
        "[" + PROVIDER + "] no send button after polling, trying Enter key"
      );
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

    // Reset stability tracking
    lastResponseText = "";
    stableTextCount = 0;

    // Start watching for the response
    startResponseObserver();
  } catch (err) {
    emitError("SEND_EXCEPTION", err.message, err.stack);
    showDebug("Error: " + err.message, true);
  }
}

// --- Response Observer (MutationObserver + polling with text stability) ---

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

    if (!messages || messages.length === 0 || messages.length <= lastMessageCount) return false;

    var latestMsg = messages[messages.length - 1];
    var text = extractMessageText(latestMsg);
    if (text.length === 0) return false;

    // Check if Claude is actively streaming via stop button
    var isStreaming = false;
    for (var i = 0; i < STREAMING_ACTIVE_SELECTORS.length; i++) {
      try {
        if (document.querySelector(STREAMING_ACTIVE_SELECTORS[i])) {
          isStreaming = true;
          break;
        }
      } catch (e) {
        /* skip */
      }
    }

    if (isStreaming) {
      // Reset stability when streaming is active
      lastResponseText = text;
      stableTextCount = 0;
      return false;
    }

    // Text stability check: if text hasn't changed for 3 consecutive checks, consider it done
    if (text === lastResponseText) {
      stableTextCount++;
    } else {
      lastResponseText = text;
      stableTextCount = 0;
      return false;
    }

    // Require text to be stable for at least 2 checks (~4 seconds with 2s interval)
    if (stableTextCount < 2) return false;

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

  // MutationObserver on main content area
  try {
    var targetNode =
      document.querySelector('[data-testid="conversation"]') ||
      document.querySelector("main") ||
      document.body;
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

  // Polling fallback (every 2 seconds)
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

console.log("[" + PROVIDER + "] content script loaded (v1)");

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
