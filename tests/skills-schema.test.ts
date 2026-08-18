import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * The skill taxonomy is the spine of the lessons feature: one lesson per
 * skill, and questions labelled by skill. A gap here shows up much later as a
 * topic with no lessons, so it is checked offline against the committed JSON.
 */

const SKILLS_PATH = path.resolve(__dirname, "../data/generated/skills.json");
const TOPICS_PATH = path.resolve(__dirname, "../data/generated/topics.json");

const skillsFile = JSON.parse(fs.readFileSync(SKILLS_PATH, "utf-8"));
const topicsFile = JSON.parse(fs.readFileSync(TOPICS_PATH, "utf-8"));

interface SkillRecord {
  topicSlug: string;
  exam: string;
  name: string;
  slug: string;
  orderIndex: number;
  objective: string;
  source: string;
}

const skills: SkillRecord[] = skillsFile.skills;
const topics = [...topicsFile.amp1, ...topicsFile.amp2];
const topicSlugs = new Set<string>(topics.map((t: any) => t.slug));

describe("skills taxonomy", () => {
  it("references only topics that exist", () => {
    const orphans = [...new Set(skills.filter((s) => !topicSlugs.has(s.topicSlug)).map((s) => s.topicSlug))];
    expect(orphans, `Skills pointing at unknown topics: ${orphans.join(", ")}`).toEqual([]);
  });

  it("has unique slugs", () => {
    const seen = new Map<string, number>();
    for (const s of skills) seen.set(s.slug, (seen.get(s.slug) ?? 0) + 1);
    const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([slug]) => slug);
    expect(dupes, `Duplicate skill slugs: ${dupes.join(", ")}`).toEqual([]);
  });

  it("covers every topic with enough skills to build a lesson path", () => {
    const counts = new Map<string, number>();
    for (const s of skills) counts.set(s.topicSlug, (counts.get(s.topicSlug) ?? 0) + 1);
    const thin = [...topicSlugs].filter((slug) => (counts.get(slug) ?? 0) < 3);
    expect(thin, `Topics with fewer than 3 skills: ${thin.join(", ")}`).toEqual([]);
  });

  it("covers all 32 topics", () => {
    expect(new Set(skills.map((s) => s.topicSlug)).size).toBe(topicSlugs.size);
    expect(topicSlugs.size).toBe(32);
  });

  it("gives every skill a non-empty objective and name", () => {
    const empty = skills.filter((s) => !s.objective?.trim() || !s.name?.trim()).map((s) => s.slug);
    expect(empty).toEqual([]);
  });

  it("records provenance so derived wording can be told from the study guide", () => {
    const bad = skills.filter((s) => s.source !== "study-guide" && s.source !== "derived");
    expect(bad.map((s) => s.slug)).toEqual([]);
    // AMP 2 publishes no objective list, so none of its skills may claim to be
    // transcribed from the study guide.
    const misattributed = skills.filter((s) => s.exam === "AMP2" && s.source === "study-guide");
    expect(misattributed.map((s) => s.slug)).toEqual([]);
  });

  it("keeps the study-guide objectives as the bulk of AMP 1", () => {
    const amp1 = skills.filter((s) => s.exam === "AMP1");
    const verbatim = amp1.filter((s) => s.source === "study-guide");
    expect(verbatim.length).toBeGreaterThanOrEqual(100);
  });
});
