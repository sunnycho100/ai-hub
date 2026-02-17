# Bug Fix: Chrome Extension Not Detecting Already-Opened Tabs

## 🐛 THE PROBLEM

The Chrome extension fails to detect ChatGPT, Gemini, and Claude tabs that were **already open** before the extension was loaded or reloaded. This breaks the Agent Communication mode workflow because no providers are registered.

---

## 📊 COMPLETE WORKFLOW & PIPELINE

### Architecture Overview

```
┌─────────────────────┐         WebSocket          ┌──────────────────────┐
│   Next.js Web App   │◄──────── :3333 ───────────►│ Chrome Extension     │
│   (localhost:3000)  │        (broadcast)         │ background.js        │
│                     │                            │ (Service Worker)     │
└─────────────────────┘                            └──────────┬───────────┘
         ▲                                                    │
         │                                           chrome.tabs.sendMessage
         │                                                    │
    hubpage.js ────────────────────────────────►   ┌─────────┼─────────────┐
    (wakes service worker)                         ▼         ▼             ▼
                                              ChatGPT    Gemini        Claude
                                            (content   (content      (content
                                             script)    script)       script)
```

### Normal Registration Flow (✅ WORKS)

1. **Extension loads first**
2. User opens ChatGPT/Gemini/Claude tab
3. `manifest.json` content_scripts auto-inject
4. Content script runs: `register()` → sends `HELLO_PROVIDER`
5. `background.js` receives message → adds to `tabRegistry`
6. Tab is now registered and ready to receive `SEND_PROMPT` messages
7. ✅ **SUCCESS**

### Broken Flow (❌ FAILS)

1. User opens ChatGPT/Gemini/Claude tabs **FIRST**
2. **Then** loads/reloads the extension
3. ❌ Content scripts **NOT** auto-injected (tabs existed before extension)
4. `background.js` has empty `tabRegistry`
5. `discoverTabs()` sends `PING_CONTENT` to all tabs
6. ❌ No content script to respond (never injected)
7. Tabs remain unregistered forever
8. When user clicks "Start Run": **TAB_NOT_FOUND** error

---

## 🔍 ROOT CAUSE ANALYSIS

### Issue 1: Content Script Injection Timing

**Content scripts are only auto-injected when:**
- Extension is first installed
- Extension is updated
- Tab is opened/refreshed **AFTER** extension is already loaded

**Content scripts are NOT auto-injected when:**
- Tabs were already open before extension loaded
- Extension is reloaded (developer mode)
- Service worker restarts (MV3 dormancy)

### Issue 2: Missing Re-injection on Critical Events

The `reinjectContentScripts()` function exists (lines 372-397) but was **only called** on:
- `chrome.runtime.onInstalled` ← fires on install/update only
- **NOT** on `chrome.runtime.onStartup` ← fires when Chrome starts
- **NOT** when WebSocket reconnects ← service worker woke up

### Issue 3: Discovery Mechanism Relies on Existing Scripts

The `discoverTabs()` function (lines 195-253):
- Queries all tabs
- Sends `PING_CONTENT` message to each
- Waits for content scripts to respond with provider info
- **FAILS if no content script is present to respond**

---

## ✅ THE FIX

### Three Strategic Injection Points

#### 1. **On Chrome Startup** (line 410-414)
```javascript
chrome.runtime.onStartup.addListener(() => {
  console.log("[bg] Chrome started – connecting WS + re-injecting content scripts");
  connectWS();
  reinjectContentScripts(); // ← ADDED
});
```

**Why:** Catches already-open tabs when browser restarts.

---

#### 2. **On Service Worker Initialization** (line 416-419)
```javascript
console.log("[bg] AI Hub extension starting...");
// Re-inject content scripts into any already-open provider tabs
reinjectContentScripts(); // ← ADDED
connectWS();
```

**Why:** Catches already-open tabs when:
- Extension is reloaded in developer mode
- Service worker wakes from dormancy
- Extension context is refreshed

---

#### 3. **On WebSocket Connection** (line 70-73)
```javascript
// Re-discover content script tabs (in case service worker restarted and lost registry)
// Track completion so we can send an updated EXTENSION_READY after all tabs are pinged
// Also re-inject content scripts to catch already-open tabs that may have lost their scripts
reinjectContentScripts().then(() => {
  // After re-injection completes, discover tabs to build registry
  discoverTabs();
});
```

**Why:** Ensures fresh registration when:
- WebSocket bus restarts (dev server restart)
- Service worker reconnects after dormancy
- Network connection is re-established

**Critical:** Re-injection runs **BEFORE** discovery, ensuring content scripts are present to respond to `PING_CONTENT`.

---

## 🎯 TESTING SCENARIOS

### Test 1: Already-Open Tabs (Primary Bug)
1. Open ChatGPT, Gemini, Claude tabs
2. Load extension
3. Open AI Hub page (localhost:3000)
4. ✅ All 3 providers should appear as registered
5. Click "Start Run"
6. ✅ Prompts should be delivered to all tabs

