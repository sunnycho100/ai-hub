// ─────────────────────────────────────────────
// AI Hub – Agent Communication Types
// ─────────────────────────────────────────────

/** The AI providers supported via browser extension */
export type Provider = "chatgpt" | "gemini" | "claude";

export const PROVIDERS: Provider[] = ["chatgpt", "gemini", "claude"];

export const PROVIDER_LABELS: Record<Provider, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  claude: "Claude",
};

/** Extended model list including in-progress providers */
export type ExtendedProvider = "chatgpt" | "gemini" | "grok" | "claude" | "kimi";

export const EXTENDED_PROVIDER_LABELS: Record<ExtendedProvider, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  grok: "Grok",
  claude: "Claude",
  kimi: "Kimi",
};

/** Model availability status */
export type ModelStatus = "available" | "in-progress";

export const MODEL_STATUS: Record<ExtendedProvider, ModelStatus> = {
  chatgpt: "available",
  gemini: "available",
  grok: "in-progress",
  claude: "available",
  kimi: "in-progress",
};

/** Provider brand colors */
export const PROVIDER_COLORS: Record<Provider, { text: string; bg: string; hex: string }> = {
  chatgpt: { text: "text-green-500", bg: "bg-green-500", hex: "#10b981" },
  gemini: { text: "text-blue-500", bg: "bg-blue-500", hex: "#3b82f6" },
  claude: { text: "text-orange-500", bg: "bg-orange-500", hex: "#f97316" },
};

/** Conversation mode */
export type RunMode = "debate" | "collaboration";

/** Round identifiers */
export type Round = 1 | 2 | 3;

/** Run state machine states */
export type RunStatus =
  | "IDLE"
  | "R1_SENDING"
  | "R1_WAITING"
  | "R2_SENDING"
  | "R2_WAITING"
  | "R3_SENDING"
  | "R3_WAITING"
  | "DONE"
  | "ERROR";

/** A single message in the transcript */
export interface TranscriptMessage {
  id: string;
  runId: string;
  provider: Provider;
  round: Round;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

/** Run source */
export type RunSource = "extension" | "api";
/** A complete run (one topic discussion across 3 rounds) */
export interface Run {
  id: string;
  topic: string;
  mode: RunMode;
  source?: RunSource;
  status: RunStatus;
  messages: TranscriptMessage[];
  createdAt: number;
  updatedAt: number;
}

// ─────────────────────────────────────────────
// WebSocket Message Protocol
// ─────────────────────────────────────────────

/** HubAI → Extension: send a prompt to a specific provider */
export interface SendPromptMsg {
  type: "SEND_PROMPT";
  runId: string;
  provider: Provider;
  round: Round;
  text: string;
}

/** HubAI → Extension: bring a provider tab to focus */
export interface FocusTabMsg {
  type: "FOCUS_TAB";
  provider: Provider;
}

/** Bidirectional: liveness check */
export interface PingMsg {
  type: "PING";
}

/** Extension → HubAI: provider tab registered */
export interface HelloProviderMsg {
  type: "HELLO_PROVIDER";
  provider: Provider;
  tabId: number;
  url: string;
}

/** Extension → HubAI: new assistant message scraped */
export interface NewMessageMsg {
  type: "NEW_MESSAGE";
  runId: string;
  provider: Provider;
  round: Round;
  role: "assistant";
  text: string;
  timestamp: number;
}

/** Extension → HubAI: prompt was successfully pasted & sent */
export interface PromptSentMsg {
  type: "PROMPT_SENT";
  runId: string;
  provider: Provider;
  round: Round;
  timestamp: number;
}

/** Extension → HubAI: something went wrong */
export interface ErrorMsg {
  type: "ERROR";
  provider: Provider;
  code: string;
  message: string;
  details?: string;
}

/** Server → Client: pong */
export interface PingAckMsg {
  type: "PING_ACK";
  timestamp: number;
}

/** Union of all WS message types */
export type WSMessage =
  | SendPromptMsg
  | FocusTabMsg
  | PingMsg
  | HelloProviderMsg
  | NewMessageMsg
  | PromptSentMsg
  | ErrorMsg
  | PingAckMsg;
