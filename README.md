# AI Hub

A unified workspace for AI-powered tools — agent collaboration, content verification, and style-conditioned writing — with a Chrome extension that automates multi-model conversations across ChatGPT, Gemini, and Claude.

## Project Overview

AI Hub is a **production AI platform** built on top of existing Large Language Models (LLMs), without training new foundation models. Rather than treating LLMs as standalone chatbots, AI Hub adds the engineering layers needed for real-world reliability: deterministic orchestration, multimodal ingestion, and verifiable outputs.

### Three Core Pillars

1. **Reliability Engineering** — Deterministic orchestration, audit logs, and failure modes
   - Reproducible run execution with idempotent message handling
   - Structured audit logging for every LLM call (input, output, latency, tokens)
   - Graceful degradation, circuit breakers, and automatic retry with backoff
   - Run replay and debugging from audit trails

2. **Multimodal Pipeline** — Image/PDF ingestion, OCR, layout chunking, and vision grounding
   - Document and image upload with type detection and validation
   - PDF parsing and OCR for scanned documents
   - Layout-aware chunking (headers, tables, figures) with structural metadata
   - Vision grounding via GPT-4V / Gemini Vision for figure captioning and chart summarization

3. **Verifiable Outputs** — Claim-level citations and evidence-linked reports
   - Claim-level decomposition of LLM responses with inline source attribution
   - Evidence retrieval via web search and internal document RAG
   - Confidence scoring and adversarial verification
   - Interactive evidence-linked reports with exportable audit trails

### Supplementary Layers (Future)

4. **Memory & State Layer** — Persistent context across sessions
   - Short-term and long-term memory classification
   - Semantic search over stored context (pgvector)
   - Memory decay, summarization, and re-injection

5. **AI Writing Layer** — Style-conditioned generation
   - Writing sample analysis and structured style profiles
   - Voice preservation and stylistic consistency
   - Multi-mode generation (academic, casual, technical)

### Current Implementation

The Agent Communication tool uses a **hybrid architecture**: a Next.js orchestrator coordinates multi-round debates while a Chrome extension automates prompt delivery and response scraping inside real AI chat tabs.

Agent Communication now also offers an **API edition**: a server-side route that calls ChatGPT, Gemini, and Grok directly using your API keys, with a dedicated "Agent Communication (API)" tab in the UI.

## Current Implementation Status

**Phase 1: Frontend Shell — Done**
- Landing page with hero section and tool overview
- Navigation shell with sidebar layout
- Responsive design with mobile support

**Phase 2: Agent Communication — Done**
- Next.js orchestrator (`/agent`) with run controls and transcript timeline
- Chrome Extension (Manifest V3) with per-provider content scripts
- Local WebSocket bus for real-time message routing
- 3-round discussion system with localStorage persistence
- Service worker keepalive with multi-layer approach (hubpage bridge, alarms, re-registration)
- Extension readiness handshake (DISCOVER_EXTENSION / EXTENSION_READY protocol)
- Automatic SEND_PROMPT retry with timeout (3 attempts, 8s each)
- API edition (`/api/agent-api`) for in-process, key-based provider calls
- Extracted hooks: `useExtensionRun`, `useApiRun`, `useRunHistory`

**Phase 2.5: API Mode + UI Redesign — Done**
- API-based agent communication tab (ChatGPT, Gemini, Grok via API keys)
- Next.js API route (`/api/agent-api`) for server-side provider calls
- Glassmorphism theme with **light/dark mode** toggle (ThemeProvider, localStorage-persisted)
- Glass design system: CSS custom properties for glass-thick, glass-thin, glass-rim variants
- Framer Motion animations: spring-physics page transitions, glassmorphism sliding pill indicators
- Apple-style `layoutId` shared layout animations for sidebar nav and mode tabs
- All pages restyled: landing (single-viewport), agent, verifier, writer
- Agent page refactored from 1,065 → 218 lines via component extraction

**Phase 3: Reliability Engineering — Planned (TODO)**
- Deterministic run orchestration with reproducible step ordering
- Structured audit logging (every LLM call, correlation IDs, tracing)
- Failure modes: circuit breakers, graceful degradation, exponential backoff
- Run replay and diagnostic dashboard

**Phase 4: Multimodal Pipeline — Planned (TODO)**
- Image/PDF upload with drag-and-drop UI
- PDF parsing, OCR, and scanned document handling
- Layout-aware chunking (headers, tables, figures, metadata)
- Vision grounding via GPT-4V / Gemini Vision

