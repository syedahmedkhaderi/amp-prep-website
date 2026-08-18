import { getCurrentUser } from "@/lib/auth";
import { getTopics, getPublishedLessons, getLessonProgress } from "@/lib/db/queries";
import { LearnSidebar, type SidebarTopic } from "@/components/lesson/LearnSidebar";

/**
 * Shared shell for the Learn section.
 *
 * The topic rail is built here rather than on each page so it keeps its scroll
 * position while a student moves between lessons, and so the progress counts
 * are computed once per navigation instead of three times.
 */
export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const isPro = user.plan === "pro";
  const topics = getTopics();
  const lessons = getPublishedLessons();
  const progress = getLessonProgress(user.id);
  const completed = new Set(progress.filter((p) => p.state === "completed").map((p) => p.lessonId));

  const sidebarTopics: SidebarTopic[] = topics.map((topic) => {
    const topicLessons = lessons.filter((l) => l.topicSlug === topic.slug);
    const locked = topic.examCode === "AMP2" && !isPro;
    return {
      slug: topic.slug,
      name: topic.name,
      examCode: (topic.examCode ?? "AMP1") as "AMP1" | "AMP2",
      lessonCount: topicLessons.length,
      completedCount: topicLessons.filter((l) => completed.has(l.id)).length,
      // AMP 2 is the paid tier. The rail still lists these so a free student can
      // see what Pro contains; the link goes to pricing rather than the lesson.
      locked,
      // Lesson titles ship for every unlocked topic, but the rail only expands
      // the one being read, so this is not 200 links in the DOM.
      lessons: locked
        ? []
        : topicLessons.map((l) => ({
            slug: l.slug,
            title: l.title,
            completed: completed.has(l.id),
          })),
    };
  });

  return (
    <div className="mx-auto max-w-7xl gap-8 px-6 py-8 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <LearnSidebar topics={sidebarTopics} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
