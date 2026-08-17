import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";

loadScriptsEnv();

/**
 * Measure what is actually wrong with the question bank.
 *
 * The bank was generated to a flat quota — 150 questions per AMP 1 topic, 66
 * per AMP 2 topic, split evenly across three difficulties — with no check on
 * whether the questions inside a topic differ from each other in any way that
 * matters. They frequently do not. Four topics have over half their content
 * under five stem templates, and some questions are re-skins of a sibling that
 * resolve to the same answer, so a student who has seen one learns nothing from
 * the other.
 *
 * This is read-only and needs no API key, so it can run in CI and be diffed
 * between passes. Writes data/generated/bank-audit.json and prints a summary.
 *
 *   npx tsx scripts/audit-bank.ts
 */

const QUESTIONS_PATH = path.resolve(process.cwd(), "data/generated/questions.json");
const TOPICS_PATH = path.resolve(process.cwd(), "data/generated/topics.json");
const OUT_PATH = path.resolve(process.cwd(), "data/generated/bank-audit.json");

/** Above this share of one topic, an archetype is a rut rather than a pattern. */
const ARCHETYPE_SHARE_LIMIT = 0.12;
/** Above this, the topic's top five templates dominate it. */
const TOP5_SHARE_LIMIT = 0.3;

interface BankQuestion {
  id: string;
  exam: string;
  topic_slug: string;
  type: string;
  difficulty: string;
  stem: string;
  final_answer?: string;
  options?: { content: string; is_correct: boolean }[];
  numeric_answer?: { value: number } | null;
  distractor_rationales?: Record<string, string>;
  explanation_steps?: string[];
  [key: string]: unknown;
}

/**
 * Reduce a stem to the shape of the question being asked, discarding the
 * numbers and symbols that a re-skin varies. Two questions with the same
 * archetype are the same question asked twice.
 */
