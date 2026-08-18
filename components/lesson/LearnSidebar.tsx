"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * Topic navigation for the Learn section.
 *
 * The syllabus is 32 topics and 197 lessons. Without a persistent rail the only
 * way between two lessons is back to the index and down again, which is a lot
 * of navigation for a student working through a topic.
 *
 * The topic the student is currently in expands to show its lessons, so moving
 * between lessons in a topic never leaves the page. Other topics stay collapsed
 * — expanding all 32 would put roughly 200 links in the rail.
 *
 * Everything is numbered. The syllabus has an order and the numbering is how a
 * student knows where they are in it.
 *
 * AMP 2 topics are shown to everyone rather than hidden. A free student should
 * be able to see what the paid tier contains and decide, and hiding it makes
 * the syllabus look incomplete. Locked entries link to /pricing.
 */

export interface SidebarLesson {
  slug: string;
  title: string;
  completed: boolean;
}

export interface SidebarTopic {
  slug: string;
  name: string;
  examCode: "AMP1" | "AMP2";
  lessonCount: number;
  completedCount: number;
  locked: boolean;
  lessons: SidebarLesson[];
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="M7.5 5l5 5-5 5V5z" />
    </svg>
  );
}

function TopicEntry({
  topic,
  index,
  active,
  activeLesson,
}: {
  topic: SidebarTopic;
  index: number;
  active: boolean;
  activeLesson: string;
}) {
  const done = topic.lessonCount > 0 && topic.completedCount === topic.lessonCount;
  const number = String(index).padStart(2, "0");

  if (topic.locked) {
    return (
      <Link
        href="/pricing?from=learn"
        className="group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-ink-light transition hover:bg-surface-panel"
        title="AMP 2 lessons are part of Pro"
      >
        <span className="shrink-0 tabular-nums text-[11px] text-ink-light">{number}</span>
        <span className="truncate">{topic.name}</span>
        <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wide text-brand-600 group-hover:underline">
          Pro
        </span>
      </Link>
    );
  }

  return (
    <div>
      <Link
        href={`/learn/${topic.slug}`}
        aria-current={active ? "page" : undefined}
        aria-expanded={active}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
          active ? "bg-brand-deep font-medium text-white" : "text-ink hover:bg-surface-panel"
        }`}
      >
        {topic.lessons.length > 0 ? <Chevron open={active} /> : <span className="w-3.5 shrink-0" />}
        <span className="shrink-0 tabular-nums text-[11px] opacity-70">{number}</span>
        <span className="truncate">{topic.name}</span>
        <span
          className={`ml-auto shrink-0 text-[11px] tabular-nums ${
            active ? "text-white/70" : done ? "text-green-600" : "text-ink-light"
          }`}
        >
          {done ? "done" : `${topic.completedCount}/${topic.lessonCount}`}
        </span>
      </Link>

      {active && topic.lessons.length > 0 && (
        <ol className="mt-0.5 space-y-0.5 border-l border-surface-border pl-3 ml-5">
          {topic.lessons.map((lesson, i) => {
            const current = lesson.slug === activeLesson;
            return (
              <li key={lesson.slug}>
                <Link
                  href={`/learn/${topic.slug}/${lesson.slug}`}
                  aria-current={current ? "page" : undefined}
                  className={`flex items-start gap-2 rounded-md px-2 py-1 text-xs transition ${
                    current
                      ? "bg-surface-panel font-medium text-brand-deep"
                      : "text-ink-soft hover:bg-surface-panel hover:text-ink"
                  }`}
                >
                  <span className="shrink-0 tabular-nums text-ink-light">
                    {number}.{i + 1}
                  </span>
                  <span className="min-w-0 flex-1">{lesson.title}</span>
                  {lesson.completed && (
                    <span aria-label="completed" className="shrink-0 text-green-600">
                      ✓
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function LearnSidebar({ topics }: { topics: SidebarTopic[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const amp1 = topics.filter((t) => t.examCode === "AMP1");
  const amp2 = topics.filter((t) => t.examCode === "AMP2");

  // /learn/[topicSlug]/[lessonSlug]
  const parts = pathname.split("/");
  const activeSlug = parts[2] ?? "";
  const activeLesson = parts[3] ?? "";

  const section = (label: string, list: SidebarTopic[], offset: number) => (
    <div>
      <p className="px-3 text-xs font-semibold uppercase tracking-wider text-ink-light">{label}</p>
      <div className="mt-1 space-y-0.5">
        {list.map((t, i) => (
          <TopicEntry
            key={t.slug}
            topic={t}
            index={offset + i + 1}
            active={t.slug === activeSlug}
            activeLesson={activeLesson}
          />
        ))}
      </div>
    </div>
  );

  const nav = (
    <nav className="space-y-6" aria-label="Lesson topics">
      {section("AMP 1", amp1, 0)}
      {section("AMP 2", amp2, amp1.length)}
    </nav>
  );

  return (
    <>
      {/* On a phone the rail would eat the screen, so it collapses behind a
          toggle rather than being dropped entirely. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mb-4 w-full rounded-lg border border-surface-border bg-white px-4 py-2 text-left text-sm font-medium text-ink"
        >
          {open ? "Hide topics" : "Browse all topics"}
        </button>
        {open && <div className="mb-6 rounded-lg border border-surface-border bg-white p-3">{nav}</div>}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-2">
          <Link href="/learn" className="mb-4 block px-3 text-sm font-semibold text-brand-deep hover:underline">
            All topics
          </Link>
          {nav}
        </div>
      </aside>
    </>
  );
}
