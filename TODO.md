# AI Hub – Development TODO

This document tracks active development progress for AI Hub.
Each section represents a milestone suitable for a standalone Git commit.

**Roadmap order:** Reliability Engineering → Multimodal Pipeline → Verifiable Outputs → Memory & State → AI Writing

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
- [x] Gemini response extraction fix (updated DOM selectors for 2025 structure)
- [x] ChatGPT search/thinking mode text filtering (strip Sources/citations)
- [x] Gemini thinking mode text filtering (strip thinking indicators)
- [ ] Provider selector versioning
- [ ] Manual resend controls
- [ ] Paste-only fallback mode
- [ ] Transcript export (JSON)

**Status:** 🔶 In Progress

---

## Phase 2 – Reliability Engineering (TODO)

> **Why first?** Deterministic orchestration, audit logging, and failure handling are foundational infrastructure. Every subsequent feature (multimodal, verification, memory) depends on reproducible, observable, recoverable runs.

### Milestone 9 – Deterministic Orchestration
- [ ] Design run execution engine with reproducible step ordering
- [ ] Implement idempotent message handling (dedup, sequence IDs)
- [ ] Add configurable execution strategies (sequential, parallel, pipeline)
- [ ] Build timeout and circuit-breaker policies per provider
- [ ] Create run configuration schema (rounds, models, strategies)

**Status:** ⬜ Not started

---

### Milestone 10 – Audit Logging & Observability
- [ ] Design structured audit log schema (input, output, latency, tokens, cost)
- [ ] Implement run-level tracing with correlation IDs
- [ ] Build append-only log storage (PostgreSQL + flat files)
- [ ] Create diagnostic dashboard UI
- [ ] Add per-run cost and latency aggregation

**Status:** ⬜ Not started

---

### Milestone 11 – Failure Modes & Recovery
- [ ] Implement graceful degradation (continue with N-1 providers on failure)
- [ ] Add automatic retry with exponential backoff
- [ ] Build run replay from audit logs
- [ ] Design health monitoring and alerting
- [ ] Create failure classification and reporting

**Status:** ⬜ Not started

---

## Phase 3 – Multimodal Pipeline (TODO)

> **Why second?** Once runs are reliable and observable, we expand *what* can be ingested — images, PDFs, scanned documents — giving the agent richer context to reason over.

---

### Engineering Scoping Note

There is a critical distinction between:

1. **"I can send an image to a model."**
2. **"I built a multimodal document ingestion + grounding system."**

These are not the same thing. The goal is **B**.

#### Scope Breakdown

| Component | Estimated Time |
|---|---|
| Simple image → LLM (upload, base64, call, return JSON) | < 1 day |
| PDF ingestion MVP (page rendering, resizing, OCR fallback) | 2–3 days |
| Proper multimodal ingestion pipeline | 4–7 days |
| Production-level robust system | 1–2 weeks |

#### What Actually Takes Time

**1. PDF → Page Images (1 day)**
PDFs are messy — scanned vs text-based, multi-page, large file sizes, memory handling.
Requires: page rendering, image resizing, OCR fallback for scanned pages.
This is where most people underestimate complexity.

**2. Layout-Aware Chunking (1–2 days)**
Claiming "layout-aware chunking" means:
- Split by section headers, table blocks, figure regions
- Preserve page number + bounding box per chunk
- Store structured metadata (coordinate tracking, data schema)

**3. Vision Grounding (1–2 days)**
Claiming "vision grounding" means:
- Ask model to extract claims, figure descriptions, table rows
- Return structured output with source location
- Map grounding back to page coordinates
- Store confidence scores, log token usage + latency per call

**4. Cost Control Layer (½ day)**
Without this, bills spike:
- Resize and resolution-limit images before sending
- Reject oversized uploads (200MB+ PDFs)
- Log token usage per ingestion run

#### Strategic Goal

> **Build something that would survive a senior engineer technical interview.**

That means:
- Bounding box tracking per chunk
- Structured JSON schema for ingested documents
- Claim-to-evidence mapping
- Error logging and ablation tests
- Evaluation metrics for grounding quality

A "feature" is image upload + API call. A "system" is everything above together.

---

