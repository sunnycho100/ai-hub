// ─────────────────────────────────────────────
// GET  /api/memory/files          – Get all memory .md files
// GET  /api/memory/files?category=xxx – Get a specific .md file
// POST /api/memory/files          – Regenerate .md files
// ─────────────────────────────────────────────

import { NextResponse } from "next/server";
import * as MemoryService from "@/lib/memory/MemoryService";
import type { MemoryCategory } from "@/lib/memory/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") as MemoryCategory | null;
    const userId = searchParams.get("userId") ?? undefined;

    if (category) {
      const file = await MemoryService.getMemoryFile(category, userId);
      return NextResponse.json(file);
    }

    const files = await MemoryService.getAllMemoryFiles(userId);
    return NextResponse.json(files);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      category?: MemoryCategory;
      userId?: string;
    };

    if (body?.category) {
      const content = await MemoryService.regenerateMemoryFile(
        body.category,
        body.userId
      );
      return NextResponse.json({ category: body.category, content });
    }

    const files = await MemoryService.regenerateAllMemoryFiles(body?.userId);
    return NextResponse.json(files);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
