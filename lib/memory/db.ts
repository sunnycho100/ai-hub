// ─────────────────────────────────────────────
// AI Hub – PostgreSQL Connection Pool
// ─────────────────────────────────────────────

import { Pool, type PoolConfig, type QueryResult } from "pg";

let pool: Pool | null = null;

/** Default connection config (env-overridable) */
function getPoolConfig(): PoolConfig {
  return {
    host: process.env.PGHOST ?? "localhost",
    port: parseInt(process.env.PGPORT ?? "5432", 10),
    database: process.env.PGDATABASE ?? "aihub",
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "postgres",
    max: parseInt(process.env.PG_POOL_MAX ?? "10", 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  };
}

/** Get or create a shared connection pool */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(getPoolConfig());
    pool.on("error", (err: Error) => {
      console.error("[memory/db] Unexpected pool error:", err.message);
    });
  }
  return pool;
}

/** Run a parameterized query */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const p = getPool();
  const start = Date.now();
  const result = await p.query<T>(text, params);
  const duration = Date.now() - start;
  if (duration > 500) {
    console.warn(`[memory/db] Slow query (${duration}ms):`, text.slice(0, 80));
  }
  return result;
}

/** Check if the database is reachable */
export async function healthCheck(): Promise<boolean> {
  try {
    await query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

/** Generate a prefixed unique ID */
export function generateMemoryId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Gracefully shut down the pool */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
