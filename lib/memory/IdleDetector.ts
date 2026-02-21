// ─────────────────────────────────────────────
// AI Hub – Idle Detector
// ─────────────────────────────────────────────
// Hybrid idle detection: lightweight (5min) + deep (session-end).
// Runs server-side to trigger consolidation.

import { getIdleSessions, markSessionIdle } from "./ShortTermBuffer";
import { consolidateSession } from "./ConsolidationEngine";
import type { ConsolidationResult } from "./types";

/** Configuration for the idle detector */
interface IdleDetectorConfig {
  /** Polling interval (ms) – how often to check for idle sessions */
  pollIntervalMs: number;
  /** How long idle before triggering lightweight consolidation */
  lightweightThresholdMs: number;
  /** How long idle before triggering deep consolidation + session close */
  deepThresholdMs: number;
}

const DEFAULT_CONFIG: IdleDetectorConfig = {
  pollIntervalMs: 60_000,          // check every minute
  lightweightThresholdMs: 5 * 60_000,  // 5 minutes
  deepThresholdMs: 30 * 60_000,        // 30 minutes
};

let pollingTimer: ReturnType<typeof setInterval> | null = null;
let isProcessing = false;

/** Start the idle detector polling loop */
export function startIdleDetector(
  config: Partial<IdleDetectorConfig> = {}
): void {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (pollingTimer) {
    console.warn("[IdleDetector] Already running — stopping first");
    stopIdleDetector();
  }

  console.log(
    `[IdleDetector] Starting (poll: ${cfg.pollIntervalMs}ms, ` +
      `lightweight: ${cfg.lightweightThresholdMs}ms, deep: ${cfg.deepThresholdMs}ms)`
  );

  pollingTimer = setInterval(() => {
    processIdleSessions(cfg).catch((err) =>
      console.error("[IdleDetector] Error:", err)
    );
  }, cfg.pollIntervalMs);

  // Also run immediately
  processIdleSessions(cfg).catch((err) =>
    console.error("[IdleDetector] Initial check error:", err)
  );
}

/** Stop the idle detector */
export function stopIdleDetector(): void {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
    console.log("[IdleDetector] Stopped");
  }
}

/** Check if the idle detector is running */
export function isIdleDetectorRunning(): boolean {
  return pollingTimer !== null;
}

/** Process sessions that have been idle long enough */
async function processIdleSessions(
  config: IdleDetectorConfig
): Promise<ConsolidationResult[]> {
  if (isProcessing) return []; // prevent concurrent processing
  isProcessing = true;

  try {
    const results: ConsolidationResult[] = [];
    const idleSessions = await getIdleSessions(
      config.lightweightThresholdMs
    );

    for (const session of idleSessions) {
      if (!session.idleSince) continue;

      const idleDuration = Date.now() - session.idleSince;

      if (idleDuration >= config.deepThresholdMs) {
        // Deep consolidation: full LLM extraction + session close
        console.log(
          `[IdleDetector] Deep consolidation for session ${session.id}`
        );
        try {
          const result = await consolidateSession(
            session.id,
            session.userId
          );
          results.push(result);
        } catch (err) {
          console.error(
            `[IdleDetector] Deep consolidation failed for ${session.id}:`,
            err
          );
        }
      }
      // Lightweight threshold met but not deep yet — we mark idle
      // but don't consolidate yet (the session set to idle is enough)
    }

    return results;
  } finally {
    isProcessing = false;
  }
}

/** Manually trigger consolidation for a specific session */
export async function triggerConsolidation(
  sessionId: string,
  userId: string = "default-user"
): Promise<ConsolidationResult> {
  console.log(
    `[IdleDetector] Manual consolidation triggered for session ${sessionId}`
  );
  return consolidateSession(sessionId, userId);
}

/** Mark a session as idle (called when user stops interacting) */
export async function notifyIdle(sessionId: string): Promise<void> {
  await markSessionIdle(sessionId);
}

/** Mark a session as active again (user resumed) */
export async function notifyActive(sessionId: string): Promise<void> {
  // If session was idle but not yet consolidated, reactivate it
  const { query } = await import("./db");
  await query(
    `UPDATE memory_sessions
     SET status = 'active', idle_since = NULL
     WHERE id = $1 AND status = 'idle'`,
    [sessionId]
  );
}
