# AI Hub

A unified workspace for AI-powered tools — agent collaboration, content verification, and style-conditioned writing — with a Chrome extension that automates multi-model conversations across ChatGPT, Gemini, and Grok.

## Project Overview

AI Hub is a student productivity platform that brings together three core AI capabilities:

1. **Agent Communication** — Multi-model debate and collaboration (implemented)
2. **AI Verifier** — Search and verification pipeline (planned)
3. **AI Writer** — User-style-conditioned writing assistant (planned)

The Agent Communication tool uses a **hybrid architecture**: a Next.js orchestrator coordinates multi-round debates while a Chrome extension automates prompt delivery and response scraping inside real AI chat tabs.

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

**Phase 3: Verifier & Writer — Planned**
- AI Verifier and AI Writer tools
- Spring Boot product backend, FastAPI AI engine
- PostgreSQL, Redis, S3

## Tech Stack

### Frontend (Next.js App)
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Runtime**: React 19
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix primitives)
- **Icons**: lucide-react
- **State Management**: TanStack Query + localStorage
- **Validation**: Zod 4
- **Code Quality**: ESLint

### Chrome Extension
- **Manifest**: V3 (service worker, no persistent background page)
- **Language**: JavaScript (vanilla)
- **Service Worker**: `background.js` — WebSocket client, message router, tab registry
- **Content Scripts**: Per-provider DOM automation (`chatgpt.js`, `gemini.js`, `grok.js`)
- **Keepalive**: `chrome.alarms` (every 27s) to prevent MV3 service worker termination
- **Permissions**: `activeTab`, `scripting`, `tabs`, `alarms`
- **Host Permissions**: `chatgpt.com`, `gemini.google.com`, `grok.com`, `x.com/i/grok`

### WebSocket Bus
- **Library**: `ws` (Node.js)
- **Port**: 3333
- **Role**: Broadcast relay — every message from one client is forwarded to all others
- **Clients**: Next.js browser app + Chrome extension service worker

### Backend (Planned)
- **Product Backend**: Spring Boot (Java)
- **AI Engine**: FastAPI (Python)
- **Database**: PostgreSQL
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

4. Load the Chrome extension:
   - Open `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked** → select the `extension/` folder
   - Open tabs for ChatGPT, Gemini, and/or Grok

5. Open [http://localhost:3000/agent](http://localhost:3000/agent) and start a run

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
│   │   └── grok.js             # Grok content script
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
                                   ChatGPT   Gemini      Grok
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
| Grok | `nativeValueSetter` on React textarea | `button[aria-label="Submit"]` | `div.message-bubble` with `.markdown`/`.prose` heuristic |

**Run system**:
- 3-round discussion: R1 (Independent answers) → R2 (Critique & improve) → R3 (Reconcile)
- Real-time transcript timeline with per-provider status
- Conversation history persisted in localStorage
- Error handling with per-provider error display

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
- **Grok**: React + Tailwind. Requires `nativeValueSetter` (`Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set`) because direct `.value =` doesn't trigger React state. Assistant messages identified by `div.message-bubble` containing `.markdown`/`.prose`.

## License

MIT

## Contact

For questions or feedback, please open an issue on [GitHub](https://github.com/sunnycho100/ai-hub/issues).

---

**Note**: Agent Communication is functional. Verifier and Writer tools are planned for the next phase.
