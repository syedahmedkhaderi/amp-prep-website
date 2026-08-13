"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface KatexProps {
  math: string;
  displayMode?: boolean;
}

/**
 * Render a LaTeX string using KaTeX. Throws are caught and the raw string is
 * shown in red so rendering issues are visible during development.
 */
export function Katex({ math, displayMode = false }: KatexProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(math, ref.current, {
        displayMode,
        throwOnError: false,
        errorColor: "#dc2626",
        strict: false,
      });
    } catch {
      if (ref.current) ref.current.textContent = math;
    }
  }, [math, displayMode]);

  return <span ref={ref} />;
}

/**
 * Render mixed text and math. Splits on $...$ (inline) and $$...$$ (display).
 * This is the main content renderer for stems, options, and explanations.
 */
export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = parseMathDelimiters(text).flatMap(splitLooseCommands);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === "display") {
          return (
            <span key={i} className="block my-2 overflow-x-auto">
              <Katex math={part.content} displayMode />
            </span>
          );
        }
        if (part.type === "inline") {
          return <Katex key={i} math={part.content} />;
        }
        return part.content.split("\n").map((line, j, arr) => (
          <span key={`${i}-${j}`}>
            {line}
            {j < arr.length - 1 && <br />}
          </span>
        ));
      })}
    </span>
  );
}

type Part = { type: "text" | "inline" | "display"; content: string };

// A lot of generated question text (especially matching-question choices and
// MCQ options) contains bare LaTeX like \frac{8}{12} with no surrounding $...$
// at all, so there is no delimiter for the main parser to find and it was
// rendered as raw source. Scan "text" parts for runs of LaTeX command syntax
// (a command, its brace groups, and connecting operators/digits/whitespace)
// and promote each run to inline math. \newline becomes a real line break
// first, since it means "break" here rather than literal KaTeX content.
const MATH_SAFE_CONNECTOR = /[0-9+\-*/=<>^_.,()\s]/;
const MAX_LOOSE_RUN = 300;

function isCommandStart(text: string, i: number): boolean {
  return text[i] === "\\" && /[a-zA-Z]/.test(text[i + 1] || "");
}

function consumeCommand(text: string, start: number): number {
  let j = start + 1;
  while (j < text.length && /[a-zA-Z]/.test(text[j])) j += 1;
  while (text[j] === "{") {
    let depth = 1;
    j += 1;
    while (j < text.length && depth > 0) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") depth--;
      j += 1;
    }
  }
  return j;
}

export function splitLooseCommands(part: Part): Part[] {
  if (part.type !== "text") return [part];

  const withBreaks = part.content.replace(/\\newline/g, "\n");
  const text = withBreaks;
  const result: Part[] = [];
  let buf = "";
  let i = 0;

  while (i < text.length) {
    if (isCommandStart(text, i)) {
      const start = i;
      let j = i;
      while (j < text.length && j - start < MAX_LOOSE_RUN) {
        if (isCommandStart(text, j)) {
          j = consumeCommand(text, j);
        } else if (MATH_SAFE_CONNECTOR.test(text[j])) {
          j += 1;
        } else {
          break;
        }
      }
      const run = text.slice(start, j).trimEnd();
      if (buf) {
        result.push({ type: "text", content: buf });
        buf = "";
      }
      result.push({ type: "inline", content: run });
      i = start + run.length;
      // Re-add any whitespace trimmed off the end of the run as plain text.
      while (i < j) {
        buf += text[i];
        i += 1;
      }
      continue;
    }
    buf += text[i];
    i += 1;
  }
  if (buf) result.push({ type: "text", content: buf });

  return result.length ? result : [part];
}

/**
 * Question text mixes real LaTeX delimiters ($...$, $$...$$) with bare currency
 * dollar signs (e.g. "costs $48"). A single regex can't tell those apart: a
 * stray currency $ paired with an unrelated later $ swallows everything between
 * them as garbage math and corrupts the rest of the string. This is a manual
 * scanner instead, so an opening $ only becomes math when a plausible close is
 * found nearby; otherwise it falls back to a literal dollar sign. \$ is always
 * treated as an escaped literal, matching KaTeX's own handling of \$ in math.
 */
export function parseMathDelimiters(text: string): Part[] {
  const parts: Part[] = [];
  let textBuf = "";
  let i = 0;

  const flushText = () => {
    if (textBuf) {
      parts.push({ type: "text", content: textBuf });
      textBuf = "";
    }
  };

  while (i < text.length) {
    const ch = text[i];

    if (ch === "\\" && text[i + 1] === "$") {
      textBuf += "$";
      i += 2;
      continue;
    }

    if (ch === "$") {
      if (text[i + 1] === "$") {
        const close = findDisplayClose(text, i + 2);
        if (close !== -1) {
          flushText();
          parts.push({ type: "display", content: text.slice(i + 2, close).trim() });
          i = close + 2;
          continue;
        }
      } else {
        const close = findInlineClose(text, i + 1);
        if (close !== -1) {
          flushText();
          parts.push({ type: "inline", content: text.slice(i + 1, close).trim() });
          i = close + 1;
          continue;
        }
      }
      // No plausible close nearby: this is a bare currency sign, not math.
      textBuf += ch;
      i += 1;
      continue;
    }

    textBuf += ch;
    i += 1;
  }

  flushText();
  return parts;
}

const MAX_INLINE_SPAN = 200;

function findInlineClose(text: string, start: number): number {
  let i = start;
  while (i < text.length) {
    if (text[i] === "\\" && text[i + 1] === "$") {
      i += 2;
      continue;
    }
    if (text[i] === "$") return i;
    if (text[i] === "\n") return -1;
    if (text[i] === "." && text[i + 1] === " ") return -1;
    if (i - start > MAX_INLINE_SPAN) return -1;
    i += 1;
  }
  return -1;
}

function findDisplayClose(text: string, start: number): number {
  let i = start;
  while (i < text.length - 1) {
    if (text[i] === "\\" && text[i + 1] === "$") {
      i += 2;
      continue;
    }
    if (text[i] === "$" && text[i + 1] === "$") return i;
    i += 1;
  }
  return -1;
}