**Phase 5: Verifiable Outputs — Planned (TODO)**
- Claim-level extraction and inline citation linking
- Evidence retrieval (web search + internal document RAG)
- Confidence scoring and adversarial verification
- Evidence-linked report generation with export (Markdown, PDF, JSON)

**Phase 6: Memory & State Layer — Planned (TODO)**
- User preference persistence across sessions
- Short-term and long-term memory classification
- Semantic search with pgvector, Markdown/JSON storage
- Context retrieval and re-injection

**Phase 7: AI Writing Layer — Planned (TODO)**
- User writing sample collection and analysis
- Structured style profile generation (JSON)
- Style-conditioned generation with voice preservation
- Multi-mode writing (academic, casual, technical)

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- (Optional) API keys for ChatGPT and/or Gemini

### Installation

1. Clone the repository:
```bash
git clone https://github.com/sunnycho100/ai-hub.git
cd ai-hub
```

2. Install dependencies:
```bash
npm install
```

3. Configure API keys (for API mode):
```bash
# Copy the example and add your keys
cp .env.local.example .env.local
```

Edit `.env.local` and add your API keys:
```env
GEMINI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=your_openai_key_here
```

- Get Gemini key: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- Get OpenAI key: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### Model Selection (API Mode)

The API mode lets you select 2 models for multi-agent discussions. By default:
- **Model 1 (Left)**: ChatGPT (`gpt-4o-mini`)
- **Model 2 (Right)**: Gemini (`gemini-2.5-flash-lite`)

**Available models:**
- ✅ **ChatGPT** — OpenAI's gpt-4o-mini (requires `OPENAI_API_KEY`)
- ✅ **Gemini** — Google's gemini-2.5-flash-lite (requires `GEMINI_API_KEY`)

**In progress:**
- 🔶 **Grok** — xAI's grok-2-latest (requires `XAI_API_KEY`)
- 🔶 **Claude** — Anthropic's models (not yet implemented)
- 🔶 **Kimi** — Moonshot AI's models (not yet implemented)

You can select different models using the dropdown in the API mode interface. Models marked "in progress" are disabled until implementation is complete.

**Configurable rounds:**
- Set the maximum number of conversation rounds (1-5)
- Default: 3 rounds
- Each round allows both models to respond in sequence
- Conversation automatically ends after reaching the max rounds

Model configurations are defined in `app/api/agent-api/route.ts`.

## Tech Stack

### Current Tech Stack (Implemented)

#### Frontend (Next.js App)
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Runtime**: React 19
- **Styling**: Tailwind CSS 4 (glassmorphism light/dark theme)
- **Animations**: Framer Motion (spring physics, layout animations)
- **UI Components**: shadcn/ui (Radix primitives)
- **UI Design**: Pencil (VSCode extension) for visual prototyping
- **Icons**: lucide-react
- **State Management**: TanStack Query + localStorage
- **Validation**: Zod 4
- **Code Quality**: ESLint

### Chrome Extension
- **Manifest**: V3 (service worker, no persistent background page)
- **Language**: JavaScript (vanilla)
- **Service Worker**: `background.js` — WebSocket client, message router, tab registry, extension readiness handshake
- **Content Scripts**: Per-provider DOM automation (`chatgpt.js`, `gemini.js`, `claude.js`)
- **Hub Bridge**: `hubpage.js` — injected into localhost to wake the service worker on page load
- **Keepalive**: `chrome.alarms` (every 30s, with fast initial fire) to prevent MV3 service worker termination
- **Permissions**: `activeTab`, `scripting`, `tabs`, `alarms`
- **Host Permissions**: `chatgpt.com`, `gemini.google.com`, `claude.ai`, `localhost:3000–3003`

### WebSocket Bus
- **Library**: `ws` (Node.js)
- **Port**: 3333
- **Role**: Broadcast relay — every message from one client is forwarded to all others
- **Clients**: Next.js browser app + Chrome extension service worker

### Server API (Next.js Route)
- **Endpoint**: `/api/agent-api`
- **Providers**: OpenAI (gpt-4o-mini), Gemini (gemini-2.5-flash-lite), Grok (grok-2-latest)
- **Auth**: API keys via `OPENAI_API_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY`

---

### Planned Tech Stack (TODO)

#### Reliability Engineering Backend
- **Orchestration**: Deterministic run engine with idempotent execution
- **Audit Logging**: PostgreSQL (append-only), structured JSON logs
- **Tracing**: Correlation IDs, run-level tracing
- **Failure Handling**: Circuit breakers, exponential backoff, graceful degradation
- **Monitoring**: Health checks, diagnostic dashboard

