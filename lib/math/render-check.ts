/**
 * Does this text actually render, or will a user see broken output?
 *
 * The bank shipped 297 questions whose LaTeX failed to parse, caused by escape
 * corruption that was invisible in the source file and only appeared on screen.
 * This module is the gate that keeps that from recurring. It runs the real
 * renderer path: the same splitter the browser uses (lib/math/parse.ts) feeding
 * the same KaTeX build, with throwOnError on so failures surface instead of
 * being painted red for the user to discover.
 *
 * Checking with an ad-hoc regex instead of the real parser produces false
 * positives (an escaped \$ looks like an unclosed delimiter) and false
 * negatives, so the parser is imported rather than reimplemented.
 */

import katex from "katex";
import { toParts } from "./parse";

export type RenderFailure = { segment: string; message: string };

/**
 * Render every math segment in `text` and collect the failures.
 * Text that contains no math yields no failures.
 */
export function findRenderFailures(text: string): RenderFailure[] {
  const failures: RenderFailure[] = [];

  for (const part of toParts(text)) {
    if (part.type === "text") continue;
    try {
      katex.renderToString(part.content, {
        displayMode: part.type === "display",
        throwOnError: true,
        strict: false,
      });
    } catch (err) {
      failures.push({
        segment: part.content,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return failures;
}

/**
 * Every string reachable from a question object. A deep walk rather than a
 * field list, so a new field added by the generation pipeline is covered
 * automatically instead of silently escaping the check.
 */
export function collectStrings(value: unknown, out: { path: string; text: string }[] = [], prefix = ""): { path: string; text: string }[] {
  if (typeof value === "string") {
    out.push({ path: prefix || "(root)", text: value });
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => collectStrings(v, out, `${prefix}[${i}]`));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      collectStrings(v, out, prefix ? `${prefix}.${k}` : k);
    }
  }
  return out;
}

export type QuestionFailure = { path: string; segment: string; message: string };

/** All render failures anywhere in a question object. */
export function checkQuestion(question: unknown): QuestionFailure[] {
  const failures: QuestionFailure[] = [];
  for (const { path, text } of collectStrings(question)) {
    for (const f of findRenderFailures(text)) {
      failures.push({ path, segment: f.segment, message: f.message });
    }
  }
  return failures;
}
