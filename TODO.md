# AI Hub – Development TODO

This document tracks active development progress for AI Hub.
Each section represents a milestone suitable for a standalone Git commit.

---

## Phase 1 – Agent Communication (Hybrid Web + Chrome Extension)

### Milestone 1 – Local Message Bus
- [x] Create WebSocket server (`ws://localhost:3333`)
- [x] Add HubAI WebSocket client
- [x] Display connection status on `/agent`
- [x] Test PING / ACK messaging

**Status:** ✅ Complete

---

### Milestone 2 – Agent Orchestrator UI (Frontend Only)
- [x] Topic input
- [x] Debate / Collaboration mode toggle
- [x] Round indicator (R1 / R2 / R3)
- [x] Agent panels (ChatGPT / Gemini / Grok)
- [x] Transcript timeline
- [x] LocalStorage-based run persistence

**Status:** ✅ Complete

---

### Milestone 3 – Chrome Extension Skeleton
- [x] Manifest v3 setup
- [x] Background service worker
- [x] Provider registration (`HELLO_PROVIDER`)
- [x] WS connection from extension
- [x] Show connected providers in HubAI UI

**Status:** ✅ Complete

---

### Milestone 4 – ChatGPT Provider Automation
- [x] Detect ChatGPT tab
- [x] Paste prompt into input
- [x] Auto-click send
- [x] Extract assistant messages
- [x] Emit `NEW_MESSAGE` events
- [x] Error handling for selector failures

**Status:** ✅ Complete

---

### Milestone 5 – Gemini Provider Automation
- [x] Paste + auto-send
- [x] Extract assistant messages
- [x] Emit provider health signals

**Status:** ✅ Complete

---

### Milestone 6 – Grok Provider Automation
- [x] Paste + auto-send
- [x] Extract assistant messages
- [x] Emit provider health signals

**Status:** ✅ Complete

---

### Milestone 7 – Multi-Agent Round Engine
- [ ] Implement run state machine
- [ ] Round completion detection (3/3 agents)
- [ ] Prompt synthesis between rounds
- [ ] Timeout + retry logic
- [ ] Stop / Resume controls

**Status:** ⬜ Not started

---

### Milestone 8 – Debugging & Stability
- [ ] Provider selector versioning
- [ ] Manual resend controls
- [ ] Paste-only fallback mode
- [ ] Transcript export (JSON)

**Status:** ⬜ Not started

---

## Implementation History

### Completed
- ✅ Milestones 3–6: Chrome Extension + All 3 Providers (v0.0.5)
  - Manifest v3 extension with background service worker
  - ChatGPT, Gemini, Grok content scripts (paste, send, scrape)
  - Extension popup UI with connection status
  - Full message protocol implementation
- ✅ Milestone 1: Local Message Bus (v0.0.4)
  - WebSocket broadcast server on port 3333
  - Browser WS client with auto-reconnect
  - Connection status indicator in UI
- ✅ Milestone 2: Agent Orchestrator UI (v0.0.4)
  - Full /agent page with topic input, mode toggle, round indicators
  - 3 agent panels (ChatGPT / Gemini / Grok) with color-coded UI
  - Transcript timeline with chronological message display
  - Run state machine (IDLE → R1 → R2 → R3 → DONE)
  - Mock run mode for local testing without Chrome extension
  - localStorage-based run persistence with history panel
  - Prompt templates for all 3 rounds (debate & collaboration)
  - TypeScript message protocol for WS communication
- ✅ Phase 0: Project setup and landing page (v0.0.1)
  - Next.js 16 with App Router
  - Tailwind CSS v4
  - shadcn/ui components
  - Responsive layout
  - Three placeholder pages: `/agent`, `/verifier`, `/writer`
