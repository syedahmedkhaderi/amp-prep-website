import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { MockRunner } from "@/components/test-runner/MockRunner";
import { getAttemptReview } from "@/lib/attempts";
import { getExamByCode } from "@/lib/db/queries";
import { toClientSafe } from "@/lib/types";

export default async function MockRunnerPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const review = getAttemptReview(attemptId);
  if (review.attempt.user_id !== user.id) redirect("/dashboard");
  if (review.attempt.submitted_at) redirect(`/attempt/${attemptId}/review`);

  const exam = getExamByCode(review.attempt.exam_code || "AMP1");
  const clientQuestions = review.questions.map((q: any) => toClientSafe(q));

  return (
    <MockRunner
      attemptId={attemptId}
      questions={clientQuestions}
      timeLimitSeconds={review.attempt.time_limit_seconds}
      examTitle={exam?.title || "AMP Mock Exam"}
    />
  );
}
