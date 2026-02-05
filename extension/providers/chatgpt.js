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

// --- Insert text (simple, proven approach) ---

function insertText(el, text) {
  var strategies = [];

  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    // Textarea / Input path
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
    // ContentEditable path (ProseMirror / rich editor)
    try {
      el.focus();
      el.textContent = "";
      var ok = document.execCommand("insertText", false, text);
      if (ok && (el.textContent || "").trim().length > 0) {
        strategies.push("clear+execCommand OK");
        return { success: true, strategies: strategies };
      }
      strategies.push("clear+execCommand returned " + ok);
    } catch (e) {
      strategies.push("clear+execCommand FAIL " + e.message);
    }

    // Fallback: innerHTML
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
    // Count existing assistant messages
    var existingMsgs = document.querySelectorAll(
      ASSISTANT_SELECTORS.join(", ")
    );
    lastMessageCount = existingMsgs.length;
    console.log(
      "[" + PROVIDER + "] existing assistant messages: " + lastMessageCount
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

    showDebug("Text inserted, sending...");
    await sleep(500);

    // Find and click send button
    var sendBtn = findSendButton(input);
    if (sendBtn) {
      console.log("[" + PROVIDER + "] clicking send button");
      sendBtn.click();
      await sleep(100);
      sendBtn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      await sleep(50);
      sendBtn.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    } else {
      console.log("[" + PROVIDER + "] no send button found, trying Enter key");
      triggerEnterKey(input);
      showDebug("Tried Enter key (no send button found)");
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

    // Check if still streaming
    var isStreaming =
      !!document.querySelector('button[aria-label="Stop generating"]') ||
      !!document.querySelector('[data-testid="stop-button"]') ||
      !!latestMsg.querySelector('[class*="result-streaming"]');

    if (isStreaming) return false;

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
