# Chrome Extension Text Insertion into React/Contenteditable Inputs

## Research Summary

Comprehensive guide on reliably inserting text from Chrome extensions into modern
web apps (ChatGPT, Gemini, Grok) that use React controlled inputs and
contenteditable divs.

---

## Table of Contents

1. [The Core Problem](#the-core-problem)
2. [Approach Rankings (by reliability)](#approach-rankings)
3. [Approach 1: Chrome Debugger `Input.insertText` (Most Reliable)](#approach-1-chrome-debugger-inputinserttext)
4. [Approach 2: Native Setter + dispatchEvent (React inputs)](#approach-2-native-setter--dispatchevent)
5. [Approach 3: `document.execCommand('insertText')` (Contenteditable)](#approach-3-documentexeccommandinserttext)
6. [Approach 4: Clipboard API / Synthetic Paste](#approach-4-clipboard-api--synthetic-paste)
7. [Approach 5: InputEvent dispatch (beforeinput + input)](#approach-5-inputevent-dispatch)
8. [Approach 6: Direct React Fiber/Props manipulation](#approach-6-direct-react-fiberprops-manipulation)
9. [Per-Target Recommendations](#per-target-recommendations)
10. [Key Differences Explained](#key-differences-explained)

---

## The Core Problem

### React Controlled Inputs
React overrides the native `value` setter on `<input>` and `<textarea>` elements.
When you do `el.value = 'text'`, React's synthetic setter records the value internally.
If you then dispatch an `input` event, React sees the value hasn't "really" changed
(it compares against its internal tracking) and **swallows the event**. The component
state never updates.

### Contenteditable Divs (Quill/ProseMirror)
Editors like Quill (used by Gemini's `.ql-editor`) and ProseMirror maintain their
own internal document model. Directly setting `innerHTML` or `textContent` doesn't
update the editor's model, so the text appears visually but:
- The send button stays disabled (editor thinks the field is empty)
- The text disappears on the next re-render
- The editor state is out of sync

---

## Approach Rankings

| Rank | Approach | React `<textarea>` | Contenteditable (Quill/ProseMirror) | Requires Permission | `isTrusted` |
|------|----------|--------------------|------------------------------------|---------------------|-------------|
| 1 | **CDP `Input.insertText`** | ✅ Excellent | ✅ Excellent | `debugger` permission | ✅ Yes |
| 2 | **Native Setter + Event** | ✅ Excellent | ❌ N/A (no `value`) | None | ❌ No |
| 3 | **`execCommand('insertText')`** | ⚠️ Unreliable | ✅ Good | None | ✅ Yes |
| 4 | **Clipboard Paste** | ✅ Good | ✅ Good | `clipboardRead/Write` | ✅ Yes |
| 5 | **InputEvent dispatch** | ⚠️ Partial | ⚠️ Partial | None | ❌ No |
| 6 | **React Fiber manipulation** | ⚠️ Fragile | ❌ N/A | None | N/A |

---

## Approach 1: Chrome Debugger `Input.insertText`

**The most reliable approach across ALL input types.** It works at the browser
engine level, below React/Quill/ProseMirror. The events it generates have
`isTrusted: true`, making them indistinguishable from real user input.

### How It Works
The Chrome Debugger API (`chrome.debugger`) attaches to a tab and sends Chrome
DevTools Protocol (CDP) commands. `Input.insertText` emulates inserting text as
if from an IME or emoji keyboard — it bypasses all JavaScript framework
interception.

### Manifest Permissions
```json
{
  "permissions": ["debugger"]
}
```

> **Warning:** The `debugger` permission shows a scary warning banner ("Extension
> is debugging this browser") to the user. Some users may reject this indicator.

### Background Script Code

```javascript
// background.js

async function insertTextViaDebugger(tabId, text) {
  const target = { tabId };
  
  try {
    // 1. Attach the debugger
    await chrome.debugger.attach(target, "1.3");
    
    // 2. Insert text (works for textarea, input, AND contenteditable)
    await chrome.debugger.sendCommand(target, "Input.insertText", {
      text: text
    });
    
    // 3. Detach the debugger
    await chrome.debugger.detach(target);
    
    return { success: true };
  } catch (err) {
    // Clean up on error
    try { await chrome.debugger.detach(target); } catch {}
    return { success: false, error: err.message };
  }
}

// Usage: The content script must first FOCUS the target element,
// then send a message to background to trigger this.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "INSERT_VIA_DEBUGGER") {
    insertTextViaDebugger(sender.tab.id, msg.text)
      .then(sendResponse);
    return true; // async
  }
});
```

### Content Script Code

```javascript
// content-script.js

async function insertTextReliably(selector, text) {
  const el = document.querySelector(selector);
  if (!el) throw new Error("Element not found: " + selector);
  
  // Step 1: Focus the element (CRITICAL - Input.insertText targets focused element)
  el.focus();
  
  // Step 2: Select all existing content and delete it
  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    el.select(); // select all text in textarea/input
  } else {
    // For contenteditable: select all content
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  // Delete selected content
  document.execCommand("delete", false);
  
  // Step 3: Ask background script to use debugger API
  const result = await chrome.runtime.sendMessage({
    type: "INSERT_VIA_DEBUGGER",
    text: text
  });
  
  return result;
}
```

### Typing Character-by-Character (for apps that validate keystroke-by-keystroke)

```javascript
// background.js - type text character by character via CDP

async function typeTextViaDebugger(tabId, text) {
  const target = { tabId };
  
  await chrome.debugger.attach(target, "1.3");
  
  for (const char of text) {
    // keyDown
    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
      type: "keyDown",
      text: char,
      key: char,
      code: "Key" + char.toUpperCase(),
      windowsVirtualKeyCode: char.charCodeAt(0),
      nativeVirtualKeyCode: char.charCodeAt(0),
    });
    // char event
    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
      type: "char",
      text: char,
      key: char,
      code: "Key" + char.toUpperCase(),
      windowsVirtualKeyCode: char.charCodeAt(0),
      nativeVirtualKeyCode: char.charCodeAt(0),
    });
    // keyUp
    await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
      type: "keyUp",
      key: char,
      code: "Key" + char.toUpperCase(),
      windowsVirtualKeyCode: char.charCodeAt(0),
      nativeVirtualKeyCode: char.charCodeAt(0),
    });
  }
  
  await chrome.debugger.detach(target);
}
```

### Pros/Cons
- ✅ Works on ALL input types (textarea, input, contenteditable, Quill, ProseMirror)
- ✅ Events have `isTrusted: true`
- ✅ React state updates correctly
- ✅ Editor models (Quill, ProseMirror) update correctly
- ✅ Send buttons activate correctly
- ❌ Shows "debugging" banner to user
- ❌ Requires `debugger` permission (scary install warning)
- ❌ Cannot attach if DevTools is already open to the same tab
- ❌ `Input.insertText` is marked EXPERIMENTAL in CDP (but stable in practice)

---

## Approach 2: Native Setter + dispatchEvent

**Best approach for React `<textarea>` and `<input>` WITHOUT needing the debugger
permission.** This is the most widely used technique by autofill/automation
extensions (Cypress, Selenium, auto-fill extensions).

### How It Works
React replaces the native `value` setter on HTMLInputElement/HTMLTextAreaElement
with its own synthetic setter that tracks values internally. By calling the
**original prototype setter** (which React hasn't touched), we bypass React's
tracking. Then we dispatch an `input` event. React sees the event, reads the DOM
value (which is now our value), and updates its state.

### Code

```javascript
function setReactInputValue(element, newValue) {
  // Determine the correct prototype based on element type
  const prototype = element.tagName === "TEXTAREA"
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  
  // Get the NATIVE (original) value setter from the prototype
  const nativeValueSetter = Object.getOwnPropertyDescriptor(
    prototype, "value"
  ).set;
  
  // Call the native setter — this sets the DOM value WITHOUT
  // triggering React's synthetic setter
  nativeValueSetter.call(element, newValue);
  
  // Now dispatch the input event — React will read the DOM value
  // and see it has changed, triggering onChange
  const inputEvent = new Event("input", { bubbles: true });
  element.dispatchEvent(inputEvent);
}
```

### Robust Version (handles edge cases)

```javascript
function setReactInputValueRobust(element, newValue) {
  // Focus first (some React apps check focus state)
  element.focus();
  
  const descriptor = Object.getOwnPropertyDescriptor(element, "value");
  const prototypeDescriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(element), "value"
  );
  
  // If React has overridden the instance setter, use the prototype setter
  if (descriptor && descriptor.set && 
      prototypeDescriptor && descriptor.set !== prototypeDescriptor.set) {
    prototypeDescriptor.set.call(element, newValue);
  } else if (prototypeDescriptor && prototypeDescriptor.set) {
    prototypeDescriptor.set.call(element, newValue);
  } else {
    // Fallback: direct value set
    element.value = newValue;
  }
  
  // Dispatch input event (React listens for this)
  element.dispatchEvent(new Event("input", { bubbles: true }));
  
  // Also dispatch change event (some React components listen for this instead)
  element.dispatchEvent(new Event("change", { bubbles: true }));
  
  // Verify
  if (element.value !== newValue) {
    console.warn("Value verification failed. Expected:", newValue, "Got:", element.value);
  }
}
```

### For ChatGPT Specifically (which uses `ProseMirror` contenteditable as of 2025)

```javascript
// ChatGPT switched from <textarea> to a ProseMirror contenteditable div.
// The #prompt-textarea is now a div[contenteditable="true"], NOT a <textarea>.
// Native setter won't work on contenteditable. Use execCommand instead.

function insertIntoChatGPT(text) {
  // Try new ProseMirror selector first
  let el = document.querySelector('#prompt-textarea[contenteditable="true"]');
  
  if (el) {
    // It's contenteditable — use Approach 3 (execCommand)
    return insertIntoContentEditable(el, text);
  }
  
  // Fallback: old textarea
  el = document.querySelector('#prompt-textarea');
  if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
    return setReactInputValueRobust(el, text);
  }
  
  throw new Error("ChatGPT input element not found");
}
```

### Pros/Cons
- ✅ No special permissions needed
- ✅ Well-established technique (used by Cypress, Selenium)
- ✅ Reliable for standard React `<textarea>` and `<input>`
- ✅ React state updates correctly
- ❌ Does NOT work for `contenteditable` (no `value` property)
- ❌ Events have `isTrusted: false` (some apps check this)
- ❌ May fail on React 19+ if internal event handling changes
- ❌ ChatGPT has moved away from `<textarea>` to contenteditable

---

## Approach 3: `document.execCommand('insertText')`

**Best DOM-level approach for contenteditable elements.** This is deprecated but
still works in all browsers and generates `isTrusted: true` events. This is the
technique used by many autofill extensions.

### How It Works
`document.execCommand('insertText')` triggers the browser's native text
insertion path. It fires `beforeinput` and `input` events with `isTrusted: true`.
Rich text editors (Quill, ProseMirror, Draft.js) listen for these events and
update their internal document model.

### Code for Contenteditable (Gemini's Quill Editor)

```javascript
function insertIntoContentEditable(element, text) {
  // 1. Focus the element
  element.focus();
  
  // 2. Select all existing content and delete it
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
  
  // 3. Delete existing content
  document.execCommand("delete", false);
  
  // 4. Insert new text
  const success = document.execCommand("insertText", false, text);
  
  if (!success) {
    // Fallback: try setting textContent + firing events
    element.textContent = text;
    element.dispatchEvent(new InputEvent("input", {
      inputType: "insertText",
      data: text,
      bubbles: true,
    }));
  }
  
  return success;
}
```

### Code for Gemini's `.ql-editor` (Quill-based)

```javascript
function insertIntoGemini(text) {
  // Gemini uses Quill editor with .ql-editor contenteditable
  const editor = document.querySelector('.ql-editor[contenteditable="true"]');
  
  if (!editor) {
    // Fallback selectors
    const alternates = [
      'div[contenteditable="true"][aria-label*="prompt"]',
      'rich-textarea [contenteditable="true"]',
      'div[contenteditable="true"][role="textbox"]',
    ];
    for (const sel of alternates) {
      const el = document.querySelector(sel);
      if (el) return insertIntoContentEditable(el, text);
    }
    throw new Error("Gemini input not found");
  }
  
  // Focus
  editor.focus();
  
  // Clear existing placeholder paragraph
  // Quill has a <p><br></p> placeholder when empty
  const existingP = editor.querySelector("p");
  if (existingP && existingP.textContent.trim() === "") {
    const range = document.createRange();
    range.selectNodeContents(editor);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand("delete", false);
  }
  
  // Insert text
  const ok = document.execCommand("insertText", false, text);
  
  if (!ok) {
    // Quill fallback: set innerHTML and dispatch events
    editor.innerHTML = "<p>" + text.replace(/\n/g, "</p><p>") + "</p>";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    
    // Also try to trigger Quill's internal update
    // Quill watches for MutationObserver, so innerHTML change may suffice
  }
  
  return ok;
}
```

### Pros/Cons
- ✅ Events have `isTrusted: true`
- ✅ Quill/ProseMirror update their internal models
- ✅ Send buttons activate
- ✅ No special permissions needed
- ✅ Works well for contenteditable elements
- ⚠️ Deprecated API, but still widely supported (2026)
- ⚠️ May not work if element doesn't have focus
- ⚠️ Doesn't work for `<textarea>` in React (React swallows the event)
- ⚠️ Some apps use `beforeinput` event prevention that can block this

---

## Approach 4: Clipboard API / Synthetic Paste

**Most universal fallback.** Simulates a paste operation. Works for both
textareas and contenteditable because all apps handle paste events.

### Method A: Clipboard Write + execCommand paste

```javascript
async function insertViaPaste(element, text) {
  element.focus();
  
  // Select all existing content
  if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
    element.select();
  } else {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  
  // Save current clipboard
  let savedClipboard;
  try {
    savedClipboard = await navigator.clipboard.readText();
  } catch {}
  
  // Write our text to clipboard
  await navigator.clipboard.writeText(text);
  
  // Execute paste
  document.execCommand("paste");
  
  // Restore clipboard (optional, be a good citizen)
  if (savedClipboard !== undefined) {
    setTimeout(() => navigator.clipboard.writeText(savedClipboard), 100);
  }
}
```

### Method B: Synthetic Paste Event with DataTransfer

```javascript
function insertViaSyntheticPaste(element, text) {
  element.focus();
  
  // Select all
  if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
    element.select();
  } else {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  
  // Create a DataTransfer object with our text
  const dataTransfer = new DataTransfer();
  dataTransfer.setData("text/plain", text);
  
  // Create and dispatch paste event
  const pasteEvent = new ClipboardEvent("paste", {
    bubbles: true,
    cancelable: true,
    clipboardData: dataTransfer,
  });
  
  element.dispatchEvent(pasteEvent);
  
  // Note: This event has isTrusted: false
  // Some apps check isTrusted and ignore synthetic paste events
  // In that case, use Method A (real clipboard) or the Debugger approach
}
```

### Method C: Using Background Script for Real Paste (via CDP)

```javascript
// background.js
async function pasteViaDebugger(tabId, text) {
  const target = { tabId };
  await chrome.debugger.attach(target, "1.3");
  
  // Insert text using the IME method (simpler than clipboard)
  await chrome.debugger.sendCommand(target, "Input.insertText", { text });
  
  // OR simulate Cmd+V / Ctrl+V after writing to clipboard
  // Step 1: Execute script to write to clipboard
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (t) => navigator.clipboard.writeText(t),
    args: [text],
  });
  
  // Step 2: Simulate Ctrl+V / Cmd+V
  const isMac = true; // detect platform
  const modifier = isMac ? 4 : 2; // Meta=4, Ctrl=2
  
  await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
    type: "keyDown",
    modifiers: modifier,
    key: "v",
    code: "KeyV",
    windowsVirtualKeyCode: 86,
    commands: ["paste"],
  });
  await chrome.debugger.sendCommand(target, "Input.dispatchKeyEvent", {
    type: "keyUp",
    modifiers: modifier,
    key: "v",
    code: "KeyV",
    windowsVirtualKeyCode: 86,
  });
  
  await chrome.debugger.detach(target);
}
```

### Pros/Cons
- ✅ Works for both textarea and contenteditable
- ✅ Apps universally handle paste
- ✅ Method A generates `isTrusted: true` events
- ❌ Method B's synthetic paste has `isTrusted: false`
- ❌ Method A overwrites user's clipboard (can restore, but race conditions)
- ❌ Requires clipboard permissions
- ❌ Some apps sanitize pasted content (stripping formatting)

---

## Approach 5: InputEvent dispatch (beforeinput + input)

**Limited reliability.** This mimics what the browser does internally during text
input. ProseMirror and some editors listen for `beforeinput` events to handle
text insertion.

### Code

```javascript
function insertViaInputEvent(element, text) {
  element.focus();
  
  // Clear existing content
  if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
    element.select();
  } else {
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  
  // Dispatch beforeinput (ProseMirror/Quill listen for this)
  const beforeInputEvent = new InputEvent("beforeinput", {
    inputType: "insertText",
    data: text,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  const notCancelled = element.dispatchEvent(beforeInputEvent);
  
  if (notCancelled) {
    // If beforeinput wasn't cancelled, set the content
    if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
      // Use native setter for React
      const setter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(element), "value"
      ).set;
      setter.call(element, text);
    } else {
      element.textContent = text;
    }
  }
  
  // Dispatch input event
  element.dispatchEvent(new InputEvent("input", {
    inputType: "insertText",
    data: text,
    bubbles: true,
  }));
}
```

### Why It's Unreliable
- `isTrusted: false` — ProseMirror explicitly checks `event.isTrusted` in its
  `beforeinput` handler and ignores untrusted events
- React doesn't respond to `InputEvent` differently from regular `Event` for
  controlled inputs
- The `beforeinput` spec is complex; apps may check for properties that
  synthetic events don't have (like `getTargetRanges()`)

### Pros/Cons
- ✅ No permissions needed
- ✅ Follows the spec
- ❌ `isTrusted: false` — many editors ignore these
- ❌ ProseMirror and Tiptap explicitly reject untrusted beforeinput events
- ❌ Unreliable as a primary strategy

---

## Approach 6: Direct React Fiber/Props manipulation

**Fragile but creative.** Access React's internal fiber tree or event handlers
directly through the DOM element's React-specific properties.

### Code

```javascript
function setValueViaReactProps(element, newValue) {
  // Find React internal properties on the DOM element
  const reactPropsKey = Object.keys(element).find(
    key => key.startsWith("__reactProps$")
  );
  
  if (reactPropsKey) {
    const props = element[reactPropsKey];
    if (props && props.onChange) {
      // Call onChange directly with a synthetic event
      props.onChange({
        target: { value: newValue },
        currentTarget: { value: newValue },
        preventDefault: () => {},
        stopPropagation: () => {},
      });
      return true;
    }
  }
  
  // Alternative: React Event Handlers (older React versions)
  const reactHandlerKey = Object.keys(element).find(
    key => key.startsWith("__reactEventHandlers$")
  );
  
  if (reactHandlerKey) {
    const handlers = element[reactHandlerKey];
    if (handlers && handlers.onChange) {
      handlers.onChange({
        target: { value: newValue },
        currentTarget: { value: newValue },
      });
      return true;
    }
  }
  
  return false;
}
```

### Pros/Cons
- ✅ Directly triggers React state update
- ✅ No permissions needed
- ❌ Extremely fragile — React key naming changes between versions
- ❌ Internal API, not documented, breaks without warning
- ❌ Doesn't work for contenteditable (Quill/ProseMirror don't use React onChange)
- ❌ Not recommended for production

---

## Per-Target Recommendations

### ChatGPT (`chatgpt.com`)

ChatGPT's input has evolved over time:
- **2023:** Standard `<textarea id="prompt-textarea">`
- **2024-2025:** ProseMirror-based `<div contenteditable="true" id="prompt-textarea">`

**Recommended strategy chain:**

```javascript
function insertIntoChatGPT(text) {
  const el = document.querySelector("#prompt-textarea");
  if (!el) throw new Error("ChatGPT input not found");
  
  if (el.getAttribute("contenteditable") === "true") {
    // ProseMirror contenteditable — use execCommand
    el.focus();
    
    // Clear placeholder content
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("delete", false);
    
    // Insert text
    const ok = document.execCommand("insertText", false, text);
    
    if (!ok || el.textContent.trim() === "") {
      // Fallback: set innerHTML and trigger events
      el.innerHTML = "<p>" + text.replace(/\n/g, "<br>") + "</p>";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  } else {
    // Legacy textarea
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, "value"
    ).set;
    setter.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
```

**Most reliable:** Use CDP `Input.insertText` after focusing `#prompt-textarea`.

---

### Gemini (`gemini.google.com`)

Gemini uses a Quill-based rich text editor with `.ql-editor` contenteditable.

**Recommended strategy chain:**

```javascript
function insertIntoGemini(text) {
  const selectors = [
    '.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"][aria-label*="prompt"]',
    'rich-textarea [contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
  ];
  
  let el;
  for (const sel of selectors) {
    el = document.querySelector(sel);
    if (el) break;
  }
  if (!el) throw new Error("Gemini input not found");
  
  // Focus
  el.focus();
  
  // Clear the Quill placeholder (<p><br></p>)
  const children = el.querySelectorAll("p");
  if (children.length <= 1 && el.textContent.trim() === "") {
    el.innerHTML = "";
  }
  
  // Select all and delete
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(el);
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand("delete", false);
  
  // Insert using execCommand
  const ok = document.execCommand("insertText", false, text);
  
  if (!ok || el.textContent.trim() === "") {
    // Fallback: set innerHTML in Quill format
    const paragraphs = text.split("\n")
      .map(line => "<p>" + (line || "<br>") + "</p>")
      .join("");
    el.innerHTML = paragraphs;
    
    // Fire input event to notify Quill
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
}
```

**Most reliable:** Use CDP `Input.insertText`. Quill's internal model updates
correctly because the browser fires trusted `beforeinput`/`input` events.

---

### Grok (`grok.com` / `x.com/i/grok`)

Grok uses a React-controlled `<textarea>` or contenteditable depending on version.

**Recommended strategy chain:**

```javascript
function insertIntoGrok(text) {
  const selectors = [
    'textarea[placeholder*="Ask"]',
    'textarea[aria-label*="Message"]',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][data-placeholder]',
    'textarea',
  ];
  
  let el;
  for (const sel of selectors) {
    el = document.querySelector(sel);
    if (el) break;
  }
  if (!el) throw new Error("Grok input not found");
  
  el.focus();
  
  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    // React controlled textarea
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, "value"
    ).set;
    setter.call(el, text);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    
    // Verify — if it didn't work, try execCommand
    if (el.value !== text) {
      el.focus();
      el.select();
      document.execCommand("insertText", false, text);
    }
  } else {
    // Contenteditable
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("delete", false);
    document.execCommand("insertText", false, text);
  }
}
```

---

## Key Differences Explained

### `dispatchEvent(new Event('input'))` vs Native Setter Trick

| Aspect | Plain `dispatchEvent` | Native Setter + `dispatchEvent` |
|--------|----------------------|-------------------------------|
| Sets DOM value | No | Yes |
| React sees change | No (React's own setter already recorded old value) | Yes (bypasses React's setter) |
| `isTrusted` | `false` | `false` |
| Works on React ≥15.6 | No | Yes |

**Why plain dispatch fails:** React's `ChangeEventPlugin` deduplicates events.
When you do `el.value = 'x'`, React's overridden setter records `'x'` internally.
When the `input` event fires, React reads the DOM value, sees it's `'x'` (same as
what the setter recorded), and considers it a duplicate → swallowed.

When you use the **native prototype setter**, you bypass React's recording.
React's internal tracker still has the old value. When the event fires, React
reads the DOM (which now has the new value), sees a difference, and fires `onChange`.

### `execCommand('insertText')` vs `dispatchEvent(InputEvent)`

| Aspect | `execCommand` | `dispatchEvent(InputEvent)` |
|--------|--------------|---------------------------|
| `isTrusted` | ✅ Yes | ❌ No |
| Modifies DOM | ✅ Yes (browser does it) | ❌ No (you must do it manually) |
| ProseMirror response | ✅ Processes it | ❌ Ignores (checks isTrusted) |
| Quill response | ✅ Processes it | ⚠️ May work via MutationObserver |
| Deprecated | ⚠️ Yes (but still supported) | ✅ No |

### CDP `Input.insertText` vs DOM manipulation

| Aspect | CDP `Input.insertText` | DOM manipulation |
|--------|----------------------|-----------------|
| Level | Browser engine (Blink) | JavaScript DOM API |
| `isTrusted` | ✅ Yes | ❌ No |
| Works on all input types | ✅ Yes | ⚠️ Depends on strategy |
| Requires debugger permission | ✅ Yes | ❌ No |
| User sees banner | ✅ Yes ("debugging this browser") | ❌ No |
| Framework agnostic | ✅ Yes | ❌ No |

### What Autofill/Simplify Extensions Use

Major autofill extensions typically use a **layered approach**:

1. **Primary:** Native setter trick for `<input>`/`<textarea>` (works for most
   form fields)
2. **Contenteditable:** `document.execCommand('insertText')` 
3. **Fallback:** Clipboard-based paste (real clipboard write + `execCommand('paste')`)
4. **Nuclear option:** Some use CDP via `chrome.debugger` for the hardest cases

Extensions like **Simplify Gmail** use `execCommand('insertText')` for Gmail's
contenteditable compose window. Form autofill extensions (LastPass, 1Password)
primarily use the native setter trick.

---

## Complete Universal Insertion Function

```javascript
/**
 * Universal text insertion that works across React inputs,
 * contenteditable, Quill, ProseMirror, and more.
 * 
 * Tries strategies in order of reliability, returns on first success.
 */
async function universalInsertText(element, text) {
  const strategies = [];
  const isTextInput = element.tagName === "TEXTAREA" || element.tagName === "INPUT";
  const isContentEditable = element.getAttribute("contenteditable") === "true";
  
  element.focus();
  
  // === STRATEGY 1: Native setter (React textarea/input) ===
  if (isTextInput) {
    try {
      const proto = element.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
      setter.call(element, text);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      if (element.value === text) {
        return { success: true, strategy: "native-setter" };
      }
      strategies.push("native-setter: value mismatch");
    } catch (e) {
      strategies.push("native-setter: " + e.message);
    }
  }
  
  // === STRATEGY 2: execCommand insertText ===
  try {
    element.focus();
    // Select all first
    if (isTextInput) {
      element.select();
    } else if (isContentEditable) {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    document.execCommand("delete", false);
    const ok = document.execCommand("insertText", false, text);
    
    const content = element.textContent || element.value || "";
    if (ok && content.includes(text.substring(0, Math.min(20, text.length)))) {
      return { success: true, strategy: "execCommand" };
    }
    strategies.push("execCommand: ok=" + ok + " content=" + content.length);
  } catch (e) {
    strategies.push("execCommand: " + e.message);
  }
  
  // === STRATEGY 3: Clipboard paste ===
  try {
    element.focus();
    if (isTextInput) {
      element.select();
    } else if (isContentEditable) {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    
    const dt = new DataTransfer();
    dt.setData("text/plain", text);
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: dt,
    });
    element.dispatchEvent(pasteEvent);
    
    await new Promise(r => setTimeout(r, 50));
    const content2 = element.textContent || element.value || "";
    if (content2.includes(text.substring(0, Math.min(20, text.length)))) {
      return { success: true, strategy: "synthetic-paste" };
    }
    strategies.push("synthetic-paste: dispatched");
  } catch (e) {
    strategies.push("synthetic-paste: " + e.message);
  }
  
  // === STRATEGY 4: InputEvent dispatch ===
  try {
    element.focus();
    if (isContentEditable) {
      element.textContent = "";
    }
    
    element.dispatchEvent(new InputEvent("beforeinput", {
      inputType: "insertText",
      data: text,
      bubbles: true,
      cancelable: true,
    }));
    
    if (isTextInput) {
      const setter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(element), "value"
      )?.set;
      if (setter) setter.call(element, text);
      else element.value = text;
    } else {
      element.textContent = text;
    }
    
    element.dispatchEvent(new InputEvent("input", {
      inputType: "insertText",
      data: text,
      bubbles: true,
    }));
    strategies.push("InputEvent: dispatched");
  } catch (e) {
    strategies.push("InputEvent: " + e.message);
  }
  
  // === STRATEGY 5: Force DOM + CDP fallback ===
  try {
    if (isTextInput) {
      element.value = text;
    } else {
      element.innerHTML = text.replace(/\n/g, "<br>");
    }
    element.dispatchEvent(new Event("input", { bubbles: true }));
    strategies.push("force-dom: set");
    
    // Ask background for CDP insertion  
    const cdpResult = await chrome.runtime.sendMessage({
      type: "INSERT_VIA_DEBUGGER",
      text: text,
    }).catch(() => null);
    
    if (cdpResult?.success) {
      return { success: true, strategy: "cdp-debugger" };
    }
  } catch (e) {
    strategies.push("force-dom: " + e.message);
  }
  
  return { 
    success: false, 
    strategies,
    hint: "All strategies attempted. Consider using CDP Input.insertText via background script."
  };
}
```

---

## Summary

For your AI Hub extension targeting ChatGPT, Gemini, and Grok:

| Target | Current Input Type | Best Approach | Fallback |
|--------|-------------------|---------------|----------|
| ChatGPT | ProseMirror contenteditable | `execCommand('insertText')` | CDP `Input.insertText` |
| Gemini | Quill `.ql-editor` contenteditable | `execCommand('insertText')` | CDP `Input.insertText` |
| Grok | React `<textarea>` | Native setter + dispatchEvent | `execCommand('insertText')` |

**If you want maximum reliability across all three with one approach:**
Use `chrome.debugger` + `Input.insertText`. It's the only technique that works
identically across all input types with `isTrusted: true` events. The tradeoff
is the debugging banner and the `debugger` permission.
