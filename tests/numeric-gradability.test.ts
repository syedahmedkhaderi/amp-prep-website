import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { repairedTolerance, roundForTyping } from "../scripts/repair-tolerances";

/**
 * A numeric question a student cannot answer by typing the right number is
 * broken, and it fails silently: grading marks correct work wrong and nothing
 * in the pipeline notices.
 *
 * lib/grading.ts accepts `Math.abs(parsed - target) <= tolerance + 1e-9`, so a
 * non-integer key with a tolerance near zero demands the full float. 93
 * questions shipped in that state. scripts/repair-tolerances.ts fixed them;
 * this keeps them fixed, since the generator that produced them is still the
 * thing that writes new questions.
 */

const BANK_PATH = path.resolve(__dirname, "../data/generated/questions.json");

interface BankQuestion {
  id: string;
  type: string;
  numeric_answer?: { value: number; tolerance?: number; accepted?: string[] } | null;
}

const questions: BankQuestion[] = JSON.parse(fs.readFileSync(BANK_PATH, "utf-8"));

describe("numeric answers are gradable by hand", () => {
  it("gives every non-integer answer a tolerance a human can hit", () => {
    const tooTight = questions
      .filter((q) => q.type === "numeric" && q.numeric_answer)
      .filter((q) => {
        const na = q.numeric_answer!;
        if (Number.isInteger(na.value)) return false;
        return (na.tolerance ?? 0) < repairedTolerance(na.value, 0);
      })
      .map((q) => `${q.id} (value ${q.numeric_answer!.value}, tol ${q.numeric_answer!.tolerance})`);

    expect(tooTight, `Ungradable numeric questions:\n${tooTight.join("\n")}`).toEqual([]);
  });

  it("keeps numeric_answer off the types that never read it", () => {
    // gradeQuestion routes by type and only the `numeric` branch looks at
    // numeric_answer. Carrying one elsewhere is inert at grading time but
    // seed.ts still writes a numeric_answers row for it, and heldForReview()
    // then quarantines the value-0 cases for no reason.
    const misplaced = questions
      .filter((q) => q.type !== "numeric" && q.numeric_answer)
      .map((q) => `${q.id} (${q.type})`);

    expect(misplaced, `Non-numeric questions carrying a numeric answer:\n${misplaced.slice(0, 20).join("\n")}`).toEqual([]);
  });

  it("never stores an answer that needs more than four significant figures", () => {
    const noisy = questions
      .filter((q) => q.type === "numeric" && q.numeric_answer)
      .filter((q) => roundForTyping(q.numeric_answer!.value) !== q.numeric_answer!.value)
      .map((q) => `${q.id} (${q.numeric_answer!.value})`);

    expect(noisy, `Answers carrying float noise:\n${noisy.join("\n")}`).toEqual([]);
  });
});

describe("repairedTolerance", () => {
  it("scales with magnitude for large answers", () => {
    expect(repairedTolerance(1000, 0)).toBeCloseTo(1, 10);
  });

  it("floors at 0.005 for ordinary answers near 1", () => {
    expect(repairedTolerance(3.1667, 0)).toBeCloseTo(0.005, 10);
  });

  it("tightens the floor for small answers so it cannot accept a wrong one", () => {
    // A flat 0.005 floor against a keyed 0.01 would accept 0.005 to 0.015,
    // marking an answer wrong by half correct.
    const tol = repairedTolerance(0.01, 0);
    expect(tol).toBeLessThan(0.005);
    expect(0.01 + tol).toBeLessThan(0.015);
  });

  it("never narrows a tolerance the author set deliberately", () => {
    expect(repairedTolerance(2.5, 0.25)).toBe(0.25);
  });
});

describe("roundForTyping", () => {
  it("cuts float noise to four decimals", () => {
    expect(roundForTyping(3.1666666666666665)).toBe(3.1667);
  });

  it("preserves small answers a four-decimal round would destroy", () => {
    // 1/59049 rounds to 0 at four decimal places, which deletes the answer.
    expect(roundForTyping(1 / 59049)).toBeGreaterThan(0);
    expect(roundForTyping(1 / 59049)).toBeCloseTo(0.00001694, 8);
  });

  it("leaves integers and zero alone", () => {
    expect(roundForTyping(42)).toBe(42);
    expect(roundForTyping(0)).toBe(0);
  });
});
