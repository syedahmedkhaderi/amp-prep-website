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
 * AMP 2 topics are shown to everyone rather than hidden. A free student should
 * be able to see what the paid tier contains and decide, and hiding it makes
 * the syllabus look incomplete. Locked entries link to /pricing.
 */

export interface SidebarTopic {
  slug: string;
  name: string;
  examCode: "AMP1" | "AMP2";
  lessonCount: number;
  completedCount: number;
  locked: boolean;
}

function TopicLink({ topic, active }: { topic: SidebarTopic; active: boolean }) {
  const done = topic.lessonCount > 0 && topic.completedCount === topic.lessonCount;

  if (topic.locked) {
    return (
      <Link
        href="/pricing"
        className="group flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm text-ink-light transition hover:bg-surface-panel"
        title="AMP 2 lessons are part of Pro"
      >
        <span className="truncate">{topic.name}</span>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-brand-600 group-hover:underline">
          Pro
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/learn/${topic.slug}`}
      aria-current={active ? "page" : undefined}
      className={`flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-sm transition ${
        active ? "bg-brand-deep text-white" : "text-ink hover:bg-surface-panel"
      }`}
    >
      <span className="truncate">{topic.name}</span>
      <span
        className={`shrink-0 text-[11px] tabular-nums ${
          active ? "text-white/70" : done ? "text-green-600" : "text-ink-light"
        }`}
      >
        {done ? "done" : `${topic.completedCount}/${topic.lessonCount}`}
      </span>
    </Link>
  );
}

export function LearnSidebar({ topics }: { topics: SidebarTopic[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const amp1 = topics.filter((t) => t.examCode === "AMP1");
  const amp2 = topics.filter((t) => t.examCode === "AMP2");
  const activeSlug = pathname.split("/")[2] ?? "";

  const nav = (
    <nav className="space-y-6" aria-label="Lesson topics">
      <div>
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-ink-light">AMP 1</p>
        <div className="mt-1 space-y-0.5">
          {amp1.map((t) => (
            <TopicLink key={t.slug} topic={t} active={t.slug === activeSlug} />
          ))}
        </div>
      </div>
      <div>
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-ink-light">AMP 2</p>
        <div className="mt-1 space-y-0.5">
          {amp2.map((t) => (
            <TopicLink key={t.slug} topic={t} active={t.slug === activeSlug} />
          ))}
        </div>
      </div>
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
