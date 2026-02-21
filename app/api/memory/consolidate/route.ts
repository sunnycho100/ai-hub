// ─────────────────────────────────────────────
// POST /api/memory/consolidate  – Trigger consolidation for a session
// ─────────────────────────────────────────────

import { NextResponse } from "next/server";
import { triggerConsolidation } from "@/lib/memory/IdleDetector";
import type { ConsolidateRequest } from "@/lib/memory/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ConsolidateRequest;

    if (!body?.sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const result = await triggerConsolidation(
      body.sessionId,
      body.userId
    );

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
