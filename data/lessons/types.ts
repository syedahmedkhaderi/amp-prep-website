import type { LessonBlock } from "@/lib/types";

/**
 * A lesson as authored, before it is given an id and attached to a skill row.
 *
 * `skillSlug` points at an entry in data/generated/skills.json. The seeding
 * script fails loudly on a slug that does not resolve, so a renamed skill
 * cannot silently orphan its lesson.
 */
export interface LessonSource {
  skillSlug: string;
  title: string;
  summary: string;
  estMinutes: number;
  blocks: LessonBlock[];
}
