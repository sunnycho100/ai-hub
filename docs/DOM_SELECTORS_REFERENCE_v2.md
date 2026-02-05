# Gemini & Grok DOM Selectors Reference v2 (Jan 2026)

> **Cross-referenced from 8 independent production userscripts** (total ~30,000+ active installs).
> Selectors are organized by **number of independent sources confirming them**.
> Always use a **multi-selector fallback strategy**.

---

## SOURCES

| # | Script | Installs | Updated | URL |
|---|--------|----------|---------|-----|
| 1 | Gemini-UX-Customizer (p65536) | 142 | Jan 2026 | [greasyfork.org/scripts/543704](https://greasyfork.org/en/scripts/543704) |
| 2 | Gemini Helper (urzeye) | 1,192 | Jan 2026 | [greasyfork.org/scripts/558318](https://greasyfork.org/en/scripts/558318) |
| 3 | Lyra Exporter Fetch v8.1 (Yalums) | 5,000+ | Jan 2026 | [greasyfork.org/scripts/539579](https://greasyfork.org/en/scripts/539579) |
| 4 | Export ChatGPT/Gemini/Grok as MD (Elior) | 21,581 | Jul 2025 | [greasyfork.org/scripts/456055](https://greasyfork.org/en/scripts/456055) |
| 5 | Gemini DumpChat (Yumeka) | — | Dec 2025 | [greasyfork.org/scripts/534816](https://greasyfork.org/en/scripts/534816) |
| 6 | CodeDown (OHAS) | 1,500+ | Jan 2026 | [greasyfork.org/scripts/550714](https://greasyfork.org/en/scripts/550714) |
| 7 | Grok Auto-Retry v41 (Aggressive_Tip4777) | 540 | Jan 2026 | [greasyfork.org/scripts/557842](https://greasyfork.org/en/scripts/557842) |
| 8 | Grok Auto-Regenerate v4.4 (bigelelya) | — | Jan 2026 | [greasyfork.org/scripts/560375](https://greasyfork.org/en/scripts/560375) |

---

## GEMINI (gemini.google.com)

### Architecture
- **Framework:** Angular with custom Web Components
- **Editor:** Quill-based rich text editor (`.ql-editor`) in consumer Gemini
- **Editor (Business):** ProseMirror (`.ProseMirror`) in business.gemini.google.com
- **Custom elements:** `<model-response>`, `<user-query>`, `<message-content>`, `<rich-textarea>`, `<chat-window>`, `<code-block>`, `<input-area-v2>`, `<bard-sidenav>`, `<immersive-panel>`, `<context-sidebar>`

---

### App Structure

```javascript
// Sources: [1]
const APP_STRUCTURE = {
  MAIN_APP_CONTAINER:       'bard-sidenav-content',
  CHAT_WINDOW:              'chat-window',
  CHAT_WINDOW_CONTENT:      'chat-window-content',
  CHAT_HISTORY_MAIN:        'div#chat-history',
  CHAT_HISTORY_SCROLL:      '[data-test-id="chat-history-container"]',  // [1]
  SCROLL_CONTAINER:         'infinite-scroller.chat-history',           // [2]
  SCROLL_CONTAINER_SHARE:   'div.content-container',                    // [2] (share pages)
  INPUT_CONTAINER:          'input-container',
  SIDEBAR:                  'bard-sidenav',
  CANVAS_CONTAINER:         'immersive-panel',                          // [1]
  CANVAS_CLOSE:             'button[data-test-id="close-button"]',      // [1]
  FILE_PANEL:               'context-sidebar',                          // [1]
  CONTENT_MAX_WIDTH:        '.conversation-container',                  // [1][2]
};
```

---

### Input Element

```javascript
// Sources: [1][2][3][5]
const INPUT_SELECTORS = [
  // PRIMARY: Quill editor (confirmed by 3 sources)
  'rich-textarea .ql-editor[contenteditable="true"]',     // [1][2][3]
  'rich-textarea .ql-editor',                             // [1]
  '.ql-editor[contenteditable="true"]',                   // [2]

  // SECONDARY: contenteditable with attributes
  'div[contenteditable="true"].ql-editor',                // [2]
  'div[contenteditable="true"]',                          // [2]

  // TERTIARY: role/aria based
  '[role="textbox"]',                                     // [2]
  '[aria-label*="Enter a prompt"]',                       // [2]
  'div[contenteditable="true"][aria-label*="prompt"]',

  // FALLBACK
  '.text-input-field textarea',
  'textarea[aria-label*="prompt"]',
];

// Input area container and surrounding elements
const INPUT_AREA = {
  CONTAINER:      'input-area-v2',                                // [1]
  RESIZE_TARGET:  'input-area-v2',                                // [1]
  BG_TARGET:      'input-area-v2',                                // [1]
  BUTTON_ANCHOR:  'input-area-v2 .trailing-actions-wrapper',      // [1] injection point for custom buttons
  MAX_WIDTH:      '.input-area-container',                        // [2]
};
```

#### Business Gemini (business.gemini.google.com) — DIFFERENT EDITOR!
```javascript
// Sources: [2]
const BUSINESS_INPUT_SELECTORS = [
  'div.ProseMirror',                                      // [2] NOTE: ProseMirror, NOT Quill!
  '.ProseMirror',                                         // [2]
  '[contenteditable="true"]:not([type="search"])',        // [2]
  '[role="textbox"]',                                     // [2]
];
```

---

### Send Button

```javascript
// Sources: [2]
const SEND_SELECTORS = [
  'button[aria-label*="Send"]',                           // [2]
  'button[aria-label*="발송"]',                            // [2] Korean
  '.send-button',                                         // [2]
  '[data-testid*="send"]',                                // [2]
  'button.send-button',
  'button[data-mat-icon-name="send"]',
];
```

---

### User Query Elements

```javascript
// Sources: [1][2][3][4][5]
const USER_QUERY = {
  // Container element (5 sources confirm)
  ELEMENT:        'user-query',                           // [1][2][3][4][5]
  CONTENT:        'user-query-content',                   // [1][4]
  TEXT:           '.query-text',                           // [1][2][3][5]
  TEXT_ALT:       '.query-text-line',                      // [3]
  BUBBLE_BG:      '.user-query-bubble-with-background',   // [1]
  // For text extraction
  TEXT_DATA:       '[data-user-text]',                     // [3]
};
```

---

### Assistant Response Elements

```javascript
// Sources: [1][2][3][4][5][6]
const ASSISTANT_RESPONSE = {
  // Primary container (6 sources confirm)
  ELEMENT:        'model-response',                       // [1][2][3][4][5][6]
  
  // Text content selectors
  TEXT:           '.markdown',                             // [1][5]
  MAIN_PANEL:     '.markdown-main-panel',                 // [3][5]
  TEXT_CONTENT:   'message-content.model-response-text',  // [1]
  RESPONSE_TEXT:  '.model-response-text',                 // [3][5]
  RESPONSE_EL:    'response-element',                     // [3]
  
  // Container
  CONTAINER:      '.model-response-container',            // [2]
  BUBBLE_BG:      '.response-container-with-gpi',         // [1]
  RESPONSE_CONT:  '.response-container',                  // [2]
  
  // Message content (for text extraction — excludes model-thoughts)
  MESSAGE_CONTENT: 'message-content',                     // [1][3]
  
  // Message identification
  MESSAGE_ID:     '[data-message-id]',                    // [1][2]
  
  // For export: strict content extraction from message-content
  // exclude: model-thoughts, .model-thoughts, .thoughts-header, button.retry-without-tool-button
};
```

---

### Conversation Structure

```javascript
// Sources: [1][2][3][5]
const CONVERSATION = {
  // Turn containers
  TURN:           'user-query, model-response',           // [1]
  TURN_CLASS:     '.conversation-turn',                   // [2][3][5]
  SINGLE_TURN:    '.single-turn',                         // [3]
  TURN_CONTAINER: '.conversation-container',              // [3][5]
  
  // Message roles
  USER:           'user-query',                           // [1][2][3]
  ASSISTANT:      'model-response',                       // [1][2][3]
  
  // Message root
  MESSAGE_ROOT:   'user-query, model-response',           // [1]
  
  // For conversation list (sidebar)
  CONV_ITEM:      '.conversation',                        // [1][2]
  CONV_WITH_LOG:  '.conversation[jslog]',                 // [2] has jslog with ID
  CONV_ID_REGEX:  /\["c_([^"]+)"/,                        // [2] extract from jslog attr
  CONV_TITLE:     '.conversation-title',                  // [1][2]
  CONV_SELECTED:  '[data-test-id="conversation"].selected', // [1]
  CONV_SELECTED2: '.conversation.selected',               // [2]
  
  // Model name
  MODEL_NAME:     '.input-area-switch-label > span:first-child', // [2]
};
```

---

### Streaming Detection (Is AI still generating?)

```javascript
// Sources: [1][2]
const STREAMING_DETECTION = {
  // BEST: Check if turn-complete actions have appeared
  TURN_COMPLETE:  'model-response message-actions',       // [1] Present = done streaming
  
  // Stop button visible = still streaming
  STOP_BUTTON:    'button[aria-label*="Stop"]',           // [2]
  
  // Spinners = still loading
  SPINNER: [
    'mat-spinner',                                        // [2]
    '.loading-spinner',                                   // [2]
    '[role="progressbar"]',                               // [2]
  ],
};

// Recommended detection function
function isGeminiStreaming() {
  // Method 1: Stop button present = streaming
  if (document.querySelector('button[aria-label*="Stop"]')) return true;
  
  // Method 2: Spinners present = loading
  if (document.querySelector('mat-spinner, .loading-spinner, [role="progressbar"]')) return true;
  
  // Method 3: Last model-response has no message-actions = still generating
  const responses = document.querySelectorAll('model-response');
  if (responses.length > 0) {
    const last = responses[responses.length - 1];
    if (!last.querySelector('message-actions')) return true;
  }
  
  return false;
}
```

---

### Code Blocks

```javascript
// Sources: [3][4][6]
const CODE_BLOCKS = {
  // Primary element
  ELEMENT:        'code-block',                           // [3][4][6]
  CODE_CONTENT:   'code[data-test-id="code-content"]',    // [6]
  
  // For language detection
  LANG_LABEL:     'code-block .buttons span',             // [6] first span in .buttons parent
  
  // Additional code selectors
  ALT: [
    'pre code',                                           // [3]
    '.code-block',                                        // [3]
    '[data-code-block]',                                  // [3]
    '.artifact-code',                                     // [3]
    'code-execution-result code',                         // [3]
  ],
};
```

---

### New Chat / Navigation

```javascript
// Sources: [2]
const NEW_CHAT_BUTTONS = [
  '.new-chat-button',                                     // [2]
  '.chat-history-new-chat-button',                        // [2]
  '[aria-label="New chat"]',                              // [2]
  '[data-testid="new-chat-button"]',                      // [2]
  '[data-test-id="new-chat-button"]',                     // [2]
  '[data-test-id="expanded-button"]',                     // [2]
  '[data-test-id="temp-chat-button"]',                    // [2]
];
```

---

### Images

```javascript
// Sources: [3]
const IMAGES = {
  USER_IMAGES:    'user-query img, user-query-file-preview img, .file-preview-container img', // [3]
  MODEL_IMAGES:   'message-content img',                  // [3] only from message-content, excludes model-thoughts
};
```

---

### Gem (Custom Bots)

```javascript
// Sources: [1]
const GEM = {
  SELECTED_ITEM: 'bot-list-item.bot-list-item--selected', // [1]
};
```

---

### Business Gemini Shadow DOM

```javascript
// Sources: [2]
// business.gemini.google.com uses HEAVY Shadow DOM:
const BUSINESS_GEMINI = {
  CHAT_CONTENT: [
    '.model-response-container',                          // [2]
    '.message-content',                                   // [2]
    '[data-message-id]',                                  // [2]
    'ucs-conversation-message',                           // [2]
    '.conversation-message',                              // [2]
  ],
  USER_QUERY:     '.question-block',                      // [2]
  ASSISTANT_RESP: 'ucs-summary',                          // [2]
  TURN:           '.turn',                                // [2]
  SHADOW_DOM_MD:  'ucs-fast-markdown .markdown-document', // [2] inside shadowRoot
  USES_SHADOW_DOM: true,                                  // [2]
  SCROLL:         '.chat-mode-scroller',                  // [2]
  MODEL_SELECTOR: [
    '#model-selector-menu-anchor',                        // [2]
    '.action-model-selector',                             // [2]
    '.model-selector',                                    // [2]
    '[data-test-id="model-selector"]',                    // [2]
    '.current-model',                                     // [2]
  ],
  // Streaming in business: must recursively search Shadow DOM
  STREAMING_INDICATORS: [
    'button[aria-label*="Stop"]',
    'mat-spinner',
    'md-spinner',
    '.loading-spinner',
    '[role="progressbar"]',
    '.generating-indicator',
    '.response-loading',
  ],
};
```

---

## GROK (grok.com)

### Architecture
- **Framework:** Next.js (React)
- **Input:** Standard `<textarea>` (React controlled)
- **Styling:** Tailwind CSS
- **Attributes:** `data-testid`, `aria-label` based
- **Code rendering:** Shiki syntax highlighter (`pre.shiki > code > .line`)
- **CRITICAL:** React textarea requires `nativeValueSet` pattern for programmatic input

---

### Input Element

```javascript
// Sources: [7][8]
const INPUT_SELECTORS = [
  // PRIMARY: Chat input
  'textarea[placeholder*="Ask"]',
  'textarea[aria-label*="Ask"]',
  
  // Mode-specific inputs
  'textarea[aria-label="Make a video"]',                  // [7][8] Video mode
  'textarea[aria-label="Type to edit image..."]',         // [7] Image editor
  'textarea[aria-label="Image prompt"]',                  // [7] Image prompt
  'p[data-placeholder="Type to imagine"]',                // [7] Imagine mode
  
  // data-testid based
  'textarea[data-testid="chat-input"]',

  // FALLBACK
  'textarea',
  '[contenteditable="true"]',
];

// CRITICAL: React textarea value setting pattern
// Direct .value assignment does NOT trigger React state updates!
function setGrokTextareaValue(textarea, text) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  ).set;
  nativeInputValueSetter.call(textarea, text);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}
```

---

### Send Button

```javascript
// Sources: [7]
const SEND_SELECTORS = [
  'button[aria-label="Send"]',
  'button[aria-label="Send message"]',
  'button[data-testid="send-button"]',
  'button[type="submit"]',
  
  // Mode-specific
  'button[aria-label="Make video"]',                      // [7][8] video mode
  'button[aria-label="Generate"]',                        // [7] image generation
  'button[aria-label="Submit"]',                          // [7] image submit
];
```

---

### Assistant Response Elements

```javascript
// Sources: [3][4][6]
const ASSISTANT_RESPONSE = {
  // data-testid based
  MESSAGE_TEXT:   '[data-testid="message-text-assistant"]',
  MESSAGE_ALT:    '[data-testid*="assistant-message"]',
  
  // Generic message containers
  MESSAGE_BUBBLE: 'div.message-bubble',                   // [4] all messages (user+assistant)
  MESSAGE_ROLE:   '[data-message-role="assistant"]',
  
  // Response ID containers (for image association)
  RESPONSE_BY_ID: '[id^="response-"]',                    // [3] e.g. id="response-{uuid}"
  
  // Text content
  TEXT: [
    '.markdown',
    '.prose',
    '.message-text',
    '[class*="message-content"]',
    'div[dir="auto"]',
  ],
};
```

---

### Code Blocks

```javascript
// Sources: [4][6]
const CODE_BLOCKS = {
  // Primary container
  CONTAINER:     '.relative.not-prose',                   // [6] (div.not-prose in Grok [4])
  
  // Code element
  CODE:          'pre.shiki > code',                      // [6]
  LINES:         'pre.shiki > code .line',                // [6] individual lines
  
  // Language label
  LANG_LABEL:    '.flex.flex-row.px-4 span',              // [6]
  
  // Collapse button (for injection point)
  COLLAPSE_BTN:  'button svg.lucide-chevrons-down-up',    // [6] find via SVG class
};
```

---

### Streaming / Progress Detection

```javascript
// Sources: [7][8]
const STREAMING_DETECTION = {
  // Progress percentage (video generation)
  PROGRESS_ELEMENT:  'div.font-semibold',                 // [7][8]
  PROGRESS_REGEX:    /^(\d{1,3})%$/,                      // [7][8] match text content
  
  // Exit extend mode
  EXIT_EXTEND:       'button[aria-label="Exit extend mode"]', // [7]
};

function getGrokProgress() {
  const els = document.querySelectorAll('div.font-semibold');
  for (const el of els) {
    const match = el.textContent.trim().match(/^(\d{1,3})%$/);
    if (match) return parseInt(match[1]);
  }
  return null; // no progress indicator
}
```

---

### Moderation / Error Detection

```javascript
// Sources: [7][8]
const MODERATION = {
  // Toast/notification
  NOTIFICATION:  'section[aria-label*="Notification"]',   // [7]
  ALERT:         '[role="alert"]',                        // [7]
  TOAST:         '.toast',                                // [7]
  
  // Content moderation popup (specific text match)
  POPUP:         'body > section > ol > li > div > span', // [8]
  POPUP_TEXT:    'Content Moderated. Try a different idea.', // [8]
};

function isGrokModerated() {
  // Check notification area
  const notification = document.querySelector('section[aria-label*="Notification"]');
  if (notification) return true;
  
  // Check specific moderation message
  const spans = document.querySelectorAll('body > section > ol > li > div > span');
  for (const span of spans) {
    if (span.textContent.includes('Content Moderated')) return true;
  }
  return false;
}
```

---

### User Images

```javascript
// Sources: [3]
const USER_IMAGES = {
  UPLOADED: 'figure img[src*="assets.grok.com"][src*="preview-image"]', // [3]
};
```

---

### Grok API Endpoints

```javascript
// Sources: [3]
const API = {
  ALL_CONVERSATIONS:  '/rest/app-chat/conversations',     // [3]
  SINGLE_CONVERSATION: (id) => `/rest/app-chat/conversations/${id}`, // [3]
  // Conversation ID from URL: last path segment (length >= 20)
};
```

---

## COMPARISON: YOUR CURRENT SELECTORS vs. RESEARCH

### Gemini — What to ADD

| Selector | Purpose | Priority | Sources |
|----------|---------|----------|---------|
| `user-query-content` | User message content wrapper | HIGH | [1][4] |
| `.query-text` | User text content extraction | HIGH | [1][2][3][5] |
| `message-content.model-response-text` | Specific assistant answer content | HIGH | [1] |
| `model-response message-actions` | Streaming detection (present = done) | HIGH | [1] |
| `button[aria-label*="Stop"]` | Streaming detection (present = streaming) | HIGH | [2] |
| `infinite-scroller.chat-history` | Scroll container | MEDIUM | [2] |
| `[data-message-id]` | Message identification | MEDIUM | [1][2] |
| `code-block` | Code block custom element | MEDIUM | [3][4][6] |
| `code[data-test-id="code-content"]` | Code content inside code-block | MEDIUM | [6] |
| `input-area-v2` | Input area container | MEDIUM | [1] |
| `.trailing-actions-wrapper` | Button injection point | LOW | [1] |
| `bard-sidenav-content` | Main app container | LOW | [1] |
| `.conversation-title` | Sidebar conversation title | LOW | [1][2] |
| `[data-test-id="conversation"].selected` | Active conversation in sidebar | LOW | [1] |

### Gemini — What's CONFIRMED (already in your code)

| Selector | Sources confirming |
|----------|-------------------|
| `rich-textarea .ql-editor[contenteditable="true"]` | [1][2][3] |
| `model-response` | [1][2][3][4][5][6] |
| `.model-response-text` | [1][3][5] |
| `.markdown.markdown-main-panel` | [3][5] |
| `.markdown` | [1][5] |
| `button[aria-label="Send message"]` | [2] |
| `button.send-button` | [2] |

### Grok — What to ADD

| Selector | Purpose | Priority | Sources |
|----------|---------|----------|---------|
| `div.message-bubble` | All messages (user+assistant) | HIGH | [4] |
| `.relative.not-prose` | Code block container | HIGH | [6] |
| `pre.shiki > code` | Code element | HIGH | [6] |
| `pre.shiki > code .line` | Code lines (for text extraction) | HIGH | [6] |
| `div.font-semibold` + `/^(\d{1,3})%$/` | Progress detection | MEDIUM | [7][8] |
| `section[aria-label*="Notification"]` | Error/moderation toast | MEDIUM | [7] |
| `[role="alert"]` | Alert messages | MEDIUM | [7] |
| `[id^="response-"]` | Response containers by ID | MEDIUM | [3] |
| `textarea[aria-label="Make a video"]` | Video mode input | LOW | [7][8] |
| `button[aria-label="Make video"]` | Video generate button | LOW | [7][8] |
| `button[aria-label="Generate"]` | Image generate button | LOW | [7] |
| `nativeValueSet` pattern | React textarea manipulation | CRITICAL | [7][8] |

### Grok — What's CONFIRMED (already in your code)

| Selector | Sources confirming |
|----------|-------------------|
| `textarea[placeholder*="Ask"]` | widely used |
| `button[aria-label="Send"]` | [7] |
| `.markdown` | common |
| `.prose` | common |
| `div[dir="auto"]` | common |

---

## CRITICAL IMPLEMENTATION NOTES

### 1. React Textarea Value Setting (Grok)

Both Grok automation scripts [7][8] use the same pattern. Direct `.value = "text"` does NOT work with React:

```javascript
// WRONG - React won't detect this
textarea.value = "my prompt";

// CORRECT - Use native property descriptor
const nativeSetter = Object.getOwnPropertyDescriptor(
  window.HTMLTextAreaElement.prototype, 'value'
).set;
nativeSetter.call(textarea, "my prompt");
textarea.dispatchEvent(new Event('input', { bubbles: true }));
```

### 2. Gemini Quill Editor Text Setting

For Quill editors, must use the Quill API or simulate keypresses. NOT `.textContent =`:

```javascript
// For Quill, focus + execCommand or clipboard paste
editor.focus();
document.execCommand('insertText', false, text);
// OR use clipboard API
```

### 3. Shadow DOM in Business Gemini

Business Gemini uses Shadow DOM extensively. Regular `querySelector` won't find elements inside Shadow DOM. Must recursively search:

```javascript
function queryShadow(root, selector) {
  const result = root.querySelector(selector);
  if (result) return result;
  
  const shadowHosts = root.querySelectorAll('*');
  for (const host of shadowHosts) {
    if (host.shadowRoot) {
      const found = queryShadow(host.shadowRoot, selector);
      if (found) return found;
    }
  }
  return null;
}
```

### 4. Streaming Detection Strategy (Gemini)

Best approach combines multiple signals:
- `button[aria-label*="Stop"]` visible → still streaming
- `mat-spinner` / `[role="progressbar"]` visible → loading
- Last `model-response` has no `message-actions` child → still generating
- `model-response message-actions` appearing → generation complete

### 5. Grok Conversation Data via API

Grok exposes REST endpoints for full conversation history including all branches:
- `GET /rest/app-chat/conversations` — list all
- `GET /rest/app-chat/conversations/{id}` — single conversation with full message history
- Messages include: `sender` ("human"|"assistant"), `message`, `webSearchResults`, `cardAttachmentsJson`, `imageAttachments`, `fileAttachments`

---

## DOM TREE SUMMARIES

### Gemini DOM Tree
```
bard-sidenav-content
  └── chat-window
       └── chat-window-content
            └── div#chat-history
                 └── infinite-scroller.chat-history
                      ├── user-query [data-message-id="..."]
                      │    └── user-query-content
                      │         └── .query-text
                      │              └── (text content)
                      └── model-response [data-message-id="..."]
                           ├── message-content.model-response-text
                           │    └── .markdown-main-panel
                           │         └── .markdown
                           │              └── (rendered markdown)
                           ├── code-block
                           │    └── code[data-test-id="code-content"]
                           ├── model-thoughts (thinking trace, exclude from export)
                           └── message-actions (present when done streaming)

input-area-v2
  └── rich-textarea
       └── .ql-editor[contenteditable="true"]
  └── .trailing-actions-wrapper
       └── button.send-button / button[aria-label*="Send"]
```

### Grok DOM Tree
```
main
  └── (conversation container)
       ├── div.message-bubble (each message)
       │    ├── [data-testid="message-text-assistant"] (assistant text)
       │    │    └── .markdown / .prose
       │    │         └── (rendered markdown)
       │    └── .relative.not-prose (code blocks)
       │         ├── .flex.flex-row.px-4 > span (language label)
       │         └── pre.shiki > code
       │              └── .line (individual source lines)
       └── [id^="response-{uuid}"] (response containers for image association)

(input area)
  └── textarea[aria-label="..."] (React controlled)
  └── button[aria-label="Send"] / button[type="submit"]
```