#### Multimodal Pipeline Backend
- **PDF Parsing**: pdf.js / pdfplumber
- **OCR**: Tesseract / cloud OCR APIs
- **Layout Analysis**: Layout-aware chunking (headers, tables, figures)
- **Vision Models**: GPT-4V, Gemini Vision for image grounding
- **Storage**: AWS S3 for uploaded documents

#### Verification & Evidence Backend
- **Claim Extraction**: LLM-based decomposition
- **Evidence Retrieval**: Web search APIs + internal document RAG
- **Vector Search**: pgvector for semantic matching
- **Verification LLMs**: Low-temperature adversarial validation
- **Report Generation**: Markdown, PDF, JSON export

#### Memory & State Backend
- **Database**: PostgreSQL with JSONB
- **Vector Search**: pgvector extension
- **File-based Memory**: Markdown (.md)
- **Summarization**: LLM APIs with classification

#### AI Writing Backend
- **Style Extraction**: LLM-based analysis
- **Example Retrieval**: Embeddings + vector search
- **Constraint Checking**: Rule-based filters
- **Storage**: PostgreSQL + Markdown

#### Infrastructure
- **Framework**: FastAPI (Python) for ML-heavy backends
- **Async Processing**: Celery + Redis
- **Cache/Queue**: Redis
- **Storage**: AWS S3
- **Deployment**: AWS (EC2, RDS, CloudFront)

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm
- Google Chrome (for the extension)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/sunnycho100/ai-hub.git
cd ai-hub
```

2. Install dependencies:
```bash
npm install
```

3. Start both servers (Next.js + WebSocket bus):
```bash
npm run dev:all
```

This launches the Next.js dev server on port 3000 and the WS bus on port 3333.

4. (Optional) Enable API edition:
  - Create `.env.local` with:
    ```bash
    OPENAI_API_KEY=...
    GEMINI_API_KEY=...
    XAI_API_KEY=...
    ```
  - In the UI, switch to **Agent Communication (API)**.

5. Load the Chrome extension:
   - Open `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked** → select the `extension/` folder
   - Open tabs for ChatGPT, Gemini, and/or Claude

