# Race Condition Debug: Extension Not Working on First Load

## The Bug

When starting the server with `bash start.sh` and using the non-API (Extension) mode for Agent Communication, clicking "Start Run" does nothing — no messages are sent to any provider tabs (ChatGPT, Gemini, Claude). However, if you wait ~30-60 seconds and try again, it works. This makes the product non-deployable since first-use experience is broken.

---

## Pipeline Under Investigation

The full message pipeline for Extension mode is:

```
User clicks "Start Run"
  → useExtensionRun.handleStart()
    → wsSend({ type: "SEND_PROMPT", ... })
      → WebSocket client (lib/ws.ts)
        → WS Bus relay server (ws://localhost:3333)
          → Chrome Extension background.js (service worker)
            → chrome.tabs.sendMessage()
              → Content script (chatgpt.js / gemini.js / claude.js)
                → Injects text into AI provider's input + clicks send
```

The return path is:

```
Content script detects AI response
  → chrome.runtime.sendMessage({ type: "NEW_MESSAGE" })
    → background.js
      → wsSend() to WS bus
        → WS bus relays to web app
          → useExtensionRun receives via subscribe()
```

---

## Debugging Approach

### Step 1: Map the full data flow

Read every file in the pipeline end-to-end:
- `start.sh` — startup sequence (kills old WS bus, starts new one + Next.js)
- `tools/ws-bus/server.js` — the relay server (simple broadcast)
- `lib/ws.ts` — browser-side WebSocket client
- `lib/useWebSocket.ts` — React hook wrapping ws.ts
- `extension/background.js` — MV3 service worker, routes messages between bus and content scripts
- `extension/providers/*.js` — content scripts injected into AI provider pages
- `hooks/useExtensionRun.ts` — orchestrates the run (sends prompts, listens for responses)
- `extension/manifest.json` — content script injection rules, permissions

### Step 2: Identify what "works after waiting" means

The fact that it works after 30-60 seconds is the key clue. That timing matches Chrome's MV3 alarm minimum interval (~30s). The extension has a keepalive alarm (`periodInMinutes: 0.45`) that reconnects the service worker's WebSocket. This means:

- The extension's WS connection to the bus is the bottleneck
- The ~30s wait is the alarm firing and reconnecting

### Step 3: Trace the startup race

When `bash start.sh` runs:

1. **Kills port 3333** (old WS bus) — this breaks any existing extension WS connection
2. **Starts new WS bus** on 3333
3. **Starts Next.js** dev server
4. **Opens Chrome** to localhost:3000 after 2 seconds

The web app (Next.js) connects to the new bus almost instantly via `wsConnect()` in `useWebSocket`. But the Chrome extension's service worker is **dormant** — Chrome MV3 suspends service workers after ~30 seconds of inactivity. There's nothing to wake it up:

- `onInstalled` / `onStartup` — only fires once, not on server restart
- Keepalive alarm — fires every ~30s minimum, not immediately
- Content script registration — `setInterval(register, 30000)` — 30 second cycle

**Result: There's a 30-60 second window where the extension has no WS connection to the bus.**

### Step 4: Identify compounding failures

The race condition is made worse by several design gaps:

1. **No readiness check**: `handleStart()` proceeds even when zero providers are connected. If `connectedProviders` is empty, it falls back to sending to ALL selected models anyway — but the messages go through the bus to nobody.

2. **No retry mechanism**: `SEND_PROMPT` messages are fire-and-forget. If the extension isn't connected to the bus when the message is relayed, it's lost permanently.

3. **No timeout**: Once a run enters `R1_WAITING`, it stays there forever if no response comes. The user has no indication that messages were lost.

4. **Silent failure**: No error is shown to the user. The `wsSend` function in ws.ts logs a warning if the socket isn't open, but the extension side is the problem — the web app's WS IS open (to the bus), the bus just has no extension client to relay to.

5. **No discovery handshake**: The web app has no way to ask "is the extension alive?" — it only passively listens for `HELLO_PROVIDER` messages that the extension sends on its own schedule.

---

## The Fix (6 layers of defense)

### Layer 1: Wake the extension on page load (NEW FILE: `extension/hubpage.js`)

Created a lightweight content script that runs on `localhost:3000-3003`. When the AI Hub page opens, it immediately sends `chrome.runtime.sendMessage({ type: "HUB_PAGE_OPENED" })` which **wakes the dormant MV3 service worker**. It keeps pinging every 5 seconds to prevent re-dormancy while the page is open.

This is the single most important fix — it eliminates the 30-60s waiting period entirely.

### Layer 2: Extension announces itself (background.js)

When the extension's WS connection opens, it now immediately sends `{ type: "EXTENSION_READY", providers: {...} }` through the bus. This tells the web app "I'm alive and here are the provider tabs I know about."

