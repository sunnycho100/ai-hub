# Changelog

All notable changes to AI Hub will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Version Format
- **MAJOR.MINOR.PATCH**
- Each commit increments the PATCH version
- Version title matches the git commit message
- Brief description summarizes the changes

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
