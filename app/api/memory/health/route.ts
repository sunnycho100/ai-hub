// ─────────────────────────────────────────────
// GET /api/memory/health  – Check DB connectivity
// ─────────────────────────────────────────────

import { NextResponse } from "next/server";
import { healthCheck } from "@/lib/memory/db";

export async function GET() {
  try {
    const ok = await healthCheck();
    return NextResponse.json(
      { status: ok ? "ok" : "error", database: ok },
      { status: ok ? 200 : 503 }
    );
  } catch (err) {
    return NextResponse.json(
      { status: "error", database: false },
      { status: 503 }
    );
  }
}
