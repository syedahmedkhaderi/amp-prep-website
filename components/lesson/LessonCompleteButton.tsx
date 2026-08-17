"use client";

import { useState } from "react";
import { markLessonProgressAction } from "@/app/(app)/learn/[topicSlug]/[lessonSlug]/actions";

/**
 * Marks a lesson finished.
 *
 * Deliberately an explicit button rather than a scroll-depth or timer
 * heuristic: the student decides when they have understood something, and a
 * progress marker that fires on scrolling to the bottom would tell them they
 * have learned something they may have skimmed.
 */
export function LessonCompleteButton({ lessonSlug }: { lessonSlug: string }) {
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function complete() {
    if (pending || done) return;
    setPending(true);
    const result = await markLessonProgressAction(lessonSlug, "completed");
    setPending(false);
    if (result.ok) setDone(true);
  }

  return (
    <button
      type="button"
      onClick={complete}
      disabled={pending || done}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        done ? "bg-green-50 text-green-800" : "bg-brand-deep text-white hover:bg-brand-700"
      }`}
    >
      {done ? "Marked as complete" : pending ? "Saving..." : "Mark as complete"}
    </button>
  );
}
