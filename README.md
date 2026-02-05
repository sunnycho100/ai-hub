# AI Hub

A minimalistic web application that provides a unified workspace for AI-powered tools including agent collaboration, content verification, and style-conditioned writing.

## Project Overview

AI Hub is a student productivity platform that brings together three core AI capabilities:

1. **Agent Communication** - Multi-model debate and collaboration
2. **AI Verifier** - Search and verification pipeline with one model searching and another verifying
3. **AI Writer** - User-style-conditioned writing assistant

This repository currently contains the frontend implementation with a clean, scalable architecture designed for future backend integration.

## Current Implementation Status

**Phase 1: Frontend Shell (Current)**
- Landing page with hero section and tool overview
- Navigation shell with sidebar layout
- Placeholder pages for three core tools
- Responsive design with mobile support
- Component-based architecture

**Phase 2: Backend Integration (Planned)**
- Spring Boot product backend
- Python FastAPI AI engine
- PostgreSQL database
- Redis for caching and queues
- S3 for artifact storage

## Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: lucide-react
- **State Management**: TanStack Query (React Query)
- **Validation**: Zod
- **Code Quality**: ESLint + Prettier

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
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-hub
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

## Project Structure

```
ai-hub/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Landing page
│   ├── agent/
│   │   └── page.tsx            # Agent Communication tool
│   ├── verifier/
│   │   └── page.tsx            # AI Verifier tool
│   └── writer/
│       └── page.tsx            # AI Writer tool
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
│   ├── nav.ts                  # Navigation configuration
│   ├── utils.ts                # Utility functions
│   └── providers.tsx           # React Query provider
└── styles/
    └── globals.css             # Global styles
```

## Application Routes

**Important**: The application uses true Next.js routing with URL changes. Each route is a separate page:
- Navigation changes the browser URL (e.g., aihub.com → aihub.com/agent)
- Browser back/forward buttons work as expected
- Each page can be bookmarked and shared
- No single-page navigation - full page transitions

| Route | Description | Status |
|-------|-------------|--------|
| `/` | Landing page | Implemented |
| `/agent` | Agent Communication tool | Placeholder |
| `/verifier` | AI Verifier tool | Placeholder |
| `/writer` | AI Writer tool | Placeholder |

## Features

### Current Features
- Responsive navigation with sidebar layout
- Mobile-friendly design with collapsible navigation
- Clean, minimalistic UI with Tailwind CSS
- Component-based architecture for scalability
- Type-safe routing with TypeScript

### Planned Features

#### Agent Communication (Hybrid Mode)
**Architecture**: The Agent Communication tool uses a hybrid approach combining Next.js orchestration with a Chrome extension for automated interaction.

**Components**:
- **HubAI (Next.js `/agent` page)**: Orchestrator and transcript viewer with run controls
- **Chrome Extension**: Executes actions inside ChatGPT/Gemini/Grok tabs (paste, auto-send, scrape)
- **Local WebSocket Bus** (`ws://localhost:3333`): Message routing between HubAI and extension

**Features**:
- Multi-model conversation interface (ChatGPT, Gemini, Grok)
- Debate mode with multiple AI agents
- Collaboration mode for problem-solving
- 3-round discussion system (R1: Independent answers, R2: Critique & improve, R3: Reconcile)
- Real-time transcript timeline
- Conversation history stored in localStorage
- Citation tracking and source verification

#### AI Verifier
- Two-stage verification pipeline
- Search model generates claims and sources
- Verification model validates accuracy
- Confidence scoring
- Source citation with links
- Fact-check reports
- Export verified content

#### AI Writer
- Style-conditioned text generation
- User writing style analysis and matching
- Multiple writing modes (academic, casual, technical)
- Tone adjustment controls
- Citation integration
- Draft versioning and comparison
- Export to multiple formats

## Design Principles

### UI/UX Guidelines
- **Minimalism**: Clean interface with focus on content
- **Clarity**: Clear navigation and intuitive interactions
- **Responsiveness**: Mobile-first design approach
- **Accessibility**: WCAG 2.1 compliant components
- **Performance**: Optimized loading and interactions

