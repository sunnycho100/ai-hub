/**
 * AI Hub – Hub Page Content Script
 *
 * Injected into the AI Hub web page (localhost:3000/3001/etc).
 * Its sole purpose is to WAKE the MV3 service worker so the
 * background script can (re-)establish its WebSocket connection
 * to the WS bus before the user tries to start a run.
 *
 * Without this, the service worker may be dormant/suspended,
 * causing SEND_PROMPT messages to be lost on first use.
 */

(function () {
  var WAKE_INTERVAL = 5000; // re-ping every 5 seconds while page is open

  function wakeExtension() {
    try {
      chrome.runtime.sendMessage(
        { type: "HUB_PAGE_OPENED" },
        function (response) {
          if (chrome.runtime.lastError) {
            // Extension not available or service worker crashed — will retry
            return;
          }
          if (response && response.wsStatus) {
            console.log(
              "[aihub-bridge] Extension awake — WS:",
              response.wsStatus,
              "| Providers:",
              Object.keys(response.providers || {}).join(", ") || "none"
            );
          }
        }
      );
    } catch (e) {
      // Silently ignore — extension may be unloaded
    }
  }

  // Wake immediately on page load
  wakeExtension();

  // Keep waking periodically to prevent service worker suspension
  // while the AI Hub page is open
  setInterval(wakeExtension, WAKE_INTERVAL);
})();
