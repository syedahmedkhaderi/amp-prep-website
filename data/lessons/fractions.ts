import type { LessonSource } from "./types";

/**
 * Fractions.
 *
 * Written for a student who found school maths hard. Every symbol is named in
 * words before it is used, every rule is shown with a concrete number before
 * the general form, and each paragraph carries one idea.
 */
export const fractionsLessons: LessonSource[] = [
  {
    skillSlug: "fractions-define-proper-fractions-improper-fractions-and-mixed",
    title: "What the top and bottom of a fraction mean",
    summary: "Read any fraction, and tell proper, improper and mixed numbers apart.",
    estMinutes: 6,
    blocks: [
      {
        type: "prose",
        text: "A fraction is a way of writing part of a whole. It has two numbers, one above the other, with a line between them.",
      },
      {
        type: "definition",
        term: "Numerator and denominator",
        meaning:
          "In $\\frac{3}{4}$, the bottom number $4$ is the denominator. It tells you how many equal pieces the whole was cut into. The top number $3$ is the numerator. It tells you how many of those pieces you have.",
      },
      {
        type: "prose",
        text: "So $\\frac{3}{4}$ means: cut something into 4 equal pieces, then take 3 of them. The word denominator sounds difficult, but it is just the naming number. It names the size of each piece.",
      },
      {
        type: "callout",
        kind: "tip",
        text: "The denominator can never be $0$. Cutting something into zero pieces is not a thing you can do, so a fraction like $\\frac{3}{0}$ has no value at all.",
      },
      {
        type: "prose",
        text: "Fractions come in three shapes, and the names only describe how the top compares with the bottom.",
      },
      {
        type: "definition",
        term: "Proper fraction",
        meaning: "The top is smaller than the bottom, so the value is less than $1$. For example $\\frac{3}{4}$.",
      },
      {
        type: "definition",
        term: "Improper fraction",
        meaning:
          "The top is bigger than or equal to the bottom, so the value is $1$ or more. For example $\\frac{7}{4}$. Nothing is wrong with an improper fraction. The name is misleading.",
      },
      {
        type: "definition",
        term: "Mixed number",
        meaning: "A whole number written next to a proper fraction, such as $1\\frac{3}{4}$. It means $1 + \\frac{3}{4}$.",
      },
      {
        type: "prose",
        text: "$\\frac{7}{4}$ and $1\\frac{3}{4}$ are the same amount written two ways. If you have 7 quarters, you can group 4 of them into 1 whole and have 3 quarters left over.",
      },
      {
        type: "worked_example",
        prompt: "Sort these into proper, improper and mixed: $\\frac{2}{5}$, $\\frac{9}{9}$, $2\\frac{1}{3}$, $\\frac{11}{4}$.",
        steps: [
          {
            action: "Look at $\\frac{2}{5}$ and compare top with bottom.",
            math: "2 < 5",
            why: "The top is smaller, so the value is less than one whole. That makes it proper.",
          },
          {
            action: "Look at $\\frac{9}{9}$.",
            math: "9 = 9",
            why: "The top equals the bottom, so this is exactly $1$. Equal counts as improper, because improper means the top is not smaller than the bottom.",
          },
          {
            action: "Look at $2\\frac{1}{3}$.",
            why: "There is a whole number sitting next to a fraction, which is what a mixed number is.",
          },
          {
            action: "Look at $\\frac{11}{4}$.",
            math: "11 > 4",
            why: "The top is larger, so the value is more than one whole. Improper.",
          },
        ],
        answer: "Proper: $\\frac{2}{5}$. Improper: $\\frac{9}{9}$ and $\\frac{11}{4}$. Mixed: $2\\frac{1}{3}$.",
      },
      {
        type: "callout",
        kind: "common-mistake",
        text: "Improper does not mean wrong. On the placement test it is usually the cleanest way to write an answer. You will often convert a mixed number into one before calculating with it.",
      },
      { type: "checkpoint", questionIds: ["q_kzkqx3farol4"] },
    ],
  },

  {
    skillSlug: "fractions-simplify-a-fraction",
    title: "Simplifying a fraction",
    summary: "Cancel a fraction down to its smallest equal form.",
    estMinutes: 7,
    blocks: [
      {
        type: "prose",
        text: "Two fractions can look different and be worth exactly the same. $\\frac{6}{8}$ and $\\frac{3}{4}$ are the same amount. Simplifying means finding the smallest way to write it.",
      },
      {
        type: "prose",
        text: "The rule behind this is short. If you multiply the top and the bottom by the same number, the value does not change. If you divide the top and the bottom by the same number, the value does not change either.",
      },
      {
        type: "callout",
        kind: "watch-out",
        text: "This works for multiplying and dividing only. Adding $2$ to the top and bottom of $\\frac{1}{2}$ gives $\\frac{3}{4}$, which is a different number. Never add the same thing to both.",
      },
      {
        type: "worked_example",
        prompt: "Simplify $\\frac{18}{24}$.",
        steps: [
          {
            action: "Find a number that divides into both 18 and 24.",
            math: "6",
            why: "Both are in the 6 times table. Using the largest one that fits, the greatest common factor, gets you to the answer in a single step.",
          },
          {
            action: "Divide the top by 6 and the bottom by 6.",
            math: "\\frac{18 \\div 6}{24 \\div 6} = \\frac{3}{4}",
            why: "Dividing top and bottom by the same number keeps the value the same.",
          },
          {
            action: "Check whether anything still divides into both 3 and 4.",
            why: "Only $1$ does, so this cannot be reduced further. The fraction is now in simplest form.",
          },
        ],
        answer: "$\\frac{3}{4}$",
      },
      {
        type: "prose",
        text: "If you cannot see the biggest common factor straight away, that is fine. Take out any factor you do spot, then look again. $\\frac{18}{24}$ divided by 2 is $\\frac{9}{12}$, and dividing that by 3 gives $\\frac{3}{4}$. Two small steps get to the same place as one big one.",
      },
      { type: "checkpoint", questionIds: ["q_hnhwxe4wrz57"] },
    ],
  },

  {
    skillSlug: "fractions-add-and-subtract-proper-fractions-improper-fractions",
    title: "Adding and subtracting fractions",
    summary: "Why the bottoms must match, and how to make them match.",
    estMinutes: 8,
    blocks: [
      {
        type: "prose",
        text: "You can only add fractions when the pieces are the same size. Two quarters plus one quarter is three quarters, because every piece is a quarter.",
      },
      {
        type: "prose",
        text: "When the bottoms already match, add the tops and leave the bottom alone.",
      },
      {
        type: "worked_example",
        prompt: "Work out $\\frac{2}{7} + \\frac{3}{7}$.",
        steps: [
          {
            action: "Check the denominators.",
            math: "7 \\text{ and } 7",
            why: "They match, so every piece is one seventh and the pieces can simply be counted.",
          },
          {
            action: "Add the numerators, keep the denominator.",
            math: "\\frac{2+3}{7} = \\frac{5}{7}",
            why: "Two sevenths and three sevenths is five sevenths. The size of a piece has not changed, so the bottom does not change.",
          },
        ],
        answer: "$\\frac{5}{7}$",
      },
      {
        type: "callout",
        kind: "common-mistake",
        text: "Do not add the bottoms. $\\frac{2}{7} + \\frac{3}{7}$ is $\\frac{5}{7}$, not $\\frac{5}{14}$. Adding the denominators would make the pieces smaller, and adding things cannot make the total smaller.",
      },
      {
        type: "prose",
        text: "When the bottoms are different, the pieces are different sizes, and you cannot count them together yet. Rewrite both fractions so they share a bottom number first.",
      },
      {
        type: "worked_example",
        prompt: "Work out $\\frac{1}{2} + \\frac{1}{3}$.",
        steps: [
          {
            action: "Find a number that both 2 and 3 divide into.",
            math: "6",
            why: "$6$ is the lowest common denominator. Sixths are small enough to build both a half and a third exactly.",
          },
          {
            action: "Rewrite each fraction in sixths.",
            math: "\\frac{1}{2} = \\frac{3}{6}, \\qquad \\frac{1}{3} = \\frac{2}{6}",
            why: "Multiply top and bottom of the first by 3, and of the second by 2. Multiplying both parts by the same number keeps each value unchanged.",
          },
          {
            action: "Now the bottoms match, so add the tops.",
            math: "\\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}",
            why: "Three sixths and two sixths is five sixths.",
          },
        ],
        answer: "$\\frac{5}{6}$",
      },
      {
        type: "prose",
        text: "Subtracting works exactly the same way. Match the bottoms, then subtract the tops.",
      },
      { type: "checkpoint", questionIds: ["q_bw21t3o1te3k"] },
    ],
  },
];
