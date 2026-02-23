# Known Issues & Future Improvements

Tracked problems and planned enhancements for AI Hub.
Last updated: 2026-02-23 (v0.3.0)

---

## Critical

### 1. Extension-mode responses only fetched when user re-opens the AI provider tab

- **Severity**: Critical — breaks unattended multi-round runs
- **Observed behavior**: After the user submits a prompt, the AI model tab (ChatGPT/Gemini/Claude) generates a response in the background, but the content script does **not** extract and send it back to the hub until the user manually switches to that browser tab.
- **Root cause (suspected)**: Chromium throttles or suspends inactive/background tabs. `MutationObserver` callbacks and `setInterval` polling may be paused or deprioritized when the tab is not visible. The content script's `checkForResponse` loop effectively stalls until the tab regains focus.
- **Impact**: The orchestrator waits indefinitely for `NEW_MESSAGE` from the provider. The round never completes. The user has to manually click each AI tab to "kick" the response through.
- **Possible solutions**:
  <!-- TODO: Investigate `chrome.offscreen` API (MV3) to keep a background document alive for polling -->
  <!-- TODO: Consider using `chrome.tabs.update(tabId, { active: true })` to programmatically cycle through tabs (poor UX but functional) -->
  <!-- TODO: Evaluate service worker-driven response scraping via `chrome.scripting.executeScript` on a timer, bypassing content script lifecycle -->
  <!-- TODO: Check if `chrome.alarms` API can wake up content scripts in background tabs -->
  <!-- TODO: Look into `document.visibilityState` handling — maybe force a final scrape attempt before tab goes hidden -->

---

## High Priority

### 2. No AI agent orchestrator (MC) — conversations feel mechanical

- **Severity**: High — core UX problem
- **Observed behavior**: The multi-model conversation runs in a rigid round-robin loop. There is no intelligent moderator, synthesizer, or MC that guides the discussion, asks follow-ups, resolves contradictions, or produces a final summary. The app feels like a raw dump of independent AI outputs rather than a coordinated conversation.
- **Impact**: Users see three separate monologues rather than a meaningful debate/collaboration. There's no "glue" connecting the rounds. The feature's core value proposition (AI models talking to each other productively) is undermined.
- **Possible solutions**:
  <!-- TODO: Design an "MC Agent" — a dedicated LLM call (cheap model like GPT-4o-mini) that runs between rounds to: -->
  <!--   1. Summarize what each model said -->
  <!--   2. Identify agreements and disagreements -->
  <!--   3. Generate a focused follow-up prompt for the next round instead of the static template -->
  <!--   4. Produce a final synthesis after the last round -->
  <!-- TODO: Could be implemented as a new "mc" step in the round pipeline (between receiving all responses and sending the next prompt) -->
  <!-- TODO: Feasibility analysis was discussed — conclusion was it's achievable with a lightweight orchestration LLM call per round -->
  <!-- TODO: Consider letting the user choose MC behavior: "strict moderator" vs "hands-off relay" -->

### 3. No follow-up questions after rounds complete

- **Severity**: High — limits conversational depth
- **Observed behavior**: Once the configured number of rounds finishes, the conversation is done. The user cannot ask a follow-up question to continue the discussion or dig deeper into a specific point.
- **Impact**: Users have to start an entirely new conversation with a new prompt, losing the context of the previous exchange. This breaks the natural flow of inquiry.
- **Possible solutions**:
  <!-- TODO: After final round, keep the run in an "open" state where the ChatInput accepts follow-up prompts -->
  <!-- TODO: Append the follow-up as a new round (round N+1) with the user's question injected into the prompt template -->
  <!-- TODO: Include a summary of the previous rounds in the follow-up prompt so the AI models have full context -->
  <!-- TODO: UI: show a "Continue conversation..." prompt in the ChatInput instead of disabling it -->

---

## Medium Priority

### 4. Chat UI visibility and layout issues

- **Severity**: Medium — usability friction
- **Observed behavior**:
  - AI model responses are often very long (1000+ words) but the chat thread only occupies roughly half the viewport width, requiring excessive scrolling to read each answer.
  - The typing/streaming animation (bouncing dots) does not accurately reflect whether a model is actually still generating — it sometimes shows while the model has already finished, or disappears too early.
- **Impact**: Users spend more time scrolling than reading. The inaccurate typing indicator creates confusion about whether a response is still incoming.
- **Possible solutions**:
  <!-- TODO: Make the chat thread full-width or at least wider (remove max-w constraints or reduce side padding) -->
  <!-- TODO: Add a "expand message" / "collapse message" toggle per message for long responses -->
  <!-- TODO: Consider a split-pane view option where each model gets its own scrollable column -->
  <!-- TODO: Fix typing indicator: tie it to actual WS message state (show only when `isSending` is true AND no `NEW_MESSAGE` received yet for that provider in the current round) -->
  <!-- TODO: Add markdown rendering for AI responses (code blocks, headers, lists) for better readability -->

### 5. DISCOVER_EXTENSION ping-pong loop causes terminal spam

- **Severity**: Medium — performance/DX issue
- **Observed behavior**: When not all selected provider tabs are open in Chrome, `useExtensionRun.ts` sends `DISCOVER_EXTENSION` messages every 3 seconds and on every state update, flooding the WebSocket bus and filling the terminal with log output.
- **Root cause**: The `useEffect` at line ~461 in `useExtensionRun.ts` sends an immediate `DISCOVER_EXTENSION` on every re-render where `wsStatus === 'connected'`, including when provider tabs haven't changed.
- **Impact**: Terminal becomes laggy and unreadable. Minor performance overhead from constant WS traffic.
- **Possible solutions**:
  <!-- TODO: Remove the immediate `send({ type: "DISCOVER_EXTENSION" })` call inside the useEffect -->
  <!-- TODO: Only send DISCOVER_EXTENSION on explicit user actions (e.g., clicking "refresh" or starting a run) -->
  <!-- TODO: Add a debounce or dedupe mechanism so the same DISCOVER message isn't sent repeatedly -->

---

## Notes

- Issues are numbered for easy reference in PRs and commits (e.g., "Fixes #1", "Relates to KNOWN_ISSUES #3").
- Move issues to the changelog entry that resolves them when fixed.
- Add new issues at the bottom of the appropriate severity section.
