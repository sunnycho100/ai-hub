# Gemini & Grok DOM Selectors Reference (Late 2025 / Early 2026)

> **Important:** Both Gemini and Grok use heavily obfuscated, frequently-changing
> class names. Always use a **multi-selector fallback strategy** (as your v2 code
> already does). The selectors below are ordered by reliability.

---

## GEMINI (gemini.google.com)

### Architecture
- **Framework:** Angular (custom elements / Web Components)
- **Editor:** Quill-based rich text editor (`.ql-editor`) wrapped in a custom `<rich-textarea>` element
- **Rendering:** Server-side hydrated Angular components with custom element tags like `<model-response>`, `<user-query>`, `<message-content>`, `<chat-window>`

---

### Input Element

Gemini uses a **Quill editor** inside a custom Angular element `<rich-textarea>`. The actual editable surface is a `div.ql-editor` with `contenteditable="true"`.

#### Selectors (ordered by reliability)

```javascript
const INPUT_SELECTORS = [
  // PRIMARY: Quill editor inside rich-textarea component
  'rich-textarea .ql-editor[contenteditable="true"]',
  '.ql-editor[contenteditable="true"]',
  
  // SECONDARY: aria-label based (language-dependent but stable structurally)
  'div[contenteditable="true"][aria-label*="Enter a prompt"]',
  'div[contenteditable="true"][aria-label*="prompt"]',
  
  // TERTIARY: role-based
  'div[contenteditable="true"][role="textbox"]',
  
  // FALLBACK: broader contenteditable within the input area container
  'rich-textarea [contenteditable="true"]',
  
  // LAST RESORT: plain textarea fallback (Gemini occasionally uses this)
  '.text-input-field textarea',
  'textarea[aria-label*="prompt"]',
];
```

#### DOM Tree Structure

```
<div class="input-area-container">
  <rich-textarea>
    <div class="ql-container">
      <div class="ql-editor textarea"
           contenteditable="true"
           role="textbox"
           aria-label="Enter a prompt here"
           data-placeholder="Enter a prompt here">
        <p><br></p>            <!-- empty state -->
        <p>User typed text</p> <!-- with content -->
      </div>
    </div>
  </rich-textarea>
</div>
```

#### Text Insertion Strategy (for Quill `.ql-editor`)
1. **Best:** `document.execCommand('insertText', false, text)` — Quill listens for this
2. **Fallback:** Synthetic `ClipboardEvent('paste')` with DataTransfer
3. **Last resort:** `el.innerHTML = '<p>' + text + '</p>'` + dispatch `input` event
4. **NEVER** use `el.textContent = ''` — it destroys Quill's internal state

```javascript
function insertIntoGemini(editor, text) {
  editor.focus();
  
  // Select all existing content
  const range = document.createRange();
  range.selectNodeContents(editor);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  
  // Delete existing then insert new
  document.execCommand('delete', false, null);
  const ok = document.execCommand('insertText', false, text);
  
  if (!ok || !editor.textContent.trim()) {
    // Fallback: paste simulation
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    editor.dispatchEvent(new ClipboardEvent('paste', {
      clipboardData: dt,
      bubbles: true,
      cancelable: true,
    }));
  }
}
```

---

### Send Button

```javascript
const SEND_SELECTORS = [
  // PRIMARY: aria-label (most stable)
  'button[aria-label="Send message"]',
  
  // SECONDARY: material icon data attribute
  'button[data-mat-icon-name="send"]',
  
  // TERTIARY: class-based
  'button.send-button',
  
  // FALLBACK: aria-label variations
  'button[aria-label="Send"]',
  'button[mattooltip="Send"]',
  
  // FALLBACK: look for send button in the input area
  '.input-area-container button[aria-label*="Send"]',
  '.send-button-container button',
];
```

#### Send Button DOM

```
<div class="send-button-container">
  <button mat-icon-button
          aria-label="Send message"
          class="send-button"
          [disabled]="!hasInput">
    <mat-icon>send</mat-icon>
    <!-- or as SVG -->
    <span class="mat-icon material-icons">send</span>
  </button>
</div>
```

