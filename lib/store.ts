/**
 * AI Hub – Run Store (localStorage-based persistence)
 *
 * Stores and retrieves runs + transcripts from localStorage.
 */

import { Run, TranscriptMessage } from "./types";

const STORAGE_KEY = "ai-hub-runs";

/** Load all runs from localStorage. */
export function loadRuns(): Run[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Save all runs to localStorage. */
export function saveRuns(runs: Run[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

/** Create a new run and persist it. Returns the new run. */
export function createRun(
  topic: string,
  mode: "debate" | "collaboration"
): Run {
  const run: Run = {
    id: generateId(),
    topic,
    mode,
    status: "IDLE",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const runs = loadRuns();
  runs.unshift(run);
  saveRuns(runs);
  return run;
}

/** Add a message to a run. Returns the updated run. */
export function addMessageToRun(
  runId: string,
  message: Omit<TranscriptMessage, "id">
): Run | null {
  const runs = loadRuns();
  const run = runs.find((r) => r.id === runId);
  if (!run) return null;

  run.messages.push({ ...message, id: generateId() });
  run.updatedAt = Date.now();
  saveRuns(runs);
  return { ...run };
}

/** Update the status of a run. */
export function updateRunStatus(
  runId: string,
  status: Run["status"]
): Run | null {
  const runs = loadRuns();
  const run = runs.find((r) => r.id === runId);
  if (!run) return null;

  run.status = status;
  run.updatedAt = Date.now();
  saveRuns(runs);
  return { ...run };
}

/** Get a run by ID. */
export function getRun(runId: string): Run | null {
  const runs = loadRuns();
  return runs.find((r) => r.id === runId) || null;
}

/** Delete a run. */
export function deleteRun(runId: string): void {
  const runs = loadRuns().filter((r) => r.id !== runId);
  saveRuns(runs);
}

/** Simple ID generator. */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
