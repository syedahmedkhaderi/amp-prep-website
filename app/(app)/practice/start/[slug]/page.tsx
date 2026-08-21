import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTopicBySlug } from "@/lib/db/queries";
import { createAttempt } from "@/lib/attempts";
import { getEntitlements } from "@/lib/entitlements";

export default async function PracticeStartPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ skillId?: string }>;
}) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const topic = getTopicBySlug(slug);
  if (!topic) redirect("/topics");

  const entitlements = getEntitlements(user);
  if (!entitlements.canPractice) {
    redirect("/dashboard?reason=practice-limit");
  }

  let attemptId: string;
  try {
    const result = createAttempt({
      userId: user.id,
      examCode: topic.examCode || "AMP1",
      mode: "practice",
      topicSlug: slug,
      skillId: query.skillId,
      questionCount: 10,
      isPro: entitlements.isPro,
    });
    attemptId = result.attemptId;
  } catch {
    redirect(`/topics/${slug}?reason=no-questions`);
  }

  redirect(`/practice/runner/${attemptId}`);
}
