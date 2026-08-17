import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getTopics, getSkills, getPublishedLessons, getLessonProgress } from "@/lib/db/queries";

export const metadata = { title: "Learn" };

/**
 * The syllabus index: every topic, how many lessons it has, and how far the
 * student has got.
 *
 * AMP 1 lessons are free. AMP 2 lessons are part of Pro, and a free student
 * sees them listed but locked rather than hidden, so the syllabus does not look
 * truncated and the upgrade has a visible reason.
 */
export default async function LearnPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const isPro = user.plan === "pro";

  const topics = getTopics();
  const skills = getSkills();
  const lessons = getPublishedLessons();
  const progress = getLessonProgress(user.id);

  const completed = new Set(progress.filter((p) => p.state === "completed").map((p) => p.lessonId));
  const lessonsByTopic = new Map<string, typeof lessons>();
  for (const lesson of lessons) {
    const key = lesson.topicSlug ?? "";
    const bucket = lessonsByTopic.get(key);
    if (bucket) bucket.push(lesson);
    else lessonsByTopic.set(key, [lesson]);
  }
  const skillCount = new Map<string, number>();
  for (const s of skills) {
    if (!s.topicSlug) continue;
    skillCount.set(s.topicSlug, (skillCount.get(s.topicSlug) ?? 0) + 1);
  }

  const amp1 = topics.filter((t) => t.examCode === "AMP1");
  const amp2 = topics.filter((t) => t.examCode === "AMP2");

  const totalLessons = lessons.length;
  const totalDone = lessons.filter((l) => completed.has(l.id)).length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-deep">Learn</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Every topic on the UDST placement syllabus, explained from the beginning. Read a lesson, then
        practise the same skill.
      </p>

      {totalLessons > 0 && (
        <p className="mt-4 text-sm text-ink-light">
          {totalDone} of {totalLessons} lessons completed
        </p>
      )}

      <Section
        title="AMP 1: the basics"
        subtitle="Everyone applying to UDST takes this test."
        topics={amp1}
        lessonsByTopic={lessonsByTopic}
        skillCount={skillCount}
        completed={completed}
        locked={false}
      />
      <Section
        title="AMP 2: precalculus"
        subtitle={
          isPro
            ? "Taken only by students who score a high pass on AMP 1."
            : "Taken only by students who score a high pass on AMP 1. Part of Pro."
        }
        topics={amp2}
        lessonsByTopic={lessonsByTopic}
        skillCount={skillCount}
        completed={completed}
        locked={!isPro}
      />
    </div>
  );
}

function Section({
  title,
  subtitle,
  topics,
  lessonsByTopic,
  skillCount,
  completed,
  locked,
}: {
  title: string;
  subtitle: string;
  topics: { id: string; name: string; slug: string; description: string }[];
  lessonsByTopic: Map<string, { id: string; topicSlug?: string }[]>;
  skillCount: Map<string, number>;
  completed: Set<string>;
  locked: boolean;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <p className="text-sm text-ink-soft">{subtitle}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic, i) => {
          const topicLessons = lessonsByTopic.get(topic.slug) ?? [];
          const done = topicLessons.filter((l) => completed.has(l.id)).length;
          const skills = skillCount.get(topic.slug) ?? 0;
          const ready = topicLessons.length > 0;
          return (
            <Link
              key={topic.id}
              href={locked ? "/pricing?from=learn" : `/learn/${topic.slug}`}
              className={`group rounded-xl border bg-white p-4 transition-colors ${
                locked
                  ? "border-dashed border-surface-border hover:border-brand-600"
                  : ready
                    ? "border-surface-border hover:border-brand-600"
                    : "border-surface-border opacity-70"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-medium text-ink-light">{String(i + 1).padStart(2, "0")}</span>
                {locked ? (
                  <span className="rounded-full bg-brand-deep px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Pro
                  </span>
                ) : ready ? (
                  <span className="text-xs text-ink-light">
                    {done}/{topicLessons.length} done
                  </span>
                ) : (
                  <span className="text-xs text-ink-light">{skills} skills</span>
                )}
              </div>
              <h3 className={`mt-1 font-semibold group-hover:text-brand-deep ${locked ? "text-ink-soft" : "text-ink"}`}>
                {topic.name}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{topic.description}</p>
              {locked && (
                <p className="mt-2 text-xs text-brand-600">{topicLessons.length} lessons, unlock with Pro</p>
              )}
              {!locked && !ready && <p className="mt-2 text-xs text-ink-light">Lessons coming soon</p>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