6. Open [http://localhost:3000/agent](http://localhost:3000/agent) and start a run

### Available Scripts

```bash
npm run dev          # Start Next.js dev server (port 3000)
npm run bus          # Start WebSocket bus (port 3333)
npm run dev:all      # Start both concurrently
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
bash start.sh        # Full startup with dependency checks
```

## Project Structure

```
ai-hub/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Landing page
│   ├── agent/
│   │   └── page.tsx            # Agent orchestrator (run controls, transcript)
│   ├── api/
│   │   └── agent-api/
│   │       └── route.ts        # Server-side API for agent communication
│   ├── verifier/
│   │   └── page.tsx            # AI Verifier (planned)
│   └── writer/
│       └── page.tsx            # AI Writer (planned)
├── hooks/
│   ├── useExtensionRun.ts      # Extension mode run orchestration (retry, readiness gating)
│   ├── useApiRun.ts            # API mode run orchestration
│   └── useRunHistory.ts        # Run history management
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx        # Main layout shell (theme, landing detection)
│   │   ├── Sidebar.tsx         # Navigation sidebar (glassmorphism sliding pill)
│   │   ├── Topbar.tsx          # Top navigation bar
│   │   ├── LiquidTabWrapper.tsx # Mount-only page transition wrapper
│   │   └── LiquidStagger.tsx   # Stagger animation container
│   ├── agent/
│   │   ├── AgentPageHeader.tsx  # Header with connection status
│   │   ├── AgentPanel.tsx       # Per-provider message panel
│   │   ├── ApiModelSelector.tsx # API mode model dropdowns
│   │   ├── ConnectionStatus.tsx # WS + extension readiness indicator
│   │   ├── ErrorBanner.tsx      # Error display (per-provider + system)
│   │   ├── ExtensionModelPicker.tsx # Extension mode model toggles
│   │   ├── ModeTabs.tsx         # Extension/API tab switcher (glass pill)
│   │   ├── ProviderIcon.tsx     # Provider brand icons
│   │   ├── RunControls.tsx      # Topic input, mode toggle, start/stop
│   │   ├── RunHistoryPanel.tsx  # Historical run browser
│   │   └── TranscriptTimeline.tsx # Message transcript display
│   ├── landing/
│   │   ├── Hero.tsx            # Hero section
│   │   ├── ToolCards.tsx       # Tool showcase cards
│   │   ├── HowItWorks.tsx      # Process steps timeline
│   │   └── Footer.tsx          # Footer component
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── ws.ts                   # WebSocket client (connects to bus on :3333, discovery handshake)
│   ├── useWebSocket.ts         # React hook for WS subscribe/send
│   ├── store.ts                # Agent state machine + localStorage persistence
│   ├── types.ts                # Shared TypeScript types (WS message protocol)
│   ├── prompts.ts              # Prompt templates for each round
│   ├── theme.tsx               # Light/dark theme provider
│   ├── liquidTransitions.ts    # Spring physics & animation variants
│   ├── mock.ts                 # Mock response generator for testing
│   ├── nav.ts                  # Navigation configuration
│   ├── providers.tsx           # React Query provider
│   └── utils.ts                # Utility functions
├── extension/
│   ├── manifest.json           # Chrome MV3 manifest
│   ├── background.js           # Service worker (WS client, tab registry, readiness protocol)
│   ├── hubpage.js              # Hub page bridge (wakes service worker on localhost)
│   ├── popup.html / popup.js   # Extension popup UI
│   ├── providers/
│   │   ├── chatgpt.js          # ChatGPT content script
│   │   ├── gemini.js           # Gemini content script
│   │   └── claude.js           # Claude content script
│   └── icons/                  # Extension icons
├── tools/
│   └── ws-bus/
│       ├── server.js           # WebSocket broadcast relay server
│       └── monitor.js          # Pipeline diagnostic monitor
├── docs/                       # Research & reference docs
├── start.sh                    # Dev startup script
└── styles/
    └── globals.css             # Global styles + glass design system
```

## Application Routes

| Route | Description | Status |
|-------|-------------|--------|
| `/` | Landing page | Implemented |
| `/agent` | Agent Communication (orchestrator + transcript) | Implemented |
| `/verifier` | AI Verifier tool | Planned |
| `/writer` | AI Writer tool | Planned |

## API Routes

| Route | Description |
|-------|-------------|
| `/api/agent-api` | Server-side Agent Communication (API edition) |

## Features

### Agent Communication (Implemented)

**Architecture**: Hybrid approach — Next.js orchestrator + Chrome extension + local WebSocket bus, with an extension readiness handshake and automatic retry mechanism.

```
┌──────────────────┐     WebSocket      ┌──────────────────┐
│   Next.js App    │◄──── :3333 ────►   │ Chrome Extension │
│   /agent page    │    (broadcast)     │  Service Worker  │
│  (orchestrator)  │                    │  (background.js) │
└──────┬───────────┘                    └───────┬──────────┘
       │                                  chrome.tabs
  hubpage.js ──────────────────────►  ┌───────┼──────────┐
  (wakes service worker on load)      ▼       ▼          ▼
                                   ChatGPT   Gemini     Claude
                                   (content  (content   (content
                                    script)   script)    script)
```

**Startup handshake** (fixes MV3 dormancy race condition):
1. User opens AI Hub page → `hubpage.js` content script fires immediately
2. `hubpage.js` sends `HUB_PAGE_OPENED` → wakes dormant service worker
3. Service worker connects to WS bus → sends `EXTENSION_READY` with provider registry
4. Web app receives `EXTENSION_READY` → shows "Ext ✓" in connection status
5. If no response, web app sends `DISCOVER_EXTENSION` every 3s until acknowledged

**Message flow**:
1. User enters a topic on `/agent` → orchestrator sends `SEND_PROMPT` via WebSocket
2. WS bus relays to Chrome extension service worker
3. Service worker routes to the correct tab's content script
4. Content script pastes text, clicks send, polls for response
5. Response scraped → `NEW_MESSAGE` sent back through the same path

**Provider-specific techniques**:
| Provider | Input Method | Send Button | Response Selector |
|----------|-------------|-------------|-------------------|
| ChatGPT | `execCommand("insertText")` on ProseMirror contenteditable | `button[data-testid="send-button"]` | `[data-message-author-role="assistant"]` |
| Gemini | `execCommand("insertText")` on Quill `.ql-editor` | `button[aria-label="Send message"]` | `model-response` (Web Component) |
| Claude | `<p>` element injection on contenteditable | `button[type="submit"]` | `.font-claude-response` / `.font-claude-message` |

**Run system**:
- 3-round discussion: R1 (Independent answers) → R2 (Critique & improve) → R3 (Reconcile)
- Configurable max rounds (1–3) per run
- Real-time transcript timeline with per-provider status
- Conversation history persisted in localStorage
- Error handling with per-provider error display
- **Automatic retry**: SEND_PROMPT retries up to 3 times (8s timeout) if unacknowledged
- **Extension readiness gating**: Start Run blocked with clear error if extension not connected

**API edition**:
- Server-side run mode using `/api/agent-api` with provider API keys
- Sequential turns per round (ChatGPT → Gemini → Grok)
- Uses the same transcript timeline and run history as extension runs

### UI Shell (Implemented)
- Responsive sidebar navigation with glassmorphism sliding pill indicator
- Light/dark theme toggle with system preference detection
- Spring-physics page transitions (mount-only, no exit animation)
- Stagger entrance animations for page content
- Mobile-friendly with collapsible nav
- Type-safe App Router routing

### AI Verifier (Planned)
- Claim-level extraction from LLM responses with inline citations
- Evidence retrieval via web search and internal document RAG
- Confidence scoring per claim with adversarial verification
- Interactive evidence-linked reports with exportable audit trails

### AI Writer (Planned)
- Style-conditioned text generation with voice preservation
- Writing style analysis and structured profile matching
- Multiple modes (academic, casual, technical)

## What You Learn from This Project

### AI / ML Perspective
- **LLM limitations and structural compensation** — Understanding how to build reliable systems without fine-tuning foundation models
- **Multimodal AI pipelines** — Ingesting images, PDFs, and scanned documents alongside text for richer LLM context
- **Verifiable AI outputs** — Decomposing LLM responses into auditable claims with evidence-linked citations
- **Multi-agent architectures** — Coordinating multiple LLMs for debate, collaboration, and consensus

### Systems / Software Perspective
- **Reliability engineering for AI** — Deterministic orchestration, audit logging, circuit breakers, and failure recovery
- **Agent-based architectures** — Decomposing tasks across role-specific agents with reproducible execution
- **Asynchronous execution patterns** — Managing concurrent LLM calls and state synchronization
- **API-driven integration** — Connecting multiple AI providers with unified interfaces
- **Chrome extension automation** — Deep DOM manipulation across different web architectures (ProseMirror, Quill, React)

### Practical / Industry Perspective
- **Production AI systems** — Building beyond prototypes with audit trails, failure modes, and deterministic runs
- **Multimodal document processing** — OCR, layout-aware chunking, and vision grounding for real-world inputs
- **Trustworthy AI systems** — Designing claim-level verification and evidence-linked reports
- **Full AI product pipeline** — From prototype to production-ready system with real user interfaces
- **Hybrid architectures** — Combining browser automation with server-side API orchestration

### Summary

This project is **not about building new AI models**, but about **engineering systems that use AI correctly, reliably, and verifiably**. The LLM remains a black box, while reliability engineering, multimodal ingestion, and output verification are layered on top to create a production-grade AI platform.

## Design Principles

- **Minimalism**: Clean interface with focus on content
- **Responsiveness**: Mobile-first design
- **Type safety**: TypeScript strict mode, Zod validation
- **Separation of concerns**: UI components, state logic, and data layer are independent
- **Real-world DOM automation**: Content scripts based on research from production userscripts (30K+ installs)

## Chrome Extension Technical Notes

### MV3 Service Worker Keepalive
Chrome terminates Manifest V3 service workers after ~30s of inactivity. The extension uses a multi-layered approach to stay alive:

1. **`hubpage.js` content script**: Injected into the AI Hub page (localhost). Sends `HUB_PAGE_OPENED` messages every 5 seconds, keeping the service worker awake while the page is open.
2. **`chrome.alarms`**: Fires every 30 seconds as a fallback, reconnecting the WebSocket if it dropped.
3. **Content script re-registration**: Each provider content script re-registers every 30 seconds via `setInterval(register, 30000)` in case the service worker restarted and lost its tab registry.
4. **Fast reconnection**: WebSocket reconnect delay is 1 second (both extension and web app) for rapid recovery after bus restart.

### Provider DOM Strategies
Each AI platform has different DOM architecture requiring different automation approaches:

- **ChatGPT**: ProseMirror contenteditable editor. Uses `textContent = "" → execCommand("insertText")`.
- **Gemini**: Angular + Quill + Web Components. Streaming completion detected via `message-actions` element presence. Response scraped from `model-response` custom element.
- **Claude**: Contenteditable with ProseMirror. Uses Claude-specific `<p>` element injection (`element.innerHTML = ''; const p = document.createElement('p'); p.textContent = text; element.appendChild(p);`). Streaming detected via stop button + text stability. Response scraped from `.font-claude-response` or `.font-claude-message`.

## License

MIT

## Contact

For questions or feedback, please open an issue on [GitHub](https://github.com/sunnycho100/ai-hub/issues).

---

**Note**: Agent Communication is functional. Reliability Engineering, Multimodal Pipeline, and Verifiable Outputs are the next planned phases.
