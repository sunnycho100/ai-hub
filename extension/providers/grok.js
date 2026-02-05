/**
 * AI Hub - Grok Content Script (v2 - Robust)
 *
 * Injected into grok.com / x.com/i/grok pages.
 * Uses multiple selector strategies, fallback paste mechanisms,
 * MutationObserver for response detection, and detailed error reporting.
 */

var PROVIDER = "grok";

// Multiple selector strategies
var INPUT_SELECTORS = [
  'textarea[placeholder*="Ask"]',
  'textarea[placeholder*="ask"]',
  'textarea[aria-label*="Message"]',
  'textarea[aria-label*="message"]',
  'div[contenteditable="true"][role="textbox"]',
  'div[contenteditable="true"][data-placeholder]',
  "textarea",
  'div[contenteditable="true"]',
];

var SEND_SELECTORS = [
  'button[aria-label="Send"]',
  'button[aria-label="Send message"]',
  'button[data-testid="send-button"]',
  'button[type="submit"]',
  "form button:last-of-type",
];

var ASSISTANT_SELECTORS = [
  '[data-testid="assistant-message"]',
  ".assistant-message",
  '[class*="response"][class*="message"]',
  '[data-message-role="assistant"]',
  '[class*="assistant"]',
];

var MESSAGE_TEXT_SELECTORS = [".markdown", ".message-text", ".prose", "p"];

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

// --- Select all content in a contenteditable element ---

function selectAllContent(el) {
  el.focus();
  var range = document.createRange();
  range.selectNodeContents(el);
  var sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

// --- Insert text (multi-strategy) ---
// Grok primarily uses textarea but may switch to contenteditable.
// For textarea: native setter is primary (bypasses React).
// For contenteditable: Selection API + execCommand.

function insertText(el, text) {
  var strategies = [];
  var isEditable = el.getAttribute("contenteditable") === "true";
  var isTextInput = el.tagName === "TEXTAREA" || el.tagName === "INPUT";

  // --- Textarea / Input path (React controlled) ---
  if (isTextInput) {
    // Strategy 1: Native prototype setter (bypasses React's override)
    try {
      var proto = el.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      var desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc && desc.set) {
        desc.set.call(el, text);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        if (el.value === text) {
          strategies.push("native-setter OK");
          return { success: true, strategies: strategies };
        }
      }
    } catch (e) {
      strategies.push("native-setter FAIL " + e.message);
    }

    // Strategy 2: Focus → select all → execCommand
    try {
      el.focus();
      el.select();
      var ok = document.execCommand("insertText", false, text);
      if (ok && el.value === text) {
        strategies.push("textarea-execCommand OK");
        return { success: true, strategies: strategies };
      }
      strategies.push("textarea-execCommand returned " + ok);
    } catch (e) {
      strategies.push("textarea-execCommand FAIL " + e.message);
    }

    // Strategy 3: Direct value set
    try {
      el.value = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      if (el.value === text) {
        strategies.push("direct-value OK");
        return { success: true, strategies: strategies };
      }
    } catch (e) {
      strategies.push("direct-value FAIL " + e.message);
    }
  }

  // --- Contenteditable path ---
  if (isEditable) {
    // Strategy 1: Select all → execCommand insertText
    try {
      selectAllContent(el);
      var ok2 = document.execCommand("insertText", false, text);
      var content = (el.textContent || "").trim();
      if (ok2 && content.length > 0) {
        strategies.push("select+execCommand OK");
        return { success: true, strategies: strategies };
      }
      strategies.push("select+execCommand returned " + ok2 + " len=" + content.length);
    } catch (e) {
      strategies.push("select+execCommand FAIL " + e.message);
    }

    // Strategy 2: Select all → delete → execCommand
    try {
      selectAllContent(el);
      document.execCommand("delete", false, null);
      var ok3 = document.execCommand("insertText", false, text);
      var content2 = (el.textContent || "").trim();
      if (ok3 && content2.length > 0) {
        strategies.push("delete+execCommand OK");
        return { success: true, strategies: strategies };
      }
      strategies.push("delete+execCommand returned " + ok3);
    } catch (e) {
      strategies.push("delete+execCommand FAIL " + e.message);
    }

    // Strategy 3: Clipboard paste simulation
    try {
      selectAllContent(el);
      var dt = new DataTransfer();
      dt.setData("text/plain", text);
      var pasteEvt = new ClipboardEvent("paste", {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      });
      el.dispatchEvent(pasteEvt);
      var content3 = (el.textContent || "").trim();
      if (content3.length > 0 && content3 !== el.getAttribute("data-placeholder")) {
        strategies.push("paste-event OK");
        return { success: true, strategies: strategies };
      }
      strategies.push("paste-event (dispatched, len=" + content3.length + ")");
    } catch (e) {
      strategies.push("paste-event FAIL " + e.message);
    }

    // Strategy 4: Last resort - innerHTML
    try {
      el.focus();
      el.innerHTML = "<p>" + text.replace(/\n/g, "</p><p>") + "</p>";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      strategies.push("innerHTML-force OK");
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

    showDebug("Text inserted, sending...");
    await sleep(500);

    var sendBtn = findSendButton(input);
    if (sendBtn) {
      sendBtn.click();
      await sleep(100);
      sendBtn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      await sleep(50);
      sendBtn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    } else {
      triggerEnterKey(input);
      showDebug("Tried Enter key (no send button)");
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
    var messages = null;
    for (var i = 0; i < ASSISTANT_SELECTORS.length; i++) {
      try {
        var found = document.querySelectorAll(ASSISTANT_SELECTORS[i]);
        if (found.length > 0) {
          messages = found;
          break;
        }
      } catch (e) {
        /* skip */
      }
    }

    if (!messages || messages.length <= lastMessageCount) return false;
    var latestMsg = messages[messages.length - 1];

    var text = "";
    for (var j = 0; j < MESSAGE_TEXT_SELECTORS.length; j++) {
      var textEl = latestMsg.querySelector(MESSAGE_TEXT_SELECTORS[j]);
      if (textEl && textEl.textContent.trim()) {
        text = textEl.textContent.trim();
        break;
      }
    }
    if (!text) text = (latestMsg.textContent || "").trim();
    if (text.length === 0) return false;

    var isStreaming = !!document.querySelector(
      '.loading-indicator, [class*="loading"], [class*="typing"]'
    );
    if (isStreaming) return false;

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
