/**
 * LaTeX sanitizer. Validates that math content between delimiters parses under
 * KaTeX before a question can be published. Spec Section 11.
 *
 * In the build scripts environment this is called by verify-questions.ts.
 * In the live site this is called by the admin publish action.
 */

import katex from "katex";

/**
 * Returns true if all math expressions in the text parse successfully under
 * KaTeX. Extracts expressions from $...$ and $$...$$ delimiters and tries
 * each one.
 */
export function validateLatex(text: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const expressions = extractMath(text);

  for (const expr of expressions) {
    try {
      katex.renderToString(expr, { throwOnError: true, displayMode: false });
    } catch (e: any) {
      errors.push(`KaTeX parse error in "${expr.slice(0, 50)}": ${e.message}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function extractMath(text: string): string[] {
  const result: string[] = [];
  const regex = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    result.push((match[1] || match[2] || "").trim());
  }
  return result;
}

/**
 * Check for forbidden raw notation that should be in LaTeX. Spec Section 11.
 */
export function checkNotation(text: string): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  // Raw carets outside LaTeX
  if (/\w\^\d/.test(text) && !/\$\$?[^$]*\^\{/.test(text)) {
    issues.push("Raw caret notation detected. Use x^{2} inside LaTeX delimiters.");
  }
  // -> for arrows
  if (/->/.test(text)) {
    issues.push("Arrow '->' detected. Use \\rightarrow inside LaTeX.");
  }
  // Asterisk multiplication
  if (/\d\s*\*\s*\d/.test(text)) {
    issues.push("Asterisk multiplication detected. Use \\cdot or \\times.");
  }
  return { ok: issues.length === 0, issues };
}