#### Important Notes
- The send button is **disabled** when the input is empty. Quill must register the content internally.
- After inserting text, wait ~300-500ms for Quill to process before clicking send.
- If `sendBtn.disabled === true` after text insertion, the insertion didn't register with Quill — retry with a different strategy.

---

### Assistant / Model Responses

#### Selectors for Response Containers

```javascript
const ASSISTANT_SELECTORS = [
  // PRIMARY: custom Angular element
  'model-response',
  
  // SECONDARY: class-based containers
  '.model-response-text',
  'message-content.model-response-text',
  
  // TERTIARY: response container with markdown
  '.response-container',
  'model-response .response-container',
  
  // FALLBACK: attribute-based
  '[data-message-author="model"]',
  'message-content[class*="model"]',
  
  // BROAD FALLBACK
  '.conversation-container model-response',
];
```

#### Selectors for Response Text Content

```javascript
const MESSAGE_TEXT_SELECTORS = [
  // PRIMARY: markdown rendered content
  '.markdown.markdown-main-panel',
  '.markdown-main-panel',
  
  // SECONDARY: standard markdown class
  '.markdown',
  
  // TERTIARY: model response text wrapper
  '.model-response-text .markdown',
  '.response-container .markdown',
  
  // FALLBACK: any paragraph content
  '.model-response-text p',
  'p',
];
```

#### Response DOM Tree

```
<model-response>
  <div class="response-container">
    <div class="model-response-text">
      <div class="markdown markdown-main-panel">
        <p>Here is the response text.</p>
        <pre><code class="language-python">print("hello")</code></pre>
        <ul><li>List item</li></ul>
      </div>
    </div>
    
    <!-- Action buttons (copy, thumbs up/down, etc.) -->
    <div class="response-actions">
      <button aria-label="Copy">...</button>
      <button aria-label="Good response">...</button>
      <button aria-label="Bad response">...</button>
    </div>
  </div>
</model-response>
```

#### Extracting the Latest Response

```javascript
function getLatestGeminiResponse() {
  // Try custom element first
  let responses = document.querySelectorAll('model-response');
  if (!responses.length) {
    responses = document.querySelectorAll('.model-response-text');
  }
  if (!responses.length) return null;
  
  const latest = responses[responses.length - 1];
  
  // Get the markdown content
  const markdown = latest.querySelector('.markdown.markdown-main-panel')
    || latest.querySelector('.markdown')
    || latest.querySelector('.model-response-text');
  
  return markdown ? markdown.textContent.trim() : latest.textContent.trim();
}
```

---

### Streaming / Loading Indicators

```javascript
const STREAMING_SELECTORS = [
  // Typing/thinking indicator
  '.loading-indicator',
  '.thinking-indicator',
  'mat-progress-bar',
  
  // Class-based patterns
  '[class*="loading"]',
  '[class*="typing"]',
  '[class*="thinking"]',
  '[class*="streaming"]',
  
  // Cursor blink element (appears in response during streaming)
  '.cursor-blink',
  '.blinking-cursor',
];

function isGeminiStreaming() {
  // Check for any streaming indicators
  for (const sel of STREAMING_SELECTORS) {
    if (document.querySelector(sel)) return true;
  }
  
  // Also check if the latest response is still growing
  // (no "response-actions" buttons yet = still streaming)
  const responses = document.querySelectorAll('model-response');
  if (responses.length) {
    const latest = responses[responses.length - 1];
    const hasActions = latest.querySelector('.response-actions button');
    if (!hasActions) return true; // Still streaming
  }
  
  return false;
}
```

---

## GROK (grok.com / x.com/i/grok)

### Architecture
- **Framework:** Next.js (React) — grok.com; React — x.com/i/grok
- **Editor:** Standard `<textarea>` (React controlled component)
- **Rendering:** React with `data-testid` attributes, Tailwind CSS classes

---

