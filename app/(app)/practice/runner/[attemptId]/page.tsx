import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PracticeRunner } from "@/components/test-runner/PracticeRunner";
import { getAttemptReview } from "@/lib/attempts";
import { getQuestionById } from "@/lib/db/queries";
import { toClientSafe } from "@/lib/types";

export default async function PracticeRunnerPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const review = getAttemptReview(attemptId);
  if (review.attempt.user_id !== user.id) redirect("/dashboard");
  if (review.attempt.submitted_at) redirect(`/attempt/${attemptId}/review`);

  const clientQuestions = review.questions.map((q: any) => toClientSafe(q));

  return (
    <PracticeRunner
      attemptId={attemptId}
      questions={clientQuestions}
    />
  );
}