### Code Guidelines
- TypeScript strict mode enabled
- Component-based architecture
- Separation of concerns (UI, logic, data)
- Consistent naming conventions
- Comprehensive error handling
- Unit tests for critical paths (future)

## Backend Architecture

### System Overview

The backend follows a microservices architecture with two main services:

1. **Product Backend (Spring Boot)**
   - User authentication and authorization
   - Project and workspace management
   - Run history and audit trails
   - Quota and rate limiting
   - User preferences and settings

2. **AI Engine (FastAPI)**
   - Agent communication pipeline
   - Verification workflow
   - Writing assistant logic
   - Model orchestration
   - Prompt engineering and templating

### Architecture Diagram

```
┌─────────────┐
│   Next.js   │
│   Frontend  │
└──────┬──────┘
       │ HTTP/REST
       ▼
┌─────────────────┐
│  Spring Boot    │
│ Product Backend │
│  (Port 8080)    │
└────┬───────┬────┘
     │       │
     │       └─────────┐
     │                 │ Internal API
     ▼                 ▼
┌──────────┐    ┌──────────────┐
│PostgreSQL│    │   FastAPI    │
│          │    │  AI Engine   │
│          │    │ (Port 8000)  │
└──────────┘    └──────────────┘
     ▲                 │
     │                 │
     │          ┌──────┴────┐
     │          ▼           ▼
     │      ┌──────┐   ┌──────┐
     └──────│Redis │   │  S3  │
            └──────┘   └──────┘
```

### Data Flow

#### 1. User Creates a Run
```
UI → POST /api/runs
  ↓
Spring Boot validates request
  ↓
Creates run record in PostgreSQL
  ↓
Returns run_id to UI
```

#### 2. Execute AI Workflow
```
UI → POST /api/runs/{id}/execute
  ↓
Spring Boot validates quota/permissions
  ↓
POST to FastAPI /ai/agent-chat (or /verify, /write)
  ↓
FastAPI executes AI pipeline
  ↓
Returns structured output + citations + trace
  ↓
Spring Boot stores results in PostgreSQL
  ↓
Returns response to UI
```

#### 3. View Results
```
UI → GET /api/runs/{id}
  ↓
Spring Boot fetches from PostgreSQL
  ↓
Returns run details + output + trace
  ↓
UI displays with citations and metadata
```

### API Endpoints

#### Public API (Spring Boot - Port 8080)

**Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token

**User Management**
- `GET /api/me` - Get current user profile
- `PUT /api/me` - Update user profile
- `GET /api/me/quota` - Get usage quota

**Projects**
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project

**Runs**
- `GET /api/runs` - List runs (filtered by project)
- `POST /api/runs` - Create new run
- `GET /api/runs/{id}` - Get run details
- `POST /api/runs/{id}/execute` - Execute AI workflow
- `DELETE /api/runs/{id}` - Delete run
- `GET /api/runs/{id}/export` - Export run results

#### Internal API (FastAPI - Port 8000)

**Agent Communication**
- `POST /ai/agent-chat` - Execute multi-agent conversation
  - Request: `{ models: [], prompt: "", mode: "debate|collaborate" }`
  - Response: `{ messages: [], citations: [], trace: {} }`

**Verification**
- `POST /ai/verify` - Execute search and verify pipeline
  - Request: `{ query: "", search_model: "", verify_model: "" }`
  - Response: `{ claims: [], sources: [], confidence: 0.95, trace: {} }`

**Writing**
- `POST /ai/write` - Execute style-conditioned writing
  - Request: `{ prompt: "", style: "", tone: "", citations: bool }`
  - Response: `{ content: "", style_match: 0.92, citations: [], trace: {} }`

**Health**
- `GET /health` - Service health check
- `GET /models` - List available AI models

### Database Schema (PostgreSQL)

#### Core Tables

