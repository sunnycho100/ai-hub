# Changelog

All notable changes to AI Hub will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Version Format
- **MAJOR.MINOR.PATCH**
- Each commit increments the PATCH version
- Version title matches the git commit message
- Brief description summarizes the changes (should mention specific technical changes made, e.g., "Add status-pulse keyframe animation and ConnectionStatus DOM updates" or "Refactor PostgreSQL pipeline for concurrent writes")

---

## [0.3.0] - 2026-02-23 - Chat UI redesign and robust round-sync scraping fix

### Added
- **Chat-style conversation UI** — Complete redesign of the Agent Communication page from card grid to chatbox layout
  - `components/agent/ChatThread.tsx` — Scrollable chat thread displaying all AI responses chronologically with provider avatars, round dividers, and full untruncated message text. Auto-scrolls to newest message. Shows typing indicators (bouncing dots) for providers currently generating.
  - `components/agent/ConversationTabs.tsx` — Horizontal tab bar for conversation history. Each past run appears as a clickable tab with status dot (green/red/pulsing) and truncated topic. "+" button to start a new conversation. Tabs have close-on-hover.
  - `components/agent/ChatInput.tsx` — Bottom-pinned input bar with auto-resizing textarea, Debate/Collab mode toggle, Send/Stop button, and inline status indicator. Supports Enter-to-send.
- **Conversation preservation** — Users can switch between past and current conversations via tabs without losing any history. Starting a new prompt opens a new conversation tab automatically.

### Changed
- **`app/agent/page.tsx`** — Rewired from scrollable card layout to fixed-height flex column: compact header → mode tabs → conversation tabs → chat thread (fills remaining viewport) → pinned chat input. Replaced `AgentPanel` grid and `TranscriptTimeline` with unified `ChatThread`.
- **`components/agent/AgentPageHeader.tsx`** — Simplified; removed redundant "New Run" button and "History" toggle (both now handled by ConversationTabs).
- **`components/layout/LiquidTabWrapper.tsx`** — No functional changes; intermediate height propagation experiments reverted.

### Fixed
- **Round synchronization — stale round 1 text captured as round 2/3 answers** (all three providers)
  - Root cause: strict `text === lastCapturedText` equality failed when extracted text had minor whitespace or formatting differences between polls, allowing the old response to slip through as a "new" answer.
  - Fix 1: Replaced strict equality with **prefix + length similarity check** — if the first 200 characters match AND total lengths are within 10% of each other, the text is considered stale and rejected. Handles minor DOM re-render drift.
  - Fix 2: Added **2-second post-send cooldown** — after `PROMPT_SENT`, the scraper ignores all response readings for 2 seconds, giving the AI model time to start generating a genuinely new response before the old text can be grabbed.
  - Fix 3: Added `lastCapturedText` tracking to Gemini (previously only ChatGPT and Claude had it).
- **Claude slow response detection** — Added `RESPONSE_DONE_SELECTORS` for positive completion signals (copy/retry/thumbs buttons). Reduced stability threshold from 2 to 1 when done signal is detected. Reduced polling interval from 2000ms to 1000ms.

### Technical Details
- **Stale guard**: `var prefixLen = Math.min(200, lastCapturedText.length, text.length); var samePrefix = text.substring(0, prefixLen) === lastCapturedText.substring(0, prefixLen); var lenRatio = text.length / lastCapturedText.length;` — rejects if `samePrefix && lenRatio > 0.9 && lenRatio < 1.1`.
- **Cooldown**: `var promptSentAt = 0;` set to `Date.now()` in `handleSendPrompt`, checked as `if (promptSentAt && (Date.now() - promptSentAt) < 2000) return false;` at the top of `checkForResponse`.
- **Chat UI architecture**: Page uses `height: calc(100vh - 3.5rem)` flex column. ChatThread has `flex-1 overflow-y-auto min-h-0` for proper scroll containment. Messages sorted chronologically with `useMemo`. Round breaks computed via pre-pass `Set<number>` to avoid mutable variables in render.

### Files Modified
- `extension/providers/chatgpt.js` — `promptSentAt`, cooldown check, prefix+length stale guard
- `extension/providers/gemini.js` — `promptSentAt`, `lastCapturedText`, cooldown check, prefix+length stale guard
- `extension/providers/claude.js` — `promptSentAt`, cooldown check, prefix+length stale guard, `RESPONSE_DONE_SELECTORS`, `hasDoneSignal` logic
- `components/agent/ChatThread.tsx` (new)
- `components/agent/ConversationTabs.tsx` (new)
- `components/agent/ChatInput.tsx` (new)
- `app/agent/page.tsx` (rewritten)
- `components/agent/AgentPageHeader.tsx` (simplified)

---

## [0.2.6] - 2026-02-22 - Fix ChatGPT and Gemini response scraping in extension mode

### Fixed
- **ChatGPT returning only bold text instead of full response**
  - Root cause: `NOISE_SELECTORS` in `extension/providers/chatgpt.js` included `[class*="thought"]`, bare `details`, bare `summary`, and `a[class*="group"]`. ChatGPT's reasoning-model DOM wraps response paragraphs inside containers whose class names contain "thought". The noise removal stripped all `<p>` elements, leaving only orphaned `<strong>` tag contents (bold text).
  - Fix: Replaced broad class wildcards (`[class*="thought"]`, `details`, `summary`, `a[class*="group"]`) with narrow data-testid selectors (`[data-testid*="thought"]`, `[data-testid*="thinking"]`).
  - Added sanity check: if noise removal strips >70% of the raw text, fall back to regex-only cleaned text instead.
