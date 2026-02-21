// ─────────────────────────────────────────────
// AI Hub – Memory File Manager
// ─────────────────────────────────────────────
// Generates and maintains per-category .md files
// that serve as human-readable memory snapshots.

import { query, generateMemoryId } from "./db";
import {
  type MemoryCategory,
  MEMORY_CATEGORIES,
  MEMORY_CATEGORY_LABELS,
  MEMORY_CATEGORY_DESCRIPTIONS,
} from "./types";
import { getMemoriesByCategory } from "./LongTermStore";

// ─── File CRUD ──────────────────────────────

/** Get the .md content for a specific category */
export async function getMemoryFile(
  category: MemoryCategory,
  userId: string = "default-user"
): Promise<{ content: string; version: number; updatedAt: number }> {
  const result = await query(
    `SELECT content, version,
            EXTRACT(EPOCH FROM updated_at) * 1000 AS updated_at
     FROM memory_files
     WHERE user_id = $1 AND category = $2`,
    [userId, category]
  );

  if (result.rows.length === 0) {
    // Auto-create if missing
    const defaultContent = buildDefaultContent(category);
    await ensureMemoryFile(userId, category, defaultContent);
    return { content: defaultContent, version: 1, updatedAt: Date.now() };
  }

  const row = result.rows[0] as Record<string, unknown>;
  return {
    content: row.content as string,
    version: Number(row.version),
    updatedAt: Number(row.updated_at),
  };
}

/** Get all .md files for a user */
export async function getAllMemoryFiles(
  userId: string = "default-user"
): Promise<
  Record<
    MemoryCategory,
    { content: string; version: number; updatedAt: number }
  >
> {
  const files = {} as Record<
    MemoryCategory,
    { content: string; version: number; updatedAt: number }
  >;

  for (const cat of MEMORY_CATEGORIES) {
    files[cat] = await getMemoryFile(cat, userId);
  }

  return files;
}

/** Update the .md content for a category */
export async function updateMemoryFile(
  category: MemoryCategory,
  content: string,
  userId: string = "default-user"
): Promise<void> {
  await query(
    `UPDATE memory_files
     SET content = $1, version = version + 1, updated_at = NOW()
     WHERE user_id = $2 AND category = $3`,
    [content, userId, category]
  );
}

// ─── Regeneration ───────────────────────────

/** Regenerate a .md file from current long-term memories */
export async function regenerateMemoryFile(
  category: MemoryCategory,
  userId: string = "default-user"
): Promise<string> {
  const memories = await getMemoriesByCategory(category, userId);

  const label = MEMORY_CATEGORY_LABELS[category];
  const description = MEMORY_CATEGORY_DESCRIPTIONS[category];

  const lines: string[] = [
    `# ${label}`,
    "",
    `> ${description}`,
    "",
    `_Last updated: ${new Date().toISOString()}_`,
    `_Total memories: ${memories.length}_`,
    "",
    "---",
    "",
  ];

  if (memories.length === 0) {
    lines.push("_No memories recorded yet._");
  } else {
    // Group by importance
    const high = memories.filter((m) => m.importance >= 0.7);
    const medium = memories.filter(
      (m) => m.importance >= 0.4 && m.importance < 0.7
    );
    const low = memories.filter((m) => m.importance < 0.4);

    if (high.length > 0) {
      lines.push("## Key Insights");
      lines.push("");
      for (const m of high) {
        lines.push(
          `- **${m.content}** _(confidence: ${(m.confidence * 100).toFixed(0)}%, v${m.version})_`
        );
      }
      lines.push("");
    }

    if (medium.length > 0) {
      lines.push("## Notable Observations");
      lines.push("");
      for (const m of medium) {
        lines.push(
          `- ${m.content} _(confidence: ${(m.confidence * 100).toFixed(0)}%)_`
        );
      }
      lines.push("");
    }

    if (low.length > 0) {
      lines.push("## Minor Notes");
      lines.push("");
      for (const m of low) {
        lines.push(`- ${m.content}`);
      }
      lines.push("");
    }
  }

  const content = lines.join("\n");
  await updateMemoryFile(category, content, userId);
  return content;
}

/** Regenerate all .md files */
export async function regenerateAllMemoryFiles(
  userId: string = "default-user"
): Promise<Record<MemoryCategory, string>> {
  const result = {} as Record<MemoryCategory, string>;

  for (const cat of MEMORY_CATEGORIES) {
    result[cat] = await regenerateMemoryFile(cat, userId);
  }

  return result;
}

// ─── Helpers ────────────────────────────────

function buildDefaultContent(category: MemoryCategory): string {
  const label = MEMORY_CATEGORY_LABELS[category];
  return `# ${label}\n\n_No data recorded yet._\n`;
}

async function ensureMemoryFile(
  userId: string,
  category: MemoryCategory,
  content: string
): Promise<void> {
  const id = generateMemoryId("mf");
  await query(
    `INSERT INTO memory_files (id, user_id, category, content)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, category) DO NOTHING`,
    [id, userId, category, content]
  );
}
