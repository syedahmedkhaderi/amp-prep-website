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
  const parts = parseMathDelimiters(text);

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
        return <span key={i}>{part.content}</span>;
      })}
    </span>
  );
}

type Part = { type: "text" | "inline" | "display"; content: string };

function parseMathDelimiters(text: string): Part[] {
  const parts: Part[] = [];
  const regex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ type: "text", content: text.slice(lastIdx, match.index) });
    }
    const token = match[0];
    if (token.startsWith("$$")) {
      parts.push({ type: "display", content: token.slice(2, -2).trim() });
    } else {
      parts.push({ type: "inline", content: token.slice(1, -1).trim() });
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push({ type: "text", content: text.slice(lastIdx) });
  }

  return parts;
}
