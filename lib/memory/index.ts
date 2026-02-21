// ─────────────────────────────────────────────
// AI Hub – Memory Module Index
// ─────────────────────────────────────────────

export * from "./types";
export * as MemoryService from "./MemoryService";
export * as ConsolidationEngine from "./ConsolidationEngine";
export * as IdleDetector from "./IdleDetector";
export { healthCheck, getPool, closePool } from "./db";
