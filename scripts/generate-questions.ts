import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";
loadScriptsEnv();

import { GeminiKeyRotator } from "./lib/gemini-rotator";
import { generationPrompt } from "./lib/prompts";
import type { ExamCode, Difficulty, QType, TopicsFile, GeneratedQuestion } from "./lib/types";
// Relative, not "@/": this file runs under tsx, which does not apply the
// bundler path alias. render-check avoids importing the React renderer for
// exactly this reason, so collectStrings is reachable from a script.
import { collectStrings } from "../lib/math/render-check";

const TOPICS_PATH = path.resolve(process.cwd(), "data/generated/topics.json");
const OUT_PATH = path.resolve(process.cwd(), "data/generated/questions.json");
const LOG_PATH = path.resolve(process.cwd(), "logs/generation-log.md");

const TYPES: QType[] = ["single_mcq", "multi_mcq", "matching", "fill_blank", "numeric"];
const DIFFS: Difficulty[] = ["easy", "medium", "hard"];

// Target: 3000 AMP1 + 800 AMP2 = 3800 total
// 20 AMP1 topics * 3 diffs * 50 = 3000
// 12 AMP2 topics * 3 diffs * ~22 = 800
const AMP1_PER_TOPIC_PER_DIFF = Number(process.env.AMP1_PER_DIFF) || 50;
const AMP2_PER_TOPIC_PER_DIFF = Number(process.env.AMP2_PER_DIFF) || 22;