- **Gemini responses not being fetched at all**
  - Root cause 1: `messages.length <= lastMessageCount` gate blocked processing because Gemini updates responses **in-place** (mutates the existing DOM node) without adding new child nodes — the message count never increases.
  - Root cause 2: `document.querySelector(THINKING_SELECTORS[ti])` was a **global** check that matched unrelated spinners/loading elements elsewhere on the page, keeping `isThinking = true` indefinitely and blocking completion.
  - Root cause 3: `[class*="loading"], [class*="progress"], [class*="shimmer"]` wildcard class checks in the secondary loading detection matched permanent Gemini UI elements, not just streaming indicators.
  - Fix: Added in-place update detection — when message count hasn't increased, extract text from the latest node and allow processing if meaningful content (>=20 chars) is present. Track `baselineLastText` to distinguish genuinely new in-place content from stale text.
  - Fix: Scoped thinking/loading detection to the current `model-response` container only (no more `document.querySelector`). Replaced wildcard class checks with specific selectors (`.loading-indicator`, `mat-spinner`, `circular-progress`, `thinking-content`).
  - Fix: Added stop button override — if a Stop/Cancel button is visible inside the response container, `hasDoneSignal` is forced to false (still streaming). Added `message-actions` as an explicit done signal.

### Changed
- **`extension/providers/chatgpt.js`**
  - Narrowed `NOISE_SELECTORS` from 12 entries to 10, removing 4 over-aggressive selectors
  - Added 70% sanity threshold in `extractMessageText()` to detect and bypass over-aggressive noise removal
  - Reduced polling interval from 2000ms to 1200ms for faster response detection
- **`extension/providers/gemini.js`**
  - Added `baselineLastText` variable to track last extracted text for in-place update comparison
  - Rewrote message detection to allow in-place DOM mutations (no longer requires `messages.length > lastMessageCount`)
  - Scoped all thinking/loading detection to `latestMsg` and its parent `model-response` container
  - Replaced broad `[class*="loading"]` wildcards with specific element selectors
  - Added stop button detection to override premature done signals
  - Added `message-actions` as explicit completion indicator
  - Reduced required stable polls from 3 to 2 (without done signal) and 1 (with done signal)
  - Reduced polling interval from 2000ms to 1000ms

### Technical Details
- ChatGPT's reasoning models (o-series) wrap response content in DOM containers with class names like `thought-*`. The previous `[class*="thought"]` noise selector inadvertently matched and removed these containers, stripping all paragraph text and leaving only inline `<strong>` elements.
- Gemini's web app architecture renders responses by mutating an existing `model-response` element rather than appending new DOM nodes. The previous scraper relied on `messages.length > lastMessageCount` which never triggered, causing an infinite wait.
- Both providers had overly broad loading/thinking detection that could latch onto unrelated UI elements on the page, causing the scraper to wait indefinitely.

---

## [0.2.5] - 2026-02-16 - Harden extension-mode WS reliability and start gating

### Fixed
- **Extension mode silent send failures when UI appeared connected**
  - Added transport-level hardening so extension-mode prompts are not dropped during short WebSocket disconnect windows.
  - Improved run-start validation to prevent starting runs when WS transport is not actually connected.
  - Synced extension/provider readiness state with real WS lifecycle to avoid stale "connected" UI states.

### Changed
- **`lib/ws.ts`**
  - Added client-side outbox queue for messages emitted while socket is disconnected.
  - Added reconnect-on-send behavior when socket is unavailable.
  - Added queue flush on reconnect (`onopen`) so pending messages are delivered in order.
  - Added queue cap (`MAX_OUTBOX`) and dedupe behavior for high-frequency `DISCOVER_EXTENSION` messages.
- **`lib/useWebSocket.ts`**
  - Stopped disconnecting the singleton WS client during transient React unmount/remount cycles to reduce accidental transport flaps.
- **`hooks/useExtensionRun.ts`**
  - Added `wsStatus` dependency to extension run orchestrator.
  - Reset `extensionReady` and `connectedProviders` when WS is not connected (prevents stale "all green" UI).
  - Added reconnect resync trigger (`DISCOVER_EXTENSION`) when WS returns.
  - Added strict start gate: when WS is disconnected, block run start and surface `_system` error `WS_NOT_CONNECTED`.
- **`app/agent/page.tsx`**
  - Threaded current WS status into `useExtensionRun` for authoritative start gating and readiness sync.

### Technical Details
- Root issue was a transport/readiness mismatch:
  - UI state could remain optimistic while the web app WS client was temporarily disconnected.
  - `SEND_PROMPT` retries were attempted but never reached the bus when transport was down.
- New behavior ensures:
  - no dead-start runs on disconnected transport,
  - no stale provider-ready display after WS drop,
  - automatic recovery path via queued send + reconnect flush.

### Important Note
- Ensure dev server/runtime is launched from the active worktree containing these changes so the updated bundle is served.

---

## [0.2.4] - 2026-02-16 - Update Chrome extension icons to match AI Hub branding

### Changed
- **Chrome extension icons** — Replaced plain dark gray placeholder icons with branded indigo "A" logo
  - `extension/icons/generate.js` — Rewrote PNG generator to render indigo (`#6366f1`) rounded rectangle with bold white "A" letter, matching the sidebar logo in `Sidebar.tsx` and `Topbar.tsx`
  - Added `isInsideRoundedRect()` for proper corner rounding and `isLetterA()` for pixel-level letter rendering
  - Stroke thickness auto-adjusts for small sizes (thicker at 16px for legibility)
  - Regenerated `icon16.png`, `icon48.png`, `icon128.png`
- **`extension/icons/icon16.svg`** — Updated fill from `#111827` to `#6366f1`, letter from "H" to "A"
- **`extension/popup.html`** — Replaced robot emoji (🤖) header icon with branded indigo "A" box, matching extension icon style

