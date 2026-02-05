/**
 * AI Hub – Prompt Templates for Agent Communication
 *
 * Generates the prompts sent to each AI provider for each round.
 * R1: Independent answer
 * R2: Critique other agents' answers + improve
 * R3: Reconcile and produce final consolidated answer
 */

import { Provider, RunMode, PROVIDER_LABELS, TranscriptMessage } from "./types";

/** Build the Round 1 prompt: answer the topic independently. */
export function buildR1Prompt(topic: string, mode: RunMode): string {
  if (mode === "debate") {
    return [
      `You are participating in a multi-AI debate on the following topic:`,
      ``,
      `"${topic}"`,
      ``,
      `Provide your independent analysis and position. Be thoughtful, specific, and support your reasoning with evidence or logic.`,
      `Keep your response focused and under 500 words.`,
    ].join("\n");
  }

  // collaboration mode
  return [
    `You are collaborating with other AI models to solve the following:`,
    ``,
    `"${topic}"`,
    ``,
    `Provide your best initial answer or approach. Be thorough but concise.`,
    `Keep your response focused and under 500 words.`,
  ].join("\n");
}

/** Build the Round 2 prompt: critique other agents and refine your answer. */
export function buildR2Prompt(
  topic: string,
  mode: RunMode,
  currentProvider: Provider,
  r1Messages: TranscriptMessage[]
): string {
  const otherResponses = r1Messages
    .filter((m) => m.provider !== currentProvider && m.role === "assistant")
    .map(
      (m) =>
        `--- ${PROVIDER_LABELS[m.provider]} (Round 1) ---\n${m.text}`
    )
    .join("\n\n");

  if (mode === "debate") {
    return [
      `The topic under debate is: "${topic}"`,
      ``,
      `Here are the other participants' Round 1 responses:`,
      ``,
      otherResponses,
      ``,
      `Now:`,
      `1. Point out weaknesses or gaps in their arguments.`,
      `2. Defend or revise your own position.`,
      `3. Provide an improved, refined answer.`,
      ``,
      `Keep your response under 500 words.`,
    ].join("\n");
  }

  // collaboration mode
  return [
    `The topic is: "${topic}"`,
    ``,
    `Here are the other collaborators' Round 1 responses:`,
    ``,
    otherResponses,
    ``,
    `Now:`,
    `1. Identify the strongest ideas from each response.`,
    `2. Note any gaps or areas where you can add value.`,
    `3. Provide a refined, improved answer that builds on everyone's contributions.`,
    ``,
    `Keep your response under 500 words.`,
  ].join("\n");
}

/** Build the Round 3 prompt: reconcile and produce a final consolidated answer. */
export function buildR3Prompt(
  topic: string,
  mode: RunMode,
  currentProvider: Provider,
  r2Messages: TranscriptMessage[]
): string {
  const otherResponses = r2Messages
    .filter((m) => m.provider !== currentProvider && m.role === "assistant")
    .map(
      (m) =>
        `--- ${PROVIDER_LABELS[m.provider]} (Round 2) ---\n${m.text}`
    )
    .join("\n\n");

  if (mode === "debate") {
    return [
      `Final round on: "${topic}"`,
      ``,
      `Here are the other participants' Round 2 (refined) responses:`,
      ``,
      otherResponses,
      ``,
      `Produce your FINAL position:`,
      `1. Acknowledge valid points from others.`,
      `2. State where genuine disagreement remains.`,
      `3. Give your best consolidated answer.`,
      ``,
      `Keep your response under 500 words.`,
    ].join("\n");
  }

  // collaboration mode
  return [
    `Final synthesis on: "${topic}"`,
    ``,
    `Here are the other collaborators' Round 2 (refined) responses:`,
    ``,
    otherResponses,
    ``,
    `Produce a FINAL consolidated answer:`,
    `1. Merge the best ideas from all contributors.`,
    `2. Resolve any remaining conflicts.`,
    `3. Present a clear, unified solution or answer.`,
    ``,
    `Keep your response under 500 words.`,
  ].join("\n");
}
