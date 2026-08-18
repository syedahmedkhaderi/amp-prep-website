import type { LessonSource } from "./types";

/** Solving Equations: the balance idea, then brackets, fractions and proportions. */
export const solvingEquationsLessons: LessonSource[] = [
  {
    skillSlug: "solving-equations-determine-whether-a-given-number-is-a",
    title: "Checking whether a number is the solution",
    summary: "Test a value by substituting it back into the equation.",
    estMinutes: 5,
    blocks: [
      { type: "definition", term: "Solution", meaning: "A solution is a value for the letter that makes the two sides of the equation equal." },
      { type: "prose", text: "To test a number, put it in wherever the letter appears and work out each side separately. If both sides come to the same value, it is a solution." },
      {
        type: "worked_example",
        prompt: "Is $x = 3$ a solution of $5x - 4 = 11$?",
        steps: [
          { action: "Substitute into the left side only.", math: "5(3) - 4", why: "Work one side at a time so the two can be compared honestly." },
          { action: "Work it out.", math: "15 - 4 = 11", why: "Multiplication before subtraction." },
          { action: "Compare with the right side.", math: "11 = 11", why: "Both sides come to $11$, so the equation holds." },
        ],
        answer: "Yes, $x = 3$ is a solution.",
      },
      { type: "callout", kind: "tip", text: "This is also how you check your own work. After solving any equation, put your answer back in. It catches most arithmetic slips in a few seconds." },
      { type: "checkpoint", questionIds: ["q_0h4vqighbone"] },
    ],
  },
  {
    skillSlug: "solving-equations-use-the-addition-property-to-solve-an",
    title: "Adding or subtracting to solve",
    summary: "Undo an addition or subtraction to get the letter alone.",
    estMinutes: 6,
    blocks: [
      { type: "prose", text: "An equation is a balance. The two sides are equal, and they stay equal as long as you do the same thing to both." },
      { type: "definition", term: "The addition property", meaning: "You may add the same number to both sides, or subtract the same number from both sides, and the equation still holds." },
      { type: "prose", text: "This is how you get the letter on its own. Whatever is attached to it, do the opposite to both sides." },
      {
        type: "worked_example",
        prompt: "Solve $x + 7 = 12$.",
        steps: [
          { action: "See what is attached to $x$.", math: "+7", why: "Seven is being added, so subtracting seven will undo it." },
          { action: "Subtract $7$ from both sides.", math: "x + 7 - 7 = 12 - 7", why: "Doing it to only one side would break the balance and change the answer." },
          { action: "Tidy up.", math: "x = 5", why: "On the left $+7 - 7$ cancels, leaving $x$ alone." },
          { action: "Check.", math: "5 + 7 = 12", why: "It matches, so the answer is right." },
        ],
        answer: "$x = 5$",
      },
      { type: "callout", kind: "tip", text: "Subtracting a negative means adding. To solve $x - 4 = 9$ you add $4$ to both sides, giving $x = 13$." },
      { type: "checkpoint", questionIds: ["q_11gvqbj6blsu"] },
    ],
  },
  {
    skillSlug: "solving-equations-use-the-division-property-to-solve-an",
    title: "Dividing to solve",
    summary: "Undo a multiplication to get the letter alone.",
    estMinutes: 5,
    blocks: [
      { type: "definition", term: "The division property", meaning: "You may divide both sides by the same number, as long as that number is not zero, and the equation still holds." },
      { type: "prose", text: "When a number is multiplying the letter, divide both sides by it." },
      {
        type: "worked_example",
        prompt: "Solve $4x = 20$.",
        steps: [
          { action: "See what is attached to $x$.", math: "4 \\times x", why: "Four is multiplying, so dividing by four will undo it." },
          { action: "Divide both sides by $4$.", math: "\\frac{4x}{4} = \\frac{20}{4}", why: "The same operation on both sides keeps the balance." },
          { action: "Tidy up.", math: "x = 5", why: "On the left the fours cancel." },
        ],
        answer: "$x = 5$",
      },
      { type: "prose", text: "If the letter is divided by a number, multiply instead. To solve $\\frac{x}{3} = 6$, multiply both sides by $3$ to get $x = 18$." },
      { type: "callout", kind: "watch-out", text: "Divide by the whole coefficient, including its sign. To solve $-3x = 12$, divide both sides by $-3$, giving $x = -4$." },
      { type: "checkpoint", questionIds: ["q_12rj5x5xibtr"] },
    ],
  },
  {
    skillSlug: "solving-equations-combine-the-addition-and-division-properties-to",
    title: "Two-step equations",
    summary: "Undo an addition and a multiplication in the right order.",
    estMinutes: 7,
    blocks: [
      { type: "prose", text: "Most equations need both moves. The order matters, and it is the reverse of the order of operations." },
      { type: "definition", term: "The order to undo", meaning: "Deal with addition and subtraction first, then multiplication and division. You are unwrapping the expression from the outside in." },
      {
        type: "worked_example",
        prompt: "Solve $3x + 5 = 20$.",
        steps: [
          { action: "Subtract $5$ from both sides.", math: "3x = 15", why: "Undo the addition first. This clears everything except the multiplication." },
          { action: "Divide both sides by $3$.", math: "x = 5", why: "Now only the multiplication is left to undo." },
          { action: "Check.", math: "3(5) + 5 = 20", why: "$15 + 5 = 20$, so it is correct." },
        ],
        answer: "$x = 5$",
      },
      { type: "callout", kind: "common-mistake", text: "Dividing by $3$ first. That gives $x + \\frac{5}{3} = \\frac{20}{3}$, which is still true but much harder to finish. Clear the addition first." },
      {
        type: "worked_example",
        prompt: "Solve $2x - 7 = 3x + 1$.",
        steps: [
          { action: "Get the letters onto one side.", math: "2x - 7 - 2x = 3x + 1 - 2x", why: "Subtracting $2x$ from both sides removes it from the left." },
          { action: "Tidy.", math: "-7 = x + 1", why: "The left has no $x$ left, and the right has $x$." },
          { action: "Subtract $1$ from both sides.", math: "-8 = x", why: "Undo the addition to leave $x$ alone." },
        ],
        answer: "$x = -8$",
      },
      { type: "callout", kind: "tip", text: "When the letter appears on both sides, remove the smaller amount of it. Taking $2x$ from both sides here avoids negative coefficients." },
      { type: "checkpoint", questionIds: ["q_1iv9okzn5of0"] },
    ],
  },
  {
    skillSlug: "solving-equations-solve-equations-that-contain-brackets",
    title: "Equations with brackets",
    summary: "Expand first, then solve as usual.",
    estMinutes: 6,
    blocks: [
      { type: "prose", text: "When an equation has brackets, expand them before anything else." },
      { type: "definition", term: "Expanding", meaning: "Multiply everything inside the bracket by the number outside. $3(x + 4)$ becomes $3x + 12$." },
      { type: "callout", kind: "watch-out", text: "Multiply the number outside by every term inside, not just the first. $3(x + 4)$ is $3x + 12$, not $3x + 4$." },
      {
        type: "worked_example",
        prompt: "Solve $4(x - 3) + 6 = 18$.",
        steps: [
          { action: "Expand the bracket.", math: "4x - 12 + 6 = 18", why: "$4$ multiplies both the $x$ and the $-3$." },
          { action: "Collect the numbers on the left.", math: "4x - 6 = 18", why: "$-12 + 6 = -6$." },
          { action: "Add $6$ to both sides.", math: "4x = 24", why: "Undo the subtraction first." },
          { action: "Divide by $4$.", math: "x = 6", why: "Undo the multiplication last." },
        ],
        answer: "$x = 6$",
      },
      { type: "callout", kind: "tip", text: "A minus sign in front of a bracket flips every sign inside. $-2(x - 5)$ becomes $-2x + 10$." },
      { type: "checkpoint", questionIds: ["q_250nsfre5to5"] },
    ],
  },
  {
    skillSlug: "solving-equations-solve-equations-that-contain-fractions",
    title: "Equations with fractions",
    summary: "Clear the denominators, then solve as usual.",
    estMinutes: 7,
    blocks: [
      { type: "prose", text: "Fractions in an equation are easier to remove than to work with. Multiply everything by a number the denominators all divide into." },
      { type: "definition", term: "Clearing fractions", meaning: "Multiply every term on both sides by the lowest common denominator. The fractions disappear in one move." },
      {
        type: "worked_example",
        prompt: "Solve $\\frac{x}{2} + \\frac{x}{3} = 5$.",
        steps: [
          { action: "Find the lowest common denominator.", math: "6", why: "Both $2$ and $3$ divide into $6$." },
          { action: "Multiply every term by $6$.", math: "6 \\cdot \\frac{x}{2} + 6 \\cdot \\frac{x}{3} = 6 \\cdot 5", why: "Every term, including the one on the right. Missing one breaks the balance." },
          { action: "Simplify each term.", math: "3x + 2x = 30", why: "$6 \\div 2 = 3$ and $6 \\div 3 = 2$, so the fractions are gone." },
          { action: "Collect and divide.", math: "5x = 30, \\quad x = 6", why: "Ordinary two-step solving from here." },
        ],
        answer: "$x = 6$",
      },
      { type: "callout", kind: "common-mistake", text: "Multiplying only the fractions and leaving the whole number alone. The $5$ on the right must be multiplied too." },
      { type: "checkpoint", questionIds: ["q_2dtx6kiqlvkz"] },
    ],
  },
  {
    skillSlug: "solving-equations-solve-a-proportion-for-an-unknown-value",
    title: "Solving a proportion",
    summary: "Use cross multiplication when two fractions are equal.",
    estMinutes: 6,
    blocks: [
      { type: "definition", term: "Proportion", meaning: "A statement that two fractions are equal, such as $\\frac{3}{4} = \\frac{x}{20}$." },
      { type: "definition", term: "Cross multiplication", meaning: "In $\\frac{a}{b} = \\frac{c}{d}$, multiply each top by the opposite bottom to get $ad = bc$. It works because it is the same as multiplying both sides by $b$ and by $d$." },
      {
        type: "worked_example",
        prompt: "Solve $\\frac{3}{4} = \\frac{x}{20}$.",
        steps: [
          { action: "Cross multiply.", math: "3 \\times 20 = 4 \\times x", why: "Each numerator multiplies the opposite denominator." },
          { action: "Work out the left.", math: "60 = 4x", why: "The fractions are now gone." },
          { action: "Divide both sides by $4$.", math: "x = 15", why: "Undo the multiplication." },
        ],
        answer: "$x = 15$",
      },
      { type: "prose", text: "Proportions handle most scaling questions. If $3$ pens cost $12$ QR, then $7$ pens cost $x$, and $\\frac{3}{12} = \\frac{7}{x}$ gives the answer." },
      { type: "callout", kind: "watch-out", text: "Keep the two fractions consistent. If pens are on top on the left, pens must be on top on the right. Swapping one side gives the wrong answer." },
      { type: "checkpoint", questionIds: ["q_2w8l34idl2uj"] },
    ],
  },
];