### Technical Details
- **Design match**: Chrome extension icon now mirrors the app logo visible in the Sidebar (`bg-primary/20` box with "A" in `text-primary`) using the solid indigo primary color `#6366f1`
- **Font rendering**: PNG generator uses geometric math for the letter "A" (two diagonal legs + horizontal crossbar) since no font rendering is available without dependencies

---

## [0.2.3] - 2026-02-15 - Fix Chrome extension race condition: Extension mode now works on first load

### Fixed
- **Extension service worker startup race condition** — Extension mode no longer requires 30-60 second wait after `bash start.sh`
  - **Content scripts** (`providers/gemini.js`, `chatgpt.js`, `claude.js`) — Fast registration bursts (every 2s for 30s, then 30s), try-catch wrapper prevents uncaught "Extension context invalidated" errors
  - **`extension/background.js`** — New `discoverTabs()` sends consolidated `EXTENSION_READY` after tab discovery completes (3s safety timeout), `reinjectContentScripts()` on install/update uses `chrome.scripting.executeScript` for fresh content injection
  - **`start.sh`** — Replaced fixed `sleep 2` with health-check loop that polls Next.js until ready (up to 30s) before opening Chrome

### Technical Details
- **Root cause analysis**: Content scripts used 30s re-registration intervals; service worker sent empty `EXTENSION_READY` before async tab discovery; Chrome opened before Next.js was serving, preventing `hubpage.js` injection
- **Provider registration**: Reduced from 30s gaps to 2s bursts, preventing lost `SEND_PROMPT` messages during startup
- **Service worker lifecycle**: Proactive content script re-injection ensures fresh connection after extension reload/update
- **Startup sequence**: Chrome now opens only after localhost health check passes, ensuring `hubpage.js` content script loads correctly

---

## [0.2.2] - 2026-02-15 - Add Sluggish Liquid Glass page transitions with Framer Motion

### Added
- **`lib/liquidTransitions.ts`** — Animation variants and spring physics configuration
  - `liquidSpring` (mass: 1.2, damping: 30, stiffness: 80) — viscous, heavy-glass feel
  - `childSpring` (mass: 0.8, damping: 24, stiffness: 120) — snappier child stagger spring
  - `liquidPageVariants` — page enter/exit with opacity, scale, y-offset, and Gaussian blur
  - `liquidStaggerContainer` / `liquidStaggerChild` — micro-parallax staggered entrance
  - `chromaticShimmer` — subtle split-color text-shadow on exit
- **`components/layout/LiquidTabWrapper.tsx`** — `AnimatePresence mode="wait"` wrapper keyed by `usePathname()` for route-level transitions
- **`components/layout/LiquidStagger.tsx`** — Reusable `<LiquidStagger>` container + `<LiquidStaggerItem>` child for per-section staggered entrances
- **CSS utilities** in `globals.css` — `.liquid-page-transition` (will-change, backface-visibility, perspective), `.liquid-chromatic-active`, `.liquid-stagger-item`

### Changed
- **`components/layout/AppShell.tsx`** — Wrapped `{children}` in `<LiquidTabWrapper>` inside `<main>` for automatic route transitions
- **`app/agent/page.tsx`** — Outer container changed from `<div>` to `<LiquidStagger>`, header/tabs/mode blocks wrapped in `<LiquidStaggerItem>`
- **`app/writer/page.tsx`** — Converted to `"use client"`, container → `<LiquidStagger>`, each section wrapped in `<LiquidStaggerItem>`
- **`app/verifier/page.tsx`** — Converted to `"use client"`, container → `<LiquidStagger>`, each section wrapped in `<LiquidStaggerItem>`

### Dependencies
- **`framer-motion`** — Added as project dependency for physics-based animations

---

## [0.2.1] - 2026-02-15 - Refactor Agent page: extract custom hooks and UI components

### Changed
- **`app/agent/page.tsx` reduced from 1,065 → 218 lines** — 79% reduction in complexity
  - Extracted all extension mode logic to `hooks/useExtensionRun.ts` (349 lines)
  - Extracted all API mode logic to `hooks/useApiRun.ts` (230 lines)
  - Extracted run history management to `hooks/useRunHistory.ts` (41 lines)
  - Moved `generateMockResponse()` utility to `lib/mock.ts` (18 lines)
  - Page now acts as thin orchestrator: wires hooks to components, coordinates cross-concern handlers
- **10 new files created** — Modular, single-responsibility components and hooks
  - `components/agent/ExtensionModelPicker.tsx` (138 lines) — Model checkboxes, provider tab launcher, rounds selector
  - `components/agent/ApiModelSelector.tsx` (125 lines) — API model dropdowns (Model 1/2), max rounds selector
  - `components/agent/AgentPageHeader.tsx` (77 lines) — Back button, page title, connection status, history toggle
  - `components/agent/RunHistoryPanel.tsx` (73 lines) — Shared history panel (deduplicated from extension/API)
  - `components/agent/ModeTabs.tsx` (31 lines) — Extension/API tab switcher
  - `components/agent/ErrorBanner.tsx` (31 lines) — Shared error banner (deduplicated from extension/API)
  - Custom hooks manage state lifecycle, WebSocket subscriptions, round progression, and API fetch loops independently

### Fixed
- **Type errors in `AgentPanel.tsx` and `TranscriptTimeline.tsx`** — Pre-existing runtime/build failures
  - Replaced `grok` entries in `Record<Provider, string>` maps with `claude`
  - `grok` is not in `Provider` type (only in `ExtendedProvider`), was causing TypeScript compilation errors
  - Updated accent colors, dot colors, glow shadows, and borders across both files

