/**
 * AI Hub – Extension Popup Script
 *
 * Queries the background worker for current status
 * and updates the popup UI accordingly.
 */

const WS_STATUS_EL = document.getElementById("ws-status");
const PROVIDER_DOTS = {
  chatgpt: document.getElementById("dot-chatgpt"),
  gemini: document.getElementById("dot-gemini"),
  claude: document.getElementById("dot-claude"),
};

function updateUI(status) {
  // WS status
  const { wsStatus, providers } = status;

  WS_STATUS_EL.textContent =
    wsStatus === "connected"
      ? "Connected"
      : wsStatus === "connecting"
      ? "Connecting…"
      : "Disconnected";

  WS_STATUS_EL.className = `status-badge badge-${wsStatus}`;

  // Provider dots
  for (const [provider, dot] of Object.entries(PROVIDER_DOTS)) {
    const isConnected = providers && providers[provider];
    dot.className = `provider-dot ${isConnected ? "dot-active" : "dot-inactive"}`;
  }
}

// Query background for current status
chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
  if (chrome.runtime.lastError) {
    console.warn("Could not reach background:", chrome.runtime.lastError.message);
    return;
  }
  if (response) {
    updateUI(response);
  }
});

// Listen for live status updates while popup is open
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STATUS_UPDATE") {
    updateUI(msg);
  }
});
