import { describe, it, expect } from "vitest";
import { parseTables } from "@/components/ui/RichText";

/**
 * The bank ships 69 questions whose data is a markdown pipe table. Before
 * RichText existed those rendered as literal pipes and `:---` rows, so a
 * student read the markup rather than the numbers.
 */
describe("parseTables", () => {
  it("leaves ordinary text as a single text segment", () => {
    const segs = parseTables("What is $2 + 2$?");
    expect(segs).toHaveLength(1);
    expect(segs[0].type).toBe("text");
  });

  it("does not treat a lone pipe as a table", () => {
    const segs = parseTables("Evaluate $|x - 3|$ when $x = 1$.");
    expect(segs.every((s) => s.type === "text")).toBe(true);
  });

  it("pulls a table out of the surrounding prose", () => {
    const source = [
      "The table shows books read.",
      "",
      "| Month | Books Read |",
      "| :--- | :--- |",
      "| January | 4 |",
      "| February | 7 |",
    ].join("\n");

    const segs = parseTables(source);
    const table = segs.find((s) => s.type === "table");
    expect(table).toBeDefined();
    if (table?.type !== "table") throw new Error("expected a table");

    expect(table.table.header).toEqual(["Month", "Books Read"]);
    expect(table.table.rows).toEqual([
      ["January", "4"],
      ["February", "7"],
    ]);
    expect(segs.some((s) => s.type === "text" && s.content.includes("books read"))).toBe(true);
  });

  it("keeps text that follows the table", () => {
    const source = ["| A | B |", "| --- | --- |", "| 1 | 2 |", "", "Average: ___"].join("\n");
    const segs = parseTables(source);
    expect(segs.some((s) => s.type === "table")).toBe(true);
    expect(segs.some((s) => s.type === "text" && s.content.includes("Average"))).toBe(true);
  });

  it("reads column alignment from the separator row", () => {
    const source = ["| L | C | R |", "| :--- | :---: | ---: |", "| 1 | 2 | 3 |"].join("\n");
    const segs = parseTables(source);
    if (segs[0].type !== "table") throw new Error("expected a table first");
    expect(segs[0].table.align).toEqual(["left", "center", "right"]);
  });

  it("needs a separator row, not just pipes", () => {
    const segs = parseTables("| not | really |\njust text");
    expect(segs.every((s) => s.type === "text")).toBe(true);
  });
});
