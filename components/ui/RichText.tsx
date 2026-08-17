"use client";

import { MathText } from "@/components/ui/Katex";

/**
 * Renders question and lesson copy that may contain a markdown pipe table.
 *
 * 69 questions in the bank present their data as a GitHub-style table. Passing
 * those straight to MathText printed the pipes and the `:---` separator row as
 * literal text, so a student read the raw markdown instead of a table.
 *
 * Everything that is not a table is handed to MathText unchanged, so the
 * existing behaviour — including unmatched currency `$` falling through as
 * plain text — is untouched.
 */

interface Table {
  header: string[];
  rows: string[][];
  align: ("left" | "right" | "center")[];
}

/** Split a `| a | b |` line into its cells, ignoring the outer pipes. */
function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

/** `:---`, `---:`, `:---:` and `---` set a column's alignment. */
function isSeparator(line: string): boolean {
  const cells = splitRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function alignOf(cell: string): "left" | "right" | "center" {
  const left = cell.startsWith(":");
  const right = cell.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  return "left";
}

type Segment = { type: "text"; content: string } | { type: "table"; table: Table };

/**
 * Walk the lines once, collecting any header/separator/body run into a table
 * and passing everything else through as text.
 */
export function parseTables(source: string): Segment[] {
  const lines = source.split("\n");
  const out: Segment[] = [];
  let buffer: string[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    out.push({ type: "text", content: buffer.join("\n") });
    buffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const header = lines[i];
    const sep = lines[i + 1];
    const looksLikeTable =
      header.includes("|") && sep !== undefined && isSeparator(sep) && splitRow(header).length > 1;

    if (!looksLikeTable) {
      buffer.push(header);
      continue;
    }

    flush();
    const headerCells = splitRow(header);
    const align = splitRow(sep).map(alignOf);
    const rows: string[][] = [];
    let j = i + 2;
    for (; j < lines.length; j++) {
      if (!lines[j].includes("|") || lines[j].trim() === "") break;
      rows.push(splitRow(lines[j]));
    }
    out.push({ type: "table", table: { header: headerCells, rows, align } });
    i = j - 1;
  }

  flush();
  return out;
}

const ALIGN_CLASS = { left: "text-left", right: "text-right", center: "text-center" } as const;

export function RichText({ text, className }: { text: string; className?: string }) {
  const segments = parseTables(text);

  // The overwhelmingly common case: no table, so behave exactly as before.
  if (segments.length === 1 && segments[0].type === "text") {
    return <MathText text={text} className={className} />;
  }

  return (
    <div className={className}>
      {segments.map((seg, i) => {
        if (seg.type === "text") {
          if (seg.content.trim() === "") return null;
          return (
            <div key={i}>
              <MathText text={seg.content} />
            </div>
          );
        }

        const { header, rows, align } = seg.table;
        return (
          <div key={i} className="my-3 overflow-x-auto">
            <table className="min-w-[16rem] border-collapse text-sm">
              <thead>
                <tr>
                  {header.map((cell, c) => (
                    <th
                      key={c}
                      scope="col"
                      className={`border border-surface-border bg-surface-panel px-3 py-1.5 font-semibold text-ink ${
                        ALIGN_CLASS[align[c] ?? "left"]
                      }`}
                    >
                      <MathText text={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) => (
                      <td
                        key={c}
                        className={`border border-surface-border px-3 py-1.5 text-ink ${
                          ALIGN_CLASS[align[c] ?? "left"]
                        }`}
                      >
                        <MathText text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
