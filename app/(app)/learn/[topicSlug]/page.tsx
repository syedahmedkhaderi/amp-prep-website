import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTopicBySlug, getSkills, getLessonsForTopic, getLessonProgress } from "@/lib/db/queries";

export default async function LearnTopicPage({ params }: { params: Promise<{ topicSlug: string }> }) {
  const { topicSlug } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const topic = getTopicBySlug(topicSlug);
  if (!topic) notFound();

  // The sidebar points free users at pricing for AMP 2, but a typed URL must be
  // stopped here too. Access control that lives only in a link is not access
  // control.
  if (topic.examCode === "AMP2" && user.plan !== "pro") {
    redirect("/pricing?from=learn");
  }

  const skills = getSkills(topic.id);
  const lessons = getLessonsForTopic(topicSlug);
  const progress = getLessonProgress(user.id);
  const completed = new Set(progress.filter((p) => p.state === "completed").map((p) => p.lessonId));
  const lessonBySkill = new Map(lessons.map((l) => [l.skillId, l]));

  return (
    <div>
      <Link href="/learn" className="text-sm text-ink-light hover:text-brand-deep">
        Back to all topics
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-brand-deep">{topic.name}</h1>
      <p className="mt-1 text-sm text-ink-soft">{topic.description}</p>

      <div className="mt-6 flex gap-3">
        <Link
          href={`/practice/start/${topic.slug}`}
          className="rounded-lg border border-brand-deep px-4 py-2 text-sm font-medium text-brand-deep hover:bg-surface-panel"
        >
          Practise this topic
        </Link>
      </div>

      <ol className="mt-8 space-y-2">
        {skills.map((skill, i) => {
          const lesson = lessonBySkill.get(skill.id);
          const done = lesson ? completed.has(lesson.id) : false;
          const body = (
            <>
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    done ? "bg-brand-deep text-white" : "bg-surface-panel text-ink-light"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <div className="min-w-0">
                  <h2 className={`font-medium ${lesson ? "text-ink" : "text-ink-light"}`}>{skill.name}</h2>
                  <p className="mt-0.5 text-xs text-ink-soft">{skill.objective}</p>
                  {!lesson && <p className="mt-1 text-xs text-ink-light">Lesson coming soon</p>}
                </div>
              </div>
            </>
          );

          return (
            <li key={skill.id}>
              {lesson ? (
                <Link
                  href={`/learn/${topic.slug}/${lesson.slug}`}
                  className="block rounded-xl border border-surface-border bg-white p-4 transition-colors hover:border-brand-600"
                >
                  {body}
                </Link>
              ) : (
                <div className="rounded-xl border border-dashed border-surface-border bg-surface p-4">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
