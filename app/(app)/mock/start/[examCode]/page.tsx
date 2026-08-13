import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createAttempt } from "@/lib/attempts";
import { getEntitlements } from "@/lib/entitlements";
import { getPaperById } from "@/lib/db/queries";
import type { ExamCode } from "@/lib/types";

export default async function MockStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ examCode: string }>;
  searchParams?: Promise<{ paper?: string }>;
}) {
  const { examCode } = await params;
  const query = searchParams ? await searchParams : {};
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

  // A specific paper was requested: verify it belongs to this exam and that
  // free users aren't reaching a Pro-only paper directly via the URL.
  if (query.paper) {
    const paper = getPaperById(query.paper);
    if (!paper || paper.examCode !== code) {
      redirect("/mock?reason=no-questions");
    }
    if (!paper.isFree && !entitlements.isPro) {
      redirect("/pricing");
    }
  }

  let attemptId: string;
  try {
    const result = createAttempt({
      userId: user.id,
      examCode: code,
      mode: "mock",
      isPro: entitlements.isPro,
      paperId: query.paper,
    });
    attemptId = result.attemptId;
  } catch {
    redirect("/mock?reason=no-questions");
  }

  redirect(`/mock/runner/${attemptId}`);
}
