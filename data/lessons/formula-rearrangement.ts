import type { LessonSource } from "./types";

/** Formula Rearrangement: making a different letter the subject. */
export const formulaRearrangementLessons: LessonSource[] = [
  {
    skillSlug: "formula-rearrangement-solve-an-equation-or-formula-for-a",
    title: "Making a letter the subject",
    summary: "Rearrange a formula so a different letter stands alone.",
    estMinutes: 7,
    blocks: [
      { type: "prose", text: "A formula like $A = lw$ is set up to give you the area. If you know the area and the length and want the width, you need to rearrange it." },
      { type: "definition", term: "Subject of a formula", meaning: "The letter that stands alone on one side. In $A = lw$ the subject is $A$." },
      { type: "prose", text: "Rearranging uses exactly the same moves as solving an equation. The only difference is that the answer contains letters instead of a number." },
      {
        type: "worked_example",
        prompt: "Make $w$ the subject of $A = lw$.",
        steps: [
          { action: "See what is attached to $w$.", math: "l \\times w", why: "$l$ is multiplying $w$, so dividing by $l$ will undo it." },
          { action: "Divide both sides by $l$.", math: "\\frac{A}{l} = \\frac{lw}{l}", why: "The same operation on both sides keeps the formula true." },
          { action: "Tidy up.", math: "\\frac{A}{l} = w", why: "On the right the two $l$ terms cancel." },
          { action: "Write the subject on the left.", math: "w = \\frac{A}{l}", why: "Only a matter of presentation. Both forms say the same thing." },
        ],
        answer: "$w = \\frac{A}{l}$",
      },
      { type: "callout", kind: "tip", text: "If the letters are confusing, try the same steps with numbers first. Solving $12 = 3w$ by dividing by $3$ is the identical move." },
      { type: "checkpoint", questionIds: ["q_13s6zb0uyo3p"] },
    ],
  },
  {
    skillSlug: "formula-rearrangement-isolate-a-variable-that-appears-only-once",
    title: "Isolating a letter step by step",
    summary: "Peel away operations in the reverse of the order of operations.",
    estMinutes: 7,
    blocks: [
      { type: "prose", text: "When several things are attached to the letter you want, remove them from the outside in." },
      { type: "definition", term: "The order to peel", meaning: "Undo addition and subtraction first, then multiplication and division, then powers and roots. It is the order of operations run backwards." },
      {
        type: "worked_example",
        prompt: "Make $C$ the subject of $F = \\frac{9}{5}C + 32$.",
        steps: [
          { action: "Subtract $32$ from both sides.", math: "F - 32 = \\frac{9}{5}C", why: "The $+32$ is on the outside, so it comes off first." },
          { action: "Multiply both sides by $5$.", math: "5(F - 32) = 9C", why: "Clearing the denominator is easier than dividing by a fraction. Note the brackets: the whole left side gets multiplied." },
          { action: "Divide both sides by $9$.", math: "\\frac{5(F - 32)}{9} = C", why: "This is the last thing attached to $C$." },
        ],
        answer: "$C = \\frac{5(F - 32)}{9}$",
      },
      { type: "callout", kind: "watch-out", text: "When you multiply a side that has more than one term, bracket it. Writing $5F - 32$ instead of $5(F - 32)$ multiplies only the first term and gives the wrong formula." },
      { type: "checkpoint", questionIds: ["q_1hm2k1ose6a3"] },
    ],
  },
  {
    skillSlug: "formula-rearrangement-rearrange-a-formula-where-the-target-variable",
    title: "When the letter is inside a bracket",
    summary: "Decide whether to expand the bracket or divide by what is outside it.",
    estMinutes: 6,
    blocks: [
      { type: "prose", text: "If the letter you want sits inside a bracket, you have two routes. Both work, but one is usually shorter." },
      { type: "prose", text: "If the bracket contains only the letter you want plus numbers, divide by whatever is outside. That removes the bracket in one step." },
      {
        type: "worked_example",
        prompt: "Make $x$ the subject of $y = a(x + b)$.",
        steps: [
          { action: "Divide both sides by $a$.", math: "\\frac{y}{a} = x + b", why: "$a$ multiplies the whole bracket, so dividing removes both $a$ and the bracket at once." },
          { action: "Subtract $b$ from both sides.", math: "\\frac{y}{a} - b = x", why: "Now $x$ has only the $+b$ attached to it." },
        ],
        answer: "$x = \\frac{y}{a} - b$",
      },
      { type: "prose", text: "Expanding first also works: $y = ax + ab$, then $y - ab = ax$, then $x = \\frac{y - ab}{a}$. The two answers look different but are equal." },
      { type: "callout", kind: "tip", text: "If the letter appears both inside and outside the bracket, you must expand. Dividing would leave it on both sides." },
      { type: "checkpoint", questionIds: ["q_1lwmlk2biaxs"] },
    ],
  },
  {
    skillSlug: "formula-rearrangement-rearrange-a-formula-where-the-target-variable-2",
    title: "When the letter is on the bottom",
    summary: "Get a letter out of a denominator.",
    estMinutes: 7,
    blocks: [
      { type: "prose", text: "A letter in a denominator cannot be isolated where it stands. Multiply by it to lift it out first." },
      {
        type: "worked_example",
        prompt: "Make $x$ the subject of $y = \\frac{k}{x}$.",
        steps: [
          { action: "Multiply both sides by $x$.", math: "yx = k", why: "This lifts $x$ out of the denominator. Nothing else can happen until it is out." },
          { action: "Divide both sides by $y$.", math: "x = \\frac{k}{y}", why: "Now $x$ is multiplied by $y$, so dividing undoes it." },
        ],
        answer: "$x = \\frac{k}{y}$",
      },
      { type: "callout", kind: "tip", text: "Notice the result: $y = \\frac{k}{x}$ rearranges to $x = \\frac{k}{y}$. The two letters simply swap. That is worth recognising on sight." },
      {
        type: "worked_example",
        prompt: "Make $x$ the subject of $P = k + \\frac{1}{x^{2}}$.",
        steps: [
          { action: "Subtract $k$ from both sides.", math: "P - k = \\frac{1}{x^{2}}", why: "Clear anything added on before touching the fraction." },
          { action: "Multiply both sides by $x^{2}$ and divide by $(P - k)$.", math: "x^{2} = \\frac{1}{P - k}", why: "This lifts $x^{2}$ out of the denominator and leaves it alone." },
          { action: "Take the square root of both sides.", math: "x = \\sqrt{\\frac{1}{P - k}}", why: "The square root undoes the squaring." },
        ],
        answer: "$x = \\sqrt{\\frac{1}{P - k}}$",
      },
      { type: "checkpoint", questionIds: ["q_27xg36540l6t"] },
    ],
  },
  {
    skillSlug: "formula-rearrangement-rearrange-a-formula-involving-a-power-or",
    title: "When the letter has a power or a root",
    summary: "Undo a square with a square root, and a root with a square.",
    estMinutes: 7,
    blocks: [
      { type: "prose", text: "Powers and roots undo each other. Squaring cancels a square root, and a square root cancels a square." },
      { type: "prose", text: "Because a power binds tightly to the letter, it is the last thing you undo." },
      {
        type: "worked_example",
        prompt: "Make $r$ the subject of $A = \\pi r^{2}$.",
        steps: [
          { action: "Divide both sides by $\\pi$.", math: "\\frac{A}{\\pi} = r^{2}", why: "Clear the multiplication before touching the power." },
          { action: "Take the square root of both sides.", math: "r = \\sqrt{\\frac{A}{\\pi}}", why: "The square root undoes the squaring, leaving $r$ alone." },
        ],
        answer: "$r = \\sqrt{\\frac{A}{\\pi}}$",
      },
      {
        type: "worked_example",
        prompt: "Make $L$ the subject of $T = 2\\pi\\sqrt{\\frac{L}{g}}$.",
        steps: [
          { action: "Divide both sides by $2\\pi$.", math: "\\frac{T}{2\\pi} = \\sqrt{\\frac{L}{g}}", why: "Clear what multiplies the root before removing the root." },
          { action: "Square both sides.", math: "\\frac{T^{2}}{4\\pi^{2}} = \\frac{L}{g}", why: "Squaring undoes the square root. Note that squaring $2\\pi$ gives $4\\pi^{2}$, not $2\\pi^{2}$." },
          { action: "Multiply both sides by $g$.", math: "L = \\frac{gT^{2}}{4\\pi^{2}}", why: "This lifts $L$ out of its denominator." },
        ],
        answer: "$L = \\frac{gT^{2}}{4\\pi^{2}}$",
      },
      { type: "callout", kind: "common-mistake", text: "Squaring only part of a side. $\\left(\\frac{T}{2\\pi}\\right)^{2}$ squares both the top and the bottom, giving $\\frac{T^{2}}{4\\pi^{2}}$." },
      { type: "checkpoint", questionIds: ["q_2s0diva7vp7b"] },
    ],
  },
  {
    skillSlug: "formula-rearrangement-rearrange-a-formula-where-the-target-variable-3",
    title: "When the letter appears twice",
    summary: "Collect the terms and factorise to isolate a repeated letter.",
    estMinutes: 8,
    blocks: [
      { type: "prose", text: "This is the hardest kind, and it has a fixed recipe. When the letter you want appears more than once, you cannot isolate it by peeling. You must gather it first." },
      { type: "definition", term: "The recipe", meaning: "Clear any fractions. Expand any brackets. Move every term containing your letter to one side and everything else to the other. Factorise the letter out. Divide by what is left in the bracket." },
      {
        type: "worked_example",
        prompt: "Make $x$ the subject of $A = \\frac{x + y}{x - y}$.",
        steps: [
          { action: "Multiply both sides by $(x - y)$.", math: "A(x - y) = x + y", why: "Clear the fraction first. Nothing useful can be done while $x$ is on the bottom." },
          { action: "Expand the left.", math: "Ax - Ay = x + y", why: "Now every term is visible and can be moved." },
          { action: "Gather the $x$ terms on one side.", math: "Ax - x = y + Ay", why: "Subtract $x$ from both sides and add $Ay$ to both sides. All the $x$ terms are now on the left." },
          { action: "Factorise $x$ out of the left.", math: "x(A - 1) = y(1 + A)", why: "This is the key step. It turns two $x$ terms into one." },
          { action: "Divide by the bracket.", math: "x = \\frac{y(A + 1)}{A - 1}", why: "Now $x$ stands alone." },
        ],
        answer: "$x = \\frac{y(A + 1)}{A - 1}$",
      },
      { type: "callout", kind: "watch-out", text: "You cannot cancel the $y$ terms in the answer. $\\frac{y(A+1)}{A-1}$ has $y$ multiplying the whole top, and there is no $y$ on the bottom to cancel with." },
      { type: "checkpoint", questionIds: ["q_30j61rcx5963"] },
    ],
  },
];
