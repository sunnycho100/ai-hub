// ─────────────────────────────────────────────
// AI Hub – Long-Term Memory Store
// ─────────────────────────────────────────────
// Manages persistent, consolidated memories with
// vector search, deduplication, and versioning.

import { query, generateMemoryId } from "./db";
import { getEmbedding } from "./EmbeddingService";
import type {
  LongTermMemory,
  MemoryCategory,
  MemorySearchOptions,
  MemorySearchResult,
  TopicEdge,
} from "./types";

// ─── Store / Update ─────────────────────────

/** Store a new long-term memory with embedding */
export async function storeMemory(params: {
  userId?: string;
  category: MemoryCategory;
  content: string;
  confidence?: number;
  importance?: number;
  sourceSessions: string[];
  metadata?: Record<string, unknown>;
}): Promise<LongTermMemory> {
  const id = generateMemoryId("ltm");
  const userId = params.userId ?? "default-user";
  const now = Date.now();

  // Generate embedding for semantic search
  const embedding = await getEmbedding(params.content);
  const embeddingStr = `[${embedding.join(",")}]`;

  await query(
    `INSERT INTO long_term_memories
       (id, user_id, category, content, embedding, confidence, importance,
        source_sessions, metadata)
     VALUES ($1, $2, $3, $4, $5::vector, $6, $7, $8, $9)`,
    [
      id,
      userId,
      params.category,
      params.content,
      embeddingStr,
      params.confidence ?? 0.5,
      params.importance ?? 0.5,
      params.sourceSessions,
      JSON.stringify(params.metadata ?? {}),
    ]
  );

  return {
    id,
    userId,
    category: params.category,
    content: params.content,
    confidence: params.confidence ?? 0.5,
    importance: params.importance ?? 0.5,
    sourceSessions: params.sourceSessions,
    validAt: now,
    invalidAt: null,
    supersededBy: null,
    version: 1,
    metadata: params.metadata ?? {},
    createdAt: now,
    updatedAt: now,
  };
}

/** Supersede an existing memory (bi-temporal versioning) */
export async function supersedeMemory(
  oldId: string,
  newContent: string,
  sessionId: string,
  importance?: number
): Promise<LongTermMemory> {
  // Get the old memory first
  const old = await getMemoryById(oldId);
  if (!old) throw new Error(`Memory ${oldId} not found`);

  // Create new version
  const newMemory = await storeMemory({
    userId: old.userId,
    category: old.category,
    content: newContent,
    confidence: Math.min(1, old.confidence + 0.1), // boost confidence
    importance: importance ?? old.importance,
    sourceSessions: [...old.sourceSessions, sessionId],
    metadata: { ...old.metadata, previousVersion: oldId },
  });

  // Mark old as superseded
  await query(
    `UPDATE long_term_memories
     SET invalid_at = NOW(), superseded_by = $1, updated_at = NOW()
     WHERE id = $2`,
    [newMemory.id, oldId]
  );

  // Update version number
  await query(
    `UPDATE long_term_memories SET version = $1 WHERE id = $2`,
    [old.version + 1, newMemory.id]
  );

  return { ...newMemory, version: old.version + 1 };
}

/** Get a specific memory by ID */
export async function getMemoryById(
  id: string
): Promise<LongTermMemory | null> {
  const result = await query(
    `SELECT id, user_id, category, content, confidence, importance,
            source_sessions, version, metadata, superseded_by,
            EXTRACT(EPOCH FROM valid_at)   * 1000 AS valid_at,
            EXTRACT(EPOCH FROM invalid_at) * 1000 AS invalid_at,
            EXTRACT(EPOCH FROM created_at) * 1000 AS created_at,
            EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at
     FROM long_term_memories WHERE id = $1`,
    [id]
  );

  if (result.rows.length === 0) return null;
  return rowToLongTermMemory(result.rows[0] as Record<string, unknown>);
}

// ─── Search & Retrieval ─────────────────────