### Technical Details
- **Hook extraction strategy**:
  - `useExtensionRun`: WebSocket listener (subscribe effect), round completion logic, `advanceToRound`, model selection state, connected providers tracking, sending state, provider errors
  - `useApiRun`: Fetch loop with AbortController, API provider filtering, model selection dropdowns, cancellation refs, turn-based round sequencing
  - `useRunHistory`: localStorage `loadRuns`/`deleteRun` wrappers, extension/API run list splitting, history panel toggles
- **Coordination pattern**: Page-level `handleDeleteRun` calls both `history.removeRun()` and `ext.clearCurrentIfId()` / `api.clearCurrentIfId()` to sync state across hooks
- **Deduplication wins**: Single `RunHistoryPanel` component replaces near-identical 50-line blocks in extension/API modes; single `ErrorBanner` replaces duplicated error display logic
- Build passes cleanly with `npx next build` — zero TypeScript errors, all routes compile successfully

---

## [0.2.0] - 2026-02-15 - Add light/dark mode theme system with toggle and complete glassmorphism palette overhaul

### Added
- **Theme toggle system** — Users can now switch between light and dark modes
  - Created `ThemeProvider` context in `lib/theme.tsx` with `useTheme()` hook
  - Theme preference persists in localStorage (`ai-hub-theme`)
  - `.dark` class applied to `<html>` element for theme switching
  - No flash of unstyled content — inline script in `<head>` reads localStorage before paint
  - Toggle button (Sun/Moon icon) in Topbar (top-right corner)
  - Floating glass toggle button on landing page
- **Light mode glassmorphism palette** — Complete design system for bright environments
  - Background: soft blue-gray (`#f0f2f8`) with pastel mesh gradients
  - Glass surfaces: white frosted-glass (`rgba(255,255,255,0.55)` thick / `0.4` thin)
  - Borders: subtle dark (`rgba(0,0,0,0.08)`)
  - Primary: vibrant indigo (`#6366f1`)
  - Text: dark foreground (`#1a1d2e`) with gray muted text (`#64748b`)
  - Shadows: light (`rgba(0,0,0,0.06)`)
- **Dark mode glassmorphism palette** — Original dark theme preserved and enhanced
  - Background: deep navy (`#0a0e1a`) with vivid mesh gradients
  - Glass surfaces: white frosted-glass (`rgba(255,255,255,0.06)` thick / `0.04` thin)
  - Borders: bright translucent (`rgba(255,255,255,0.1)`)
  - Primary: lighter indigo (`#818cf8`)
  - Text: light foreground (`#f0f2f8`) with gray muted text (`#8890a8`)
  - Shadows: dark (`rgba(0,0,0,0.25)`)

### Changed
- **globals.css theme architecture** — Refactored from dark-only to dual-mode system
  - `@theme` block defines light mode colors as default
  - `.dark {}` selector overrides all color and glass tokens for dark mode
  - `.mesh-gradient` background uses `.dark .mesh-gradient` override for darker gradients
  - Shimmer animations use `.dark .shimmer-line` overrides for inverted colors
  - Scrollbar styles use `.dark ::-webkit-scrollbar-thumb` for light/dark variants
  - `.glass-interactive:hover` brightness adjusted per theme (1.04 light / 1.15 dark)
- **Component class replacements** — All hardcoded `white/[0.xx]` replaced with semantic theme classes (17 files)
  - Backgrounds: `bg-white/[0.04]` → `bg-card`, `bg-white/[0.06]` → `bg-muted`
  - Borders: `border-white/[0.1]` → `border-input`, `border-white/[0.06]` → `border-border`
  - Hovers: `hover:bg-white/[0.06]` → `hover:bg-muted`, `hover:bg-white/[0.08]` → `hover:bg-accent`
  - All classes now reference CSS custom properties that switch based on `.dark` class
- **layout.tsx** — Added `suppressHydrationWarning` to `<html>` and inline theme-loading script
- **providers.tsx** — Wrapped children with `<ThemeProvider>`
- **Topbar.tsx** — Added theme toggle button with `useTheme()` hook
- **AppShell.tsx** — Added floating theme toggle for landing page (no Topbar present)

### Technical Details
- **Theme system architecture** — CSS-first approach with React context for toggle state
  - CSS custom properties (`--color-background`, `--glass-thick-bg`, etc.) defined in `@theme`
  - `.dark` class overrides all custom properties for dark mode
  - Theme switcher only manages class on `<html>` — no inline styles or prop drilling
  - localStorage persistence prevents flash between page loads
- **No FOUC (Flash of Unstyled Content)** — Inline blocking script runs before first paint
  - Script reads `localStorage.getItem('ai-hub-theme')` synchronously
  - Adds/removes `.dark` class before React hydration
  - `suppressHydrationWarning` on `<html>` prevents mismatch warnings
- **Semantic color tokens** — All components use Tailwind theme classes instead of opacity helpers
  - `bg-card`, `bg-muted`, `bg-accent` automatically resolve to correct theme values
  - `border-input`, `border-border` switch between dark/light borders
  - `text-foreground`, `text-muted-foreground` adapt to theme
  - Ensures full theme coverage — no hardcoded colors left
- **Glass token system** — 7 glass-specific CSS variables switch per theme
  - `--glass-thick-bg`, `--glass-thin-bg`, `--glass-border`
  - `--glass-rim-top`, `--glass-rim-bottom`, `--glass-inner-glow`, `--glass-shadow`
  - Light mode uses white glass on light bg, dark mode uses white glass on dark bg
  - Maintains consistent glassmorphism aesthetic across both modes

