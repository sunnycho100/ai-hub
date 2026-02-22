/**
 * AI Hub – Page Visibility API Override
 *
 * Injected into the MAIN world at document_start (before the page's own
 * scripts execute) for ChatGPT and Gemini tabs.
 *
 * Problem: Both ChatGPT and Gemini check the Page Visibility API and
 * defer/skip DOM rendering of streamed responses when the tab is in the
 * background. This prevents the content script's MutationObserver and
 * polling from detecting completed responses.
 *
 * Solution: Override document.hidden and document.visibilityState so the
 * page always believes it is in the foreground, and suppress
 * visibilitychange events that would tell it otherwise.
 */

(function () {
  // Override document.hidden → always false
  Object.defineProperty(document, "hidden", {
    get: function () {
      return false;
    },
    configurable: true,
  });

  // Override document.visibilityState → always "visible"
  Object.defineProperty(document, "visibilityState", {
    get: function () {
      return "visible";
    },
    configurable: true,
  });

  // Intercept visibilitychange events at the capture phase so the page
  // never learns the tab went to the background.
  document.addEventListener(
    "visibilitychange",
    function (e) {
      e.stopImmediatePropagation();
    },
    true
  );
})();