### Input Element

Grok uses a standard React-controlled **`<textarea>`** element.

#### Selectors (ordered by reliability)

```javascript
const INPUT_SELECTORS = [
  // PRIMARY: placeholder-based (most stable)
  'textarea[placeholder*="Ask"]',
  'textarea[placeholder*="ask"]',
  
  // SECONDARY: aria-label based
  'textarea[aria-label*="Message"]',
  'textarea[aria-label*="message"]',
  'textarea[aria-label*="Ask"]',
  
  // TERTIARY: data-testid (if present)
  'textarea[data-testid="chat-input"]',
  'textarea[data-testid*="input"]',
  
  // FALLBACK: contenteditable (Grok may switch to this)
  'div[contenteditable="true"][role="textbox"]',
  'div[contenteditable="true"][data-placeholder]',
  
  // LAST RESORT: any textarea in the page
  'textarea',
];
```

#### DOM Tree Structure

```
<form class="...">
  <div class="relative ...">
    <textarea
      placeholder="Ask anything..."
      aria-label="Ask Grok"
      rows="1"
      class="... resize-none ..."
      style="height: auto; overflow-y: hidden;">
    </textarea>
  </div>
  <button type="submit" aria-label="Send" class="...">
    <svg><!-- arrow/send icon --></svg>
  </button>
</form>
```

#### Text Insertion Strategy (for React `<textarea>`)

React overrides the native `value` setter. You **must** use the native prototype setter to bypass React's synthetic event system:

```javascript
function insertIntoGrok(textarea, text) {
  textarea.focus();
  
  // Strategy 1: Native prototype setter (bypasses React)
  const proto = window.HTMLTextAreaElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  nativeSetter.call(textarea, text);
  
  // Dispatch both input and change events
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Verify
  if (textarea.value !== text) {
    // Fallback: execCommand
    textarea.select();
    document.execCommand('insertText', false, text);
  }
}
```

---

### Send Button

```javascript
const SEND_SELECTORS = [
  // PRIMARY: aria-label (most stable)
  'button[aria-label="Send"]',
  'button[aria-label="Send message"]',
  
  // SECONDARY: data-testid
  'button[data-testid="send-button"]',
  'button[data-testid*="send"]',
  
  // TERTIARY: form submit button
  'form button[type="submit"]',
  
  // FALLBACK: last button in the form
  'form button:last-of-type',
];
```

#### Send Button DOM

```
<button type="submit"
        aria-label="Send"
        data-testid="send-button"
        class="... rounded-full ..."
        disabled>          <!-- disabled when input is empty -->
  <svg viewBox="0 0 24 24" class="...">
    <path d="M..."></path>  <!-- arrow-up / send icon -->
  </svg>
</button>
```

#### Important Notes
- Button is **disabled** when textarea is empty
- After setting textarea value, wait for React to re-render (~100-200ms) before checking button state
- If button stays disabled, the React state didn't update — try dispatching additional events:
  ```javascript
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
  // Also try React 18+ specific:
  textarea.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
  ```

---

### Assistant / Model Responses

#### Selectors for Response Containers

```javascript
const ASSISTANT_SELECTORS = [
  // PRIMARY: data-testid (Grok uses these extensively)
  '[data-testid="message-text-assistant"]',
  '[data-testid*="assistant-message"]',
  '[data-testid="assistant-message"]',
  
  // SECONDARY: role/attribute based
  '[data-message-role="assistant"]',
  '[data-role="assistant"]',
  
  // TERTIARY: class-based patterns
  '.assistant-message',
  '[class*="assistant"]',
  '[class*="response"][class*="message"]',
  
  // x.com/i/grok specific (may differ from grok.com)
  '[data-testid="tweetText"]', // if embedded in tweet-like UI
];
```

#### Selectors for Response Text Content

```javascript
const MESSAGE_TEXT_SELECTORS = [
  // PRIMARY: markdown rendering
  '.markdown',
  '.prose',
  
  // SECONDARY: message text container
  '.message-text',
  '[class*="message-content"]',
  
  // FALLBACK
  'p',
  'div[dir="auto"]',
];
```

