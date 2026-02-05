# AI Hub - Pipeline Debug Log

**Date:** 2026-02-05
**Issue:** Agent stuck at "Waiting for responses..." - no automation in provider tabs.

## Pipeline Flow

```
HubAI (Next.js) --SEND_PROMPT--> WS Bus --> background.js --> content script
                                                                    |
HubAI <--NEW_MESSAGE-- WS Bus <-- background.js <-- content script -+
```

## Root Cause Analysis

### Monitor Findings
- WS Bus monitor ran for 20+ minutes, captured only 1 message (PING_ACK)
- No SEND_PROMPT messages observed flowing through the bus
- Confirms: either HubAI was not sending, or messages were consumed before monitor connected

### Issue 1: Content Script Selectors (CRITICAL) - FIXED
Original scripts used hardcoded CSS selectors that likely don't match real 2026 DOM.
When querySelector returns null, scripts call emitError() but HubAI only console.error'd it.

Fix: Rewrote all 3 content scripts with 8+ fallback selectors per element, 5-strategy text
insertion (native setter, direct value, execCommand, InputEvent, innerHTML), Enter key fallback,
on-page debug overlay, SPA hydration retry.

### Issue 2: Silent Error Swallowing (CRITICAL) - FIXED
agent/page.tsx ERROR handler was just console.error(). No UI feedback.

Fix: Added providerErrors state, red error banner, inline error display in AgentPanel.

### Issue 3: Tab Validity Not Checked (MODERATE) - FIXED
background.js sent chrome.tabs.sendMessage without verifying tab exists.

Fix: Added chrome.tabs.get() check. Returns TAB_CLOSED error if tab gone.

### Issue 4: Registration Timing (MODERATE) - FIXED
Content scripts registered immediately but SPA input may not be rendered yet.

Fix: Delayed registration with window.load + 1s. Added 2s retry for input search.

## Files Modified

- extension/providers/chatgpt.js - Full v2 rewrite
- extension/providers/gemini.js - Full v2 rewrite
- extension/providers/grok.js - Full v2 rewrite
- extension/background.js - Tab validity check, better logging/errors
- app/agent/page.tsx - Error state, error banner, error clearing
- components/agent/AgentPanel.tsx - Error prop and inline display
- tools/ws-bus/monitor.js - NEW diagnostic tool

## Test Instructions

1. Reload extension in chrome://extensions/
2. Refresh all 3 provider tabs (must be logged in!)
3. Look for green "[AI Hub] Connected" overlay in tabs
4. Start new run in HubAI
5. Errors now show in red banner if something fails
6. Debug overlay on each tab shows step-by-step progress
