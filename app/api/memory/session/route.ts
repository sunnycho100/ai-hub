// ─────────────────────────────────────────────
// POST /api/memory/session  – Create a new session
// GET  /api/memory/session?runId=xxx – Get active session for a run
// ─────────────────────────────────────────────

import { NextResponse } from "next/server";
import * as MemoryService from "@/lib/memory/MemoryService";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      runId: string;
      userId?: string;
    };

    if (!body?.runId) {
      return NextResponse.json(
        { error: "runId is required" },
        { status: 400 }
      );
    }

    const session = await MemoryService.createSession(
      body.runId,
      body.userId
    );

    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");
    const userId = searchParams.get("userId") ?? undefined;

    if (!runId) {
      return NextResponse.json(
        { error: "runId query param is required" },
        { status: 400 }
      );
    }

    const session = await MemoryService.getActiveSessionForRun(runId, userId);

    if (!session) {
      return NextResponse.json(
        { error: "No active session found" },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
