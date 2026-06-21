import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createAttempt } from "@/lib/attempts";
import { getEntitlements } from "@/lib/entitlements";
import type { ExamCode } from "@/lib/types";

export default async function MockStartPage({ params }: { params: Promise<{ examCode: string }> }) {
  const { examCode } = await params;
  const code = examCode.toUpperCase() as ExamCode;
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  if (code !== "AMP1" && code !== "AMP2") redirect("/mock");

  const entitlements = getEntitlements(user);

  // AMP 2 requires Pro
  if (code === "AMP2" && !entitlements.isPro) {
    redirect("/pricing");
  }

  // Free users: weekly cap
  if (!entitlements.isPro && !entitlements.canTakeMock) {
    redirect("/mock?reason=weekly-limit");
  }

  let attemptId: string;
  try {
    const result = createAttempt({
      userId: user.id,
      examCode: code,
      mode: "mock",
      isPro: entitlements.isPro,
    });
    attemptId = result.attemptId;
  } catch {
    redirect("/mock?reason=no-questions");
  }

  redirect(`/mock/runner/${attemptId}`);
}
