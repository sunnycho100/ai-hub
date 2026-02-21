// ─────────────────────────────────────────────
// AI Hub – Memory System Types
// ─────────────────────────────────────────────

/** Memory categories corresponding to .md files */
export type MemoryCategory =
  | "writing_style"
  | "output_satisfaction"
  | "user_profile"
  | "topic_knowledge"
  | "session_history";

export const MEMORY_CATEGORIES: MemoryCategory[] = [
  "writing_style",
  "output_satisfaction",
  "user_profile",
  "topic_knowledge",
  "session_history",
];

export const MEMORY_CATEGORY_LABELS: Record<MemoryCategory, string> = {
  writing_style: "Writing Style",
  output_satisfaction: "Output Satisfaction",
  user_profile: "User Profile",
  topic_knowledge: "Topic Knowledge",
  session_history: "Session History",
};

export const MEMORY_CATEGORY_DESCRIPTIONS: Record<MemoryCategory, string> = {
  writing_style: "Tone, formatting, verbosity, code style preferences",
  output_satisfaction: "What responses the user liked/disliked, revision patterns",
  user_profile: "Identity, expertise, interests, communication style",
  topic_knowledge: "Subjects discussed, depth, relationships between topics",
  session_history: "Condensed summaries of each conversation session",
};

/** Source of a memory signal */
export type MemorySource = "user_input" | "ai_response" | "inferred";

/** Session lifecycle states */
export type SessionStatus = "active" | "idle" | "consolidated" | "closed";

/** Short-term memory types */
export type ShortTermType =
  | "message"
  | "preference"
  | "feedback"
  | "decision"
  | "topic";

// ─── Data Interfaces ────────────────────────

/** A raw signal captured during a session */
export interface ShortTermMemory {
  id: string;
  sessionId: string;
  userId: string;
  type: ShortTermType;
  content: string;
  source: MemorySource;
  provider?: string;
  round?: number;
  metadata: Record<string, unknown>;
  createdAt: number;
}

/** A consolidated, persistent memory fact */
export interface LongTermMemory {
  id: string;
  userId: string;
  category: MemoryCategory;
  content: string;
  confidence: number;
  importance: number;
  sourceSessions: string[];
  validAt: number;
  invalidAt: number | null;
  supersededBy: string | null;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

/** A conversation session for memory tracking */
export interface MemorySession {
  id: string;
  userId: string;
  runId: string;
  startedAt: number;
  endedAt: number | null;
  idleSince: number | null;
  status: SessionStatus;
  metadata: Record<string, unknown>;
}

/** A relationship between two topics */
export interface TopicEdge {
  id: string;
  userId: string;
  sourceTopic: string;
  targetTopic: string;
  relationship: string;
  strength: number;
  validAt: number;
  invalidAt: number | null;
}

// ─── Search & Retrieval ─────────────────────

/** A search result with scoring metadata */
export interface MemorySearchResult {
  memory: LongTermMemory;
  similarity: number;
  recencyBoost: number;
  finalScore: number;
}

/** Options for searching memories */
export interface MemorySearchOptions {
  query: string;
  userId?: string;
  categories?: MemoryCategory[];
  limit?: number;
  minConfidence?: number;
}

/** Formatted context block ready for prompt injection */
export interface MemoryContext {
  contextBlock: string;
  tokenEstimate: number;
  memoriesUsed: number;
  categories: MemoryCategory[];
}

// ─── Consolidation ──────────────────────────

/** Result of a consolidation run */
export interface ConsolidationResult {
  newMemories: LongTermMemory[];
  updatedMemories: LongTermMemory[];
  supersededIds: string[];
  topicEdges: TopicEdge[];
  mdFilesUpdated: MemoryCategory[];
  sessionId: string;
}

/** A single extracted memory from LLM consolidation */
export interface ExtractedMemory {
  category: MemoryCategory;
  content: string;
  importance: number;
  isUpdate: boolean;
  supersedesId?: string;
}

// ─── API Request/Response Types ─────────────

export interface CaptureRequest {
  sessionId: string;
  type: ShortTermType;
  content: string;
  source: MemorySource;
  provider?: string;
  round?: number;
  metadata?: Record<string, unknown>;
}

export interface SearchRequest {
  query: string;
  userId?: string;
  categories?: MemoryCategory[];
  limit?: number;
}

export interface SessionRequest {
  runId: string;
  userId?: string;
}

export interface ConsolidateRequest {
  sessionId: string;
  userId?: string;
}

/** Default user ID for single-user MVP */
export const DEFAULT_USER_ID = "default-user";
