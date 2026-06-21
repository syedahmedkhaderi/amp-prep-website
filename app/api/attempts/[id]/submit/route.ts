import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { submitUserAttempt, isAttemptExpired } from "@/lib/attempts";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: attemptId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Check if time expired (auto submit)
    if (isAttemptExpired(attemptId)) {
      // Allow submit even if expired
    }
    const result = submitUserAttempt(attemptId, user.id);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