### Files Modified
- Core: `lib/theme.tsx` (new), `lib/providers.tsx`, `app/layout.tsx`, `styles/globals.css`
- Layout: `components/layout/AppShell.tsx`, `components/layout/Topbar.tsx`, `components/layout/Sidebar.tsx`
- UI primitives: `components/ui/button.tsx`, `components/ui/card.tsx`
- Agent components: `components/agent/AgentPanel.tsx`, `components/agent/RunControls.tsx`, `components/agent/ConnectionStatus.tsx`, `components/agent/TranscriptTimeline.tsx`
- Landing: `components/landing/Hero.tsx`, `components/landing/ToolCards.tsx`, `components/landing/Footer.tsx`
- Pages: `app/agent/page.tsx`, `app/verifier/page.tsx`, `app/writer/page.tsx`

### Notes
- Both light and dark modes maintain the Liquid Glass aesthetic with consistent blur, saturation, and frosted-glass effects
- Theme toggle icon animates on click (active:scale-[0.95])
- All existing glassmorphism features (glass-thick, glass-thin, glass-rim, glass-float, glass-interactive) work identically in both modes
- Accessibility: system respects `prefers-reduced-motion` via Tailwind defaults
- Future: could add system theme detection with `prefers-color-scheme` media query

---

## [0.1.2] - 2026-02-15 - Add status-pulse, shimmer, and message-enter animations to Agent Communication UI

### Added
- **Pulsing status indicators** — Connection status dots now animate with brand-colored pulses
  - Added CSS `@keyframes status-pulse` (2s rhythmic glow for connected state)
  - Added CSS `@keyframes status-fade` (3s slow opacity fade for disconnected state)
  - WS connection dot shows green pulse with `animate-ping` ring when connected
  - Yellow pulse during "connecting" state
  - Slow gray fade when disconnected
  - Per-provider status dots (ChatGPT/Gemini/Claude) pulse in their brand colors (green/blue/orange)
  - Added `.status-dot-connected` and `.status-dot-disconnected` utility classes
- **Thinking shimmer skeleton** — Agent cards now show animated skeleton loading during response wait
  - Added CSS `@keyframes shimmer` with wave gradient animation (1.8s infinite)
  - Created provider-colored shimmer variants: `.shimmer-line-green`, `.shimmer-line-blue`, `.shimmer-line-orange`
  - Replaces plain "Waiting for response..." text with 5 staggered shimmer lines (150ms delay cascade)
  - Lines have varying widths (3/4, full, 5/6, 2/3, full) to mimic realistic text blocks
  - Each provider's shimmer uses its brand color tint (rgba overlay on muted background)
- **Message entry animation** — Messages now fade in and slide up when appearing
  - Added CSS `@keyframes message-enter` (300ms ease-out, 12px upward translation)
  - AgentPanel messages stagger by 80ms per message
  - TranscriptTimeline messages stagger by 60ms per message
  - Creates cascading "typewriter" effect as conversation progresses

### Changed
- **ConnectionStatus component** — Replaced simple dot with dual-layer animated indicator
  - Outer `animate-ping` layer for connected radiant effect
  - Inner colored dot with custom pulse animation
  - Moved icon after dot for better visual hierarchy
- **AgentPanel component** — Restructured empty state rendering
  - Added `PROVIDER_SHIMMER` constant mapping providers to shimmer classes
  - Split `isSending` state into skeleton shimmer vs "No messages yet" text
  - Applied `.message-enter` animation class to all message blocks with staggered delay
- **TranscriptTimeline component** — Added `.message-enter` animation to timeline entries with index-based delay

### Technical Details
- **Animation strategy** — Uses CSS keyframes instead of JavaScript for better performance
  - Pulse/fade animations run on compositor thread (no reflow)
  - Shimmer uses background-position animation (GPU-accelerated)
  - Message entry uses opacity + transform (composite-only properties)
- **Staggering approach** — Inline `style` JSX with `animationDelay` calculated from index
  - AgentPanel: `${idx * 80}ms` per message
  - TranscriptTimeline: `${idx * 60}ms` per message
  - Shimmer lines: Hardcoded 0.15s increments via `animationDelay` style prop
- **Brand color integration** — Status dots and shimmers use provider-specific colors
  - ChatGPT green: `#22c55e` (500) / `rgba(34,197,94,0.4)` (glow)
  - Gemini blue: `#3b82f6` (500) / `rgba(59,130,246,0.4)` (glow)
  - Claude orange: `#f97316` (500) / `rgba(249,115,22,0.4)` (glow)

### Notes
- First step in UI polish roadmap (animations 1/5 from design enhancement plan)
- All animations are subtle and performance-optimized (no jank on 60fps)
- Maintains accessibility (respects `prefers-reduced-motion` via Tailwind defaults)
- Ready for next enhancements: micro-interactions on buttons, glassmorphism, enhanced typography

---

## [0.1.1] - 2026-02-11 - Fix Gemini response extraction and filter search/thinking metadata

