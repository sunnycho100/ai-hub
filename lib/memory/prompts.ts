// ─────────────────────────────────────────────
// AI Hub – Consolidation Prompts
// ─────────────────────────────────────────────
// LLM prompt templates used to extract, classify,
// and consolidate short-term memories into long-term facts.

import type { MemoryCategory, LongTermMemory } from "./types";

/** Prompt to extract memories from a session's short-term buffer */
export function buildExtractionPrompt(
  sessionMessages: string[],
  existingMemories: LongTermMemory[]
): string {
  const existingBlock =
    existingMemories.length === 0
      ? "No existing memories."
      : existingMemories
          .map(
            (m) =>
              `[${m.category}] (id: ${m.id}) ${m.content}`
          )
          .join("\n");

  return [
    "You are a memory extraction engine for an AI assistant.",
    "Your job is to analyze a conversation session and extract key facts about the user.",
    "",
    "## Existing Long-Term Memories",
    existingBlock,
    "",
    "## Session Messages",
    sessionMessages.join("\n---\n"),
    "",
    "## Task",
    "Extract distinct memorable facts from this session. For each fact:",
    "1. Classify it into ONE of these categories:",
    "   - writing_style: Tone, formatting, verbosity, code style preferences",
    "   - output_satisfaction: What the user liked/disliked about responses",
    "   - user_profile: Identity, expertise, interests, communication style",
    "   - topic_knowledge: Subjects discussed, depth of knowledge shown",
    "   - session_history: A concise summary of what this session was about",
    "",
    "2. Rate its importance from 0.0 to 1.0 (1.0 = critical to remember)",
    "",
    "3. If this fact UPDATES or CONTRADICTS an existing memory, mark it as an update",
    '   and reference the existing memory ID in "supersedes_id".',
    "",
    "4. Write the fact as a clear, standalone statement (not a question).",
    "",
    "## Output Format",
    "Return a JSON array of objects with these exact fields:",
    "```json",
    "[",
    '  {',
    '    "category": "writing_style",',
    '    "content": "User prefers concise code examples with TypeScript",',
    '    "importance": 0.8,',
    '    "is_update": false,',
    '    "supersedes_id": null',
    '  }',
    "]",
    "```",
    "",
    "Rules:",
    "- Extract 1-10 facts per session (only include genuinely useful ones).",
    "- Be specific, not generic. Avoid vague observations.",
    "- For session_history, always include exactly ONE summary entry.",
    "- If a fact contradicts an existing memory, supersede it.",
    "- Do NOT repeat existing memories unless they need updating.",
    "- Return ONLY the JSON array, no other text.",
  ].join("\n");
}

/** Prompt to detect topic relationships */
export function buildTopicExtractionPrompt(
  sessionMessages: string[]
): string {
  return [
    "You are a knowledge graph extractor.",
    "Analyze the following conversation and extract TOPIC RELATIONSHIPS.",
    "",
    "## Session Messages",
    sessionMessages.join("\n---\n"),
    "",
    "## Task",
    "Extract pairs of topics that are related in this conversation.",
    "For each pair, describe the relationship.",
    "",
    "## Output Format",
    "Return a JSON array:",
    "```json",
    "[",
    '  {',
    '    "source": "React",',
    '    "target": "Next.js",',
    '    "relationship": "framework_based_on",',
    '    "strength": 0.8',
    '  }',
    "]",
    "```",
    "",
    "Rules:",
    "- Extract 0-5 topic relationships.",
    "- Topics should be specific, not overly broad.",
    "- If no clear topic relationships exist, return an empty array [].",
    "- Return ONLY the JSON array, no other text.",
  ].join("\n");
}

/** Lightweight idle-time prompt: quick rule-based signals */
export function buildLightweightExtractionPrompt(
  recentMessages: string[]
): string {
  return [
    "Quickly extract the MOST IMPORTANT single fact from these recent messages.",
    "If there's nothing worth remembering, return null.",
    "",
    "Messages:",
    recentMessages.join("\n---\n"),
    "",
    "Return ONE JSON object or null:",
    '{"category": "...", "content": "...", "importance": 0.0-1.0}',
    "",
    "Categories: writing_style, output_satisfaction, user_profile, topic_knowledge, session_history",
    "Return ONLY the JSON, no other text.",
  ].join("\n");
}