function archetype(stem: string): string {
  return stem
    .replace(/\$\$[^$]*\$\$/g, " M ")
    .replace(/\$[^$]*\$/g, " M ")
    .replace(/[0-9]+/g, "#")
    .replace(/[^a-zA-Z# ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .slice(0, 9)
    .join(" ");
}

/** Keeps wording and structure, masks only the numbers. Catches exact re-skins. */
function digitMasked(stem: string): string {
  return stem.replace(/[0-9]+(\.[0-9]+)?/g, "#").replace(/\s+/g, " ").trim().toLowerCase();
}

/** The answer a student would write down, normalised enough to compare. */
function answerKey(q: BankQuestion): string | null {
  if (q.type === "numeric" && q.numeric_answer && typeof q.numeric_answer.value === "number") {
    return `num:${q.numeric_answer.value}`;
  }
  // A handful of options carry no content at all; seed.ts rejects those
  // questions outright, but the audit runs against the raw bank.
  const correct = (q.options ?? [])
    .filter((o) => o && o.is_correct && typeof o.content === "string")
    .map((o) => o.content);
  if (correct.length > 0) {
    return `opt:${correct
      .map((c) => c.replace(/\$/g, "").replace(/\s+/g, "").toLowerCase())
      .sort()
      .join("|")}`;
  }
  if (q.final_answer) return `fin:${q.final_answer.replace(/\s+/g, "").toLowerCase()}`;
  return null;
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function main() {
  const questions: BankQuestion[] = JSON.parse(fs.readFileSync(QUESTIONS_PATH, "utf-8"));
  const topicsFile = JSON.parse(fs.readFileSync(TOPICS_PATH, "utf-8"));
  const declaredSpread = new Map<string, Record<string, number>>();
  for (const t of [...topicsFile.amp1, ...topicsFile.amp2]) {
    declaredSpread.set(t.slug, t.difficultySpread ?? {});
  }

  // ---- Per-topic archetype concentration -------------------------------
  const byTopic = groupBy(questions, (q) => `${q.exam}/${q.topic_slug}`);
  const topics: any[] = [];
  for (const [key, items] of [...byTopic.entries()].sort()) {
    const arch = groupBy(items, (q) => archetype(q.stem));
    const ranked = [...arch.entries()].sort((a, b) => b[1].length - a[1].length);
    const top5 = ranked.slice(0, 5);
    const top5Count = top5.reduce((sum, [, v]) => sum + v.length, 0);
    const worstShare = ranked.length > 0 ? ranked[0][1].length / items.length : 0;

    const actual = { easy: 0, medium: 0, hard: 0 } as Record<string, number>;
    for (const q of items) actual[q.difficulty] = (actual[q.difficulty] ?? 0) + 1;
    const slug = key.split("/")[1];
    const declared = declaredSpread.get(slug) ?? {};

    topics.push({
      topic: key,
      total: items.length,
      distinctArchetypes: arch.size,
      diversityRatio: Number((arch.size / items.length).toFixed(3)),
      top5Share: Number((top5Count / items.length).toFixed(3)),
      worstArchetypeShare: Number(worstShare.toFixed(3)),
      exceedsArchetypeLimit: worstShare > ARCHETYPE_SHARE_LIMIT,
      exceedsTop5Limit: top5Count / items.length > TOP5_SHARE_LIMIT,
      topArchetypes: top5.map(([name, v]) => ({
        archetype: name,
        count: v.length,
        share: Number((v.length / items.length).toFixed(3)),
        exampleIds: v.slice(0, 3).map((q) => q.id),
      })),
      difficulty: {
        declared: { easy: declared.easy ?? null, medium: declared.medium ?? null, hard: declared.hard ?? null },
        actualPercent: {
          easy: Math.round((actual.easy / items.length) * 100),
          medium: Math.round((actual.medium / items.length) * 100),
          hard: Math.round((actual.hard / items.length) * 100),
        },
      },
    });
  }

  // ---- Duplicate clusters ----------------------------------------------
  const digitClusters = [...groupBy(questions, (q) => digitMasked(q.stem)).entries()]
    .filter(([, v]) => v.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([stem, v]) => ({ count: v.length, stem: stem.slice(0, 140), ids: v.map((q) => q.id) }));

  // The worst kind: same question shape AND same answer, so the repeat carries
  // no new information at all.
  const sameShapeSameAnswer = [...groupBy(
    questions.filter((q) => answerKey(q) !== null),
    (q) => `${q.topic_slug}::${archetype(q.stem)}::${answerKey(q)}`
  ).entries()]
    .filter(([, v]) => v.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([, v]) => ({
      count: v.length,
      topic: v[0].topic_slug,
      answer: answerKey(v[0]),
      stem: v[0].stem.slice(0, 120),
      ids: v.map((q) => q.id),
    }));

  // ---- Content quality --------------------------------------------------
  const rationaleKeyStyle = (q: BankQuestion): string => {
    const keys = Object.keys(q.distractor_rationales ?? {});
    if (keys.length === 0) return "empty";
    const numeric = keys.filter((k) => /^\d+$/.test(k)).length;
    if (numeric === keys.length) return "index";
    if (numeric === 0) return "content";
    return "mixed";
  };
  const styleCounts: Record<string, number> = {};
  for (const q of questions) {
    const s = rationaleKeyStyle(q);
    styleCounts[s] = (styleCounts[s] ?? 0) + 1;
  }

  const allText = (q: BankQuestion): string =>
    [q.stem, q.final_answer ?? "", ...(q.explanation_steps ?? []), ...(q.options ?? []).map((o) => o.content)].join(" ");

  const quality = {
    missingFinalAnswer: questions.filter((q) => !q.final_answer || !String(q.final_answer).trim()).map((q) => q.id),
    emptyDistractorRationales: questions.filter((q) => Object.keys(q.distractor_rationales ?? {}).length === 0).length,
    rationaleKeyStyle: styleCounts,
    unicodeMathGlyphs: questions.filter((q) => /[πθ√±≤≥≠²³·×÷∞]/.test(allText(q))).map((q) => q.id),
    markdownBold: questions.filter((q) => /\*\*[^*]+\*\*/.test(allText(q))).map((q) => q.id),
    literalDoubleBackslashFrac: questions.filter((q) => /\\\\frac/.test(allText(q))).map((q) => q.id),
    escapedDollar: questions.filter((q) => /\\\$/.test(allText(q))).map((q) => q.id),
    parenMathDelimiters: questions.filter((q) => /\\\(|\\\)/.test(allText(q))).map((q) => q.id),
  };

  // ---- Type and status counts -------------------------------------------
  const counts = {
    total: questions.length,
    byExam: Object.fromEntries([...groupBy(questions, (q) => q.exam)].map(([k, v]) => [k, v.length])),
    byType: Object.fromEntries([...groupBy(questions, (q) => q.type)].map(([k, v]) => [k, v.length])),
    byExamAndType: Object.fromEntries(
      [...groupBy(questions, (q) => `${q.exam}/${q.type}`)].map(([k, v]) => [k, v.length])
    ),
    byDifficulty: Object.fromEntries([...groupBy(questions, (q) => q.difficulty)].map(([k, v]) => [k, v.length])),
  };

  const audit = {
    generatedAt: new Date().toISOString(),
    thresholds: { archetypeShareLimit: ARCHETYPE_SHARE_LIMIT, top5ShareLimit: TOP5_SHARE_LIMIT },
    counts,
    topics,
    duplicates: {
      digitMaskedClusters: digitClusters.length,
      questionsInDigitClusters: digitClusters.reduce((s, c) => s + c.count, 0),
      sameShapeSameAnswerGroups: sameShapeSameAnswer.length,
      questionsInSameAnswerGroups: sameShapeSameAnswer.reduce((s, c) => s + c.count, 0),
      topDigitClusters: digitClusters.slice(0, 25),
      allSameShapeSameAnswer: sameShapeSameAnswer,
    },
    quality,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(audit, null, 2) + "\n");

  // ---- Console report ----------------------------------------------------
  console.log(`[audit] ${counts.total} questions`);
  console.log(`[audit] by exam: ${JSON.stringify(counts.byExam)}`);
  console.log(`[audit] by type: ${JSON.stringify(counts.byType)}`);
  console.log("");
  console.log(`[audit] Duplicate clusters (identical wording, different numbers): ${audit.duplicates.digitMaskedClusters} covering ${audit.duplicates.questionsInDigitClusters} questions`);
  console.log(`[audit] Same shape AND same answer: ${audit.duplicates.sameShapeSameAnswerGroups} groups covering ${audit.duplicates.questionsInSameAnswerGroups} questions`);
  for (const g of sameShapeSameAnswer.slice(0, 8)) {
    console.log(`  ${g.count}x [${g.topic}] ${g.answer} :: ${g.stem.slice(0, 70)}`);
  }
  console.log("");
  console.log("[audit] Topics ranked by template concentration (worst first):");
  const ranked = [...topics].sort((a, b) => b.top5Share - a.top5Share);
  for (const t of ranked.slice(0, 12)) {
    const flag = t.exceedsTop5Limit ? "OVER" : "ok  ";
    console.log(`  ${flag} ${t.topic.padEnd(45)} top5 ${(t.top5Share * 100).toFixed(0).padStart(3)}%  distinct ${String(t.distinctArchetypes).padStart(3)}/${t.total}`);
  }
  const overLimit = topics.filter((t) => t.exceedsTop5Limit).length;
  console.log(`[audit] ${overLimit}/${topics.length} topics exceed the ${TOP5_SHARE_LIMIT * 100}% top-5 limit`);
  console.log("");
  console.log("[audit] Difficulty: declared vs actual (topics where they diverge most)");
  const spreadGap = topics
    .filter((t) => t.difficulty.declared.easy !== null)
    .map((t) => ({
      topic: t.topic,
      gap: Math.abs(t.difficulty.declared.hard - t.difficulty.actualPercent.hard),
      d: t.difficulty,
    }))
    .sort((a, b) => b.gap - a.gap);
  for (const s of spreadGap.slice(0, 6)) {
    console.log(`  ${s.topic.padEnd(45)} declared hard ${String(s.d.declared.hard).padStart(3)}%  actual ${String(s.d.actualPercent.hard).padStart(3)}%`);
  }
  console.log("");
  console.log("[audit] Content quality:");
  console.log(`  missing final_answer:        ${quality.missingFinalAnswer.length}`);
  console.log(`  empty distractor_rationales: ${quality.emptyDistractorRationales}`);
  console.log(`  rationale key style:         ${JSON.stringify(quality.rationaleKeyStyle)}`);
  console.log(`  unicode math glyphs:         ${quality.unicodeMathGlyphs.length}`);
  console.log(`  markdown bold in prose:      ${quality.markdownBold.length}`);
  console.log(`  literal \\\\frac:              ${quality.literalDoubleBackslashFrac.length}`);
  console.log(`  escaped \\$:                  ${quality.escapedDollar.length}`);
  console.log(`  \\( \\) delimiters:            ${quality.parenMathDelimiters.length}`);
  console.log("");
  console.log(`[audit] Written to ${OUT_PATH}`);
}

if (require.main === module) main();