### Fixed
- **Gemini response extraction** — Updated DOM selectors to match current gemini.google.com structure
  - Added `structured-content-container.model-response-text` selector (Gemini's new response container as of 2025)
  - Researched current selectors from actively-maintained userscripts (Gemini Response Collapse, GeminiPilot)
  - Reorganized `MESSAGE_TEXT_SELECTORS` to prioritize new structure while keeping legacy fallbacks
  - Response text now extracted successfully after completion
- **ChatGPT search/thinking mode filtering** — Strip Sources, citations, and thinking metadata from responses
  - Clones response element before extraction to avoid modifying actual DOM
  - Removes noise elements: `[class*="sources"]`, `[class*="citation"]`, `[class*="search-result"]`, `details`, `summary`, `[class*="thought"]`
  - Regex cleanup removes "Sources · N" section and all web result previews
  - Strips leading "Thought for Xs" / "Thinking" / "Searching for..." lines
  - Response now contains only the actual answer text, not 40+ search result snippets
- **Gemini thinking mode filtering** — Similar cleanup for Gemini 2.5 Pro thinking models
  - Removes `thinking-content`, `.thinking-indicator`, `.thought-container`, loading/spinner elements
  - Strips trailing "Sources" sections
  - Prevents thinking indicator text from being extracted as the response

### Changed
- **Text extraction method** — Both ChatGPT and Gemini now use `innerText` instead of `textContent`
  - `innerText` naturally skips hidden elements (action buttons, toolbars)
  - More accurate representation of what users see on screen
- **STREAMING_DONE_SELECTORS check** — Now searches both `latestMsg` AND parent `model-response` element
  - Action buttons (copy, thumbs up/down) may be siblings rather than children of text container
  - More reliable completion signal detection
- **Diagnostic logging** — `extractMessageText()` now logs which selector matched and dumps child element tags when extraction fails

### Technical Details
- **Root cause (Gemini)** — Gemini updated its DOM structure; old selectors (`message-content.model-response-text`) no longer matched
- **Root cause (ChatGPT search)** — When ChatGPT uses web search, the `.markdown` container includes thinking process, actual response, AND a massive Sources section with 40+ link previews
- **Solution** — Clone → strip noise → extract text → regex cleanup pipeline ensures only the actual response content is sent to AI Hub

---

## [0.1.0] - 2026-02-11 - Add Claude provider to browser extension

### Added
- **Claude provider** — Complete browser extension content script (`claude.js`, 470+ lines)
  - Multi-selector input detection: `contenteditable[role="textbox"]`, ProseMirror, fieldset, textarea
  - 4-strategy text insertion: execCommand insertText, synthetic clipboard paste, Claude-specific `<p>` element injection, innerHTML fallback
  - Send button detection: `button[type="submit"]`, `aria-label*="Send"`, with Enter key fallback
  - Response scraping: `.font-claude-response`, `.font-claude-message`, `div[data-test-render-count]`
  - Streaming detection: Stop button (`aria-label*="Stop"`) + text stability check (2 consecutive stable reads)
  - MutationObserver + 2s polling with 5min timeout
  - Debug overlay, error reporting, periodic re-registration
- **Model selection UI** — Sliding panel on extension tab for selecting active models
  - Animated transitions with dynamic agent panels
  - Provider chips with toggle functionality
  - Visual model selector with icons
- **Claude branding** — Orange theme (#f97316) for Claude provider
  - Updated `PROVIDER_ACCENT`, `PROVIDER_DOT`, `PROVIDER_BADGE` color maps
  - Extension popup updated with Claude status indicator

### Changed
- **Provider type system** — Added "claude" to `Provider` union type and `PROVIDERS` array
- **Extension manifest** — Added `https://claude.ai/*` to host_permissions and content_scripts
- **Model availability** — Set Claude `MODEL_STATUS` to "available"

### Removed
- **Grok provider** — Removed from extension (manifest, provider types, UI components)
  - Kept in API mode and `ExtendedProvider` for future support
- **Gemini debugging** — Gave up on Gemini response extraction after multiple fix attempts
  - Gemini code remains but user reported it still doesn't work reliably

### Technical Details
- **DOM research** — Created comprehensive `docs/DOM_SELECTORS_REFERENCE_CLAUDE.md` (602 lines)
  - Cross-referenced 6 independent production userscripts/extensions
  - Extracted Claude-specific input/response selectors from AI Chat Assistant, Multi-Platform AI Prompt Manager
  - Documented ProseMirror-aware text insertion strategy
- **Implementation pattern** — Follows chatgpt.js reference architecture exactly
  - Same function structure, error handling, service worker recovery
  - Robust multi-strategy fallback approach for DOM manipulation

### Notes
- This is a **major feature addition** warranting minor version bump (0.0.15 → 0.1.0)
- Extension now supports ChatGPT + Claude (reliable) and Gemini (unreliable)
- Users can select which models to use via the new model selection UI
- Build verified passing with `npx next build`

---

## [0.0.15] - 2026-02-10 - Fix Chrome extension agent communication pipeline

### Fixed
- **Text insertion** — Replaced broken `textContent = ""` approach that destroyed ProseMirror/Quill editor state; now uses Selection API + `execCommand("delete")` to properly clear and insert text
- **Send button reliability** — Added polling retry (up to 3 seconds) for send button to become enabled after text insertion, instead of single 500ms attempt
- **Provider filtering** — Extension mode now only sends to actually connected providers instead of always sending to all 3 (chatgpt+gemini+grok)
- **Round completion** — Changed hardcoded `>= 3` check to dynamic count based on active providers, so rounds complete properly with 2 providers
- **Service worker recovery** — MV3 service worker restart no longer loses tab registry; background.js now re-discovers content script tabs on WS reconnect via PING_CONTENT
- **Content script re-registration** — All content scripts now re-register every 30 seconds to survive service worker restarts

### Changed
- **ChatGPT insertion** — Added nativeValueSetter for textarea inputs + synthetic clipboard paste fallback for contenteditable
- **Gemini insertion** — Same robust insertion strategy with Quill-aware cleanup
- **Grok insertion** — Fixed contenteditable fallback path (textarea path was already correct)
- **advanceToRound** — Uses run's active providers instead of global PROVIDERS constant

### Notes
- Root cause: `el.textContent = ""` corrupted ProseMirror's internal DOM, causing `execCommand("insertText")` to fail silently
- Send button was often disabled because editor state wasn't updated, now polling waits for it
- Extension mode was broken if only 2 of 3 providers were connected (round never completed)

---

## [0.0.14] - 2026-02-10 - Use official brand logos for AI providers

### Changed
- **ChatGPT icon** — Updated to official OpenAI logo (interlocking rings)
- **Gemini icon** — Updated to Google Gemini sparkle/star logo
- **Grok icon** — Updated to X logo (xAI branding)
- **Claude icon** — Updated to Anthropic's stylized "A" logo
- **Kimi icon** — Added Moonshot Kimi logo design

### Added
- **simple-icons package** — Installed for brand icon reference

### Notes
- All icons now use official brand assets for proper visual identity
- Icons are recognizable and match what users see on the respective platforms

---

## [0.0.13] - 2026-02-10 - Add brand-specific colors and custom icons for providers

### Added
- **Custom provider icons** — Each model now has its own unique icon (ChatGPT, Gemini, Grok, Claude, Kimi)
- **Brand-specific colors** — Connection dots and accents now use model-specific colors
  - ChatGPT: Green (#10b981)
  - Gemini: Blue (#3b82f6)
  - Grok: Orange (#f97316)
- **ProviderIcon component** — Reusable SVG icon component for all providers
- **Provider color constants** — Centralized color definitions in types.ts

### Changed
- **Replaced MessageSquare icon** — Now using custom provider-specific icons
- **Visual distinction** — Each model is now visually distinct at a glance

---

## [0.0.12] - 2026-02-10 - Add configurable max rounds for API mode

### Added
- **Max Rounds selector** — Users can now configure how many rounds the conversation should run (1-5 rounds)
- **Dynamic round generation** — Conversation automatically ends after the selected number of rounds
- **Default: 3 rounds** — Maintains the original 3-round default behavior

### Changed
- **Model Selection layout** — Changed from 2-column to 3-column grid to accommodate max rounds control
- **Round limit flexibility** — No longer hardcoded to exactly 3 rounds

---

## [0.0.11] - 2026-02-10 - Add model selection UI for API mode

### Added
- **Model selection interface** — Users can now select which 2 models to use in API mode
- **Extended provider types** — Added Claude and Kimi to model list (marked as "in progress")
- **Model availability status** — Visual indicators show which models are available vs in-progress
- **Default configuration** — ChatGPT (left) and Gemini (right) as default models

### Changed
- **Disabled Grok** — Removed Grok from default API providers (marked as in-progress)
- **2-column layout** — API mode now displays 2 agent panels instead of 3
- **Dynamic model filtering** — Only available models can be used in API runs

### Fixed
- **Grok API errors** — No longer shows "Missing XAI_API_KEY" error by default

---

## [0.0.10] - 2026-02-10 - Add Layer-2 AI architecture documentation

### Added
- **Layer-2 AI system philosophy** — Document the four-layer design: Orchestration, Memory, Verification, Writing
- **Learning outcomes section** — Comprehensive guide to what you learn from AI/ML, Systems, and Industry perspectives
- **TODO milestones** — Added Phases 2-4 with 9 new milestones covering Memory, Verification, and Writing layers
- **Tech stack separation** — Clear division between "Current Tech Stack" and "Planned Tech Stack"

### Changed
- **Project overview** — Updated to explain Layer-2 approach (building systems on top of LLMs without training new models)
- **Architecture clarity** — Marked all unimplemented features with (TODO) labels
- **Implementation status** — Detailed current vs planned phases

### Notes
- This is a documentation-only release clarifying project vision and roadmap
- No code changes in this version

---

## [0.0.9] - 2026-02-10 - Configure and test API provider connections

### Added
- **`.env.local` template** — Created environment file with API key placeholders for Gemini and OpenAI
- **API connection testing** — Verified Gemini API working with live requests

### Changed
- **Gemini model** — Updated from `gemini-2.0-flash-lite` to `gemini-2.5-flash-lite` (latest cheap model)
- **OpenAI model** — Confirmed `gpt-4o-mini` as the configured model (cheapest GPT option)
- **Documentation** — Added setup instructions for API keys in README

### Fixed
- **Model compatibility** — Fixed Gemini API endpoint and model name to use available v1 models

### Notes
- Gemini API fully functional with provided key
- OpenAI API requires billing setup (free tier quota exhausted)

---

## [0.0.8] - 2026-02-06 - Glassmorphism UI redesign with Pencil

### Changed
- **Full UI redesign** — Used VSCode extension Pencil to prototype a glassmorphism dark theme, then applied it across all pages
- **globals.css** — New dark color system: `#0B1020` background, `#FFFFFF14` glass cards, `#22D3EE` cyan accent, `#C7D2FE` indigo text
- **Button component** — Cyan default, translucent outline/secondary/ghost variants with rounded-xl corners
- **Card component** — Glass background (`bg-white/8`) with `backdrop-blur-sm` and translucent borders
- **Separator** — Updated from gray to `bg-white/10`
- **Sidebar** — Dark background with cyan active states, indigo nav links
- **Topbar** — Dark backdrop blur header with translucent borders
- **Landing page** — Removed badge pill, hero with glass stat cards, glass tool cards, translucent step cards
- **Agent page** — Pill tab switcher, dark glass run controls/panels/transcript, cyan mode toggle, dark error banners
- **Verifier & Writer pages** — Restyled Coming Soon cards with indigo text on dark glass

---

## [0.0.7] - 2026-02-06 - Add API-based agent communication flow

### Added
- **API mode tab** on `/agent` — New "Agent Communication (API)" tab for running multi-model discussions via API keys instead of the Chrome extension
- **Server route** (`app/api/agent-api/route.ts`) — Calls OpenAI (`gpt-4o-mini`), Gemini (`gemini-2.0-flash-lite`), and Grok (`grok-2-latest`) APIs with turn-based prompting
- **Run source tracking** — `RunSource` type (`"extension"` | `"api"`) added to `lib/types.ts` and `lib/store.ts` for separate history per mode
- **`.env.local`** — API key storage for `OPENAI_API_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY`
- **`showMock` prop** on `RunControls` — Hides mock button in API mode

### Changed
- `RunControls` accepts optional `showMock` prop (defaults to `true`)
- Agent page manages two independent run states (extension vs API)
- History panel filters runs by source

---

## [0.0.6] - 2026-02-05 - Debug pipeline: fix content scripts, error visibility, tab validation

### Fixed
- **Content scripts (v2 rewrite)** — All 3 provider scripts rewritten with:
  - 8+ fallback CSS selectors per element (input, send button, assistant messages)
  - 5-strategy text insertion: native setter, direct value, execCommand, InputEvent, innerHTML
  - Enter key fallback when send button is not found
  - MutationObserver + polling hybrid for response detection
  - On-page debug overlay showing real-time step-by-step status
  - SPA hydration retry (2s delay if input not found initially)
- **Error visibility** — Agent page now shows errors from providers:
  - `providerErrors` state with red banner above agent panels
  - AgentPanel displays errors inline with code and message
  - Sending state clears when error arrives
  - Errors clear on new run
- **Background script** — Added `chrome.tabs.get()` check before sending messages:
  - Returns `TAB_CLOSED` error if provider tab was closed
  - Returns `SEND_FAILED` with refresh instructions if content script unreachable
  - Detailed logging for every message route

### Added
- `tools/ws-bus/monitor.js` — Diagnostic tool to watch all WS bus traffic in real time
- `terminalog.md` — Pipeline debug log documenting all diagnosed issues and fixes

---

## [0.0.5] - 2026-02-05 - Add Chrome extension skeleton + provider automation scripts

### Added
- **Chrome Extension** (Manifest v3) in `extension/` directory:
  - `manifest.json` — MV3 config with host permissions for ChatGPT, Gemini, Grok
  - `background.js` — Service worker: WS bus connection, tab registry, message routing
  - `providers/chatgpt.js` — Content script: auto-paste, auto-send, DOM response scraping
  - `providers/gemini.js` — Content script: Gemini-specific selectors and automation
  - `providers/grok.js` — Content script: Grok-specific selectors and automation
  - `popup.html` + `popup.js` — Extension popup showing WS status and connected providers
  - `icons/` — Generated PNG icons (16/48/128px) with generator script
- All three provider scripts implement the full message protocol: `HELLO_PROVIDER`, `SEND_PROMPT`, `PROMPT_SENT`, `NEW_MESSAGE`, `ERROR`
- Background worker handles tab lifecycle (cleanup on tab close) and status broadcasting

---

## [0.0.4] - 2026-02-05 - Implement agent orchestrator UI + local message bus

### Added
- **WebSocket Message Bus** (`tools/ws-bus/server.js`): Broadcast relay server on `ws://localhost:3333` with PING/ACK support
- **WS Client** (`lib/ws.ts`, `lib/useWebSocket.ts`): Browser-side WebSocket client with auto-reconnect and React hook
- **Type System** (`lib/types.ts`): Full TypeScript types for providers, runs, messages, and the WS message protocol
- **Prompt Templates** (`lib/prompts.ts`): Round 1/2/3 prompt generators for both debate and collaboration modes
- **Run Store** (`lib/store.ts`): localStorage-based persistence for runs and transcripts
- **Agent Page** (`app/agent/page.tsx`): Complete orchestrator UI with:
  - Topic input and debate/collaboration mode toggle
  - 3 color-coded agent panels (ChatGPT/Gemini/Grok)
  - Round indicator (R1/R2/R3) with state-driven styling
  - Transcript timeline with chronological message display
  - Run history panel with load/delete functionality
  - Mock run mode for testing without the Chrome extension
  - Start/Stop controls with real-time status badges
- **UI Components**: `AgentPanel`, `TranscriptTimeline`, `RunControls`, `ConnectionStatus`
- **Package scripts**: `npm run bus`, `npm run dev:all` (concurrently runs Next.js + WS bus)
- Installed `ws`, `concurrently`, `@types/ws`

---

## [0.0.3] - 2026-02-05 - Plan Phase 1: Agent Communication architecture

### Added
- Created TODO.md to track development milestones and progress
- Defined 8 implementation milestones for Agent Communication (Hybrid Mode)
- Updated README.md with Agent Communication hybrid architecture details
  - HubAI orchestrator (Next.js)
  - Chrome extension for provider automation
  - Local WebSocket message bus (ws://localhost:3333)
  - Message protocol and round-based orchestration flow

### Changed
- Updated project documentation structure (README for overview, TODO for progress tracking)

---

## [0.0.2] - 2026-02-05 - Add CHANGELOG.md for version tracking

### Added
- Created CHANGELOG.md to track all version changes
- Documented changelog format and versioning conventions

---

## [0.0.1] - 2026-02-05 - Initial commit

### Added
- Complete Next.js 16 project setup with App Router and Turbopack
- TypeScript configuration with strict mode and path aliases
- Tailwind CSS v4 with custom theme configuration
- shadcn/ui components: Button, Card, Separator
- Responsive layout with Sidebar and Topbar navigation
- Landing page with Hero, ToolCards, HowItWorks, and Footer sections
- Three tool placeholder pages: Agent (`/agent`), Verifier (`/verifier`), Writer (`/writer`)
- TanStack Query provider setup for future API integration
- `start.sh` bash script for project initialization and Chrome auto-open
- Comprehensive documentation: README.md, BUILD_SUMMARY.md, VISUAL_GUIDE.md, PROJECT_STRUCTURE.md, QUICK_REFERENCE.md

### Fixed
- Tailwind CSS v4 compatibility: migrated from `tailwindcss` to `@tailwindcss/postcss` plugin
- Replaced custom color utility classes with standard Tailwind grays for v4 compatibility
- Added `"use client"` directive to Hero component for onClick handler support
