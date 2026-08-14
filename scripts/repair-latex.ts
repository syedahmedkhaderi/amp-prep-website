/**
 * Repair LaTeX escape corruption in the generated question bank.
 *
 * The bank was written with single-backslash LaTeX inside JSON string literals,
 * so `"\frac"` is not the six characters `\frac` but the JSON escape `\f` (form
 * feed, 0x0C) followed by `rac`. JSON.parse applies that escape silently, so the
 * file is valid JSON and the damage only surfaces at render time: KaTeX sees a
 * control character where a command should be, fails to parse, and the question
 * displays raw source to the user. The same happened to `\times` and `\text`
 * via `\t` (tab, 0x09).
 *
 * The repair maps each control character back to the command it came from.
 * It is deliberately a whitelist: a control character is only rewritten when
 * the characters immediately after it complete a known LaTeX command. Anything
 * else aborts the run rather than guessing, because a wrong remap corrupts good
 * content silently and this file is the product.
 *
 * 0x0A is never a candidate: real newlines are pervasive and load bearing in
 * question stems ("Consider the following:\n\n$$x = ...$$"), and remapping them
 * would destroy formatting across the bank. 0x0D is a candidate only when
 * followed by the exact letters of \right or \rightarrow — a carriage return
 * immediately followed by "ight" is never real text, whereas a CR followed by a
 * newline is an ordinary CRLF line ending and is left alone.
 *
 * Usage:
 *   npx tsx scripts/repair-latex.ts          # report only, writes nothing
 *   npx tsx scripts/repair-latex.ts --write  # snapshot, then repair in place
 */

import * as fs from "fs";
import * as path from "path";

const QUESTIONS_PATH = path.resolve(process.cwd(), "data/generated/questions.json");

/**
 * Control character -> the LaTeX command whose escape produced it, keyed by the
 * literal text that must follow for the rewrite to apply. Derived from a full
 * frequency scan of the bank, not assumed: every control-character occurrence
 * in the file matched one of these entries or was a genuine line ending, with
 * no ambiguous cases. Longest `follow` first, so \rightarrow beats \right.
 */
const REPAIRS: { code: number; follow: string; command: string }[] = [
  { code: 0x0c, follow: "rac", command: "\\frac" },
  { code: 0x09, follow: "imes", command: "\\times" },
  { code: 0x09, follow: "ext{", command: "\\text{" },
  { code: 0x0d, follow: "ightarrow", command: "\\rightarrow" },
  { code: 0x0d, follow: "ight", command: "\\right" },
].sort((a, b) => b.follow.length - a.follow.length);

/**
 * Control characters that are legitimate content when they do not match a
 * repair above: line feeds throughout, and the carriage return of a CRLF.
 */
const PRESERVED = new Set([0x0a, 0x0d]);

type Finding = { code: number; context: string };

function repairString(input: string, unmapped: Finding[]): string {
  let out = "";
  let i = 0;

  outer: while (i < input.length) {
    const code = input.charCodeAt(i);

    if (code >= 32) {
      out += input[i];
      i += 1;
      continue;
    }

    // Repairs are checked before the preserved set, so a carriage return that
    // is really a mangled \right is repaired while the CR of a CRLF is kept.
    for (const r of REPAIRS) {
      if (code === r.code && input.startsWith(r.follow, i + 1)) {
        out += r.command;
        i += 1 + r.follow.length;
        continue outer;
      }
    }

    if (PRESERVED.has(code)) {
      out += input[i];
      i += 1;
      continue;
    }

    // A control character we have no mapping for. Record it and leave the
    // input untouched; the caller aborts on any finding.
    unmapped.push({ code, context: JSON.stringify(input.slice(Math.max(0, i - 20), i + 20)) });
    out += input[i];
    i += 1;
  }

  return out;
}

function walk(value: unknown, unmapped: Finding[]): unknown {
  if (typeof value === "string") return repairString(value, unmapped);
  if (Array.isArray(value)) return value.map((v) => walk(v, unmapped));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v, unmapped);
    return out;
  }
  return value;
}

/** Count every control-character occurrence and what follows it, for the report. */
function frequencyTable(questions: unknown[]): Map<string, number> {
  const table = new Map<string, number>();
  const scan = (v: unknown): void => {
    if (typeof v === "string") {
      for (let i = 0; i < v.length; i++) {
        const code = v.charCodeAt(i);
        const isRepairable = REPAIRS.some(
          (r) => r.code === code && v.startsWith(r.follow, i + 1)
        );
        if (code < 32 && (isRepairable || !PRESERVED.has(code))) {
          const key = `0x${code.toString(16).padStart(2, "0")} + ${JSON.stringify(v.slice(i + 1, i + 8))}`;
          table.set(key, (table.get(key) ?? 0) + 1);
        }
      }
    } else if (Array.isArray(v)) v.forEach(scan);
    else if (v && typeof v === "object") Object.values(v).forEach(scan);
  };
  questions.forEach(scan);
  return table;
}

function main(): void {
  const write = process.argv.includes("--write");
  const raw = fs.readFileSync(QUESTIONS_PATH, "utf-8");
  const questions = JSON.parse(raw) as Record<string, unknown>[];

  console.log(`[repair] ${questions.length} questions loaded from ${QUESTIONS_PATH}`);

  const before = frequencyTable(questions);
  const total = [...before.values()].reduce((a, b) => a + b, 0);
  console.log(`[repair] ${total} corrupted escape(s) across ${before.size} distinct contexts`);
  for (const [key, count] of [...before.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`         ${String(count).padStart(5)}  ${key}`);
  }

  const unmapped: Finding[] = [];
  const repaired = walk(questions, unmapped) as Record<string, unknown>[];

  if (unmapped.length > 0) {
    console.error(`\n[repair] ABORT: ${unmapped.length} control character(s) with no mapping.`);
    for (const f of unmapped.slice(0, 20)) {
      console.error(`         0x${f.code.toString(16).padStart(2, "0")} in ${f.context}`);
    }
    console.error("[repair] Add an entry to REPAIRS for each, then re-run. Nothing was written.");
    process.exit(1);
  }

  const changed = questions.filter((q, i) => JSON.stringify(q) !== JSON.stringify(repaired[i])).length;
  console.log(`\n[repair] ${changed} question(s) would change.`);

  if (!write) {
    console.log("[repair] Report only. Re-run with --write to apply.");
    return;
  }

  const snapshot = `${QUESTIONS_PATH}.corrupt-backup`;
  if (!fs.existsSync(snapshot)) {
    fs.writeFileSync(snapshot, raw);
    console.log(`[repair] Snapshot written to ${snapshot}`);
  }

  fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(repaired, null, 2) + "\n");
  console.log(`[repair] Repaired ${changed} question(s) in ${QUESTIONS_PATH}`);

  const after = frequencyTable(repaired);
  console.log(`[repair] Remaining corrupted escapes: ${[...after.values()].reduce((a, b) => a + b, 0)}`);
}

main();
