// ─────────────────────────────────────────────
// AI Hub – Agent Communication Types
// ─────────────────────────────────────────────

/** The three AI providers supported in Phase 1 */
export type Provider = "chatgpt" | "gemini" | "grok";

export const PROVIDERS: Provider[] = ["chatgpt", "gemini", "grok"];

export const PROVIDER_LABELS: Record<Provider, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  grok: "Grok",
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

/** A complete run (one topic discussion across 3 rounds) */
export interface Run {
  id: string;
  topic: string;
  mode: RunMode;
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
