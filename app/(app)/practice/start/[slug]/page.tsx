import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTopicBySlug } from "@/lib/db/queries";
import { createAttempt } from "@/lib/attempts";
import { getEntitlements } from "@/lib/entitlements";

export default async function PracticeStartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const topic = getTopicBySlug(slug);
  if (!topic) redirect("/topics");

  const entitlements = getEntitlements(user);
  if (!entitlements.canPractice) {
    redirect("/dashboard?reason=practice-limit");
  }

  const result = createAttempt({
    userId: user.id,
    examCode: topic.examCode || "AMP1",
    mode: "practice",
    topicSlug: slug,
    questionCount: 10,
    isPro: entitlements.isPro,
  });

  redirect(`/practice/runner/${result.attemptId}`);
}
