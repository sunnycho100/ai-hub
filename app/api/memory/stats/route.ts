// ─────────────────────────────────────────────
// GET  /api/memory/stats    – Get memory statistics
// ─────────────────────────────────────────────

import { NextResponse } from "next/server";
import * as MemoryService from "@/lib/memory/MemoryService";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") ?? undefined;

    const stats = await MemoryService.getMemoryStats(userId);
    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