### Milestone 12 – Document Ingestion (MVP)
**Goal:** image/PDF upload → model call → structured JSON. Ship fast, validate the pipeline end-to-end.
- [ ] Build image/PDF upload UI with drag-and-drop
- [ ] Backend API route for file receiving and type validation
- [ ] Image: base64 encode, call GPT-4o / Gemini Vision, return structured JSON
- [ ] PDF: render pages to images (pdf.js / pdfplumber), handle scanned vs text-based
- [ ] Image resizing and resolution capping (cost control — prevent runaway token usage)
- [ ] File size limits and rejection for oversized uploads
- [ ] Store uploaded documents (S3 or local filesystem)
- [ ] Log token usage and latency per ingestion call

**Status:** ⬜ Not started  
**Estimated time:** 2–3 days

---

### Milestone 13 – Layout-Aware Chunking
**Goal:** Split documents into semantically meaningful units with coordinate metadata — not just raw text.
- [ ] Detect and split by section headers
- [ ] Identify and isolate table blocks
- [ ] Identify and isolate figure/chart regions as separate visual assets
- [ ] Preserve page number + bounding box coordinates per chunk
- [ ] Design structured chunk schema: `{ page, bbox, type, content, confidence }`
- [ ] Build chunk hierarchy (document → section → block → chunk)
- [ ] Create chunk index for downstream retrieval
- [ ] OCR fallback for scanned pages (Tesseract / cloud OCR)

**Status:** ⬜ Not started  
**Estimated time:** 1–2 days

---

### Milestone 14 – Vision Grounding
**Goal:** For each visual element, ask the model to extract structured claims. Map answers back to source locations.
- [ ] Prompt vision model to extract: claims, figure descriptions, table row data
- [ ] Return structured output per visual element (not raw text)
- [ ] Map grounding output back to page + bounding box coordinates
- [ ] Store confidence score per grounded claim
- [ ] Log token usage + latency per grounding call
- [ ] Cross-reference visual grounding with surrounding text chunks
- [ ] Design multimodal context assembly for agent conversations
- [ ] Add fallback handling for low-confidence or empty grounding results
- [ ] Build evaluation metric for grounding quality (spot-check correctness)

**Status:** ⬜ Not started  
**Estimated time:** 1–2 days

**Status:** ⬜ Not started

---

## Phase 4 – Verifiable Outputs (TODO)

> **Why third?** With reliable runs and multimodal inputs in place, we can now validate *what comes out* — decomposing responses into auditable claims with evidence-linked citations.

### Milestone 15 – Claim Extraction & Citation
- [ ] Build claim-level decomposition of LLM responses
- [ ] Implement inline source attribution and citation linking
- [ ] Classify claims (factual, opinion, inference)
- [ ] Design claim database schema and storage
- [ ] Create claim extraction UI indicators

**Status:** ⬜ Not started

---

### Milestone 16 – Evidence Retrieval & Verification
- [ ] Integrate web search APIs for fact-checking
- [ ] Build internal document RAG for evidence matching
- [ ] Implement confidence scoring per claim
- [ ] Add adversarial verification LLM calls (low temperature)
- [ ] Store verification results with evidence trails

**Status:** ⬜ Not started

---

### Milestone 17 – Evidence-Linked Reports
- [ ] Design report generation with per-claim evidence trails
- [ ] Build interactive report UI (expandable citations, source previews)
- [ ] Add export formats (Markdown, PDF, JSON)
- [ ] Implement verification audit trail and gatekeeper logic
- [ ] Create verification dashboard with aggregate trust scores

**Status:** ⬜ Not started

---

## Phase 5 – Memory & State Layer (TODO)

### Milestone 18 – Memory Architecture
- [ ] Design memory classification system (short-term vs long-term)
- [ ] Create PostgreSQL schema with JSONB for flexible memory storage
- [ ] Implement pgvector extension for semantic search
- [ ] Build Markdown-based memory file system
- [ ] Design memory retrieval API

**Status:** ⬜ Not started

---

### Milestone 19 – Memory Capture & Context Injection
- [ ] Capture user interactions and decisions during runs
- [ ] Classify and store memories in Markdown/JSON formats
- [ ] Build semantic search with relevance ranking
- [ ] Design context injection and re-injection strategies
- [ ] Add memory decay, summarization, and cleanup policies

**Status:** ⬜ Not started

---

## Phase 6 – AI Writing Layer (TODO)

### Milestone 20 – Style Analysis & Conditioned Generation
- [ ] Build user writing sample upload and analysis system
- [ ] Extract tone, structure, and pattern features into JSON profiles
- [ ] Implement style constraint injection during generation
- [ ] Create style verification pipeline with iterative refinement
- [ ] Build writer UI with multi-mode support (academic, casual, technical)

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
