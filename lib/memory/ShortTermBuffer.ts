// ─────────────────────────────────────────────
// AI Hub – Short-Term Memory Buffer
// ─────────────────────────────────────────────
// Captures raw signals during an active session.

import { query, generateMemoryId } from "./db";
import type {
  ShortTermMemory,
  MemorySession,
  MemorySource,
  SessionStatus,
  ShortTermType,
  DEFAULT_USER_ID,
} from "./types";

// ─── Session Management ─────────────────────

/** Start a new memory session linked to a run */
export async function createSession(
  runId: string,
  userId: string = "default-user"
): Promise<MemorySession> {
  const id = generateMemoryId("ses");
  const now = Date.now();

  await query(
    `INSERT INTO memory_sessions (id, user_id, run_id, started_at, status)
     VALUES ($1, $2, $3, to_timestamp($4 / 1000.0), 'active')`,
    [id, userId, runId, now]
  );

  return {
    id,
    userId,
    runId,
    startedAt: now,
    endedAt: null,
    idleSince: null,
    status: "active",
    metadata: {},
  };
}

/** Get a session by ID */
export async function getSession(
  sessionId: string
): Promise<MemorySession | null> {
  const result = await query(
    `SELECT id, user_id, run_id,
            EXTRACT(EPOCH FROM started_at) * 1000 AS started_at,
            EXTRACT(EPOCH FROM ended_at)   * 1000 AS ended_at,
            EXTRACT(EPOCH FROM idle_since)  * 1000 AS idle_since,
            status, metadata
     FROM memory_sessions WHERE id = $1`,
    [sessionId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0] as Record<string, unknown>;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    runId: row.run_id as string,
    startedAt: Number(row.started_at),
    endedAt: row.ended_at ? Number(row.ended_at) : null,
    idleSince: row.idle_since ? Number(row.idle_since) : null,
    status: row.status as SessionStatus,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

/** Get the active session for a run (if any) */
export async function getActiveSessionForRun(
  runId: string,
  userId: string = "default-user"
): Promise<MemorySession | null> {
  const result = await query(
    `SELECT id FROM memory_sessions
     WHERE run_id = $1 AND user_id = $2 AND status = 'active'
     ORDER BY started_at DESC LIMIT 1`,
    [runId, userId]
  );

  if (result.rows.length === 0) return null;
  return getSession((result.rows[0] as Record<string, unknown>).id as string);
}

/** Mark a session as idle */
export async function markSessionIdle(sessionId: string): Promise<void> {
  await query(
    `UPDATE memory_sessions
     SET status = 'idle', idle_since = NOW()
     WHERE id = $1`,
    [sessionId]
  );
}

/** Mark a session as consolidated */
export async function markSessionConsolidated(
  sessionId: string
): Promise<void> {
  await query(
    `UPDATE memory_sessions
     SET status = 'consolidated', ended_at = NOW()
     WHERE id = $1`,
    [sessionId]
  );
}

/** Close a session */
export async function closeSession(sessionId: string): Promise<void> {
  await query(
    `UPDATE memory_sessions
     SET status = 'closed', ended_at = NOW()
     WHERE id = $1`,
    [sessionId]
  );
}

/** Get sessions that are idle and ready for consolidation */
export async function getIdleSessions(
  idleThresholdMs: number = 5 * 60 * 1000 // 5 minutes
): Promise<MemorySession[]> {
  const result = await query(
    `SELECT id FROM memory_sessions
     WHERE status = 'idle'
       AND idle_since < NOW() - ($1 || ' milliseconds')::INTERVAL
     ORDER BY idle_since ASC`,
    [idleThresholdMs]
  );

  const sessions: MemorySession[] = [];
  for (const row of result.rows) {
    const s = await getSession((row as Record<string, unknown>).id as string);
    if (s) sessions.push(s);
  }
  return sessions;
}

// ─── Short-Term Memory Capture ──────────────

/** Capture a short-term memory signal */
export async function captureMemory(params: {
  sessionId: string;
  userId?: string;
  type: ShortTermType;
  content: string;
  source: MemorySource;
  provider?: string;
  round?: number;
  metadata?: Record<string, unknown>;
}): Promise<ShortTermMemory> {
  const id = generateMemoryId("stm");
  const userId = params.userId ?? "default-user";
  const now = Date.now();

  await query(
    `INSERT INTO short_term_memories
       (id, session_id, user_id, type, content, source, provider, round, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      params.sessionId,
      userId,
      params.type,
      params.content,
      params.source,
      params.provider ?? null,
      params.round ?? null,
      JSON.stringify(params.metadata ?? {}),
    ]
  );

  return {
    id,
    sessionId: params.sessionId,
    userId,
    type: params.type,
    content: params.content,
    source: params.source,
    provider: params.provider,
    round: params.round,
    metadata: params.metadata ?? {},
    createdAt: now,
  };
}

/** Get all short-term memories for a session */
export async function getSessionMemories(
  sessionId: string
): Promise<ShortTermMemory[]> {
  const result = await query(
    `SELECT id, session_id, user_id, type, content, source, provider, round,
            metadata,
            EXTRACT(EPOCH FROM created_at) * 1000 AS created_at
     FROM short_term_memories
     WHERE session_id = $1
     ORDER BY created_at ASC`,
    [sessionId]
  );

  return result.rows.map((row: Record<string, unknown>) => {
    return {
      id: row.id as string,
      sessionId: row.session_id as string,
      userId: row.user_id as string,
      type: row.type as ShortTermType,
      content: row.content as string,
      source: row.source as MemorySource,
      provider: row.provider as string | undefined,
      round: row.round as number | undefined,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      createdAt: Number(row.created_at),
    };
  });
}

/** Count short-term memories for a session */
export async function countSessionMemories(
  sessionId: string
): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) as count FROM short_term_memories WHERE session_id = $1`,
    [sessionId]
  );
  return parseInt(
    (result.rows[0] as Record<string, unknown>).count as string,
    10
  );
}

/** Delete short-term memories after consolidation */
export async function clearSessionMemories(
  sessionId: string
): Promise<number> {
  const result = await query(
    `DELETE FROM short_term_memories WHERE session_id = $1`,
    [sessionId]
  );
  return result.rowCount ?? 0;
}
