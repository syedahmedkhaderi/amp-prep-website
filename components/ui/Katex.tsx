"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { parseMathDelimiters, splitLooseCommands } from "@/lib/math/parse";

interface KatexProps {
  math: string;
  displayMode?: boolean;
}

const isDev = process.env.NODE_ENV !== "production";

/**
 * Render a LaTeX string using KaTeX.
 *
 * In development a parse failure is shown in red so it is impossible to miss.
 * In production it degrades quietly to plain text: a student mid-exam should
 * never see red error output on a question they are being asked to answer.
 * scripts/verify-questions.ts gates the bank on zero parse failures, so this
 * path is a safety net rather than something the content relies on.
 */
export function Katex({ math, displayMode = false }: KatexProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(math, ref.current, {
        displayMode,
        throwOnError: isDev,
        errorColor: "#dc2626",
        strict: false,
      });
    } catch (err) {
      if (!ref.current) return;
      ref.current.textContent = math;
      console.warn("[katex] failed to render segment:", math, err);
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
