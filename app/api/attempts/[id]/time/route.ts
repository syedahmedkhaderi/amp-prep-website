import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDB, initDB } from "@/lib/db/sqlite";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: attemptId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  initDB();
  const db = getDB();
  const attempt = db.prepare(
    `SELECT user_id, started_at, submitted_at, time_limit_seconds
     FROM attempts
     WHERE id = ?`
  ).get(attemptId) as any;
  if (!attempt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (attempt.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!attempt.time_limit_seconds || attempt.submitted_at) {
    return NextResponse.json({ remainingSeconds: null });
  }

  const started = new Date(attempt.started_at + "Z").getTime();
  const elapsed = Math.floor((Date.now() - started) / 1000);
  const remaining = Math.max(0, attempt.time_limit_seconds - elapsed);

  return NextResponse.json({ remainingSeconds: remaining });
}
