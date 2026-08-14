/**
 * Splitting logic that turns a question string into text and math parts.
 *
 * This lives apart from the React renderer in components/ui/Katex.tsx so that
 * offline scripts and tests can run the exact same parser the browser uses.
 * Katex.tsx is a client component that imports the KaTeX stylesheet, which
 * cannot be resolved outside the bundler, so importing from it in a tsx script
 * or a Vitest test fails. Anything importing this module gets the real parser,
 * which is what makes the render check in scripts/verify-questions.ts a true
 * measure of what users see rather than an approximation of it.
 */

export type Part = { type: "text" | "inline" | "display"; content: string };

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

/** Index just past the balanced `{...}` starting at `start`. */
function consumeBraceGroup(text: string, start: number): number {
  let depth = 1;
  let j = start + 1;
  while (j < text.length && depth > 0) {
    if (text[j] === "{") depth++;
    else if (text[j] === "}") depth--;
    j += 1;
  }
  return j;
}

/** Index just past the optional `[...]` argument at `start`, e.g. \sqrt[3]{8}. */
function consumeOptionalArg(text: string, start: number): number {
  let j = start + 1;
  while (j < text.length && text[j] !== "]") {
    if (text[j] === "\n") return start;
    j += 1;
  }
  return j < text.length ? j + 1 : start;
}

function readCommandName(text: string, start: number): string {
  let j = start + 1;
  while (j < text.length && /[a-zA-Z]/.test(text[j])) j += 1;
  return text.slice(start + 1, j);
}

/**
 * Index just past a whole `\begin{env}...\end{env}`. Environments are consumed
 * wholesale because their bodies contain `&` and `\\` separators that are not
 * valid run connectors elsewhere; stopping at the first `&` would split a
 * matrix into fragments that each fail to parse on their own.
 */
function consumeEnvironment(text: string, start: number): number {
  const open = text.indexOf("{", start);
  if (open === -1) return start;
  const close = text.indexOf("}", open);
  if (close === -1) return start;
  const name = text.slice(open + 1, close);
  const end = text.indexOf(`\\end{${name}}`, close);
  if (end === -1) return start;
  return end + `\\end{${name}}`.length;
}

function consumeCommand(text: string, start: number): number {
  if (readCommandName(text, start) === "begin") {
    const past = consumeEnvironment(text, start);
    if (past > start) return past;
  }

  let j = start + 1;
  while (j < text.length && /[a-zA-Z]/.test(text[j])) j += 1;

  // Arguments in either order: \sqrt[3]{8}, \frac{1}{2}, \operatorname{f}.
  for (;;) {
    if (text[j] === "{") j = consumeBraceGroup(text, j);
    else if (text[j] === "[") {
      const past = consumeOptionalArg(text, j);
      if (past === j) break;
      j = past;
    } else break;
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
        } else if (text[j] === "{") {
          // A brace group with no command in front of it: the argument of a
          // sub/superscript, as in 10^{3} or \log_{2}. Without this the run
          // ends at the caret and KaTeX sees a dangling "10^".
          j = consumeBraceGroup(text, j);
        } else if ((text[j] === "^" || text[j] === "_") && /[a-zA-Z0-9]/.test(text[j + 1] ?? "")) {
          // Single-token script argument: 10^n, x_i. Only one character is
          // taken, which is what TeX itself does, so a run cannot wander into
          // the prose that follows.
          j += 2;
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

/**
 * Does this candidate math span actually read as a sentence?
 *
 * Two currency amounts in one sentence ("costs $80 with a 25% discount, the
 * price becomes $60") present exactly like one inline math span: an opening $,
 * a plausible close, nothing in between that is illegal in math mode. Pairing
 * them renders the intervening prose as italic run-together math.
 *
 * The discriminator is English function words. Counting long words does not
 * work: "LCM(12, 18) - GCF(24, 36)" and "mass = density \cdot volume" are real
 * math full of long words, and suppressing them renders genuine expressions as
 * flat text. But no expression contains "and", "the" or "which" as free
 * standing words, while any mis-paired sentence contains several.
 *
 * Only words of three letters or more count. Short function words collide with
 * algebra: "a" and "b" are variables on nearly every page, and treating them as
 * prose suppressed 953 legitimate expressions.
 */
const PROSE_WORDS = new Set([
  "and", "are", "been", "but", "for", "from", "has", "have", "how", "its",
  "not", "our", "than", "that", "the", "then", "there", "these", "they",
  "this", "those", "was", "were", "what", "when", "where", "which", "while",
  "who", "will", "with", "you", "your",
]);

function looksLikeProse(span: string): boolean {
  const withoutMath = span
    .replace(/\\text\{[^{}]*\}/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ");
  const words = withoutMath.toLowerCase().match(/[a-z]{3,}/g) ?? [];
  return words.some((w) => PROSE_WORDS.has(w));
}

function findInlineClose(text: string, start: number): number {
  let i = start;
  while (i < text.length) {
    if (text[i] === "\\" && text[i + 1] === "$") {
      i += 2;
      continue;
    }
    if (text[i] === "$") {
      return looksLikeProse(text.slice(start, i)) ? -1 : i;
    }
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

/**
 * The full split a renderer applies to a question string: delimiter scan first,
 * then loose-command promotion on whatever is still plain text.
 */
export function toParts(text: string): Part[] {
  return parseMathDelimiters(text).flatMap(splitLooseCommands);
}
