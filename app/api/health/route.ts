import { NextResponse } from "next/server";
import { getDB, initDB } from "@/lib/db/sqlite";

/**
 * Liveness and data-integrity check for the host's health monitor.
 *
 * Pointing a health check at `/` proves almost nothing: the homepage is
 * statically prerendered at build time, so it answers 200 with the volume
 * unmounted, the database empty, or the question bank never seeded. This route
 * opens the real database and counts the two things whose absence makes the
 * product silently useless:
 *
 *   questions       — zero means the volume is not mounted where the process
 *                     thinks it is, or `npm run seed` was never run.
 *   paper_questions — zero means `npm run seed` ran without `npm run assemble`,
 *                     which leaves /mock serving an empty list with a 200.
 *
 * Either one answers 503 so the host reports the machine unhealthy instead of
 * leaving a broken site quietly serving traffic.
 */

// Must run per request. Without this the route is a candidate for evaluation
// during `next build`, where it would report on the throwaway build-time
// database rather than the one on the volume.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    initDB();
    const db = getDB();

    const questions = (
      db.prepare("SELECT COUNT(*) AS c FROM questions WHERE status = 'published'").get() as {
        c: number;
      }
    ).c;
    const paperQuestions = (
      db.prepare("SELECT COUNT(*) AS c FROM paper_questions").get() as { c: number }
    ).c;

    const problems: string[] = [];
    if (questions === 0) {
      problems.push("no published questions: the database is empty or not the one on the volume");
    }
    if (paperQuestions === 0) {
      problems.push("no paper questions: 'npm run assemble' has not run since the last seed");
    }

    const body = {
      status: problems.length === 0 ? "ok" : "degraded",
      questions,
      paperQuestions,
      ...(problems.length > 0 && { problems }),
    };

    return NextResponse.json(body, {
      status: problems.length === 0 ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    // An unreadable or missing database file lands here.
    return NextResponse.json(
      {
        status: "error",
        error: err instanceof Error ? err.message : "database unreachable",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