#### Response DOM Tree

```
<!-- grok.com -->
<div data-testid="assistant-message" class="... group ...">
  <div class="... flex ...">
    <div class="avatar">
      <img src="..." alt="Grok" />
    </div>
    <div class="message-content">
      <div class="markdown prose dark:prose-invert">
        <p>Here is the response text.</p>
        <pre><code class="language-python">print("hello")</code></pre>
      </div>
    </div>
  </div>
  <!-- Action buttons -->
  <div class="... flex ... gap-2">
    <button aria-label="Copy">...</button>
    <button aria-label="Like">...</button>
    <button aria-label="Dislike">...</button>
  </div>
</div>
```

#### Extracting the Latest Response

```javascript
function getLatestGrokResponse() {
  const selectors = [
    '[data-testid="message-text-assistant"]',
    '[data-testid*="assistant"]',
    '[data-message-role="assistant"]',
    '.assistant-message',
  ];
  
  let messages = null;
  for (const sel of selectors) {
    const found = document.querySelectorAll(sel);
    if (found.length) { messages = found; break; }
  }
  if (!messages) return null;
  
  const latest = messages[messages.length - 1];
  const markdown = latest.querySelector('.markdown')
    || latest.querySelector('.prose')
    || latest.querySelector('.message-text');
  
  return markdown ? markdown.textContent.trim() : latest.textContent.trim();
}
```

---

### Streaming / Loading Indicators

```javascript
const STREAMING_SELECTORS = [
  // Spinner/loading indicators
  '.loading-indicator',
  '[class*="loading"]',
  '[class*="typing"]',
  '[class*="streaming"]',
  
  // Skeleton/placeholder
  '[class*="skeleton"]',
  '[class*="pulse"]',
  
  // Data attributes
  '[data-testid*="loading"]',
  '[data-testid*="typing"]',
];

function isGrokStreaming() {
  for (const sel of STREAMING_SELECTORS) {
    if (document.querySelector(sel)) return true;
  }
  
  // Also check if the last message is still growing
  // by observing textContent length over ~500ms
  return false;
}
```

---

## Universal Best Practices

### 1. Multi-Selector Fallback Pattern (already in your code)

```javascript
function findElement(selectors, label) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      if (el) return el;
    } catch (e) { /* skip invalid selectors */ }
  }
  return null;
}
```

### 2. Waiting for Dynamic Content

Both sites load chat UI asynchronously. Use retry logic:

```javascript
async function waitForElement(selectors, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = findElement(selectors, '');
    if (el) return el;
    await new Promise(r => setTimeout(r, 500));
  }
  return null;
}
```

### 3. Streaming Completion Detection

Don't just check for a loading indicator — also verify the response is stable:

```javascript
async function waitForStreamComplete(getTextFn, timeoutMs = 300000) {
  let lastText = '';
  let stableCount = 0;
  
  while (stableCount < 3) { // 3 consecutive checks with no change
    await new Promise(r => setTimeout(r, 1000));
    const currentText = getTextFn();
    
    if (currentText === lastText && currentText.length > 0) {
      stableCount++;
    } else {
      stableCount = 0;
      lastText = currentText;
    }
  }
  
  return lastText;
}
```

### 4. MutationObserver for Response Detection

```javascript
function observeNewMessages(targetNode, onNewMessage) {
  const observer = new MutationObserver((mutations) => {
    // Check if new message elements were added
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length) {
        onNewMessage();
      }
    }
  });
  
  observer.observe(targetNode, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  
  return observer;
}

// Usage:
const target = document.querySelector('main') || document.body;
const observer = observeNewMessages(target, () => {
  checkForNewResponse();
});
```

---

## Selector Discovery Tips

Since selectors change frequently, here's how to find current ones:

### In DevTools Console

