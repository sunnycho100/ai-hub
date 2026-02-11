# AI Hub

A unified workspace for AI-powered tools — agent collaboration, content verification, and style-conditioned writing — with a Chrome extension that automates multi-model conversations across ChatGPT, Gemini, and Claude.

## Project Overview

AI Hub is a **Layer-2 AI system** built on top of existing Large Language Models (LLMs), without training new foundation models. The core philosophy is to treat the LLM as a general intelligence engine and add higher-level layers on top: workflow orchestration, memory, trust, and style learning.

### The Four Layers

1. **Agent Orchestration Layer** — Multi-model debate and collaboration (partially implemented)
   - Decomposes user requests into multiple execution steps
   - Assigns each step to role-specific LLM agents
   - Manages execution order and merges results deterministically

2. **LLM Memory & State Layer** (TODO)
   - Solves the LLM session volatility problem
   - Persists user preferences, decisions, and summaries across sessions
   - Controls what to remember, summarize, and forget

3. **LLM Verification & Trust Layer** (TODO)
   - Validates factual accuracy, logical consistency, and source grounding
   - Acts as a gatekeeper that decides whether content is safe to release
   - Blocks or softens unverified outputs

4. **AI Writing Layer** (TODO)
   - Learns the user's writing style from past samples
   - Preserves the user's "voice" when generating new content
   - Ensures stylistic consistency rather than generic AI output

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
- Service worker keepalive to prevent MV3 termination
- API edition (`/api/agent-api`) for in-process, key-based provider calls