Added handler for `DISCOVER_EXTENSION` — the web app can explicitly ask "are you there?" and get an `EXTENSION_READY` response.

Added handler for `HUB_PAGE_OPENED` — wakes WS connection when hubpage.js pings.

### Layer 3: Web app discovery handshake (lib/ws.ts, hooks/useExtensionRun.ts)

On WS connect, the web app immediately sends `{ type: "DISCOVER_EXTENSION" }`. If the extension doesn't respond, useExtensionRun sends it again every 3 seconds until it gets `EXTENSION_READY`.

The UI shows "Ext ✓" or "Ext…" so the user can see when the bridge is live.

### Layer 4: Start run gating (hooks/useExtensionRun.ts)

`handleStart()` now checks `extensionReady` before proceeding. If the extension hasn't confirmed it's alive, the user gets a clear error: "The browser extension is not connected. Make sure it's loaded in Chrome and the WebSocket bus is running."

### Layer 5: Retry with timeout (hooks/useExtensionRun.ts)

Every `SEND_PROMPT` is now tracked. If no `PROMPT_SENT` acknowledgment arrives within 8 seconds, it retries (up to 3 times). Before each retry, it sends `DISCOVER_EXTENSION` to poke the extension. After all retries fail, the user gets a specific error per provider.

### Layer 6: Faster reconnection (background.js, lib/ws.ts)

- Extension reconnect delay: 3s → **1s**
- Web app reconnect delay: 2s → **1s**
- Extension keepalive alarm: added `delayInMinutes: 0.083` (~5 seconds) for faster first fire after install/reload

---

## Files Modified

| File | Change |
|------|--------|
| `extension/hubpage.js` | **NEW** — Content script that wakes extension on AI Hub page load |
| `extension/manifest.json` | Added hubpage.js content script for localhost:3000-3003 |
| `extension/background.js` | Handle HUB_PAGE_OPENED, DISCOVER_EXTENSION; send EXTENSION_READY on WS open; faster reconnect |
| `lib/types.ts` | Added ExtensionReadyMsg, DiscoverExtensionMsg to WSMessage union |
| `lib/ws.ts` | Send DISCOVER_EXTENSION on connect; faster reconnect (1s) |
| `hooks/useExtensionRun.ts` | Retry logic, extension readiness gating, periodic discovery, EXTENSION_READY handler |
| `components/agent/ConnectionStatus.tsx` | Show "Ext ✓" / "Ext…" badge |
| `components/agent/AgentPageHeader.tsx` | Thread extensionReady prop |
| `components/agent/ErrorBanner.tsx` | Support system-level errors |
| `app/agent/page.tsx` | Wire extensionReady from hook to header |

---

## Key Takeaway

The core issue was that **nothing in the system actively woke the Chrome extension when it was needed**. The extension relied entirely on passive mechanisms (alarms, periodic re-registration) that have minimum 30-second granularity in MV3. The fix ensures the extension is actively woken the moment the user opens the page, and adds multiple fallback layers (discovery handshake, retry, readiness gating) so that even if the wake fails, the system degrades gracefully with clear user feedback instead of silent failure.

---

## Follow-up Hardening (Post-race-condition fix)

After the original startup race fixes (hub wake, discovery handshake, retries), a secondary failure mode remained:

- The UI could show extension/provider readiness while the **web app WS transport** was momentarily disconnected.
- During this window, `SEND_PROMPT` attempts retried in app logic but did not reach the bus reliably.
- Result: users observed "everything connected" visually, but no prompt delivery and no fetched responses.

### Additional Root Cause

This was a **state/transport split-brain**:
- Readiness and provider chips were derived from previously observed events.
- Actual transport state could be disconnected at the time of send.
- Start flow lacked a strict transport gate.

### Additional Fixes Applied

#### 1) Transport queue + reconnect flush (`lib/ws.ts`)
- Added bounded outbox queue for outgoing WS messages while disconnected.
- On send while disconnected:
  - queue message,
  - trigger reconnect (if not already connecting).
- On `onopen`:
  - flush queued messages in FIFO order.
- Added dedupe for repeated `DISCOVER_EXTENSION` to avoid queue noise.

#### 2) Prevent transient client teardown (`lib/useWebSocket.ts`)
- Removed cleanup-time forced disconnect of singleton WS client on component unmount.
- Avoids unnecessary transport drops during transient remount patterns.

#### 3) Strict extension start gate (`hooks/useExtensionRun.ts`)
- Extension run hook now consumes `wsStatus`.
- If WS is not connected:
  - block `handleStart()`,
  - show explicit `_system` error `WS_NOT_CONNECTED`.
- On WS disconnect:
  - clear `extensionReady`,
  - clear `connectedProviders` to prevent stale green UI.
