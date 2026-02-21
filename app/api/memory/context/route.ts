// ─────────────────────────────────────────────
// GET  /api/memory/context?topic=xxx – Build memory context for prompts
// ─────────────────────────────────────────────

import { NextResponse } from "next/server";
import * as MemoryService from "@/lib/memory/MemoryService";
import type { MemoryCategory } from "@/lib/memory/types";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get("topic");
    const userId = searchParams.get("userId") ?? undefined;
    const categoriesParam = searchParams.get("categories");
    const maxTokens = searchParams.get("maxTokens");

    if (!topic) {
      return NextResponse.json(
        { error: "topic query param is required" },
        { status: 400 }
      );
    }

    const categories = categoriesParam
      ? (categoriesParam.split(",") as MemoryCategory[])
      : undefined;

    const context = await MemoryService.buildMemoryContext(topic, userId, {
      maxTokens: maxTokens ? parseInt(maxTokens, 10) : undefined,
      categories,
    });

    return NextResponse.json(context);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
