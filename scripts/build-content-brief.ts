import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";

loadScriptsEnv();

import Database from "better-sqlite3";
import { allLessons } from "../data/lessons";

/**
 * Write CONTENT-BRIEF.txt: everything an author needs to produce the remaining
 * lessons and questions outside this repo.
 *
 * Generated rather than hand-written so the skill slugs, question ids and
 * per-topic counts in it are the live ones. A brief with a stale slug produces
 * content that fails seeding, and the failure is only discovered after the work
 * is done.
 *
 *   npx tsx scripts/build-content-brief.ts
 */

const OUT_PATH = path.resolve(process.cwd(), "CONTENT-BRIEF.txt");
const DB_PATH = path.resolve(process.cwd(), "data/amp-prep.db");

/** How many published single_mcq each topic should end up with. */
const AMP1_MCQ_TARGET = 75;
const AMP2_MCQ_TARGET = 60;

function main() {
  const db = new Database(DB_PATH, { readonly: true });
  const skillsFile = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "data/generated/skills.json"), "utf-8"));
  const audit = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "data/generated/bank-audit.json"), "utf-8"));

  const done = new Set(allLessons.map((l) => l.skillSlug));
  const skills: any[] = skillsFile.skills;
  const todo = skills.filter((s) => !done.has(s.slug));

  const topics = db.prepare(
    `SELECT t.slug, t.name, t.description, e.code AS exam, t.order_index
     FROM topics t JOIN exams e ON e.id = t.exam_id ORDER BY e.code, t.order_index`
  ).all() as any[];

  const mcqCount = new Map<string, number>();
  for (const row of db.prepare(
    `SELECT t.slug, COUNT(*) AS c FROM questions q
     JOIN topics t ON t.id = q.topic_id
     WHERE q.status = 'published' AND q.type = 'single_mcq' GROUP BY t.slug`
  ).all() as any[]) {
    mcqCount.set(row.slug, row.c);
  }

  // Checkpoint candidates: easy/medium published MCQs, which is what a lesson
  // should end on. Numeric is offered too because typing an answer leaves
  // nowhere to guess from.
  const checkpointsFor = (topicSlug: string) =>
    (db.prepare(
      `SELECT q.id, q.type, q.difficulty, substr(q.stem, 1, 90) AS stem
       FROM questions q JOIN topics t ON t.id = q.topic_id
       WHERE t.slug = ? AND q.status = 'published'
         AND q.type IN ('single_mcq','numeric') AND q.difficulty IN ('easy','medium')
       ORDER BY q.difficulty, q.id LIMIT 14`
    ).all(topicSlug) as any[]);

  const archetypesFor = (topicSlug: string) => {
    const entry = audit.topics.find((t: any) => t.topic.endsWith(`/${topicSlug}`));
    return entry ? entry.topArchetypes : [];
  };

  const declaredSpread = (topicSlug: string) => {
    const entry = audit.topics.find((t: any) => t.topic.endsWith(`/${topicSlug}`));
    return entry?.difficulty?.declared ?? { easy: null, medium: null, hard: null };
  };

  const L: string[] = [];
  const line = (s = "") => L.push(s);
  const rule = (ch = "=") => line(ch.repeat(78));

  rule();
  line("AMP PREP - CONTENT BRIEF");
  line(`Generated ${new Date().toISOString()} by scripts/build-content-brief.ts`);
  rule();
  line();
  line("Everything needed to write the remaining lessons and questions outside");
  line("this repository. Hand a section to an AI, paste the JSON it returns into");
  line("the file named in that section, and run the verifier.");
  line();
  line("WHAT IS ALREADY DONE (do not redo):");
  line(`  - ${skills.length} skills defined. ${done.size} have lessons, ${todo.length} do not.`);
  line("  - Numeric answer tolerances repaired; the bank is gradable.");
  line("  - 748 fill_blank retyped as single_mcq. Mock papers are MCQ only.");
  line("  - AMP 2 corrected to 60 questions / 120 minutes.");
  line();

  // ---------------------------------------------------------------- part 0
  rule();
  line("PART 0 - RULES THAT APPLY TO EVERYTHING");
  rule();
  line();
  line("0.1 LATEX ESCAPING - READ THIS FIRST, IT HAS BROKEN THE BANK BEFORE");
  line();
  line("  Math is written in LaTeX inside $...$ (inline) or $$...$$ (display).");
  line("  When LaTeX goes inside JSON, every backslash must be DOUBLED.");
  line();
  line("    WRONG:   \"stem\": \"Simplify $\\frac{1}{2}$\"");
  line("    RIGHT:   \"stem\": \"Simplify $\\\\frac{1}{2}$\"");
  line();
  line("  Why this matters more than it looks: in a JSON string \\f is the form");
  line("  feed character. A single backslash turns \\frac into an invisible");
  line("  control character, the JSON still parses, nothing throws, and the");
  line("  student is shown broken output. 297 questions once shipped that way.");
  line("  The same trap applies to \\t (\\times, \\text), \\b (\\begin) and \\r");
  line("  (\\right).");
  line();
  line("  If you are writing a .ts file rather than raw JSON, the same rule");
  line("  applies inside the string literals.");
  line();
  line("0.2 LATEX THAT IS ALLOWED");
  line();
  line("  Use only what KaTeX renders: \\frac \\sqrt \\cdot \\times \\div \\pm");
  line("  \\le \\ge \\ne \\approx \\pi \\theta \\sin \\cos \\tan \\log \\ln");
  line("  \\underline \\text \\circ \\infty ^{ } _{ } \\left( \\right)");
  line();
  line("  Never use: tabular, itemize, align, \\begin{array} unless certain,");
  line("  \\(...\\) delimiters, raw carets outside math, * for multiplication,");
  line("  -> for arrows, or Unicode math glyphs. Write \\pi not the pi symbol,");
  line("  \\sqrt{2} not the root symbol, x^{2} not a superscript two.");
  line();
  line("0.3 WRITING STYLE - THE WHOLE POINT OF THIS PROJECT");
  line();
  line("  The reader is a student who found school maths hard and is preparing");
  line("  for a placement test that decides which course they can take. Write");
  line("  for them, not for a mathematician.");
  line();
  line("    - Eighth grade reading level.");
  line("    - Define every symbol in words before using it.");
  line("    - Show each rule with a concrete number FIRST, then the general form.");
  line("    - One idea per paragraph. Short sentences. Under 25 words each.");
  line("    - Say why a step is allowed, not just what changed.");
  line();
  line("  BANNED WORDS AND PHRASES (the verifier rejects these):");
  line("    hence, thus, it follows that, observe that, clearly, obviously,");
  line("    trivially, denote, arbitrary, straightforward, simply note,");
  line("    as we know, recall that");
  line();
  line("  No em-dashes as sentence connectors. No emoji. Plain full stops.");
  line();

  // ---------------------------------------------------------------- part 1
  rule();
  line("PART 1 - LESSONS");
  rule();
  line();
  line(`${todo.length} skills still need a lesson. Work one topic at a time.`);
  line();
  line("OUTPUT FORMAT: a TypeScript file per topic at data/lessons/<topic>.ts,");
  line("exporting an array of LessonSource. Copy the shape of the existing");
  line("data/lessons/fractions.ts exactly.");
  line();
  line("  import type { LessonSource } from \"./types\";");
  line("  export const <camelCaseTopic>Lessons: LessonSource[] = [ ... ];");
  line();
  line("Then add it to data/lessons/index.ts.");
  line();
  line("EACH LESSON OBJECT:");
  line();
  line("  {");
  line("    skillSlug: \"<exact slug from the list below - do not invent one>\",");
  line("    title: \"<short, plain, what the student will be able to do>\",");
  line("    summary: \"<one sentence>\",");
  line("    estMinutes: <5 to 10>,");
  line("    blocks: [ ... ]");
  line("  }");
  line();
  line("BLOCK TYPES - use them in a sensible teaching order:");
  line();
  line("  { type: \"prose\", text: \"...\" }");
  line("      A paragraph. Math inline with $...$.");
  line();
  line("  { type: \"definition\", term: \"...\", meaning: \"...\" }");
  line("      Name a thing and say what it means in ordinary words.");
  line();
  line("  { type: \"worked_example\",");
  line("    prompt: \"...\",");
  line("    steps: [ { action: \"...\", math: \"...\", why: \"...\" } ],");
  line("    answer: \"...\" }");
  line("      `math` is optional. `why` is REQUIRED and is the teaching: it says");
  line("      why the step is legal. Without it the example is just a transcript.");
  line();
  line("  { type: \"callout\", kind: \"tip\" | \"watch-out\" | \"common-mistake\",");
  line("    text: \"...\" }");
  line();
  line("  { type: \"checkpoint\", questionIds: [\"q_...\"] }");
  line("      1 or 2 ids, taken ONLY from the candidate list for that topic below.");
  line();
  line("  { type: \"graph\", spec: { ... }, caption: \"...\" }");
  line("  { type: \"diagram\", spec: { ... }, caption: \"...\" }");
  line("      See Part 1B. Every spec needs a `description` for screen readers.");
  line();
  line("HARD REQUIREMENTS - the verifier fails the lesson otherwise:");
  line("  - at least one worked_example");
  line("  - exactly one checkpoint, with ids from the candidate list");
  line("  - a non-empty title and summary");
  line("  - no banned phrase, no sentence over 25 words");
  line("  - every graph and diagram spec has a description");
  line();

  rule("-");
  line("PART 1B - GRAPH AND DIAGRAM SPECS");
  rule("-");
  line();
  line("Use a graph where the shape IS the idea: slope, parabolas, asymptotes,");
  line("transformations, inequalities on a number line, the unit circle. Do not");
  line("decorate a lesson with a graph that adds nothing.");
  line();
  line("  Cartesian:");
  line("    { kind: \"cartesian\",");
  line("      description: \"<what a sighted reader would see>\",");
  line("      viewport: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 },");
  line("      curves: [ { fn: \"x^2-3\", label: \"y = x^2-3\",");
  line("                  color: \"primary\"|\"accent\"|\"muted\", dashed: false } ],");
  line("      points: [ { x: 1, y: 2, label: \"(1, 2)\", open: false } ],");
  line("      segments: [ { from: {x:1,y:2}, to: {x:4,y:2}, dashed: true } ],");
  line("      regions: [ { fn: \"2x+1\", side: \"above\"|\"below\" } ] }");
  line();
  line("    `fn` is NOT LaTeX. It is a plain expression: + - * / ^ ( ),");
  line("    x, sin cos tan asin acos atan log ln sqrt abs exp, pi, e.");
  line("    log is base 10, ln is natural. Implicit multiplication (2x) is fine.");
  line("    Named parameters are allowed via params: { a: 2, h: 1, k: -3 }.");
  line();
  line("  Number line:");
  line("    { kind: \"number-line\", min: -5, max: 5, description: \"...\",");
  line("      marks: [ { at: 3, open: true } ],");
  line("      intervals: [ { from: 3, to: 5, openFrom: true } ] }");
  line();
  line("  Unit circle:");
  line("    { kind: \"unit-circle\", description: \"...\",");
  line("      angles: [0,30,45,60,90], highlight: 30 }");
  line();
  line("  Diagrams (geometry figures, labels carry the measurements):");
  line("    { kind: \"triangle\", sides: [\"3\",\"4\",\"5\"], angles: [...],");
  line("      rightAngleAt: 0, description: \"...\" }");
  line("    also: rectangle {width,height}, square {side},");
  line("          circle {radius|diameter}, trapezoid {top,bottom,height},");
  line("          cylinder {radius,height}, cone {radius,height,slant},");
  line("          sphere {radius}, prism {width,height,depth}");
  line();

  // per-topic lesson sections
  for (const topic of topics) {
    const topicSkills = todo.filter((s) => s.topicSlug === topic.slug);
    if (topicSkills.length === 0) continue;
    line();
    rule("-");
    line(`LESSON BATCH: ${topic.exam} / ${topic.name}   [${topic.slug}]`);
    rule("-");
    line(`Write to: data/lessons/${topic.slug}.ts`);
    line(`Topic description: ${topic.description}`);
    line(`Lessons needed: ${topicSkills.length}`);
    line();
    line("SKILLS (use these slugs exactly):");
    for (const s of topicSkills) {
      line(`  slug:      ${s.slug}`);
      line(`  objective: ${s.objective}`);
      line(`  source:    ${s.source === "study-guide" ? "official exam objective, wording is authoritative" : "derived, may be reworded"}`);
      line();
    }
    const candidates = checkpointsFor(topic.slug);
    line("CHECKPOINT QUESTION IDS (choose from these only):");
    if (candidates.length === 0) {
      line("  none available - omit the checkpoint and flag it in your reply");
    } else {
      for (const c of candidates) {
        line(`  ${c.id}  [${c.type}, ${c.difficulty}]  ${c.stem.replace(/\s+/g, " ")}`);
      }
    }
    line();
  }

  // ---------------------------------------------------------------- part 2
  line();
  rule();
  line("PART 2 - NEW QUESTIONS");
  rule();
  line();
  line("Mock exams are now multiple choice only, matching the real test. The");
  line("bank does not have enough single_mcq variety, and AMP 2 is far short.");
  line();
  line("OUTPUT FORMAT: a JSON array appended to data/generated/questions.json,");
  line("or a separate file for review. Each question:");
  line();
  line("  {");
  line("    \"id\": \"q_<12 random lowercase letters and digits>\",");
  line("    \"exam\": \"AMP1\" | \"AMP2\",");
  line("    \"topic_slug\": \"<from the list below>\",");
  line("    \"type\": \"single_mcq\",");
  line("    \"difficulty\": \"easy\" | \"medium\" | \"hard\",");
  line("    \"stem\": \"<the question, LaTeX in $...$>\",");
  line("    \"options\": [");
  line("      {\"content\": \"...\", \"is_correct\": false},");
  line("      {\"content\": \"...\", \"is_correct\": true},");
  line("      {\"content\": \"...\", \"is_correct\": false},");
  line("      {\"content\": \"...\", \"is_correct\": false}");
  line("    ],");
  line("    \"final_answer\": \"<the answer stated plainly>\",");
  line("    \"explanation_steps\": [\"step 1\", \"step 2\", \"step 3\"],");
  line("    \"distractor_rationales\": {\"0\": \"why someone picks this\", ...},");
  line("    \"concept_summary\": \"<one line naming the rule tested>\"");
  line("  }");
  line();
  line("RULES:");
  line("  - EXACTLY 4 options, EXACTLY 1 with is_correct true.");
  line("  - Every wrong option must be a mistake a real student would make:");
  line("    a sign error, a forgotten square root, the reciprocal. Never a");
  line("    random number, and never an obviously silly one.");
  line("  - distractor_rationales keys are the option INDEX as a string");
  line("    (\"0\",\"1\",\"2\",\"3\"), covering every wrong option.");
  line("  - At least 3 explanation_steps.");
  line("  - Solvable with a basic scientific calculator (Casio fx-85ES class).");
  line("  - ids must not collide with anything already in the bank.");
  line();
  line("DIVERSITY - THIS IS THE MAIN PROBLEM WITH THE EXISTING BANK:");
  line();
  line(`  ${audit.duplicates.sameShapeSameAnswerGroups} groups of questions share both a template AND an answer, so`);
  line("  a student who has done one learns nothing from the rest. Six factoring");
  line("  questions all answer 5; three of those use the identical polynomial.");
  line();
  line("  For every question you write:");
  line("    - Do not reuse a stem template listed as overused below.");
  line("    - Vary the ANSWER, not just the numbers in the question.");
  line("    - Vary what is asked: solve for x, but also identify the error,");
  line("      pick the equivalent form, choose the correct first step, read a");
  line("      value off a graph, decide which of two methods applies.");
  line("    - Real contexts where they fit the topic, and vary them. The bank");
  line("      has 47 questions about the perimeter of a rectangular garden.");
  line();

  for (const topic of topics) {
    const have = mcqCount.get(topic.slug) ?? 0;
    const target = topic.exam === "AMP1" ? AMP1_MCQ_TARGET : AMP2_MCQ_TARGET;
    const need = Math.max(0, target - have);
    if (need === 0) continue;
    const spread = declaredSpread(topic.slug);
    const arch = archetypesFor(topic.slug);
    line();
    rule("-");
    line(`QUESTION BATCH: ${topic.exam} / ${topic.name}   [${topic.slug}]`);
    rule("-");
    line(`Have ${have} single_mcq, target ${target}. WRITE ${need} NEW.`);
    if (spread.easy !== null) {
      const e = Math.round((need * spread.easy) / 100);
      const m = Math.round((need * spread.medium) / 100);
      line(`Difficulty mix (from the syllabus): ${spread.easy}% easy, ${spread.medium}% medium, ${spread.hard}% hard`);
      line(`  so roughly ${e} easy, ${m} medium, ${need - e - m} hard`);
    } else {
      line("Difficulty mix: 20% easy, 40% medium, 40% hard");
    }
    line(`Covers: ${topic.description}`);
    const topicSkills = skills.filter((s) => s.topicSlug === topic.slug);
    line("Spread the questions across these objectives:");
    for (const s of topicSkills) line(`  - ${s.objective}`);
    if (arch.length > 0) {
      line();
      line("OVERUSED TEMPLATES IN THIS TOPIC - do not write more like these:");
      for (const a of arch.slice(0, 5)) {
        line(`  ${a.count} questions (${Math.round(a.share * 100)}%): "${a.archetype}"`);
      }
    }
    line();
  }

  // ---------------------------------------------------------------- part 3
  line();
  rule();
  line("PART 3 - ANSWER KEY VERIFICATION");
  rule();
  line();
  line("No human has ever checked the answer keys. The seeding script's own");
  line("30-question audit put the wrong-key rate at 6.7 percent, which is");
  line("roughly 230 wrong answers across 3,435 published questions. Three are");
  line("confirmed wrong by hand.");
  line();
  line("This is the highest value work in this document. A wrong answer key");
  line("teaches the student the wrong thing and they have no way to know.");
  line();
  line("METHOD - do not skip the first step:");
  line("  1. Solve the question from scratch WITHOUT looking at the given answer.");
  line("  2. Only then compare with the key.");
  line("  3. If they differ, say so. Do not talk yourself into agreeing.");
  line();
  line("Reading the key first produces agreement with whatever is there, which");
  line("is worse than not checking, because it looks like verification.");
  line();
  line("OUTPUT: one line of JSON per question.");
  line("  {\"id\":\"q_...\",\"agrees\":true}");
  line("  {\"id\":\"q_...\",\"agrees\":false,\"correct_answer\":\"...\",\"why\":\"...\"}");
  line();
  line("Batches of 25 to 50 questions work well. Export a batch with:");
  line();
  line("  npx tsx scripts/export-verify-batch.ts --offset 0 --limit 50");
  line();
  line("Known bad, already caught, no need to re-report:");
  line("  q_xnwoq8offp26  answer is 416/315, key says 0");
  line("  q_iq45jwt9eu5s  answer is 1/108, key is 100x off");
  line("  q_9b7wuinyq11e  answer is 1/2, key says 43/84");
  line();

  // ---------------------------------------------------------------- part 4
  rule();
  line("PART 4 - HANDING THE WORK BACK");
  rule();
  line();
  line("Lessons:");
  line("  1. Save each topic file to data/lessons/<topic-slug>.ts");
  line("  2. Add the export to data/lessons/index.ts");
  line("  3. npm run verify:lessons     (must print All clear)");
  line("  4. npm run seed:lessons");
  line();
  line("Questions:");
  line("  1. Append to data/generated/questions.json, or hand over a separate");
  line("     file and it will be merged.");
  line("  2. npm test                   (LaTeX and gradability gates)");
  line("  3. npm run seed && npm run assemble");
  line("  4. npm run audit              (check the duplicate numbers went down)");
  line();
  line("Verification results:");
  line("  Hand over the JSONL. Disagreements are re-checked and the question is");
  line("  either repaired or moved to needs_review, which takes it out of the");
  line("  student-facing pool.");
  line();
  line("If anything in this brief is ambiguous or looks wrong, say so rather");
  line("than guessing. A wrong assumption repeated across 100 questions is");
  line("expensive to unpick.");
  line();
  rule();
  line("END OF BRIEF");
  rule();

  fs.writeFileSync(OUT_PATH, L.join("\n") + "\n");
  db.close();

  const bytes = fs.statSync(OUT_PATH).size;
  console.log(`[brief] Wrote ${OUT_PATH}`);
  console.log(`[brief] ${L.length} lines, ${(bytes / 1024).toFixed(0)} KB`);
  console.log(`[brief] ${todo.length} lessons and questions for ${topics.length} topics described.`);
}

if (require.main === module) main();
