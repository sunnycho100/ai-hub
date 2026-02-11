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
- [x] Pipeline debug analysis and root cause identification
- [x] Content script v2 rewrite (multi-strategy selectors + paste fallbacks)
- [x] Error visibility in agent UI (error banner + inline errors)
- [x] Tab validity checking in background script
- [x] On-page debug overlay in provider tabs
- [x] WS bus diagnostic monitor tool
- [x] API provider configuration (Gemini + OpenAI)
- [x] API connection testing and model validation
- [ ] Provider selector versioning
- [ ] Manual resend controls
- [ ] Paste-only fallback mode
- [ ] Transcript export (JSON)

**Status:** 🔶 In Progress

---

## Phase 2 – LLM Memory & State Layer (TODO)

### Milestone 9 – Memory Architecture
- [ ] Design memory classification system (short-term vs long-term)
- [ ] Create PostgreSQL schema with JSONB for flexible memory storage
- [ ] Implement pgvector extension for semantic search
- [ ] Build Markdown-based memory file system
- [ ] Design memory retrieval API

**Status:** ⬜ Not started

---

### Milestone 10 – Memory Capture & Storage
- [ ] Capture user interactions and decisions during runs
- [ ] Classify information into memory categories
- [ ] Store memories in Markdown and JSON formats
- [ ] Implement memory summarization using LLM APIs
- [ ] Build memory versioning and update logic

**Status:** ⬜ Not started

---

### Milestone 11 – Memory Retrieval & Context Injection
- [ ] Build semantic search over memory database
- [ ] Implement relevance ranking for memory retrieval
- [ ] Design context injection strategies
- [ ] Add memory decay and cleanup policies
- [ ] Create memory management UI

**Status:** ⬜ Not started

---

## Phase 3 – LLM Verification & Trust Layer (TODO)

### Milestone 12 – Claim Extraction
- [ ] Build claim extraction from LLM responses
- [ ] Classify claims by verification priority
- [ ] Identify factual vs opinion-based statements
- [ ] Create claim database schema

**Status:** ⬜ Not started

---

### Milestone 13 – Evidence Verification
- [ ] Integrate web search APIs for fact-checking
- [ ] Build internal document RAG system
- [ ] Implement verification LLM calls (low temperature)
- [ ] Design confidence scoring algorithm
- [ ] Store verification results in PostgreSQL

**Status:** ⬜ Not started

---

### Milestone 14 – Logic & Consistency Checks
- [ ] Build logical consistency validator
- [ ] Implement cross-reference checking
- [ ] Design gatekeeper decision logic
- [ ] Create verification audit logs
- [ ] Add verification UI indicators

**Status:** ⬜ Not started

---

## Phase 4 – AI Writing Layer (TODO)

### Milestone 15 – Style Collection & Analysis
- [ ] Build user writing sample upload system
- [ ] Implement LLM-based style analysis
- [ ] Extract tone, structure, and pattern features
- [ ] Identify forbidden patterns and rules
- [ ] Generate structured style profile (JSON)

**Status:** ⬜ Not started

---

### Milestone 16 – Style-Conditioned Generation
- [ ] Design style constraint injection system
- [ ] Build embeddings-based example retrieval
- [ ] Implement rule-based style filters
- [ ] Create style verification pipeline
- [ ] Add iterative style refinement

**Status:** ⬜ Not started

---

### Milestone 17 – Writer UI & Workflows
- [ ] Build writing sample management interface
- [ ] Create style profile editor
- [ ] Implement multi-mode writing (academic, casual, technical)
- [ ] Add before/after comparison view
- [ ] Build style learning feedback loop

**Status:** ⬜ Not started

---

## Implementation History

### Completed
- ✅ Milestone 8 (partial): Pipeline Debugging & Fixes (v0.0.6)
  - Root cause: stale selectors + silent error swallowing + no tab validation
  - Content scripts v2: 8+ fallback selectors, 5-strategy paste, debug overlay
  - Error visibility: providerErrors state, red banner, inline AgentPanel errors
  - Background script: chrome.tabs.get() validation, detailed logging
  - WS bus diagnostic monitor tool
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