**Phase 2.5: API Mode + UI Redesign — Done**
- API-based agent communication tab (ChatGPT, Gemini, Grok via API keys)
- Next.js API route (`/api/agent-api`) for server-side provider calls
- Glassmorphism dark theme designed with VSCode extension [Pencil](https://marketplace.visualstudio.com/items?itemName=nicepkg.pencil) for a professional UI
- Dark navy background, translucent glass cards, cyan accent system
- All pages restyled: landing, agent, verifier, writer

**Phase 3: Memory & State Layer — Planned (TODO)**
- User preference persistence across sessions
- Short-term and long-term memory classification
- Markdown/JSON format storage
- Context retrieval and re-injection

**Phase 4: Verification & Trust Layer — Planned (TODO)**
- Claim extraction from draft responses
- Evidence verification via web search and RAG
- Logic and consistency checks
- Verification logging

**Phase 5: AI Writing Layer — Planned (TODO)**
- User writing sample collection
- Tone, structure, and pattern analysis
- Structured style profile generation (JSON)
- Style constraint injection during generation

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
- **Styling**: Tailwind CSS 4 (glassmorphism dark theme)
- **UI Components**: shadcn/ui (Radix primitives)
- **UI Design**: Pencil (VSCode extension) for visual prototyping
- **Icons**: lucide-react
- **State Management**: TanStack Query + localStorage
- **Validation**: Zod 4
- **Code Quality**: ESLint

### Chrome Extension
- **Manifest**: V3 (service worker, no persistent background page)
- **Language**: JavaScript (vanilla)
- **Service Worker**: `background.js` — WebSocket client, message router, tab registry
- **Content Scripts**: Per-provider DOM automation (`chatgpt.js`, `gemini.js`, `claude.js`)
- **Keepalive**: `chrome.alarms` (every 27s) to prevent MV3 service worker termination
- **Permissions**: `activeTab`, `scripting`, `tabs`, `alarms`
- **Host Permissions**: `chatgpt.com`, `gemini.google.com`, `claude.ai`

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

#### Agent Orchestration Backend
- **Framework**: FastAPI (Python)
- **Async Processing**: Celery + Redis
- **LLM APIs**: OpenAI / Anthropic / Gemini
- **Structured Outputs**: JSON Schema-based responses

#### Memory & State Backend
- **Database**: PostgreSQL with JSONB
- **Vector Search**: pgvector extension
- **File-based Memory**: Markdown (.md)
- **Summarization**: LLM APIs with classification

#### Verification & Trust Backend
- **Retrieval**: Web search APIs + internal document RAG
- **Verification LLMs**: Low-temperature configuration
- **Result Storage**: PostgreSQL verification logs

#### AI Writing Backend
- **Style Extraction**: LLM-based analysis
- **Example Retrieval**: Embeddings + vector search
- **Constraint Checking**: Rule-based filters
- **Storage**: PostgreSQL + Markdown

#### Infrastructure
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
bash start.sh
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
│   ├── verifier/
│   │   └── page.tsx            # AI Verifier (planned)
│   └── writer/
│       └── page.tsx            # AI Writer (planned)
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx        # Main layout shell
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   └── Topbar.tsx          # Top navigation bar
│   ├── landing/
│   │   ├── Hero.tsx            # Hero section
│   │   ├── ToolCards.tsx       # Tool showcase cards
│   │   ├── HowItWorks.tsx      # Process steps
│   │   └── Footer.tsx          # Footer component
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── ws.ts                   # WebSocket client (connects to bus on :3333)
│   ├── useWebSocket.ts         # React hook for WS subscribe/send
│   ├── store.ts                # Agent state machine + localStorage persistence
│   ├── types.ts                # Shared TypeScript types
│   ├── prompts.ts              # Prompt templates for each round
│   ├── nav.ts                  # Navigation configuration
│   ├── providers.tsx           # React Query provider
│   └── utils.ts                # Utility functions
├── extension/
│   ├── manifest.json           # Chrome MV3 manifest
│   ├── background.js           # Service worker (WS client, tab registry, routing)
│   ├── popup.html / popup.js   # Extension popup UI
│   ├── providers/
│   │   ├── chatgpt.js          # ChatGPT content script
│   │   ├── gemini.js           # Gemini content script
│   │   └── claude.js           # Claude content script
│   └── icons/                  # Extension icons
├── tools/
│   └── ws-bus/
│       └── server.js           # WebSocket broadcast relay server
├── docs/                       # Research & reference docs
├── start.sh                    # Dev startup script
└── styles/
    └── globals.css             # Global styles
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

**Architecture**: Hybrid approach — Next.js orchestrator + Chrome extension + local WebSocket bus.

```
┌──────────────────┐     WebSocket      ┌──────────────────┐
│   Next.js App    │◄──── :3333 ────►   │ Chrome Extension │
│   /agent page    │    (broadcast)     │  Service Worker  │
│  (orchestrator)  │                    │  (background.js) │
└──────────────────┘                    └───────┬──────────┘
                                          chrome.tabs
                                        ┌───────┼──────────┐
                                        ▼       ▼          ▼
                                   ChatGPT   Gemini     Claude
                                   (content  (content   (content
                                    script)   script)    script)
```

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
- Real-time transcript timeline with per-provider status
- Conversation history persisted in localStorage
- Error handling with per-provider error display

**API edition**:
- Server-side run mode using `/api/agent-api` with provider API keys
- Sequential turns per round (ChatGPT → Gemini → Grok)
- Uses the same transcript timeline and run history as extension runs

### UI Shell (Implemented)
- Responsive sidebar navigation
- Mobile-friendly with collapsible nav
- Clean, minimalistic Tailwind CSS design
- Type-safe App Router routing

### AI Verifier (Planned)
- Two-stage pipeline: search model generates claims, verification model validates
- Confidence scoring, source citation, fact-check reports

### AI Writer (Planned)
- Style-conditioned text generation
- Writing style analysis and matching
- Multiple modes (academic, casual, technical)

## What You Learn from This Project

### AI / ML Perspective
- **LLM limitations and structural compensation** — Understanding how to build reliable systems without fine-tuning foundation models
- **Layer-2 AI design** — Treating LLMs as general intelligence engines and adding orchestration, memory, trust, and style layers on top
- **Style learning and expressive modeling** — Extracting and preserving user voice without model training
- **Multi-agent architectures** — Coordinating multiple LLMs for debate, collaboration, and consensus

### Systems / Software Perspective
- **LLM-centered workflow design** — Building production systems around black-box AI models
- **Agent-based architectures** — Decomposing tasks across role-specific agents with deterministic orchestration
- **Asynchronous execution patterns** — Managing concurrent LLM calls and state synchronization
- **API-driven integration** — Connecting multiple AI providers with unified interfaces
- **Chrome extension automation** — Deep DOM manipulation across different web architectures (ProseMirror, Quill, React)

### Practical / Industry Perspective
- **Solving LLM memory problems** — Using Markdown, databases, and vector search for persistent context
- **Trustworthy AI systems** — Designing verification layers and auditable workflows
- **Full AI product pipeline** — From prototype to production-ready system with real user interfaces
- **Hybrid architectures** — Combining browser automation with server-side API orchestration

### Summary

This project is **not about building new AI models**, but about **building systems that use AI correctly and reliably**. The LLM remains a black box, while structure, memory, verification, and style are layered on top to create a production-ready AI system.

## Design Principles

- **Minimalism**: Clean interface with focus on content
- **Responsiveness**: Mobile-first design
- **Type safety**: TypeScript strict mode, Zod validation
- **Separation of concerns**: UI components, state logic, and data layer are independent
- **Real-world DOM automation**: Content scripts based on research from production userscripts (30K+ installs)

## Chrome Extension Technical Notes

### MV3 Service Worker Keepalive
Chrome terminates Manifest V3 service workers after ~30s of inactivity. The extension uses `chrome.alarms` (every 27 seconds) to keep the service worker alive and reconnect the WebSocket if it drops.

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

**Note**: Agent Communication is functional. Verifier and Writer tools are planned for the next phase.