/** Search memories by semantic similarity + recency scoring */
export async function searchMemories(
  options: MemorySearchOptions
): Promise<MemorySearchResult[]> {
  const {
    query: searchQuery,
    userId = "default-user",
    categories,
    limit = 10,
    minConfidence = 0.3,
  } = options;

  // Generate query embedding
  const queryEmbedding = await getEmbedding(searchQuery);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  // Build WHERE clause
  const conditions = [
    "user_id = $1",
    "invalid_at IS NULL", // only active memories
    "confidence >= $2",
  ];
  const params: unknown[] = [userId, minConfidence];
  let paramIdx = 3;

  if (categories && categories.length > 0) {
    conditions.push(`category = ANY($${paramIdx})`);
    params.push(categories);
    paramIdx++;
  }

  // Cosine similarity search with recency boost
  const sql = `
    SELECT id, user_id, category, content, confidence, importance,
           source_sessions, version, metadata, superseded_by,
           EXTRACT(EPOCH FROM valid_at)   * 1000 AS valid_at,
           EXTRACT(EPOCH FROM invalid_at) * 1000 AS invalid_at,
           EXTRACT(EPOCH FROM created_at) * 1000 AS created_at,
           EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at,
           1 - (embedding <=> $${paramIdx}::vector) AS similarity
    FROM long_term_memories
    WHERE ${conditions.join(" AND ")}
    ORDER BY similarity DESC
    LIMIT $${paramIdx + 1}
  `;
  params.push(embeddingStr, limit);

  const result = await query(sql, params);

  const now = Date.now();
  return result.rows.map((row: Record<string, unknown>) => {
    const memory = rowToLongTermMemory(row);
    const similarity = Number(row.similarity);

    // Recency boost: memories from last 24h get up to 0.2 boost
    const ageHours = (now - memory.updatedAt) / (1000 * 60 * 60);
    const recencyBoost = Math.max(0, 0.2 * (1 - ageHours / 24));

    return {
      memory,
      similarity,
      recencyBoost,
      finalScore: similarity * 0.7 + memory.importance * 0.15 + recencyBoost * 0.15,
    };
  }).sort((a: MemorySearchResult, b: MemorySearchResult) => b.finalScore - a.finalScore);
}

/** Get all active memories by category */
export async function getMemoriesByCategory(
  category: MemoryCategory,
  userId: string = "default-user"
): Promise<LongTermMemory[]> {
  const result = await query(
    `SELECT id, user_id, category, content, confidence, importance,
            source_sessions, version, metadata, superseded_by,
            EXTRACT(EPOCH FROM valid_at)   * 1000 AS valid_at,
            EXTRACT(EPOCH FROM invalid_at) * 1000 AS invalid_at,
            EXTRACT(EPOCH FROM created_at) * 1000 AS created_at,
            EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at
     FROM long_term_memories
     WHERE user_id = $1 AND category = $2 AND invalid_at IS NULL
     ORDER BY importance DESC, updated_at DESC`,
    [userId, category]
  );

  return result.rows.map((r: Record<string, unknown>) =>
    rowToLongTermMemory(r)
  );
}

/** Get all active memories for a user */
export async function getAllActiveMemories(
  userId: string = "default-user"
): Promise<LongTermMemory[]> {
  const result = await query(
    `SELECT id, user_id, category, content, confidence, importance,
            source_sessions, version, metadata, superseded_by,
            EXTRACT(EPOCH FROM valid_at)   * 1000 AS valid_at,
            EXTRACT(EPOCH FROM invalid_at) * 1000 AS invalid_at,
            EXTRACT(EPOCH FROM created_at) * 1000 AS created_at,
            EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at
     FROM long_term_memories
     WHERE user_id = $1 AND invalid_at IS NULL
     ORDER BY category, importance DESC`,
    [userId]
  );

  return result.rows.map((r: Record<string, unknown>) =>
    rowToLongTermMemory(r)
  );
}

