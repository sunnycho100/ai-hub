# AI Hub – Development TODO

This document tracks active development progress for AI Hub.
Each section represents a milestone suitable for a standalone Git commit.

---

## Phase 1 – Agent Communication (Hybrid Web + Chrome Extension)

### Milestone 1 – Local Message Bus
- [ ] Create WebSocket server (`ws://localhost:3333`)
- [ ] Add HubAI WebSocket client
- [ ] Display connection status on `/agent`
- [ ] Test PING / ACK messaging

**Status:** ⬜ Not started

---

### Milestone 2 – Agent Orchestrator UI (Frontend Only)
- [ ] Topic input
- [ ] Debate / Collaboration mode toggle
- [ ] Round indicator (R1 / R2 / R3)
- [ ] Agent panels (ChatGPT / Gemini / Grok)
- [ ] Transcript timeline
- [ ] LocalStorage-based run persistence

**Status:** ⬜ Not started

---

### Milestone 3 – Chrome Extension Skeleton
- [ ] Manifest v3 setup
- [ ] Background service worker
- [ ] Provider registration (`HELLO_PROVIDER`)
- [ ] WS connection from extension
- [ ] Show connected providers in HubAI UI

**Status:** ⬜ Not started

---

### Milestone 4 – ChatGPT Provider Automation
- [ ] Detect ChatGPT tab
- [ ] Paste prompt into input
- [ ] Auto-click send
- [ ] Extract assistant messages
- [ ] Emit `NEW_MESSAGE` events
- [ ] Error handling for selector failures

**Status:** ⬜ Not started

---

### Milestone 5 – Gemini Provider Automation
- [ ] Paste + auto-send
- [ ] Extract assistant messages
- [ ] Emit provider health signals

**Status:** ⬜ Not started

---

### Milestone 6 – Grok Provider Automation
- [ ] Paste + auto-send
- [ ] Extract assistant messages
- [ ] Emit provider health signals

**Status:** ⬜ Not started

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
- ✅ Phase 0: Project setup and landing page (v0.0.1)
  - Next.js 16 with App Router
  - Tailwind CSS v4
  - shadcn/ui components
  - Responsive layout
  - Three placeholder pages: `/agent`, `/verifier`, `/writer`
