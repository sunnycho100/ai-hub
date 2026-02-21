// ─────────────────────────────────────────────
// POST /api/memory/capture  – Capture a short-term memory
// GET  /api/memory/capture?sessionId=xxx – Get session memories
// ─────────────────────────────────────────────

import { NextResponse } from "next/server";
import * as MemoryService from "@/lib/memory/MemoryService";
import type { CaptureRequest } from "@/lib/memory/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CaptureRequest;

    if (!body?.sessionId || !body?.content || !body?.type || !body?.source) {
      return NextResponse.json(
        { error: "sessionId, type, content, and source are required" },
        { status: 400 }
      );
    }

    const memory = await MemoryService.captureMemory({
      sessionId: body.sessionId,
      type: body.type,
      content: body.content,
      source: body.source,
      provider: body.provider,
      round: body.round,
      metadata: body.metadata,
    });

    return NextResponse.json(memory, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId query param is required" },
        { status: 400 }
      );
    }

    const memories = await MemoryService.getSessionMemories(sessionId);
    return NextResponse.json(memories);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
