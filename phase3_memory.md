# Phase 3 — AI Memory & Personalization Layer

> **TL;DR:** Build a multi-tier memory system that captures conversation context in real-time (short-term), consolidates it into durable user profiles during idle periods (long-term), and organizes knowledge into categorized `.md` files — enabling AI agents to remember user preferences, writing style, satisfaction signals, and topic history across sessions. Architecture inspired by Mem0, Letta/MemGPT, Zep/Graphiti, and ChatGPT Memory.

---

## Table of Contents

1. [Industry Benchmark Research](#1-industry-benchmark-research)
2. [Architecture Overview](#2-architecture-overview)
3. [Memory Taxonomy](#3-memory-taxonomy)
4. [Data Model & Schema](#4-data-model--schema)
5. [Memory File System (.md)](#5-memory-file-system-md)
6. [Implementation Plan](#6-implementation-plan)
7. [Context Injection Strategy](#7-context-injection-strategy)
8. [Consolidation Pipeline](#8-consolidation-pipeline)
9. [API Design](#9-api-design)
10. [Verification & Testing](#10-verification--testing)
11. [Key Decisions](#11-key-decisions)

---

## 1. Industry Benchmark Research

### 1.1 Mem0 (mem0.ai) — 47.7k ⭐

**What they do:** Universal memory layer for AI agents. Y Combinator S24.

**Architecture:**
- **Multi-level memory:** User, Session, and Agent state with adaptive personalization
- **Memory pipeline:** Messages → LLM extraction → Conflict resolution → Vector + Graph storage
- **Key insight:** Every `add()` call passes through an LLM that extracts key facts/decisions/preferences, then checks for duplicates and contradictions before storing
- **Storage:** Vector store (managed) + optional graph store for relationships
- **Retrieval:** Hybrid search across all memory layers, ranking user memories first → session → raw history

**Key takeaways:**
- The 3-step pipeline: **Extract → Deduplicate/Resolve → Store**
- Separating `user_id` (permanent) from `session_id` (ephemeral) scoping
- Automatic memory inference from conversations (not just explicit "remember this")
- Conflict resolution — latest truth wins when contradictions detected

**Benchmark numbers:**
- +26% accuracy over OpenAI Memory (LOCOMO benchmark)
- 91% faster than full-context approaches
- 90% fewer tokens than full-context

---

### 1.2 Letta / MemGPT — Stateful Agents with Sleep-Time Compute

**What they do:** Agents that maintain memory and context across conversations, with background "sleep-time" processing.

**Architecture:**
- **Memory Blocks:** Labeled sections of context window with character limits. Blocks can be shared between agents.
- **Sleep-time agents:** Background agents that run every N steps (default: 5), reflecting on conversation history to derive "learned context" — essentially a secondary agent that summarizes and updates memory asynchronously.
- **Core memory vs. Archival memory:** Core = always in context window (pinned to system prompt). Archival = searchable but not always present.
- **Message persistence:** ALL messages stored in DB, even after eviction from context window. Agents can search old messages via tools.

**Key takeaways:**
- **Sleep-time pattern** — a background process that consolidates memory during idle periods. This maps directly to our "when user is idle, convert short-term to long-term" requirement.
- **Memory blocks** — categorized, labeled memory sections with size limits. Maps to our `.md` file approach.
- **Frequency-based consolidation** — configurable: every N interactions or every N minutes.
- **Tool-based memory access** — agents can `conversation_search` and `archival_memory_search` as tools.

---

### 1.3 Zep + Graphiti — Temporal Knowledge Graphs

**What they do:** End-to-end context engineering platform with sub-200ms retrieval.

**Architecture:**
- **Graphiti:** Open-source temporal knowledge graph framework. Triplets: Entity → Relationship → Entity, with `valid_at` and `invalid_at` timestamps.
- **Bi-temporal data model:** Tracks both when events occurred AND when they were ingested — allows accurate point-in-time queries.
- **Hybrid retrieval:** Semantic embeddings + keyword (BM25) + graph traversal.
- **Contradiction handling:** Temporal edge invalidation (mark old facts as invalid, not delete).

**Key takeaways:**
- **Temporal awareness** — memories have `valid_at`/`invalid_at`, not just `created_at`. User preferences change over time.
- **Relationship extraction** — not just flat facts but connected entities (user → prefers → dark mode, user → works_in → AI research).
- **Contradiction invalidation** — don't delete old memories, mark them as superseded.

---

### 1.4 ChatGPT Memory (OpenAI)

**What they do:** Two-tier memory for ChatGPT users — saved memories + chat history reference.

**Architecture:**
- **Saved memories:** Explicit facts the user asked ChatGPT to remember (or ChatGPT inferred should be saved). Stored separately from chat history. Always included in context.
- **Reference chat history:** ChatGPT references past conversations to personalize. Unlike saved memories, these insights change over time based on recency and frequency.
- **Automatic management:** Prioritizes memories by recency and frequency of topic discussion. Less important memories move to "background."
- **Memory versioning:** Users can view and restore prior versions of saved memories.

**Key takeaways:**
- **Two-tier system** matches our short-term / long-term split
- **Automatic inference** — ChatGPT saves memories without user explicitly asking (when it detects useful info)
- **Recency × frequency prioritization** — memories that are both recent and frequently referenced stay "top of mind"
- **Memory versioning** — track history of changes to each memory
- **Privacy controls** — explicit user control over what's remembered, ability to forget

---

### 1.5 OpenAI Conversations API

**What they do:** Server-side conversation state persistence as durable objects.

**Key features:**
- Conversations are long-running objects with durable IDs
- Can be used across sessions, devices, or jobs
- Server-side compaction when context window fills up
- Standalone compact endpoint for explicit compaction

**Key takeaways:**
- **Compaction** — summarize old conversation turns to fit within context limits
- **Durable conversation IDs** — our `runId` already serves this purpose

---

### 1.6 Benchmark Summary

| Feature | Mem0 | Letta | Zep/Graphiti | ChatGPT | **Our Plan** |
|---------|------|-------|--------------|---------|-------------|
| Multi-level memory | ✅ User/Session/Agent | ✅ Core/Archival | ✅ Episode/Entity/Community | ✅ Saved/Chat History | ✅ Short-term/Long-term/Profile |
| Background consolidation | ❌ Real-time only | ✅ Sleep-time agents | ✅ Async graph building | ✅ Lightweight background | ✅ Idle-triggered + session-end |
| Temporal tracking | ❌ | ❌ | ✅ Bi-temporal | ⚠️ Recency only | ✅ valid_at/invalid_at |
| Contradiction handling | ✅ LLM-based | ❌ | ✅ Edge invalidation | ✅ Auto-update | ✅ Supersede pattern |
| Categorized memory | ❌ Metadata tags | ✅ Memory blocks | ✅ Entity types | ❌ Flat list | ✅ Typed .md files |
| Semantic search | ✅ Vector store | ✅ Archival search | ✅ Hybrid search | ❌ | ✅ pgvector |
| User control | ✅ CRUD API | ✅ API + tools | ✅ API | ✅ Settings UI | ✅ Memory dashboard |
| Self-hostable | ✅ OSS | ✅ OSS | ⚠️ Cloud only now | ❌ | ✅ Fully self-hosted |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Hub Frontend                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Agent   │  │  Writer  │  │ Verifier │  │Memory Dashboard│  │
│  │  Page    │  │  Page    │  │  Page    │  │   (new)       │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬───────┘  │
│       │              │              │                │          │
│  ┌────▼──────────────▼──────────────▼────────────────▼───────┐  │
│  │              Memory Context Provider (React)              │  │
│  │  • useMemory() hook                                       │  │
│  │  • Injects relevant memories into prompts                 │  │
│  │  • Captures new memories from conversations               │  │
│  └──────────────────────┬────────────────────────────────────┘  │
└─────────────────────────┼──────────────────────────────────────┘
                          │ REST API
┌─────────────────────────▼──────────────────────────────────────┐
│                     Next.js API Routes                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ /api/memory  │  │/api/memory/  │  │ /api/memory/         │  │
│  │   /capture   │  │  consolidate │  │   search             │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│  ┌──────▼─────────────────▼──────────────────────▼───────────┐  │
│  │              Memory Service Layer                         │  │
│  │  • ShortTermBuffer (in-memory + DB)                       │  │
│  │  • ConsolidationEngine (LLM-powered)                      │  │
│  │  • MemoryFileManager (.md CRUD)                           │  │
│  │  • SemanticSearch (pgvector)                              │  │
│  │  • IdleDetector (timer + session tracking)                │  │
│  └──────┬─────────────────┬──────────────────────┬───────────┘  │
└─────────┼─────────────────┼──────────────────────┼─────────────┘
          │                 │                      │
┌─────────▼─────────────────▼──────────────────────▼─────────────┐
│                     Storage Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  PostgreSQL  │  │   pgvector   │  │  Memory .md Files    │  │
│  │  (memories,  │  │  (embeddings │  │  (human-readable     │  │
│  │   sessions,  │  │   for search)│  │   per-category)      │  │
│  │   profiles)  │  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. Memory Taxonomy

### 3.1 Short-Term Memory (Session Buffer)

**Lifetime:** Current session only (minutes to hours)
**Purpose:** Keep the current conversation coherent, capture raw signals
**Storage:** PostgreSQL `short_term_memories` table + in-memory buffer
**Examples:**
- "User just asked about React performance optimization"
- "User expressed frustration with the previous response"
- "User is comparing Next.js vs Remix"

### 3.2 Long-Term Memory (Consolidated Knowledge)

**Lifetime:** Weeks to forever (until superseded or deleted)
**Purpose:** Persistent user knowledge, cross-session personalization
**Storage:** PostgreSQL `long_term_memories` table + pgvector embeddings + `.md` files
**Examples:**
- "User prefers concise, bullet-point responses"
- "User is a senior frontend engineer specializing in React/TypeScript"
- "User dislikes overly verbose explanations"

### 3.3 Memory Categories (→ .md files)

| Category | File | What It Captures |
|----------|------|-----------------|
| **Writing Style** | `memory/writing_style.md` | Tone preferences, formatting rules, verbosity level, code style, language patterns |
| **Output Satisfaction** | `memory/output_satisfaction.md` | What responses the user liked/disliked, quality signals, revision patterns |
| **User Profile** | `memory/user_profile.md` | Name, role, expertise areas, interests, communication style, timezone |
| **Topic Knowledge** | `memory/topic_knowledge.md` | Subjects discussed, depth of understanding per topic, relationships between topics |
| **Session History** | `memory/session_history.md` | Condensed summaries of each conversation session, key decisions made |

---

## 4. Data Model & Schema

### 4.1 PostgreSQL Schema

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- User profiles (future multi-user support)
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions track conversation windows
CREATE TABLE sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  run_id        TEXT,
  started_at    TIMESTAMPTZ DEFAULT NOW(),
  ended_at      TIMESTAMPTZ,
  idle_since    TIMESTAMPTZ,
  status        TEXT DEFAULT 'active',
  metadata      JSONB DEFAULT '{}'
);

-- Short-term memory: raw signals captured during a session
CREATE TABLE short_term_memories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES sessions(id),
  user_id       UUID REFERENCES users(id),
  type          TEXT NOT NULL,
  content       TEXT NOT NULL,
  source        TEXT,
  provider      TEXT,
  round         INTEGER,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Long-term memory: consolidated, deduplicated, categorized
CREATE TABLE long_term_memories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  category      TEXT NOT NULL,
  content       TEXT NOT NULL,
  confidence    REAL DEFAULT 1.0,
  importance    REAL DEFAULT 0.5,
  source_sessions UUID[],
  valid_at      TIMESTAMPTZ DEFAULT NOW(),
  invalid_at    TIMESTAMPTZ,
  superseded_by UUID REFERENCES long_term_memories(id),
  version       INTEGER DEFAULT 1,
  embedding     vector(1536),
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast retrieval
CREATE INDEX idx_ltm_user_category ON long_term_memories(user_id, category) WHERE invalid_at IS NULL;
CREATE INDEX idx_ltm_embedding ON long_term_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_ltm_valid ON long_term_memories(user_id) WHERE invalid_at IS NULL;
CREATE INDEX idx_stm_session ON short_term_memories(session_id);
CREATE INDEX idx_sessions_user ON sessions(user_id, status);

-- Topic graph: relationships between discussed topics
CREATE TABLE topic_edges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  source_topic  TEXT NOT NULL,
  target_topic  TEXT NOT NULL,
  relationship  TEXT NOT NULL,
  strength      REAL DEFAULT 0.5,
  valid_at      TIMESTAMPTZ DEFAULT NOW(),
  invalid_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 TypeScript Types → `lib/memory/types.ts`

---

## 5. Memory File System (.md)

### 5.1 Directory Structure

```
memory/
├── writing_style.md
├── output_satisfaction.md
├── user_profile.md
├── topic_knowledge.md
├── session_history.md
└── .memory_meta.json
```

### 5.2 Files are human-readable projections of DB state

Each category `.md` file is regenerated after every consolidation from the structured data in PostgreSQL. They are git-trackable, human-editable, and serve as the "source of truth" for manual review.

---

## 6. Implementation Plan

| Step | What | Files |
|------|------|-------|
| 1 | DB types, schema, connection | `lib/memory/types.ts`, `lib/memory/schema.sql`, `lib/memory/db.ts` |
| 2 | Memory service core | `lib/memory/MemoryService.ts`, `ShortTermBuffer.ts`, `LongTermStore.ts`, `MemoryFileManager.ts`, `EmbeddingService.ts` |
| 3 | Consolidation engine | `lib/memory/ConsolidationEngine.ts`, `lib/memory/prompts.ts`, `lib/memory/IdleDetector.ts` |
| 4 | API routes | `app/api/memory/*/route.ts` (capture, search, consolidate, session, files, manage) |
| 5 | Context injection | Modify `lib/prompts.ts`, `hooks/useApiRun.ts`, `app/api/agent-api/route.ts` |
| 6 | React integration | `hooks/useMemory.ts`, `components/memory/*.tsx` |
| 7 | Memory dashboard page | `app/memory/page.tsx` |

---

## 7. Context Injection Strategy

Before each prompt is sent, call `MemoryService.getContext(userId, topic)`:
- Vector search top-10 memories by cosine similarity
- Re-rank: `score = (0.5 × similarity) + (0.3 × recency) + (0.2 × importance)`
- Category balance: at least 1 memory from each relevant category
- Token budget: hard cap at 500 tokens
- Inject as `[USER CONTEXT]` block in system prompt

---

## 8. Consolidation Pipeline

1. **Gather** — All short-term memories + session messages
2. **Extract** — LLM call to extract categorized facts (writing_style, satisfaction, profile, topics, session)
3. **Dedup & Conflict** — Compare against existing long-term memories, supersede contradictions
4. **Embed & Store** — Generate vector embeddings, insert into PostgreSQL
5. **Update .md** — Regenerate category files from DB state

**Triggers:**
- **5-min idle:** Lightweight rule-based extraction (no LLM) — keyword detection for preferences, feedback, topics
- **Session end:** Deep LLM-powered consolidation across all categories

---

## 9. API Design

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/memory/session` | Start a new memory session |
| PATCH | `/api/memory/session` | Update session status (idle/active/closed) |
| POST | `/api/memory/capture` | Capture a short-term memory |
| POST | `/api/memory/consolidate` | Trigger consolidation for a session |
| POST | `/api/memory/search` | Semantic search across long-term memories |
| GET | `/api/memory/context` | Get formatted memory context for prompt injection |
| GET | `/api/memory/files` | List all memory .md file contents |
| GET | `/api/memory/files/[category]` | Get specific .md file content |
| PUT | `/api/memory/files/[category]` | Update a .md file manually |
| GET | `/api/memory/manage` | List all long-term memories with filters |
| DELETE | `/api/memory/manage/[id]` | Delete a specific memory |

---

## 10. Verification & Testing

```bash
# Start PostgreSQL with pgvector
docker run -d --name ai-hub-pg -e POSTGRES_PASSWORD=aihub -p 5432:5432 pgvector/pgvector:pg16

# Apply schema
psql -h localhost -U postgres -d aihub -f lib/memory/schema.sql

# Test capture
curl -X POST http://localhost:3000/api/memory/capture \
  -H 'Content-Type: application/json' \
  -d '{"sessionId":"test","type":"preference","content":"User prefers dark mode","source":"inferred"}'

# Test search
curl -X POST http://localhost:3000/api/memory/search \
  -H 'Content-Type: application/json' \
  -d '{"query":"UI preferences","userId":"default","limit":5}'
```

---

## 11. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | PostgreSQL + pgvector | Semantic search is core; pgvector is mature, scales to production |
| Embeddings | OpenAI text-embedding-3-small | Already have API key; cheap ($0.02/1M tokens), high quality |
| LLM for consolidation | Reuse existing providers | No new infrastructure needed |
| Memory categories | 5 typed .md files | Human-readable, git-trackable |
| Idle detection | Hybrid (5min + session-end) | Quick signals + deep processing |
| Conflict resolution | Supersede with invalid_at | Preserves history, enables undo |
| Context budget | 500 tokens | Prevents prompt bloat |
| User model | Default user for MVP | No auth exists; easy to extend later |

---

## Appendix: New File Tree

```
lib/memory/
├── types.ts
├── db.ts
├── schema.sql
├── MemoryService.ts
├── ShortTermBuffer.ts
├── LongTermStore.ts
├── ConsolidationEngine.ts
├── EmbeddingService.ts
├── MemoryFileManager.ts
├── IdleDetector.ts
└── prompts.ts

app/api/memory/
├── capture/route.ts
├── consolidate/route.ts
├── search/route.ts
├── context/route.ts
├── session/route.ts
├── files/route.ts
├── files/[category]/route.ts
└── manage/route.ts

hooks/
├── useMemory.ts

components/memory/
├── MemoryDashboard.tsx
├── MemoryPanel.tsx
└── MemoryFileViewer.tsx

app/memory/
├── page.tsx

memory/
├── writing_style.md
├── output_satisfaction.md
├── user_profile.md
├── topic_knowledge.md
├── session_history.md
└── .memory_meta.json
```