```javascript
// Find all contenteditable elements
document.querySelectorAll('[contenteditable="true"]');

// Find all textareas
document.querySelectorAll('textarea');

// Find all buttons with aria-label containing "send"
document.querySelectorAll('button[aria-label*="send" i], button[aria-label*="Send"]');

// Find elements with data-testid
document.querySelectorAll('[data-testid]');

// Find custom Angular elements (Gemini)
document.querySelectorAll('model-response, user-query, message-content, rich-textarea, chat-window');

// Find elements by class substring
document.querySelectorAll('[class*="response"], [class*="message"], [class*="assistant"]');

// Inspect the input's tag and attributes
const input = document.querySelector('[contenteditable="true"], textarea');
if (input) {
  console.log('Tag:', input.tagName);
  console.log('Attributes:', [...input.attributes].map(a => `${a.name}="${a.value}"`));
  console.log('Parent:', input.parentElement?.tagName, input.parentElement?.className);
}
```

### Real-Time Selector Audit Script

Paste this into DevTools to audit which of your selectors currently work:

```javascript
function auditSelectors(selectorMap) {
  for (const [label, selectors] of Object.entries(selectorMap)) {
    console.group(label);
    for (const sel of selectors) {
      const matches = document.querySelectorAll(sel);
      const status = matches.length ? '✅' : '❌';
      console.log(`${status} ${sel} → ${matches.length} match(es)`);
    }
    console.groupEnd();
  }
}

// For Gemini:
auditSelectors({
  input: [
    'rich-textarea .ql-editor[contenteditable="true"]',
    '.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"][aria-label*="prompt"]',
    'div[contenteditable="true"][role="textbox"]',
  ],
  sendButton: [
    'button[aria-label="Send message"]',
    'button.send-button',
    'button[data-mat-icon-name="send"]',
  ],
  responses: [
    'model-response',
    '.model-response-text',
    '.response-container',
  ],
});

// For Grok:
auditSelectors({
  input: [
    'textarea[placeholder*="Ask"]',
    'textarea[aria-label*="Message"]',
    'textarea[data-testid="chat-input"]',
  ],
  sendButton: [
    'button[aria-label="Send"]',
    'button[data-testid="send-button"]',
    'form button[type="submit"]',
  ],
  responses: [
    '[data-testid*="assistant"]',
    '[data-message-role="assistant"]',
    '.assistant-message',
  ],
});
```

---

## Summary: Most Reliable Selectors

### Gemini
| Element | Best Selector | Fallback |
|---------|--------------|----------|
| Input | `rich-textarea .ql-editor[contenteditable="true"]` | `.ql-editor[contenteditable="true"]` |
| Send | `button[aria-label="Send message"]` | `button.send-button` |
| Response | `model-response` | `.model-response-text` |
| Response text | `.markdown.markdown-main-panel` | `.markdown` |
| Streaming | `.loading-indicator` | `[class*="loading"]` |

### Grok
| Element | Best Selector | Fallback |
|---------|--------------|----------|
| Input | `textarea[placeholder*="Ask"]` | `textarea` |
| Send | `button[aria-label="Send"]` | `button[data-testid="send-button"]` |
| Response | `[data-testid*="assistant-message"]` | `[data-message-role="assistant"]` |
| Response text | `.markdown` | `.prose` |
| Streaming | `[class*="loading"]` | `[class*="typing"]` |

---

## Key Differences: grok.com vs x.com/i/grok

| Aspect | grok.com | x.com/i/grok |
|--------|----------|-------------|
| Framework | Next.js standalone | Embedded in Twitter/X React app |
| Input | `textarea` | `textarea` or `div[contenteditable]` |
| data-testid | Consistent | May use X's testid patterns |
| Response container | `[data-testid*="assistant"]` | May be wrapped in X UI chrome |
| Auth | Separate grok.com auth | Uses X session |
| URL pattern | `grok.com/*` | `x.com/i/grok*` |

> **Recommendation:** Test selectors on each domain separately. The x.com/i/grok
> embed may wrap the chat in additional X UI containers that shift the DOM hierarchy.
