/**
 * AI Hub – Cloud Records API
 *
 * Provides server-side in-memory storage for run records so users can
 * "send records to the cloud" and later check whether they are still available.
 *
 * Routes:
 *   GET  /api/records          → list all cloud records
 *   GET  /api/records?id=<id>  → get a single record by id
 *   POST /api/records          → save a record { id, topic, mode, status, messages, createdAt, updatedAt, source? }
 *   DELETE /api/records?id=<id> → remove a record by id
 */

import { NextRequest, NextResponse } from "next/server";
import { Run } from "@/lib/types";

// In-memory store (persists for the lifetime of the server process).
// NOTE: All cloud records are lost when the server restarts or redeploys.
const cloudStore = new Map<string, Run>();

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const record = cloudStore.get(id);
    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    return NextResponse.json({ record });
  }

  return NextResponse.json({ records: Array.from(cloudStore.values()) });
}

export async function POST(req: NextRequest) {
  let body: Run;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.id || !body?.topic) {
    return NextResponse.json(
      { error: "Record must have id and topic" },
      { status: 400 }
    );
  }

  cloudStore.set(body.id, body);
  return NextResponse.json({ record: body }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param required" }, { status: 400 });
  }

  if (!cloudStore.has(id)) {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  cloudStore.delete(id);
  return NextResponse.json({ success: true });
}