- On reconnect:
  - force fresh discovery sync (`DISCOVER_EXTENSION`).

#### 4) Wiring update (`app/agent/page.tsx`)
- Passed `wsStatus` from page-level WS hook into extension-run hook.

### Why this resolves the observed symptom

The pipeline now enforces transport truth before orchestration:
- No run start on disconnected WS.
- No stale-ready provider state after WS drop.
- Pending control messages are retained and flushed after reconnect, reducing dead-send windows.

### Validation Observations

- Lint checks on modified files reported no new lint errors.
- Behavior goal: eliminate cases where UI appears connected but extension mode cannot send/fetch.

### Important Note

- Run the app from the worktree that contains these patches so the browser loads the updated bundle.

---

## Response Scraping Fix (Post-WS-hardening)

After the WebSocket reliability fixes above, a new class of failure surfaced: prompts were being sent successfully, but **responses were not being scraped correctly** from provider tabs.

### Symptoms

- **ChatGPT**: Only bold text (`<strong>` tag contents) was returned instead of the full response. Example: a multi-paragraph response about US-China military comparison returned only `"United StatesChina NATO Japan Self-Defense Forces..."` (concatenated bold fragments).
- **Gemini**: Responses were not fetched at all. The scraper would poll indefinitely, never detecting a completed response. Rounds could not advance.
- **Claude**: Working correctly (no changes needed).

### Root Causes

#### ChatGPT — Over-aggressive noise removal

`NOISE_SELECTORS` in `chatgpt.js` contained:
- `[class*="thought"]` — Matched ChatGPT's reasoning-model response containers (class names like `thought-*`), stripping all `<p>` elements and leaving only orphaned `<strong>` tags.
- `details`, `summary` — Bare element selectors that could match structural response elements.
- `a[class*="group"]` — Matched link wrappers inside response content.

After cloning the response DOM and running noise removal, the entire response body was deleted, leaving only inline bold text fragments.

#### Gemini — Three compounding failures

1. **In-place DOM mutation not detected**: The scraper relied on `messages.length > lastMessageCount` to detect new responses. Gemini updates responses by mutating the existing `model-response` node in place — no new DOM nodes are added, so the count never increases. The scraper waited forever.

2. **Global thinking detection**: `document.querySelector(THINKING_SELECTORS[ti])` searched the **entire page** for thinking indicators. Unrelated spinners, loading bars, and progress elements elsewhere in Gemini's UI matched, keeping `isThinking = true` permanently and blocking completion.

3. **Wildcard loading checks**: `[class*="loading"], [class*="spinner"], [class*="progress"], [class*="shimmer"]` matched permanent Gemini UI elements (not just streaming indicators), reinforcing the false `isThinking` state.

### Fixes Applied

#### ChatGPT (`extension/providers/chatgpt.js`)

| Change | Before | After |
|--------|--------|-------|
| `NOISE_SELECTORS` | 12 entries including `[class*="thought"]`, `details`, `summary`, `a[class*="group"]` | 10 entries; removed 4 over-aggressive selectors; added `[data-testid*="thought"]`, `[data-testid*="thinking"]` |
| `extractMessageText()` | No safety check on noise removal | Added 70% sanity threshold: if cleaned text is <30% of raw text, bypass noise removal and return regex-cleaned raw text |
| Polling interval | 2000ms | 1200ms |

#### Gemini (`extension/providers/gemini.js`)

| Change | Before | After |
|--------|--------|-------|
| Message detection | `messages.length <= lastMessageCount` → return false | Allow processing when message count unchanged but text content >= 20 chars (in-place update detection) |
| Thinking detection | `document.querySelector()` (global) | Scoped to `latestMsg` and parent `model-response` only |
| Loading detection | `[class*="loading"], [class*="spinner"], etc.` (broad wildcards) | `.loading-indicator, mat-spinner, circular-progress, thinking-content` (specific selectors) |
| Done signal | Generic STREAMING_DONE_SELECTORS only | Added `message-actions` as explicit done signal; added stop button override |
| Required stable polls | `hasDoneSignal ? 1 : 3` | `hasDoneSignal ? 1 : 2` |
| Polling interval | 2000ms | 1000ms |
| State tracking | `lastMessageCount` only | Added `baselineLastText` to detect genuinely new in-place content |

### Why This Resolves the Observed Symptoms

- **ChatGPT**: Narrow noise selectors no longer strip response containers. The 70% sanity check provides a safety net even if future DOM changes introduce new class names containing "thought".
- **Gemini**: In-place update detection + scoped thinking/loading checks eliminate both failure modes. The scraper now correctly detects content appearing in mutated DOM nodes and correctly identifies when streaming is complete vs. when unrelated UI elements are loading.
