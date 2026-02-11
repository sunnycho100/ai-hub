# Claude.ai DOM Selectors Reference (Jan 2026)

> **Cross-referenced from 6 independent production extensions & userscripts**.
> Selectors are organized by function with `[source#]` annotations.
> Always use a **multi-selector fallback strategy** — Claude frequently updates its Tailwind classes.

---

## SOURCES

| # | Script/Extension | Type | Installs | URL |
|---|-----------------|------|----------|-----|
| 1 | claude-export (ryanschiang) | Chrome Extension | — | [github.com/ryanschiang/claude-export](https://github.com/ryanschiang/claude-export) |
| 2 | Enhanced Claude.Ai Export v2.1 (iikoshteruu) | Userscript | — | [greasyfork.org/scripts/537242](https://greasyfork.org/en/scripts/537242) |
| 3 | Claude Chat Downloader v2.0 (Papa Casper) | Userscript | — | [greasyfork.org/scripts/513935](https://greasyfork.org/en/scripts/513935) |
| 4 | Claude Chat Exporter v2.1.3 (lugia19) | Userscript | — | [greasyfork.org/scripts/515448](https://greasyfork.org/en/scripts/515448) |
| 5 | Claude/Grok/Arena Export v10.7 (Piknockyou) | Userscript | 1,000+ | [greasyfork.org/scripts/559376](https://greasyfork.org/en/scripts/559376) |
| 6 | Claude Powerest Manager & Enhancer v1.2.5 (f14XuanLv) | Userscript | 70+ | [greasyfork.org/scripts/539886](https://greasyfork.org/en/scripts/539886) |

---

## ARCHITECTURE

- **Framework:** React SPA, server-rendered with Next.js
- **Styling:** Tailwind CSS utility classes + CSS custom properties
- **Custom Font Classes:** `font-claude-message`, `font-claude-response`, `font-user-message`, `font-styrene`, `font-styrene-display`, `font-base`, `font-small`
- **Input:** ContentEditable div or `<textarea>` (varies by context)
- **UI Components:** Radix UI (tooltips, popovers, dropdowns)
- **Key Attributes:** `data-testid`, `data-test-render-count`
- **Data Access:** Internal REST API at `/api/organizations/{orgId}/chat_conversations/{chatId}`

> **Important:** Most Claude export scripts bypass the DOM entirely and use Claude's internal API for conversation data.
> DOM selectors are primarily useful for: detecting messages on screen, injecting UI, detecting send events, and scrolling.

---

## CONVERSATION CONTAINER

```javascript
// Sources: [1][2]
const CONVERSATION_CONTAINER_SELECTORS = [
  // PRIMARY: data-testid attribute
  '[data-testid="conversation"]',                         // [2]

  // SECONDARY: semantic element
  'main',                                                  // [2]

  // FALLBACK: class-based
  '.conversation',                                         // [2]

  // Chat container with flex layout
  'div.flex-1.flex.flex-col.gap-3.px-4',                  // [1]
];
```

---

## MESSAGE TURN CONTAINERS

Each user+assistant exchange lives inside a "turn" element.

```javascript
// Sources: [6]
const TURN_SELECTORS = [
  // PRIMARY: data-test-render-count is the most precise turn identifier
  'div[data-test-render-count]',                           // [6] — each turn has this attribute
];

// Validate a turn element contains actual message content:
function isValidTurn(el) {
  const hasUserMessage   = !!el.querySelector('[data-testid="user-message"]');   // [6]
  const hasClaudeResp    = !!el.querySelector('.font-claude-response');          // [6]
  const hasFileThumbnail = !!el.querySelector('[data-testid="file-thumbnail"]'); // [6]
  return hasUserMessage || hasClaudeResp || hasFileThumbnail;
}
```

---

## USER MESSAGE ELEMENTS

```javascript
// Sources: [1][2][6]
const USER_MESSAGE_SELECTORS = [
  // PRIMARY: data-testid (most reliable)
  '[data-testid="user-message"]',                          // [6]

  // SECONDARY: custom font class
  'div.font-user-message',                                 // [1]

  // FALLBACK from multi-strategy approach
  'div[class*="message"]',                                 // [2]
  'div[data-testid*="message"]',                           // [2]
];

// User detection logic:
function isUserTurn(turnElement) {
  // Has explicit user message content
  if (turnElement.querySelector('[data-testid="user-message"]')) return true;            // [6]
  // Has file attachment without Claude response (file-only user message)
  if (turnElement.querySelector('[data-testid="file-thumbnail"]')
   && !turnElement.querySelector('.font-claude-response')) return true;                  // [6]
  // Class-based detection
  if (turnElement.classList?.contains('font-user-message')) return true;                 // [1]
  return false;
}
```

---

## ASSISTANT / CLAUDE RESPONSE ELEMENTS

```javascript
// Sources: [1][2][6]
const ASSISTANT_RESPONSE_SELECTORS = [
  // PRIMARY: custom font class (confirmed by most recent source [6])
  '.font-claude-response',                                 // [6]

  // SECONDARY: older variant (may still exist in some contexts)
  'div.font-claude-message',                               // [1]

  // FALLBACK: multi-strategy selectors from [2]
  'div[class*="col-start-2"]',                             // [2]
  '[role="presentation"] > div',                           // [2]
  'div[class*="prose"]',                                   // [2]
  'div[class*="markdown"]',                                // [2]
  'div[class*="content"]',                                 // [2]
];

// All messages (user + assistant) combined selector:
const ALL_MESSAGES = 'div.font-claude-message, div.font-user-message';   // [1]

// Assistant detection logic:
function isAssistantTurn(turnElement) {
  return !!turnElement.querySelector('.font-claude-response');            // [6]
}
```

> **NOTE:** Source [1] uses `font-claude-message` while source [6] (more recent, v1.2.5) uses `font-claude-response`.
> Use both with fallback: try `.font-claude-response` first, then `.font-claude-message`.

---

## TEXT CONTENT EXTRACTION

```javascript
// Sources: [1][6]

// Strategy 1: Direct DOM traversal from message element [1]
function extractContentFromMessage(messageElement) {
  const contentNodes = messageElement.firstChild?.firstChild?.childNodes;  // [1]
  if (!contentNodes) return '';

  let result = [];
  for (const node of contentNodes) {
    // Check if node contains markdown
    if (node.className?.includes('markdown')) {                             // [1]
      // Extract from markdown container
      result.push(node.textContent);
    }

    // Check for code blocks
    const codeEle = node.querySelector?.('code');                           // [1]
    if (codeEle) {
      const language = codeEle.classList?.[0]?.split('-')[1] || '';        // [1]
      result.push(`\`\`\`${language}\n${codeEle.textContent}\n\`\`\``);
    }
  }
  return result.join('\n');
}

// Strategy 2: Simple text content extraction [6]
function extractTextSimple(turnElement) {
  const contentElement =
    turnElement.querySelector('[data-testid="user-message"]') ||           // [6]
    turnElement.querySelector('.font-claude-response') ||                  // [6]
    turnElement;
  return (contentElement.innerText || contentElement.textContent || '')
    .replace(/\s+/g, ' ').trim();                                          // [6]
}

// Content anchor selectors (for scrolling to content within a turn) [6]
const CONTENT_ANCHOR_SELECTORS = [
  '[data-testid="user-message"]',                          // [6]
  '.font-claude-response',                                 // [6]
  'p',                                                     // [6]
  'li',                                                    // [6]
  'pre',                                                   // [6]
];
```

---

## INPUT ELEMENT

```javascript
// Sources: [6]
// Claude's input can be a <textarea> or a contenteditable div
const INPUT_SELECTORS = [
  // Detect by tag
  'textarea',                                              // [6] — tagName === 'TEXTAREA'

  // Detect by attribute
  '[contenteditable="true"]',                              // [6] — isContentEditable check
  'div[contenteditable="true"]',

  // Potential ProseMirror-based editor (seen in some React apps)
  'div.ProseMirror[contenteditable="true"]',

  // Role-based
  '[role="textbox"]',

  // Fieldset context
  'fieldset textarea',
  'fieldset [contenteditable="true"]',
];
```

> **Note:** No source provided a specific `data-testid` or `id` for Claude's input element.
> Detection is via generic `textarea` / `contenteditable` checks.

---

## SEND BUTTON

```javascript
// Sources: [6]
const SEND_SELECTORS = [
  // PRIMARY: submit button type
  'button[type="submit"]',                                 // [6]

  // SECONDARY: aria-label based
  '[aria-label*="Send"]',                                  // [6]

  // COMBINED (as used in production script)
  'button[type="submit"], [aria-label*="Send"]',          // [6]
];

// Keyboard shortcut detection for send:
// Ctrl+Enter or Cmd+Enter in textarea/contenteditable triggers send  // [6]
function detectSendKeyboard(e) {
  const target = e.target;
  const isInputArea = target.tagName === 'TEXTAREA' || target.isContentEditable;
  const isSendKey = e.key === 'Enter' && (e.metaKey || e.ctrlKey);
  return isInputArea && isSendKey;
}
```

---

## STREAMING / LOADING INDICATORS

> **⚠️ No source provides explicit streaming CSS selectors.** All 6 sources bypass streaming detection via:
> - API approach (fetch conversation data after completion)
> - MutationObserver polling (watch DOM for content changes)
>
> Below are **inferred approaches** based on how production scripts detect streaming state:

```javascript
// Strategy 1: MutationObserver on chat container [3][6]
// Watch for new child nodes appearing = new message content being streamed
const observer = new MutationObserver((mutations) => {
  // New content appearing = Claude is still streaming
  // No mutations for a sustained period = streaming likely complete
});
observer.observe(chatContainer, { childList: true, subtree: true });

// Strategy 2: Button state change [6]
// During streaming, the send button likely changes to a "Stop" button
const STOP_BUTTON_SELECTORS = [
  'button[aria-label*="Stop"]',                           // inferred from Send pattern
  'button[aria-label*="stop"]',
  'button[type="button"][aria-label*="Stop"]',
];

// Strategy 3: Polling via burst refresh after send [6]
// Source [6] uses a "burstRefresh" pattern: rapid DOM polling after detecting send
function burstRefresh(duration = 8000, interval = 300) {
  const endTime = Date.now() + duration;
  const tick = () => {
    refreshContent();
    if (Date.now() < endTime) setTimeout(tick, interval);
  };
  tick();
}

// Strategy 4: Fetch interception [5][6]
// Intercept the /completion endpoint to detect when streaming starts/ends
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  let url = args[0] instanceof Request ? args[0].url : String(args[0]);
  if (url.includes('/completion')) {
    // Streaming has started
    const response = await originalFetch.apply(this, args);
    // When response completes, streaming is done
    return response;
  }
  return originalFetch.apply(this, args);
};
```

---

## CHAT TITLE

```javascript
// Sources: [1]
const CHAT_TITLE_SELECTORS = [
  "button[data-testid='chat-menu-trigger']",              // [1]
];
```

---

## TOOLBAR / HEADER AREA

```javascript
// Sources: [6]
const TOOLBAR = {
  // Main toolbar container (for injecting custom buttons)
  CONTAINER:      'div.relative.flex-1.flex.items-center.shrink.min-w-0',  // [6]
  // Empty area within toolbar (insertion point)
  EMPTY_AREA:     'div.flex.flex-row.items-center.min-w-0',                // [6]
  // Button container area (top-right)
  BUTTON_GROUP:   '.right-3.flex.gap-2',                                    // [4]
};

// Chat controls header
const CHAT_CONTROLS = {
  HEADER:         '.font-styrene-display.flex-1.text-lg',                  // [3]
};
```

---

## BRANCH NAVIGATION

Claude supports conversation branching. Each turn can have multiple sibling versions.

```javascript
// Sources: [6]

// Sibling counter element: shows "a / b" (current position / total siblings)
const SIBLING_COUNTER = 'span.self-center.shrink-0.select-none.font-small'; // [6]

// Parse sibling info from counter element
function parseSiblingInfo(turnElement) {
  const spans = turnElement.querySelectorAll(SIBLING_COUNTER);
  for (const span of spans) {
    const match = span.textContent?.trim().match(/(\d+)\s*\/\s*(\d+)/);
    if (match) {
      return {
        currentPosition: parseInt(match[1]),  // 1-based index
        totalSiblings: parseInt(match[2]),
      };
    }
  }
  return null;
}

// Left/Right arrow buttons (navigate between sibling branches)
// These are identified by SVG path data within buttons:
const BRANCH_NAV = {
  LEFT_ARROW:  'button[type="button"] svg path[d*="M6.79839 3.07224"]',   // [6]
  RIGHT_ARROW: 'button[type="button"] svg path[d*="M13.2402 3.07224"]',   // [6]
};
```

---

## MutationObserver TARGETS

```javascript
// Sources: [3][6]
const OBSERVER_TARGETS = {
  // Page-level observer for SPA navigation detection
  PAGE_CHANGE:    document.body,                           // [6] childList + subtree
  // Chat controls area (to detect when user enters a chat)
  CHAT_CONTROLS:  '.px-5.pb-4.pt-3',                      // [3]
};
```

---

## NATIVE BUTTON STYLING

To inject buttons that visually match Claude's native UI:

```javascript
// Sources: [4][6]

// Style 1: Top-right toolbar buttons (icon buttons, 36×36px) [4]
const BUTTON_STYLE_TOOLBAR = `inline-flex items-center justify-center relative
  shrink-0 ring-offset-2 ring-offset-bg-300 ring-accent-main-100
  focus-visible:outline-none focus-visible:ring-1
  disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none
  disabled:drop-shadow-none text-text-200 border-transparent transition-colors
  font-styrene active:bg-bg-400 hover:bg-bg-500/40 hover:text-text-100
  h-9 w-9 rounded-md active:scale-95 shrink-0`;

// Style 2: Chat toolbar buttons (icon buttons, 32×32px) [6]
const BUTTON_STYLE_CHAT_TOOLBAR = `inline-flex items-center justify-center relative
  shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50
  disabled:shadow-none disabled:drop-shadow-none border border-transparent
  transition font-base duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)]
  h-8 w-8 rounded-md active:scale-95 !rounded-lg hover:!bg-bg-200
  active:!scale-100 !pointer-events-auto !outline-offset-1 text-text-300`;
```

---

## data-testid ATTRIBUTES

All confirmed `data-testid` values found across sources:

```javascript
const DATA_TESTID = {
  CHAT_MENU_TRIGGER:  'chat-menu-trigger',     // [1] — Chat title/menu button
  USER_MESSAGE:       'user-message',          // [6] — User message content
  FILE_THUMBNAIL:     'file-thumbnail',        // [6] — File attachment thumbnail
  CONVERSATION:       'conversation',          // [2] — Conversation container
  // Partial matches used with *= selector:
  MESSAGE:            'message',               // [2] — via div[data-testid*="message"]
};
```

---

## CSS CUSTOM PROPERTIES (Theme Variables)

Claude uses CSS custom properties for theming:

```javascript
// Sources: [4][5][6]
const CSS_VARIABLES = {
  // Text colors
  TEXT_100: 'var(--text-100)',       // Primary text
  TEXT_200: 'var(--text-200)',       // Secondary text
  TEXT_300: 'var(--text-300)',       // Muted text
  TEXT_400: 'var(--text-400)',       // Subtle text

  // Background colors
  BG_100:  'var(--bg-100)',         // Primary background
  BG_200:  'var(--bg-200)',         // Secondary background
  BG_300:  'var(--bg-300)',         // Tertiary background
  BG_400:  'var(--bg-400)',         // Active background
  BG_500:  'var(--bg-500)',         // Hover background

  // Border colors
  BORDER_200: 'var(--border-200)',  // Subtle border
  BORDER_300: 'var(--border-300)',  // Standard border

  // Accent
  ACCENT_SECONDARY: 'var(--accent-secondary-100)',
  ACCENT_MAIN:      'var(--accent-main-100)',
};
```

---

## API ENDPOINTS (Alternative to DOM Scraping)

Most Claude export tools prefer API calls over DOM parsing:

```javascript
// Sources: [3][4][5][6]

// Get organization ID
function getOrgId() {
  // From cookie
  const match = document.cookie.match(/lastActiveOrg=([^;]+)/);           // [4]
  return match ? match[1] : null;
}

// Get conversation UUID from URL
function getConversationId() {
  const match = window.location.pathname.match(/\/chat\/([^/?]+)/);       // [4]
  return match ? match[1] : null;
}

// API endpoints
const API = {
  // Full conversation data with tree structure
  CONVERSATION:  `/api/organizations/{orgId}/chat_conversations/{chatId}?tree=True&rendering_mode=messages&render_all_tools=true`,       // [4][5]
  // With consistency flag
  CONVERSATION_STRONG: `/api/organizations/{orgId}/chat_conversations/{chatId}?tree=True&rendering_mode=messages&render_all_tools=true&consistency=strong`, // [5]
  // Conversation list
  CONVERSATIONS: `/api/organizations/{orgId}/chat_conversations`,          // [3]
  // File download via wiggle endpoint
  FILE_DOWNLOAD: `/api/organizations/{orgId}/conversations/{chatId}/wiggle/download-file?path={path}`, // [5]
  // Title generation
  TITLE_GENERATE: `/api/organizations/{orgId}/chat_conversations/{chatId}/title`, // [6]
  // Completion endpoint (for intercepting streaming)
  COMPLETION:    `/api/organizations/{orgId}/chat_conversations/{chatId}/completion`, // [6]
};
```

---

## SPEAKER / ROLE DETECTION SUMMARY

Multiple approaches confirmed across sources:

```javascript
// Sources: [1][2][6]

function detectRole(turnElement) {
  // Method 1: data-testid based [6] — MOST RELIABLE
  const hasUserMsg   = !!turnElement.querySelector('[data-testid="user-message"]');
  const hasFileThumb = !!turnElement.querySelector('[data-testid="file-thumbnail"]');
  const isAssistant  = !!turnElement.querySelector('.font-claude-response');

  if (hasUserMsg || (hasFileThumb && !isAssistant)) return 'user';
  if (isAssistant) return 'assistant';

  // Method 2: class-based [1]
  if (turnElement.classList?.contains('font-user-message'))   return 'user';
  if (turnElement.classList?.contains('font-claude-message')) return 'assistant';

  // Method 3: check parent/child classes for keywords [2]
  const classes = turnElement.className || '';
  const testId  = turnElement.getAttribute('data-testid') || '';
  if (classes.includes('user') || testId.includes('user'))     return 'user';
  if (classes.includes('assistant') || testId.includes('assistant')) return 'assistant';

  return null;
}
```

---

## COMPLETE MULTI-SELECTOR ARRAYS (for extension use)

Ready-to-use selector arrays in the same format as the ChatGPT/Gemini providers:

```javascript
// === CLAUDE PROVIDER SELECTORS ===

var INPUT_SELECTORS = [
  'textarea',
  'div[contenteditable="true"]',
  '[contenteditable="true"]',
  'div.ProseMirror[contenteditable="true"]',
  '[role="textbox"]',
];

var SEND_SELECTORS = [
  'button[type="submit"]',
  '[aria-label*="Send"]',
  'button[aria-label*="Send"]',
];

var ASSISTANT_SELECTORS = [
  '.font-claude-response',                                // [6] current
  'div.font-claude-message',                              // [1] older variant
  'div[data-testid*="message"]',                          // [2]
  'div[class*="col-start-2"]',                            // [2]
  'div[class*="prose"]',                                  // [2]
];

var MESSAGE_TEXT_SELECTORS = [
  '.markdown',
  'div[class*="markdown"]',
  'div[class*="prose"]',
  'p',
];

var USER_SELECTORS = [
  '[data-testid="user-message"]',                         // [6]
  'div.font-user-message',                                // [1]
];

var TURN_SELECTORS = [
  'div[data-test-render-count]',                          // [6]
];

var STOP_SELECTORS = [
  'button[aria-label*="Stop"]',                           // inferred
  'button[aria-label*="stop"]',
];
```

---

## KNOWN LIMITATIONS

1. **No explicit streaming indicator class** — No source found a CSS class like `is-streaming` or a `data-*` attribute marking active streaming. Streaming detection requires MutationObserver, SSE interception, or button state monitoring.

2. **No specific input element ID** — Unlike ChatGPT (`#prompt-textarea`), Claude has no known `id` or `data-testid` on its input element. Detection is via generic `textarea`/`contenteditable` checks.

3. **Frequent class changes** — Claude uses Tailwind CSS utility classes that change frequently. The custom font classes (`font-claude-response`, `font-user-message`) and `data-testid` attributes are the most stable selectors.

4. **Two class name variants for assistant messages** — `font-claude-message` (older, [1]) vs `font-claude-response` (newer, [6]). Both should be checked.

5. **API preferred over DOM** — For conversation export/data extraction, Claude's internal API (`/api/organizations/{orgId}/chat_conversations/{chatId}`) is significantly more reliable than DOM scraping. All production export tools use the API.

---

## CHANGELOG

- **Jan 2026** — Initial compilation from 6 independent sources
