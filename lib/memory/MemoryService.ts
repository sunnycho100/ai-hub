// ─────────────────────────────────────────────
// AI Hub – Memory Service (Unified Facade)
// ─────────────────────────────────────────────
// High-level API combining short-term buffer, long-term
// store, embedding service, and .md file management.

import * as STM from "./ShortTermBuffer";
import * as LTM from "./LongTermStore";
import * as Files from "./MemoryFileManager";
import { healthCheck } from "./db";
import type {
  MemoryCategory,
  MemoryContext,
  MemorySearchOptions,
  MemorySearchResult,
  MemorySession,
  ShortTermMemory,
  LongTermMemory,
  CaptureRequest,
  DEFAULT_USER_ID,
} from "./types";
import { MEMORY_CATEGORY_LABELS } from "./types";

// ─── Context Building ───────────────────────

/** Build a memory context block for prompt injection.
 *  Searches for relevant memories and formats them. */
export async function buildMemoryContext(
  topic: string,
  userId: string = "default-user",
  options?: { maxTokens?: number; categories?: MemoryCategory[] }
): Promise<MemoryContext> {
  const maxTokens = options?.maxTokens ?? 800; // ~200 words

  try {
    const results = await LTM.searchMemories({
      query: topic,
      userId,
      categories: options?.categories,
      limit: 15,
      minConfidence: 0.3,
    });

    if (results.length === 0) {
      return {
        contextBlock: "",
        tokenEstimate: 0,
        memoriesUsed: 0,
        categories: [],
      };
    }

    // Build context block with token budget
    const lines: string[] = [
      "=== USER MEMORY CONTEXT ===",
      "(The following is what you know about this user from previous interactions.)",
      "",
    ];

    // Group by category for readability
    const byCategory = new Map<MemoryCategory, MemorySearchResult[]>();
    for (const r of results) {
      const cat = r.memory.category;
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(r);
    }

    let estimatedTokens = 20; // header tokens
    const usedCategories = new Set<MemoryCategory>();
    let usedCount = 0;

    for (const [cat, memories] of byCategory) {
      const label = MEMORY_CATEGORY_LABELS[cat];
      const catHeader = `[${label}]`;
      const catHeaderTokens = Math.ceil(catHeader.length / 4);

      if (estimatedTokens + catHeaderTokens > maxTokens) break;

      lines.push(catHeader);
      estimatedTokens += catHeaderTokens;
      usedCategories.add(cat);

      for (const { memory } of memories) {
        const memLine = `- ${memory.content}`;
        const lineTokens = Math.ceil(memLine.length / 4);

        if (estimatedTokens + lineTokens > maxTokens) break;

        lines.push(memLine);
        estimatedTokens += lineTokens;
        usedCount++;
      }

      lines.push("");
    }

    lines.push("=== END MEMORY CONTEXT ===");

    return {
      contextBlock: lines.join("\n"),
      tokenEstimate: estimatedTokens,
      memoriesUsed: usedCount,
      categories: [...usedCategories],
    };
  } catch (err) {
    console.error("[MemoryService] Failed to build context:", err);
    return {
      contextBlock: "",
      tokenEstimate: 0,
      memoriesUsed: 0,
      categories: [],
    };
  }
}

// ─── Session Lifecycle ──────────────────────

export const createSession = STM.createSession;
export const getSession = STM.getSession;
export const getActiveSessionForRun = STM.getActiveSessionForRun;
export const markSessionIdle = STM.markSessionIdle;
export const markSessionConsolidated = STM.markSessionConsolidated;
export const closeSession = STM.closeSession;

// ─── Short-Term Capture ─────────────────────

/** Capture a message exchange as short-term memory */
export async function captureMessage(
  sessionId: string,
  content: string,
  source: "user_input" | "ai_response",
  provider?: string,
  round?: number
): Promise<ShortTermMemory> {
  return STM.captureMemory({
    sessionId,
    type: "message",
    content,
    source,
    provider,
    round,
  });
}

/** Capture a user preference signal */
export async function capturePreference(
  sessionId: string,
  content: string
): Promise<ShortTermMemory> {
  return STM.captureMemory({
    sessionId,
    type: "preference",
    content,
    source: "inferred",
  });
}

/** Capture user feedback (positive/negative) */
export async function captureFeedback(
  sessionId: string,
  content: string
): Promise<ShortTermMemory> {
  return STM.captureMemory({
    sessionId,
    type: "feedback",
    content,
    source: "user_input",
  });
}

/** Capture a topic signal */
export async function captureTopic(
  sessionId: string,
  topic: string
): Promise<ShortTermMemory> {
  return STM.captureMemory({
    sessionId,
    type: "topic",
    content: topic,
    source: "inferred",
  });
}

/** General-purpose capture */
export const captureMemory = STM.captureMemory;
export const getSessionMemories = STM.getSessionMemories;

// ─── Long-Term Operations ───────────────────

export const searchMemories = LTM.searchMemories;
export const getMemoriesByCategory = LTM.getMemoriesByCategory;
export const getAllActiveMemories = LTM.getAllActiveMemories;
export const storeMemory = LTM.storeMemory;
export const supersedeMemory = LTM.supersedeMemory;
export const invalidateMemory = LTM.invalidateMemory;
export const getMemoryStats = LTM.getMemoryStats;
export const storeTopicEdge = LTM.storeTopicEdge;
export const getTopicEdges = LTM.getTopicEdges;

// ─── Memory Files ───────────────────────────

export const getMemoryFile = Files.getMemoryFile;
export const getAllMemoryFiles = Files.getAllMemoryFiles;
export const updateMemoryFile = Files.updateMemoryFile;
export const regenerateMemoryFile = Files.regenerateMemoryFile;
export const regenerateAllMemoryFiles = Files.regenerateAllMemoryFiles;

// ─── Health ─────────────────────────────────

export { healthCheck };