const genId = () => "q_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Model output is LaTeX-bearing text that is *nearly* JSON, and the two
 * disagree about what a backslash means.
 *
 * The model is asked for JSON containing LaTeX and routinely writes commands
 * with a single backslash: `"$\frac{1}{2}$"`. Inside a JSON string literal
 * `\f` is not the two characters a reader sees, it is the form feed escape, so
 * `JSON.parse` returns a string with 0x0C where `\frac` should be. The same
 * silent substitution hits `\times`/`\text` (`\t` -> 0x09), `\begin` (`\b` ->
 * 0x08) and `\right` (`\r` -> 0x0D). The result is still valid JSON, so
 * nothing throws; the damage only appears when KaTeX meets a control character
 * and the user is shown raw source. That is how 297 questions shipped broken.
 *
 * The far more common outcome is worse but louder: most LaTeX commands
 * (`\end`, `\cdot`, `\sqrt`, `\alpha`) are not valid JSON escapes at all, so
 * `JSON.parse` throws and the whole question is discarded and retried. Any
 * response containing `\begin{array}` also contains `\end{array}`, which is
 * why 0x08 never even reached the bank. Fixing the escapes recovers that
 * wasted yield as well as preventing the corruption.
 *
 * Escaping every backslash indiscriminately is not an option: `\n` is used
 * legitimately for paragraph breaks in stems ("Consider the following:\n\n$$x
 * = ...$$"), and turning those into a literal `\n` ships visible garbage in
 * the other direction.
 *
 * So the rule is asymmetric rather than one whitelist, because only one of the
 * ambiguous escapes has any legitimate use in this pipeline's output:
 *
 *   \b \f \t   always a LaTeX command. Backspace, form feed and tab have no
 *              legitimate place in question prose; a full frequency scan of
 *              the bank (see scripts/repair-latex.ts) found 0x08/0x09/0x0C
 *              only ever standing in for \begin, \times/\text and \frac.
 *   \r         a LaTeX command unless it opens a CRLF (`\r\n`).
 *   \u         a real unicode escape only when four hex digits follow. No
 *              LaTeX command beginning with u continues with four hex
 *              characters (\underline, \uparrow, \upsilon, \uplus all fail on
 *              their second letter), so no whitelist is needed here.
 *   \n         the only genuinely ambiguous one, and the only one that
 *              defaults to the escape. It is read as LaTeX only when the
 *              letters after it form an exact match for a known n-command.
 *   anything   else is not a JSON escape at all, so it can only ever have
 *              been a literal backslash.
 *
 * A bare `\\` is the one shape those rules cannot settle on their own: it is
 * both the LaTeX row separator and a correctly escaped single backslash. What
 * breaks the tie is the rest of the document, not the local text. A response
 * that needed no escaping anywhere was written as correct JSON, so its `\\`
 * means one backslash; a response that was already writing raw LaTeX means the
 * row separator. See rewrite() below, where that second reading is applied
 * only after the first pass has proved the response non-compliant.
 *
 * Getting `\n` wrong is the one mistake nothing downstream can catch, in
 * either direction: a line feed is legal everywhere, so the control-character
 * check below waves it through and KaTeX renders `$\nu$` mangled to `$<LF>u$`
 * as a silent, plausible-looking "u". That is why the decision is an exact
 * match on the whole letter run rather than a prefix test, and why the list
 * below is checked against the bank rather than copied out of a LaTeX
 * reference: a scan of all 3,789 shipped questions finds exactly five
 * n-commands in use (\neq 445, \newline 8, \not 3, \ne 3, \ngtr 1), and the
 * rest are here only because they are cheap to allow.
 *
 * The two-letter commands \ne, \nu and \ni are deliberately absent. Matching
 * one means the text after `\n` is a single letter e, u or i and then a
 * separator, which is also what a line break before "u = 5" or "e = 2.718"
 * looks like. Neither reading can be trusted, so instead of guessing,
 * findCorruption below rejects that shape and the caller retries.
 */
const LATEX_N_COMMANDS = new Set([
  "nabla", "natural", "ncong", "nearrow", "neg", "neq", "newline", "nexists",
  "ngeq", "ngtr", "nleftarrow", "nleq", "nless", "nmid", "nolimits",
  "nonumber", "norm", "not", "notin", "nparallel", "nprec", "nrightarrow",
  "nsim", "nsubseteq", "nsucc", "nsupseteq", "nvdash",
]);

/**
 * A line feed followed by a lone e, u or i: either a mangled \ne / \nu / \ni
 * or a genuine line break before a one-letter token. Across the whole bank
 * this shape occurs 7 times and every one of them is corruption, but the
 * reading is not safe to assume, so the question is dropped instead.
 */
const AMBIGUOUS_NEWLINE = /\n[eui](?![a-zA-Z])/;

/** The maximal run of ASCII letters starting at `start`. */
function letterRun(text: string, start: number): string {
  let j = start;
  while (j < text.length && /[a-zA-Z]/.test(text[j])) j += 1;
  return text.slice(start, j);
}

/** Is the backslash at `i` (inside a string literal) a JSON escape the model meant? */
function isIntendedEscape(raw: string, i: number): boolean {
  const next = raw[i + 1];
  switch (next) {
    case '"':
    case "\\":
    case "/":
      return true;
    case "n":
      return !LATEX_N_COMMANDS.has(letterRun(raw, i + 1));
    case "r":
      // A carriage return is only ever real as the first half of a CRLF.
      return raw[i + 2] === "\\" && raw[i + 3] === "n";
    case "u":
      return /^[0-9a-fA-F]{4}$/.test(raw.slice(i + 2, i + 6));
    default:
      return false;
  }
}

/**
 * One pass of the rewrite. Returns the text and how many backslashes had to be
 * escaped, which is what tells the caller whether this response was written in
 * compliant JSON or in raw LaTeX.
 *
 * `expandRowBreaks` resolves the last ambiguity, and only for responses
 * already known to be non-compliant. `\\` followed by whitespace is the LaTeX
 * row separator inside pmatrix/aligned (121 questions in the bank use it), but
 * it is also how correct JSON writes a single literal backslash. Reading it as
 * one backslash merges every matrix row onto one line; reading it as a row
 * separator would break `\}`, `\$` and `\%`, which is why only whitespace
 * qualifies and why a compliant response is never put through this pass.
 */
function rewrite(raw: string, expandRowBreaks: boolean): { out: string; escaped: number } {
  let out = "";
  let escaped = 0;
  let inString = false;
  let i = 0;

  while (i < raw.length) {
    const ch = raw[i];

    if (!inString) {
      out += ch;
      if (ch === '"') inString = true;
      i += 1;
      continue;
    }

    if (ch === '"') {
      out += ch;
      inString = false;
      i += 1;
      continue;
    }

    if (ch !== "\\") {
      out += ch;
      i += 1;
      continue;
    }

    if (isIntendedEscape(raw, i)) {
      // Whitespace after the pair is either literal, or written as an escape
      // because the row separator ends a line: `\\\n` in a laid out array.
      const afterPair = raw[i + 2];
      const followedBySpace =
        afterPair === undefined ||
        /\s/.test(afterPair) ||
        (afterPair === "\\" && /[ntr]/.test(raw[i + 3] ?? ""));
      if (expandRowBreaks && raw[i + 1] === "\\" && followedBySpace) {
        // A LaTeX row separator, kept as two backslashes rather than one.
        out += "\\\\\\\\";
        i += 2;
        continue;
      }
      // Consume both characters, so the escaped char cannot be re-read as the
      // start of another escape.
      out += ch + (raw[i + 1] ?? "");
      i += 2;
      continue;
    }

    // A literal backslash the model failed to escape: the start of a LaTeX
    // command. Only the backslash is consumed; the command name that follows
    // is ordinary content and is copied on the next pass.
    out += "\\\\";
    escaped += 1;
    i += 1;
  }

  return { out, escaped };
}

/**
 * Rewrite single-backslash LaTeX in a model response into escaped backslashes
 * so it survives JSON.parse. Backslashes outside string literals are not valid
 * JSON anyway, so the scan tracks string state and leaves structure alone.
 *
 * A response that needed no escaping was written as correct JSON, and is
 * returned from the first pass byte for byte. Only a response that already
 * proved non-compliant gets the second pass, so the row-separator rule cannot
 * reach output that was right to begin with.
 */
export function sanitizeModelJson(raw: string): string {
  const strict = rewrite(raw, false);
  return strict.escaped === 0 ? strict.out : rewrite(raw, true).out;
}

/**
 * Anything showing the sanitizer could not settle a backslash safely.
 *
 * Every code below 0x20 counts as corruption except a line feed, which is load
 * bearing in stems, and the carriage return of a CRLF. That includes codes no
 * corrupted escape has produced yet (0x0B from `\v`, say): a control character
 * in question text is never intended, so the check needs no list to keep in
 * sync. The line feed exemption is the gap AMBIGUOUS_NEWLINE closes.
 */
/**
 * Every string in a question, object keys included. collectStrings walks
 * values only, but distractor_rationales is keyed by the option text itself,
 * so its keys are user visible LaTeX and can be corrupted like any other
 * field. Keys are collected here rather than by changing collectStrings,
 * which the shipped bank's render gate depends on.
 */
function allStrings(value: unknown, out: { path: string; text: string }[] = [], prefix = ""): { path: string; text: string }[] {
  collectStrings(value, out, prefix);
  const keys = (v: unknown, p: string): void => {
    if (Array.isArray(v)) v.forEach((x, i) => keys(x, `${p}[${i}]`));
    else if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        out.push({ path: p ? `${p}.${k}(key)` : `${k}(key)`, text: k });
        keys(val, p ? `${p}.${k}` : k);
      }
    }
  };
  keys(value, prefix);
  return out;
}

