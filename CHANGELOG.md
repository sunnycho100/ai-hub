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
