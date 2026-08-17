import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLessonBySlug, getLessonsForTopic, getTopicBySlug, getQuestionById } from "@/lib/db/queries";
import { toClientSafe } from "@/lib/types";
import { LessonBody } from "@/components/lesson/LessonBody";
import { Checkpoint } from "@/components/lesson/Checkpoint";
import { LessonCompleteButton } from "@/components/lesson/LessonCompleteButton";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ topicSlug: string; lessonSlug: string }>;
}) {
  const { topicSlug, lessonSlug } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const lesson = getLessonBySlug(lessonSlug);
  if (!lesson || lesson.topicSlug !== topicSlug) notFound();

  const topic = getTopicBySlug(topicSlug);
  if (!topic) notFound();

  if (topic.examCode === "AMP2" && user.plan !== "pro") {
    redirect("/pricing?from=learn");
  }

  // Prev/next within the topic, so a student can read straight through.
  const siblings = getLessonsForTopic(topicSlug);
  const index = siblings.findIndex((l) => l.id === lesson.id);
  const previous = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;

  // Checkpoint questions are stripped of their answer key before they reach the
  // client. The worked solution comes back from gradeCheckpointAction after the
  // student answers, never with the page.
  const checkpointIds = lesson.blocks.flatMap((b) => (b.type === "checkpoint" ? b.questionIds : []));
  const safeQuestions = new Map(
    checkpointIds
      .map((id) => getQuestionById(id))
      .filter((q): q is NonNullable<typeof q> => q !== null && q.status === "published")
      .map((q) => [q.id, toClientSafe(q)])
  );

  return (
    <article className="max-w-3xl">
      <nav className="text-sm text-ink-light">
        <Link href="/learn" className="hover:text-brand-deep">
          Learn
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/learn/${topicSlug}`} className="hover:text-brand-deep">
          {topic.name}
        </Link>
      </nav>

      <h1 className="mt-2 text-2xl font-bold text-brand-deep">{lesson.title}</h1>
      {lesson.summary && <p className="mt-1 text-ink-soft">{lesson.summary}</p>}
      <p className="mt-2 text-xs text-ink-light">About {lesson.estMinutes} minutes</p>

      <div className="mt-8">
        <LessonBody
          blocks={lesson.blocks}
          renderCheckpoint={(questionIds) => (
            <div className="space-y-4">
              {questionIds.map((id) => {
                const q = safeQuestions.get(id);
                if (!q) return null;
                return <Checkpoint key={id} question={q} />;
              })}
            </div>
          )}
        />
      </div>

      <div className="mt-10 border-t border-surface-border pt-6">
        <LessonCompleteButton lessonSlug={lesson.slug} />
      </div>

      <nav className="mt-6 flex items-center justify-between gap-4 text-sm">
        {previous ? (
          <Link href={`/learn/${topicSlug}/${previous.slug}`} className="text-brand-deep hover:underline">
            &larr; {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/learn/${topicSlug}/${next.slug}`} className="text-right text-brand-deep hover:underline">
            {next.title} &rarr;
          </Link>
        ) : (
          <Link href={`/practice/start/${topicSlug}`} className="text-right text-brand-deep hover:underline">
            Practise this topic &rarr;
          </Link>
        )}
      </nav>
    </article>
  );
}