### Test 2: Extension Reload
1. Have provider tabs open
2. Reload extension (chrome://extensions)
3. Refresh AI Hub page
4. ✅ All providers re-register within 2-5 seconds

### Test 3: Service Worker Dormancy
1. Have provider tabs open
2. Wait 5+ minutes (service worker goes dormant)
3. Return to AI Hub page
4. `hubpage.js` wakes service worker → triggers re-injection
5. ✅ All providers re-register automatically

### Test 4: Dev Server Restart
1. Have provider tabs open
2. Kill and restart `bash start.sh`
3. WebSocket reconnects → triggers re-injection
4. ✅ All providers re-register

---

## 📁 FILES MODIFIED

| File | Lines Changed | Change Type |
|------|---------------|-------------|
| `extension/background.js` | 410-414 | Added `reinjectContentScripts()` to `onStartup` |
| `extension/background.js` | 70-73 | Added `reinjectContentScripts()` before `discoverTabs()` in WS `onopen` |
| `extension/background.js` | 417-418 | Added `reinjectContentScripts()` on initial service worker start |

---

## 🔧 TECHNICAL DETAILS

### `reinjectContentScripts()` Function

```javascript
async function reinjectContentScripts() {
  const scripts = [
    { patterns: ["https://chatgpt.com/*", "https://chat.openai.com/*"], file: "providers/chatgpt.js" },
    { patterns: ["https://gemini.google.com/*"], file: "providers/gemini.js" },
    { patterns: ["https://claude.ai/*"], file: "providers/claude.js" },
  ];
  for (const { patterns, file } of scripts) {
    try {
      const tabs = await chrome.tabs.query({ url: patterns });
      for (const tab of tabs) {
        if (!tab.id) continue;
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [file],
          });
          console.log("[bg] re-injected " + file + " into tab " + tab.id);
        } catch (e) {
          // Tab may not be accessible (e.g. devtools, special pages)
        }
      }
    } catch (e) {
      // Query may fail for restricted URL patterns
    }
  }
}
```

### Registration Flow After Re-injection

1. `chrome.scripting.executeScript()` injects content script
2. Content script runs initialization:
   ```javascript
   if (document.readyState === "complete") {
     register();
   } else {
     window.addEventListener("load", () => setTimeout(register, 1000));
   }
   ```
3. `register()` sends `HELLO_PROVIDER` to background
4. Background adds to `tabRegistry`
5. Background sends `HELLO_PROVIDER` through WebSocket bus
6. Web app receives and updates UI with "✓" badge

### Why Async Chain Matters

```javascript
reinjectContentScripts().then(() => {
  discoverTabs();
});
```

**Critical sequencing:**
1. Re-inject content scripts first (takes ~100-500ms)
2. Wait for injection to complete
3. **Then** send `PING_CONTENT` messages
4. Content scripts now exist to respond
5. Registry gets populated correctly

If you run `discoverTabs()` immediately (without waiting), `PING_CONTENT` messages arrive before content scripts finish initializing → empty registry.

---

## 🚀 IMPACT

### Before Fix
- ❌ Extension mode broken if tabs opened before extension
- ❌ Requires manual tab refresh to register
- ❌ Silent failure with no error message
- ❌ Poor first-run experience
- ❌ Broken after dev server restart

### After Fix
- ✅ Works with already-open tabs
- ✅ Automatic re-registration on all events
- ✅ Resilient to service worker dormancy
- ✅ Smooth first-run experience
- ✅ Survives dev server restarts
- ✅ No manual intervention required

---

## 📝 RELATED ISSUES

This fix also improves reliability for:
- **MV3 Service Worker Dormancy** — Re-injection happens on wake
- **Dev Server Restarts** — WebSocket reconnect triggers re-injection
- **Extension Hot Reload** — Developer mode reloads now work seamlessly
- **Chrome Browser Restart** — `onStartup` handler catches persistent tabs

---

## ✅ VERIFICATION

To verify the fix works:

1. **Without restarting browser**, open 3 tabs:
   - https://chatgpt.com/
   - https://gemini.google.com/
   - https://claude.ai/

2. Open Chrome DevTools Console for the **background page**:
   - Go to `chrome://extensions`
   - Enable Developer Mode
   - Find "AI Hub – Agent Bridge"
   - Click "Inspect views: service worker"

3. Load the extension or reload it

4. In the background console, look for:
   ```
   [bg] AI Hub extension starting...
   [bg] re-injected providers/chatgpt.js into tab 12345
   [bg] re-injected providers/gemini.js into tab 12346
   [bg] re-injected providers/claude.js into tab 12347
   [bg] connected to WS bus
   [bg] re-discovered chatgpt in tab 12345
   [bg] re-discovered gemini in tab 12346
   [bg] re-discovered claude in tab 12347
   [bg] ✅ registered chatgpt → tab 12345 (3 total)
   [bg] ✅ registered gemini → tab 12346 (3 total)
   [bg] ✅ registered claude → tab 12347 (3 total)
   ```

5. Open AI Hub page (localhost:3000/agent)

6. Connection status should show:
   - **WS ✓** (green)
   - **Ext ✓** (green)
   - **3 providers** listed

7. Click "Start Run" with all 3 providers selected

8. ✅ **All 3 providers should receive prompts and respond**

---

## 🎓 KEY TAKEAWAY

**The fix ensures content scripts are proactively re-injected at every critical lifecycle event**, not just on initial install. This makes the extension resilient to:
- Service worker dormancy (MV3)
- Already-open tabs
- Development workflows (hot reload)
- Network interruptions
- Browser restarts

**Before:** Passive discovery (wait for content scripts to register themselves)
**After:** Active injection (force-inject content scripts, then discover)

---

**Status:** ✅ **FIXED** - Extension now detects already-opened tabs in all scenarios.
