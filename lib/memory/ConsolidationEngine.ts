// ─────────────────────────────────────────────
// AI Hub – Consolidation Engine
// ─────────────────────────────────────────────
// Converts short-term session memories into long-term
// persistent memories using LLM extraction + dedup.

import * as STM from "./ShortTermBuffer";
import * as LTM from "./LongTermStore";
import * as Files from "./MemoryFileManager";
import {
  buildExtractionPrompt,
  buildTopicExtractionPrompt,
} from "./prompts";
import type {
  ConsolidationResult,
  ExtractedMemory,
  LongTermMemory,
  MemoryCategory,
  TopicEdge,
} from "./types";

// ─── LLM Call (reuses existing API route infra) ─

/** Call an LLM for consolidation. Uses OpenAI by default. */
async function callLLM(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY for consolidation");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a precise memory extraction engine. Return only valid JSON as instructed.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3, // low temp for consistency
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ??
        `LLM call failed (${response.status})`
    );
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0].message.content;
}

// ─── Consolidation ──────────────────────────

/** Run full consolidation for a session */
export async function consolidateSession(
  sessionId: string,
  userId: string = "default-user"
): Promise<ConsolidationResult> {
  // 1. Gather short-term memories
  const stmEntries = await STM.getSessionMemories(sessionId);

  if (stmEntries.length === 0) {
    return {
      newMemories: [],
      updatedMemories: [],
      supersededIds: [],
      topicEdges: [],
      mdFilesUpdated: [],
      sessionId,
    };
  }

  // 2. Format messages for LLM
  const sessionMessages = stmEntries.map(
    (m) =>
      `[${m.source}${m.provider ? ` | ${m.provider}` : ""}${m.round ? ` | R${m.round}` : ""}] ${m.content}`
  );

  // 3. Get existing memories for dedup/update
  const existingMemories = await LTM.getAllActiveMemories(userId);

  // 4. Call LLM to extract memories
  const extractionPrompt = buildExtractionPrompt(
    sessionMessages,
    existingMemories
  );
  const extractionResponse = await callLLM(extractionPrompt);
  const extractedMemories = parseExtractedMemories(extractionResponse);

  // 5. Call LLM to extract topic relationships
  let topicEdges: TopicEdge[] = [];
  try {
    const topicPrompt = buildTopicExtractionPrompt(sessionMessages);
    const topicResponse = await callLLM(topicPrompt);
    topicEdges = await processTopicEdges(topicResponse, userId);
  } catch (err) {
    console.warn("[ConsolidationEngine] Topic extraction failed:", err);
  }

  // 6. Store extracted memories
  const newMemories: LongTermMemory[] = [];
  const updatedMemories: LongTermMemory[] = [];
  const supersededIds: string[] = [];
  const affectedCategories = new Set<MemoryCategory>();

  for (const extracted of extractedMemories) {
    try {
      if (extracted.isUpdate && extracted.supersedesId) {
        // Update existing memory
        const updated = await LTM.supersedeMemory(
          extracted.supersedesId,
          extracted.content,
          sessionId,
          extracted.importance
        );
        updatedMemories.push(updated);
        supersededIds.push(extracted.supersedesId);
      } else {
        // Check for semantic duplicates before storing
        const isDuplicate = await checkDuplicate(
          extracted.content,
          extracted.category,
          userId
        );

        if (!isDuplicate) {
          const memory = await LTM.storeMemory({
            userId,
            category: extracted.category,
            content: extracted.content,
            confidence: 0.6, // initial confidence
            importance: extracted.importance,
            sourceSessions: [sessionId],
          });
          newMemories.push(memory);
        }
      }
      affectedCategories.add(extracted.category);
    } catch (err) {
      console.error(
        "[ConsolidationEngine] Failed to store memory:",
        extracted,
        err
      );
    }
  }

  // 7. Regenerate .md files for affected categories
  const mdFilesUpdated: MemoryCategory[] = [];
  for (const cat of affectedCategories) {
    try {
      await Files.regenerateMemoryFile(cat, userId);
      mdFilesUpdated.push(cat);
    } catch (err) {
      console.error(
        `[ConsolidationEngine] Failed to regenerate ${cat}.md:`,
        err
      );
    }
  }

  // 8. Mark session as consolidated
  await STM.markSessionConsolidated(sessionId);

  // 9. Clean up short-term buffer (optional: keep for audit)
  // await STM.clearSessionMemories(sessionId);

  return {
    newMemories,
    updatedMemories,
    supersededIds,
    topicEdges,
    mdFilesUpdated,
    sessionId,
  };
}

// ─── Duplicate Detection ────────────────────

/** Check if a memory is semantically too similar to existing ones */
async function checkDuplicate(
  content: string,
  category: MemoryCategory,
  userId: string
): Promise<boolean> {
  try {
    const results = await LTM.searchMemories({
      query: content,
      userId,
      categories: [category],
      limit: 3,
      minConfidence: 0.3,
    });

    // If we find a memory with > 0.9 similarity, it's a duplicate
    return results.some((r) => r.similarity > 0.9);
  } catch {
    return false; // fail open — allow storage
  }
}

// ─── Parsing ────────────────────────────────

/** Parse the LLM response into ExtractedMemory objects */
function parseExtractedMemories(response: string): ExtractedMemory[] {
  try {
    // The LLM might return {"memories": [...]} or just [...]
    let parsed = JSON.parse(response);

    // Handle wrapper object
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      // Look for an array property
      const arrayProp = Object.values(parsed).find(Array.isArray);
      if (arrayProp) {
        parsed = arrayProp;
      } else {
        // Single object — wrap in array
        parsed = [parsed];
      }
    }

    if (!Array.isArray(parsed)) {
      console.warn("[ConsolidationEngine] LLM returned non-array:", response);
      return [];
    }

    const validCategories = new Set([
      "writing_style",
      "output_satisfaction",
      "user_profile",
      "topic_knowledge",
      "session_history",
    ]);

    return parsed
      .filter(
        (item: Record<string, unknown>) =>
          item &&
          typeof item.category === "string" &&
          validCategories.has(item.category) &&
          typeof item.content === "string" &&
          item.content.length > 0
      )
      .map((item: Record<string, unknown>) => ({
        category: item.category as MemoryCategory,
        content: item.content as string,
        importance: Math.max(
          0,
          Math.min(1, Number(item.importance) || 0.5)
        ),
        isUpdate: Boolean(item.is_update),
        supersedesId:
          typeof item.supersedes_id === "string"
            ? item.supersedes_id
            : undefined,
      }));
  } catch (err) {
    console.error("[ConsolidationEngine] Failed to parse extraction:", err);
    return [];
  }
}

/** Process topic edges from LLM response */
async function processTopicEdges(
  response: string,
  userId: string
): Promise<TopicEdge[]> {
  try {
    let parsed = JSON.parse(response);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const arrayProp = Object.values(parsed).find(Array.isArray);
      if (arrayProp) parsed = arrayProp;
      else return [];
    }

    if (!Array.isArray(parsed)) return [];

    const edges: TopicEdge[] = [];
    for (const item of parsed) {
      if (
        typeof item.source === "string" &&
        typeof item.target === "string" &&
        typeof item.relationship === "string"
      ) {
        const edge = await LTM.storeTopicEdge({
          userId,
          sourceTopic: item.source,
          targetTopic: item.target,
          relationship: item.relationship,
          strength: Number(item.strength) || 0.5,
        });
        edges.push(edge);
      }
    }
    return edges;
  } catch (err) {
    console.error("[ConsolidationEngine] Failed to parse topics:", err);
    return [];
  }
}