/** Delete a memory (soft-delete by invalidating) */
export async function invalidateMemory(id: string): Promise<void> {
  await query(
    `UPDATE long_term_memories
     SET invalid_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

// ─── Topic Edges ────────────────────────────

/** Store a topic relationship edge */
export async function storeTopicEdge(params: {
  userId?: string;
  sourceTopic: string;
  targetTopic: string;
  relationship: string;
  strength?: number;
}): Promise<TopicEdge> {
  const id = generateMemoryId("edge");
  const userId = params.userId ?? "default-user";
  const now = Date.now();

  // Upsert: strengthen existing edge or create new
  const existing = await query(
    `SELECT id, strength FROM topic_edges
     WHERE user_id = $1 AND source_topic = $2 AND target_topic = $3
       AND invalid_at IS NULL`,
    [userId, params.sourceTopic, params.targetTopic]
  );

  if (existing.rows.length > 0) {
    const row = existing.rows[0] as Record<string, unknown>;
    const newStrength = Math.min(1, Number(row.strength) + 0.1);
    await query(
      `UPDATE topic_edges SET strength = $1 WHERE id = $2`,
      [newStrength, row.id]
    );
    return {
      id: row.id as string,
      userId,
      sourceTopic: params.sourceTopic,
      targetTopic: params.targetTopic,
      relationship: params.relationship,
      strength: newStrength,
      validAt: now,
      invalidAt: null,
    };
  }

  await query(
    `INSERT INTO topic_edges
       (id, user_id, source_topic, target_topic, relationship, strength)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      userId,
      params.sourceTopic,
      params.targetTopic,
      params.relationship,
      params.strength ?? 0.5,
    ]
  );

  return {
    id,
    userId,
    sourceTopic: params.sourceTopic,
    targetTopic: params.targetTopic,
    relationship: params.relationship,
    strength: params.strength ?? 0.5,
    validAt: now,
    invalidAt: null,
  };
}

/** Get topic edges for a user */
export async function getTopicEdges(
  userId: string = "default-user"
): Promise<TopicEdge[]> {
  const result = await query(
    `SELECT id, user_id, source_topic, target_topic, relationship, strength,
            EXTRACT(EPOCH FROM valid_at)   * 1000 AS valid_at,
            EXTRACT(EPOCH FROM invalid_at) * 1000 AS invalid_at
     FROM topic_edges
     WHERE user_id = $1 AND invalid_at IS NULL
     ORDER BY strength DESC`,
    [userId]
  );

  return result.rows.map((row: Record<string, unknown>) => {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      sourceTopic: row.source_topic as string,
      targetTopic: row.target_topic as string,
      relationship: row.relationship as string,
      strength: Number(row.strength),
      validAt: Number(row.valid_at),
      invalidAt: row.invalid_at ? Number(row.invalid_at) : null,
    };
  });
}

// ─── Memory Stats ───────────────────────────

export interface MemoryStats {
  totalActive: number;
  byCategory: Record<MemoryCategory, number>;
  totalSuperseded: number;
  topicEdgeCount: number;
}

/** Get aggregate stats about user's memories */
export async function getMemoryStats(
  userId: string = "default-user"
): Promise<MemoryStats> {
  const [activeResult, supersededResult, edgesResult] = await Promise.all([
    query(
      `SELECT category, COUNT(*) as count
       FROM long_term_memories
       WHERE user_id = $1 AND invalid_at IS NULL
       GROUP BY category`,
      [userId]
    ),
    query(
      `SELECT COUNT(*) as count
       FROM long_term_memories
       WHERE user_id = $1 AND invalid_at IS NOT NULL`,
      [userId]
    ),
    query(
      `SELECT COUNT(*) as count FROM topic_edges
       WHERE user_id = $1 AND invalid_at IS NULL`,
      [userId]
    ),
  ]);

  const byCategory: Record<string, number> = {
    writing_style: 0,
    output_satisfaction: 0,
    user_profile: 0,
    topic_knowledge: 0,
    session_history: 0,
  };

  let totalActive = 0;
  for (const row of activeResult.rows) {
    const r = row as Record<string, unknown>;
    const cat = r.category as string;
    const count = parseInt(r.count as string, 10);
    byCategory[cat] = count;
    totalActive += count;
  }

  return {
    totalActive,
    byCategory: byCategory as Record<MemoryCategory, number>,
    totalSuperseded: parseInt(
      (supersededResult.rows[0] as Record<string, unknown>).count as string,
      10
    ),
    topicEdgeCount: parseInt(
      (edgesResult.rows[0] as Record<string, unknown>).count as string,
      10
    ),
  };
}

// ─── Helpers ────────────────────────────────

function rowToLongTermMemory(r: Record<string, unknown>): LongTermMemory {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    category: r.category as MemoryCategory,
    content: r.content as string,
    confidence: Number(r.confidence),
    importance: Number(r.importance),
    sourceSessions: (r.source_sessions as string[]) ?? [],
    validAt: Number(r.valid_at),
    invalidAt: r.invalid_at ? Number(r.invalid_at) : null,
    supersededBy: (r.superseded_by as string) ?? null,
    version: Number(r.version),
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}