**users**
- `id` (UUID, PK)
- `email` (VARCHAR, UNIQUE)
- `password_hash` (VARCHAR)
- `name` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**projects**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `name` (VARCHAR)
- `description` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**runs**
- `id` (UUID, PK)
- `project_id` (UUID, FK → projects)
- `user_id` (UUID, FK → users)
- `tool_type` (ENUM: agent, verifier, writer)
- `status` (ENUM: pending, running, completed, failed)
- `input` (JSONB)
- `output` (JSONB)
- `trace` (JSONB)
- `created_at` (TIMESTAMP)
- `completed_at` (TIMESTAMP)

**quotas**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `quota_type` (ENUM: runs, tokens, storage)
- `limit_value` (INTEGER)
- `used_value` (INTEGER)
- `reset_at` (TIMESTAMP)

**audit_logs**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `action` (VARCHAR)
- `resource_type` (VARCHAR)
- `resource_id` (UUID)
- `metadata` (JSONB)
- `created_at` (TIMESTAMP)

### Technology Choices Rationale

#### Why Spring Boot for Product Backend?
- Mature ecosystem for enterprise features
- Excellent security and authentication libraries
- Strong type safety with Java
- Easy integration with PostgreSQL via JPA
- Built-in dependency injection
- Extensive testing frameworks

#### Why FastAPI for AI Engine?
- Python is the primary language for AI/ML
- Async support for concurrent model calls
- Automatic API documentation with OpenAPI
- Type hints with Pydantic
- Fast performance comparable to Node.js
- Easy integration with LangChain, OpenAI SDK

#### Why PostgreSQL?
- ACID compliance for critical data
- JSONB support for flexible schema (run inputs/outputs)
- Full-text search capabilities
- Strong indexing for performance
- Proven scalability
- Rich ecosystem of tools

#### Why Redis?
- Fast in-memory cache for session data
- Rate limiting implementation
- Job queue for async tasks
- Pub/sub for real-time features (future)

#### Why S3?
- Cost-effective object storage
- Unlimited scalability
- High durability (99.999999999%)
- Direct upload from browser
- CloudFront integration for CDN

### Deployment Strategy

#### Development
```
Local: Docker Compose
  - Next.js (localhost:3000)
  - Spring Boot (localhost:8080)
  - FastAPI (localhost:8000)
  - PostgreSQL (localhost:5432)
  - Redis (localhost:6379)
```

#### Production (AWS)
```
Frontend: Vercel or CloudFront + S3
Backend: EC2 instances with Auto Scaling
Database: RDS PostgreSQL with read replicas
Cache: ElastiCache Redis
Storage: S3 with CloudFront
Load Balancer: Application Load Balancer
```

### Security Considerations

- **Authentication**: JWT tokens with refresh mechanism
- **Authorization**: Role-based access control (RBAC)
- **API Security**: Rate limiting, request validation
- **Data Encryption**: TLS in transit, encryption at rest
- **Secrets Management**: AWS Secrets Manager
- **API Keys**: Stored in environment variables, rotated regularly
- **CORS**: Strict origin policies
- **Input Validation**: Zod on frontend, Bean Validation on backend

### Monitoring and Observability

- **Logging**: Structured logs with correlation IDs
- **Metrics**: Prometheus + Grafana
- **Tracing**: OpenTelemetry for distributed tracing
- **Alerts**: CloudWatch Alarms or PagerDuty
- **Health Checks**: /health endpoints for all services
- **Error Tracking**: Sentry or similar

## Contributing

### Development Workflow
1. Create a feature branch
2. Implement changes with tests
3. Run linting and type checking
4. Submit pull request
5. Code review and merge

### Code Style
- Follow TypeScript best practices
- Use functional components with hooks
- Implement proper error boundaries
- Write self-documenting code
- Add comments for complex logic

## License

This project is licensed under the MIT License.

## Contact

For questions or feedback, please open an issue on GitHub.

---

**Note**: This project is currently in active development. The frontend shell is implemented, and backend integration is planned for the next phase.
