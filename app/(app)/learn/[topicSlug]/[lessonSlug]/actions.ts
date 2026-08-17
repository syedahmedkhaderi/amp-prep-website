"use server";

import { getCurrentUser } from "@/lib/auth";
import { getQuestionById, upsertLessonProgress, getLessonBySlug } from "@/lib/db/queries";
import { gradeAnswer } from "@/lib/grading";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * Grade one lesson checkpoint answer.
 *
 * Two things make this different from the practice runner's grading:
 *
 * It creates no attempt row, so a checkpoint does not consume the free tier's
 * daily practice allowance. Reading a lesson and answering the question inside
 * it is part of the lesson, not a practice session.
 *
 * The worked solution is returned *here*, in the response to a submitted
 * answer, and is never included in the page the student is sent. Passing the
 * explanation down with the lesson so the client could reveal it would put the
 * whole answer key in the HTML of every lesson page — which is exactly what
 * tests/answer-key-leakage.test.ts exists to prevent for the question runner.
 */
export async function gradeCheckpointAction(
  questionId: string,
  response: unknown
): Promise<
  | { ok: true; isCorrect: boolean; correctAnswer: string; explanationSteps: string[]; conceptSummary: string | null }
  | { ok: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const limit = checkRateLimit(`checkpoint:${user.id}`, 120, 15 * 60 * 1000);
  if (!limit.allowed) return { ok: false, error: "Too many answers too quickly. Try again shortly." };

  const question = getQuestionById(questionId);
  if (!question) return { ok: false, error: "Question not found." };

  const result = gradeAnswer(question, response);
  return {
    ok: true,
    isCorrect: result.isCorrect,
    correctAnswer: result.correctAnswerText,
    explanationSteps: question.explanationSteps ?? [],
    conceptSummary: question.conceptSummary ?? null,
  };
}

/** Record that the student has read, or finished, this lesson. */
export async function markLessonProgressAction(
  lessonSlug: string,
  state: "viewed" | "completed"
): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const lesson = getLessonBySlug(lessonSlug);
  if (!lesson) return { ok: false };

  upsertLessonProgress(user.id, lesson.id, state);
  return { ok: true };
}
