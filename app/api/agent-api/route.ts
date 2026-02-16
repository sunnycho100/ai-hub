import { NextResponse } from "next/server";
import {
  Provider,
  ExtendedProvider,
  PROVIDER_LABELS,
  EXTENDED_PROVIDER_LABELS,
  RunMode,
  Round,
} from "@/lib/types";

interface IncomingMessage {
  provider: ExtendedProvider;
  round: Round;
  role: "user" | "assistant";
  text: string;
}

interface AgentApiRequest {
  provider: ExtendedProvider;
  topic: string;
  mode: RunMode;
  round: Round;
  messages: IncomingMessage[];
}

function buildTurnPrompt(
  provider: ExtendedProvider,
  topic: string,
  mode: RunMode,
  round: Round,
  messages: IncomingMessage[]
) {
  const label = EXTENDED_PROVIDER_LABELS[provider];
  const modeLine =
    mode === "debate"
      ? "You should critique, improve, and sharpen your position."
      : "You should collaborate and synthesize with prior responses.";

  const history =
    messages.length === 0
      ? "No prior messages yet."
      : messages
          .map(
            (m) =>
              `Round ${m.round} - ${EXTENDED_PROVIDER_LABELS[m.provider]}: ${m.text}`
          )
          .join("\n\n");

  return [
    `You are ${label}, participating in a turn-based multi-agent discussion.`,
    `Mode: ${mode}. ${modeLine}`,
    `Current round: ${round}. This is your turn.`,
    "",
    `Topic: ${topic}`,
    "",
    "Prior messages:",
    history,
    "",
    "Respond with your next turn. Keep it concise and avoid repeating prior points verbatim.",
  ].join("\n");
}

async function callGemini(prompt: string, apiKey: string) {
  // Keep both versions for compatibility across Gemini API rollouts.
  const endpoints = [
    "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
  ];

  let lastError = "Gemini request failed";

  for (const endpoint of endpoints) {
    const response = await fetch(`${endpoint}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      lastError = data?.error?.message || `Gemini request failed (${response.status})`;
      continue;
    }

    // Gemini may return text split across multiple parts.
    const parts = data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts
          .map((p: { text?: string }) => (typeof p?.text === "string" ? p.text : ""))
          .join("")
          .trim()
      : "";

    if (text) return text;

    // Surface a more useful error if Gemini answered without textual parts.
    const finishReason = data?.candidates?.[0]?.finishReason;
    lastError = finishReason
      ? `Gemini returned no text (finishReason: ${finishReason})`
      : "Gemini returned no text";
  }

  throw new Error(lastError);
}

async function callGrok(prompt: string, apiKey: string) {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-2-latest",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "Grok request failed");
  }
  return data?.choices?.[0]?.message?.content?.trim();
}

async function callOpenAI(prompt: string, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || "OpenAI request failed");
  }
  return data?.choices?.[0]?.message?.content?.trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AgentApiRequest;

    if (!body?.provider || !body?.topic || !body?.mode || !body?.round) {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const prompt = buildTurnPrompt(
      body.provider,
      body.topic,
      body.mode,
      body.round,
      body.messages || []
    );

    let text: string | undefined;

    if (body.provider === "chatgpt") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Missing OPENAI_API_KEY" },
          { status: 400 }
        );
      }
      text = await callOpenAI(prompt, apiKey);
    }

    if (body.provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Missing GEMINI_API_KEY" },
          { status: 400 }
        );
      }
      text = await callGemini(prompt, apiKey);
    }

    if (body.provider === "grok") {
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Missing XAI_API_KEY" },
          { status: 400 }
        );
      }
      text = await callGrok(prompt, apiKey);
    }

    if (!text) {
      return NextResponse.json(
        { error: "Empty response from provider" },
        { status: 502 }
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
