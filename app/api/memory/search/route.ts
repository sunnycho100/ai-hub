// ─────────────────────────────────────────────
// POST /api/memory/search  – Search long-term memories
// ─────────────────────────────────────────────

import { NextResponse } from "next/server";
import * as MemoryService from "@/lib/memory/MemoryService";
import type { SearchRequest } from "@/lib/memory/types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SearchRequest;

    if (!body?.query) {
      return NextResponse.json(
        { error: "query is required" },
        { status: 400 }
      );
    }

    const results = await MemoryService.searchMemories({
      query: body.query,
      userId: body.userId,
      categories: body.categories,
      limit: body.limit,
    });

    return NextResponse.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