function findCorruption(value: unknown): { path: string; reason: string } | null {
  for (const { path: where, text } of allStrings(value)) {
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code >= 32 || code === 0x0a) continue;
      if (code === 0x0d && text.charCodeAt(i + 1) === 0x0a) continue;
      return { path: where, reason: `control character 0x${code.toString(16).padStart(2, "0")}` };
    }
    if (AMBIGUOUS_NEWLINE.test(text)) {
      return { path: where, reason: "line feed before a lone e, u or i" };
    }
  }
  return null;
}

/**
 * Parse one model response. Returns null rather than a damaged object, so the
 * caller retries instead of writing corruption to the bank: the sanitizer's
 * n-command list can be incomplete without that ever reaching a user.
 */
export function parseModelResponse(raw: string): any | null {
  let item: any;
  try {
    item = JSON.parse(sanitizeModelJson(raw));
  } catch {
    return null;
  }
  return findCorruption(item) ? null : item;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\$+/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ").slice(0, 200);
}

function loadTopics(): TopicsFile {
  if (!fs.existsSync(TOPICS_PATH)) {
    console.error("topics.json not found. Run parse-pdf first.");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(TOPICS_PATH, "utf-8"));
}

function loadExisting(): GeneratedQuestion[] {
  if (!fs.existsSync(OUT_PATH)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"));
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

function save(all: GeneratedQuestion[]) {
  fs.writeFileSync(OUT_PATH, JSON.stringify(all, null, 2));
}

async function generateOne(
  rotator: GeminiKeyRotator,
  exam: ExamCode,
  topic: { name: string; slug: string; description: string },
  skills: string[],
  difficulty: Difficulty,
  type: QType,
  existingHashes: Set<string>
): Promise<GeneratedQuestion | null> {
  try {
    const prompt = generationPrompt(exam, topic.name, topic.description, skills, difficulty, type);
    const resp = await rotator.generateContent(prompt, {
      temperature: 0.85,
      responseMimeType: "application/json",
    });

    const item = parseModelResponse(resp);
    if (!item || !item.stem) return null;

    const norm = normalize(item.stem);
    if (existingHashes.has(norm)) return null;
    existingHashes.add(norm);

    return {
      id: genId(), exam, topic_slug: topic.slug,
      type: item.type || type, difficulty,
      stem: item.stem,
      options: item.options,
      matches: item.matches,
      match_choices: item.match_choices,
      numeric_answer: item.numeric_answer,
      final_answer: item.final_answer || "",
      explanation_steps: item.explanation_steps || [],
      distractor_rationales: item.distractor_rationales || {},
      concept_summary: item.concept_summary || "",
    };
  } catch (e: any) {
    return null;
  }
}

async function main() {
  console.log("=== AMP Prep Question Generation ===");
  const topicsFile = loadTopics();
  const existing = loadExisting();
  const existingHashes = new Set(existing.map(q => normalize(q.stem)));
  const all = [...existing];

  const rotator = new GeminiKeyRotator();
  console.log(`Existing: ${existing.length} questions`);

  const counts = {
    AMP1: all.filter(q => q.exam === "AMP1").length,
    AMP2: all.filter(q => q.exam === "AMP2").length,
  };

  const logLines: string[] = [
    "# Generation Log", "",
    `Started: ${new Date().toISOString()}`,
    `Keys: ${rotator.keyCount()}`,
    `Existing: ${existing.length}`, "",
    "## Progress", "",
  ];

  // Build work queue: (exam, topic, difficulty, type) tuples
  type Task = { exam: ExamCode; topic: any; diff: Difficulty; perDiff: number };
  const tasks: Task[] = [];

  for (const t of topicsFile.amp1) {
    for (const d of DIFFS) {
      tasks.push({ exam: "AMP1", topic: t, diff: d, perDiff: AMP1_PER_TOPIC_PER_DIFF });
    }
  }
  for (const t of topicsFile.amp2) {
    for (const d of DIFFS) {
      tasks.push({ exam: "AMP2", topic: t, diff: d, perDiff: AMP2_PER_TOPIC_PER_DIFF });
    }
  }

  let totalGenerated = 0;
  let saveCounter = 0;

  for (const task of tasks) {
    const skills = task.topic.skills?.length > 0
      ? task.topic.skills.map((s: any) => s.name || s)
      : [task.topic.description];

    // Count what we already have for this topic+difficulty
    const have = all.filter(q =>
      q.topic_slug === task.topic.slug && q.difficulty === task.diff
    ).length;

    const needed = task.perDiff - have;
    if (needed <= 0) {
      console.log(`[${task.topic.slug}/${task.diff}] already have ${have}, skip`);
      continue;
    }

    console.log(`\n[${task.exam}] ${task.topic.name} / ${task.diff}: need ${needed}`);

    let made = 0;
    let attempts = 0;
    const maxAttempts = needed * 3;

    while (made < needed && attempts < maxAttempts) {
      attempts++;
      const type = TYPES[(made + attempts) % TYPES.length];

      const q = await generateOne(rotator, task.exam, task.topic, skills, task.diff, type, existingHashes);

      if (q) {
        all.push(q);
        counts[task.exam]++;
        made++;
        totalGenerated++;
        saveCounter++;

        if (made % 5 === 0 || made === needed) {
          console.log(`  ${task.diff}: ${made}/${needed} (total ${task.exam}: ${counts[task.exam]})`);
        }

        // Save every 10 questions
        if (saveCounter >= 10) {
          save(all);
          saveCounter = 0;
        }
      }
    }

    // Save after each topic+difficulty
    save(all);
    logLines.push(`- ${task.exam} ${task.topic.slug} ${task.diff}: +${made} (total ${task.exam}: ${counts[task.exam]})`);
  }

  save(all);

  const stats = rotator.stats();
  logLines.push("", "## Summary", "",
    `- Total questions: ${all.length}`,
    `- AMP1: ${counts.AMP1}`,
    `- AMP2: ${counts.AMP2}`,
    `- New this run: ${totalGenerated}`,
    `- API requests: ${stats.totalRequests}`,
    `- API successes: ${stats.totalSuccess}`,
    `- API errors: ${stats.totalErrors}`,
  );

  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, logLines.join("\n"));

  console.log(`\n=== DONE ===`);
  console.log(`Total: ${all.length} (AMP1: ${counts.AMP1}, AMP2: ${counts.AMP2})`);
  console.log(`New: ${totalGenerated} | API: ${stats.totalRequests} req, ${stats.totalSuccess} ok, ${stats.totalErrors} err`);
}

// Only run when invoked as a script. The parse helpers above are exported for
// tests, and importing this module must not construct a GeminiKeyRotator or
// fire billed API calls as a side effect. argv[1] is the tsx entry point under
// `npm run generate` and the vitest binary under test.
if (/generate-questions\.(ts|js)$/.test(process.argv[1] ?? "")) {
  main().catch(e => { console.error("Fatal:", e); process.exit(1); });
}
