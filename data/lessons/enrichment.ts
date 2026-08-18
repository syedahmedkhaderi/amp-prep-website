import type { LessonBlock } from "../../lib/types";

/**
 * Extra blocks appended to lessons that were pure prose.
 *
 * 17 of the 32 topics had no figure at all, and several explained a rule in a
 * paragraph where a grid would have been read at a glance. Each entry below is
 * keyed by lesson slug prefix: the first lesson whose slug starts with the key
 * receives the blocks, so a topic gains its visual on the lesson where it makes
 * sense rather than always on lesson one.
 *
 * Applied by scripts/apply-enrichment.ts, which is idempotent — it skips a
 * lesson that already carries a block of the same type.
 */
export interface Enrichment {
  /** Slug prefix identifying the lesson. */
  match: string;
  blocks: LessonBlock[];
}

export const enrichments: Enrichment[] = [
  // ---- Fractions ----------------------------------------------------------
  {
    match: "fractions-add-and-subtract-proper-fractions-improper-fractions",
    blocks: [
      {
        type: "table",
        caption: "The four operations, side by side.",
        headers: ["Operation", "What to do first", "Example"],
        rows: [
          ["Add", "Make the bottoms match", "$\\frac{1}{2} + \\frac{1}{3} = \\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}$"],
          ["Subtract", "Make the bottoms match", "$\\frac{3}{4} - \\frac{1}{4} = \\frac{2}{4} = \\frac{1}{2}$"],
          ["Multiply", "Nothing, just go", "$\\frac{2}{3} \\times \\frac{3}{5} = \\frac{6}{15} = \\frac{2}{5}$"],
          ["Divide", "Flip the second one, then multiply", "$\\frac{1}{2} \\div \\frac{1}{4} = \\frac{1}{2} \\times \\frac{4}{1} = 2$"],
        ],
      },
      {
        type: "callout",
        kind: "common-mistake",
        text: "Only adding and subtracting need a common denominator. Multiplying and dividing do not, and forcing one wastes time.",
      },
    ],
  },
  {
    match: "fractions-simplify-a-fraction",
    blocks: [
      {
        type: "graph",
        caption: "Thirds and quarters on the same line. $\\frac{2}{3}$ sits to the right of $\\frac{1}{2}$, so it is larger.",
        spec: {
          kind: "number-line",
          min: 0,
          max: 1,
          step: 0.25,
          marks: [
            { at: 0.25, label: "1/4" },
            { at: 0.5, label: "1/2" },
            { at: 0.6667, label: "2/3" },
          ],
          description:
            "A number line from 0 to 1 with one quarter, one half and two thirds marked in order from left to right.",
        },
      },
    ],
  },

  // ---- Decimals -----------------------------------------------------------
  {
    match: "decimals-round-numbers-to-one-or-two-decimal",
    blocks: [
      {
        type: "table",
        caption: "Place value to the right of the point.",
        headers: ["Position", "Name", "In $3.4826$"],
        rows: [
          ["1st", "Tenths", "$4$"],
          ["2nd", "Hundredths", "$8$"],
          ["3rd", "Thousandths", "$2$"],
          ["4th", "Ten-thousandths", "$6$"],
        ],
      },
      {
        type: "list",
        intro: "To round to a place, look at the digit just after it:",
        ordered: true,
        items: [
          "If it is $5$ or more, add one to the rounding digit.",
          "If it is $4$ or less, leave the rounding digit alone.",
          "Drop everything after the rounding digit either way.",
        ],
      },
    ],
  },

  // ---- Percent ------------------------------------------------------------
  {
    match: "percent-change-a-fraction-or-decimal-to-a",
    blocks: [
      {
        type: "table",
        caption: "The same amount written three ways.",
        headers: ["Fraction", "Decimal", "Percent"],
        rows: [
          ["$\\frac{1}{4}$", "$0.25$", "$25\\%$"],
          ["$\\frac{1}{2}$", "$0.5$", "$50\\%$"],
          ["$\\frac{3}{4}$", "$0.75$", "$75\\%$"],
          ["$\\frac{1}{5}$", "$0.2$", "$20\\%$"],
          ["$\\frac{1}{3}$", "$0.333\\ldots$", "$33.3\\%$"],
        ],
      },
      {
        type: "list",
        intro: "Moving between the three forms:",
        items: [
          "Decimal to percent: move the point two places right.",
          "Percent to decimal: move the point two places left.",
          "Fraction to decimal: divide the top by the bottom.",
        ],
      },
    ],
  },

  // ---- Laws of exponents --------------------------------------------------
  {
    match: "laws-of-exponents-multiply-powers-with-the-same-base-by",
    blocks: [
      {
        type: "table",
        caption: "Every exponent rule in one place.",
        headers: ["Rule", "Form", "Example"],
        rows: [
          ["Product", "$a^{m} \\cdot a^{n} = a^{m+n}$", "$2^{3} \\cdot 2^{4} = 2^{7}$"],
          ["Quotient", "$\\frac{a^{m}}{a^{n}} = a^{m-n}$", "$\\frac{5^{6}}{5^{2}} = 5^{4}$"],
          ["Power of a power", "$(a^{m})^{n} = a^{mn}$", "$(3^{2})^{4} = 3^{8}$"],
          ["Power of a product", "$(ab)^{n} = a^{n}b^{n}$", "$(2x)^{3} = 8x^{3}$"],
          ["Zero", "$a^{0} = 1$", "$7^{0} = 1$"],
          ["Negative", "$a^{-n} = \\frac{1}{a^{n}}$", "$2^{-3} = \\frac{1}{8}$"],
        ],
      },
      {
        type: "callout",
        kind: "watch-out",
        text: "These rules only apply when the bases match. $2^{3} \\cdot 3^{2}$ cannot be combined, because $2$ and $3$ are different.",
      },
    ],
  },

  // ---- Negative exponents -------------------------------------------------
  {
    match: "negative-exponents-rewrite-a-negative-exponent-as-a-reciprocal",
    blocks: [
      {
        type: "table",
        caption: "Counting down the powers of two. Each step divides by $2$.",
        headers: ["Power", "Value"],
        rows: [
          ["$2^{3}$", "$8$"],
          ["$2^{2}$", "$4$"],
          ["$2^{1}$", "$2$"],
          ["$2^{0}$", "$1$"],
          ["$2^{-1}$", "$\\frac{1}{2}$"],
          ["$2^{-2}$", "$\\frac{1}{4}$"],
        ],
      },
      {
        type: "callout",
        kind: "tip",
        text: "A negative exponent never makes the answer negative. It makes it a fraction. $2^{-2}$ is $\\frac{1}{4}$, not $-4$.",
      },
    ],
  },

  // ---- Solving equations --------------------------------------------------
  {
    match: "solving-equations-combine-the-addition-and-division-properties-to",
    blocks: [
      {
        type: "list",
        intro: "The order to undo things in, which is the reverse of the order they were done:",
        ordered: true,
        items: [
          "Clear brackets and fractions.",
          "Collect the letter terms on one side and the numbers on the other.",
          "Combine like terms on each side.",
          "Divide by whatever multiplies the letter.",
          "Put the answer back into the original equation to check it.",
        ],
      },
      {
        type: "graph",
        caption: "Solving $2x + 1 = 7$ graphically: the lines cross at $x = 3$.",
        spec: {
          kind: "cartesian",
          viewport: { xMin: -1, xMax: 6, yMin: -1, yMax: 10 },
          curves: [
            { fn: "2*x + 1", label: "y = 2x + 1", color: "primary" },
            { fn: "7", label: "y = 7", color: "accent", dashed: true },
          ],
          points: [{ x: 3, y: 7, label: "(3, 7)" }],
          description:
            "The line y equals 2x plus 1 crossing the horizontal line y equals 7 at the point 3, 7.",
        },
      },
    ],
  },

  // ---- Formula rearrangement ----------------------------------------------
  {
    match: "formula-rearrangement-rearrange-a-formula",
    blocks: [
      {
        type: "table",
        caption: "Common formulas and the same formula solved for a different letter.",
        headers: ["Formula", "Solved for"],
        rows: [
          ["$A = lw$", "$l = \\frac{A}{w}$"],
          ["$C = 2\\pi r$", "$r = \\frac{C}{2\\pi}$"],
          ["$d = st$", "$t = \\frac{d}{s}$"],
          ["$F = \\frac{9}{5}C + 32$", "$C = \\frac{5}{9}(F - 32)$"],
        ],
      },
      {
        type: "callout",
        kind: "tip",
        text: "Rearranging uses exactly the same moves as solving an equation. The only difference is that the answer contains letters instead of a number.",
      },
    ],
  },

  // ---- Polynomials --------------------------------------------------------
  {
    match: "polynomials-find-the-degree-of-a-polynomial-that",
    blocks: [
      {
        type: "table",
        caption: "Naming a polynomial by its degree.",
        headers: ["Degree", "Name", "Example", "Shape of its graph"],
        rows: [
          ["$1$", "Linear", "$2x + 1$", "A straight line"],
          ["$2$", "Quadratic", "$x^{2} - 4$", "A parabola"],
          ["$3$", "Cubic", "$x^{3} - x$", "One or two bends"],
        ],
      },
      {
        type: "graph",
        caption: "The first three degrees drawn together.",
        spec: {
          kind: "cartesian",
          viewport: { xMin: -3, xMax: 3, yMin: -5, yMax: 5 },
          curves: [
            { fn: "2*x + 1", label: "2x + 1", color: "muted" },
            { fn: "x^2 - 2", label: "x² − 2", color: "primary" },
            { fn: "x^3 - 2*x", label: "x³ − 2x", color: "accent" },
          ],
          description:
            "A straight line, a parabola and a cubic curve on the same axes, showing that higher degree allows more bends.",
        },
      },
    ],
  },

  // ---- Factoring ----------------------------------------------------------
  {
    match: "factoring-find-the-greatest-common-factor-from-a",
    blocks: [
      {
        type: "table",
        caption: "Which factoring method to reach for.",
        headers: ["What you see", "Method", "Example"],
        rows: [
          ["Every term shares something", "Take out the common factor", "$6x^{2} + 9x = 3x(2x + 3)$"],
          ["Two squares subtracted", "Difference of squares", "$x^{2} - 9 = (x-3)(x+3)$"],
          ["Three terms, leading $1$", "Two numbers: product and sum", "$x^{2} + 5x + 6 = (x+2)(x+3)$"],
          ["Four terms", "Group in pairs", "$x^{3} + x^{2} + 2x + 2 = (x+1)(x^{2}+2)$"],
        ],
      },
      {
        type: "callout",
        kind: "tip",
        text: "Always check for a common factor first. Taking it out makes everything that follows smaller and easier.",
      },
    ],
  },

  // ---- Rational expressions -----------------------------------------------
  {
    match: "rational-expressions-simplify-rational-algebraic-expressions",
    blocks: [
      {
        type: "callout",
        kind: "common-mistake",
        text: "You may only cancel a whole factor, never a single term. In $\\frac{x + 3}{3}$ the $3$ on top is added, not multiplied, so nothing cancels.",
      },
      {
        type: "list",
        intro: "The steps, in order:",
        ordered: true,
        items: [
          "Factor the top completely.",
          "Factor the bottom completely.",
          "Cancel any factor that appears in both.",
          "Note the values that made the original bottom zero. They stay excluded even after cancelling.",
        ],
      },
    ],
  },

  // ---- Logarithms (AMP 1) -------------------------------------------------
  {
    match: "logarithms-change-expressions-from-exponential-to-logarithmic-form",
    blocks: [
      {
        type: "table",
        caption: "A logarithm and its exponent form say the same thing.",
        headers: ["Exponent form", "Logarithm form", "In words"],
        rows: [
          ["$2^{3} = 8$", "$\\log_{2}(8) = 3$", "Three twos multiply to $8$"],
          ["$10^{2} = 100$", "$\\log_{10}(100) = 2$", "Two tens multiply to $100$"],
          ["$5^{0} = 1$", "$\\log_{5}(1) = 0$", "No fives at all leaves $1$"],
        ],
      },
      {
        type: "graph",
        caption: "$y = \\log_{2}(x)$. It climbs forever but very slowly, and never reaches the vertical axis.",
        spec: {
          kind: "cartesian",
          viewport: { xMin: -1, xMax: 9, yMin: -4, yMax: 4 },
          curves: [{ fn: "ln(x)/ln(2)", label: "log₂ x", color: "primary" }],
          points: [{ x: 1, y: 0, label: "(1, 0)" }],
          description:
            "The logarithm curve rising steeply near zero then flattening, crossing the x axis at 1 and never touching the y axis.",
        },
      },
    ],
  },

  // ---- Word problems ------------------------------------------------------
  {
    match: "word-problems-translate-an-english-sentence-into-an-algebraic",
    blocks: [
      {
        type: "table",
        caption: "Words that tell you which operation to use.",
        headers: ["Words", "Operation"],
        rows: [
          ["sum, total, more than, increased by", "Add"],
          ["difference, less than, decreased by, fewer", "Subtract"],
          ["product, of, times, twice, per", "Multiply"],
          ["quotient, per, split, shared equally", "Divide"],
          ["is, was, gives, results in", "Equals"],
        ],
      },
      {
        type: "callout",
        kind: "watch-out",
        text: "\"Less than\" reverses the order. \"$5$ less than $x$\" is $x - 5$, not $5 - x$.",
      },
    ],
  },

  // ---- Advanced algebra (AMP 2) -------------------------------------------
  {
    match: "advanced-algebra-solve-absolute-value",
    blocks: [
      {
        type: "graph",
        caption: "$|x - 3| < 2$ holds between $1$ and $5$: every point within $2$ of $3$.",
        spec: {
          kind: "number-line",
          min: -1,
          max: 7,
          step: 1,
          marks: [
            { at: 1, label: "1", open: true },
            { at: 3, label: "3" },
            { at: 5, label: "5", open: true },
          ],
          intervals: [{ from: 1, to: 5, openFrom: true, openTo: true }],
          description:
            "A number line with the segment between 1 and 5 shaded and hollow circles at both ends, centred on 3.",
        },
      },
      {
        type: "table",
        caption: "Which way an absolute value inequality opens.",
        headers: ["Inequality", "Meaning", "Solution shape"],
        rows: [
          ["$|x - c| < a$", "Within $a$ of $c$", "One band: $c - a < x < c + a$"],
          ["$|x - c| > a$", "Further than $a$ from $c$", "Two pieces: $x < c - a$ or $x > c + a$"],
          ["$|x - c| = a$", "Exactly $a$ from $c$", "Two points"],
        ],
      },
    ],
  },

  // ---- Logarithmic functions (AMP 2) --------------------------------------
  {
    match: "logarithmic-functions-apply-the-product-quotient",
    blocks: [
      {
        type: "table",
        caption: "The three laws, and the mistake each one invites.",
        headers: ["Law", "Correct", "Not true"],
        rows: [
          ["Product", "$\\log(ab) = \\log a + \\log b$", "$\\log(a + b) = \\log a + \\log b$"],
          ["Quotient", "$\\log\\left(\\frac{a}{b}\\right) = \\log a - \\log b$", "$\\frac{\\log a}{\\log b} = \\log a - \\log b$"],
          ["Power", "$\\log(a^{n}) = n \\log a$", "$(\\log a)^{n} = n \\log a$"],
        ],
      },
      {
        type: "callout",
        kind: "common-mistake",
        text: "There is no law for the logarithm of a sum. $\\log(a + b)$ cannot be broken apart at all.",
      },
    ],
  },

  // ---- Sequences and series (AMP 2) ---------------------------------------
  {
    match: "sequences-series-identify-arithmetic-and-geometric",
    blocks: [
      {
        type: "table",
        caption: "Telling the two kinds apart.",
        headers: ["", "Arithmetic", "Geometric"],
        rows: [
          ["Each step", "Add the same amount", "Multiply by the same amount"],
          ["Test", "Differences are constant", "Ratios are constant"],
          ["Example", "$3, 7, 11, 15$", "$3, 6, 12, 24$"],
          ["$n$th term", "$a + (n-1)d$", "$ar^{n-1}$"],
        ],
      },
      {
        type: "callout",
        kind: "tip",
        text: "Check the differences first. If they are not constant, divide instead and check the ratios.",
      },
    ],
  },

  // ---- Systems and matrices (AMP 2) ---------------------------------------
  {
    match: "systems-matrices-solve-systems-of-three",
    blocks: [
      {
        type: "graph",
        caption: "Two lines that cross once. That single crossing point is the solution to the system.",
        spec: {
          kind: "cartesian",
          viewport: { xMin: -2, xMax: 6, yMin: -2, yMax: 8 },
          curves: [
            { fn: "2*x - 1", label: "y = 2x − 1", color: "primary" },
            { fn: "-x + 5", label: "y = −x + 5", color: "accent" },
          ],
          points: [{ x: 2, y: 3, label: "(2, 3)" }],
          description: "Two straight lines meeting at the single point 2, 3.",
        },
      },
      {
        type: "table",
        caption: "What the picture tells you about the number of solutions.",
        headers: ["Picture", "Solutions", "Determinant"],
        rows: [
          ["Lines cross once", "Exactly one", "Not zero"],
          ["Lines are parallel", "None", "Zero"],
          ["Lines lie on top of each other", "Infinitely many", "Zero"],
        ],
      },
    ],
  },

  // ---- Trigonometric equations (AMP 2) ------------------------------------
  {
    match: "trigonometric-equations-solve-basic-trigonometric",
    blocks: [
      {
        type: "graph",
        caption: "$\\sin\\theta = 0.5$ meets the curve twice in one turn, at $30^{\\circ}$ and $150^{\\circ}$.",
        spec: {
          kind: "cartesian",
          viewport: { xMin: 0, xMax: 360, yMin: -1.5, yMax: 1.5 },
          curves: [
            { fn: "sin(x*pi/180)", label: "sin θ", color: "primary" },
            { fn: "0.5", label: "y = 0.5", color: "accent", dashed: true },
          ],
          points: [
            { x: 30, y: 0.5, label: "30°" },
            { x: 150, y: 0.5, label: "150°" },
          ],
          xLabel: "θ (degrees)",
          description:
            "One full sine wave from 0 to 360 degrees crossed by the horizontal line y equals 0.5 at 30 and 150 degrees.",
        },
      },
      {
        type: "table",
        caption: "How many solutions to expect in one full turn.",
        headers: ["Equation", "Solutions in $0^{\\circ}$ to $360^{\\circ}$"],
        rows: [
          ["$\\sin\\theta = k$, with $-1 < k < 1$", "Two"],
          ["$\\cos\\theta = k$, with $-1 < k < 1$", "Two"],
          ["$\\tan\\theta = k$, any $k$", "Two"],
          ["$\\sin\\theta = 1$ or $\\sin\\theta = -1$", "One"],
        ],
      },
    ],
  },
];
