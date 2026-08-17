import type { LessonSource } from "./types";

/** Percent: the three problem types, increase and decrease, averages. */
export const percentLessons: LessonSource[] = [
  {
    skillSlug: "percent-define-percent",
    title: "What percent means",
    summary: "Read a percent as a number of hundredths.",
    estMinutes: 5,
    blocks: [
      { type: "definition", term: "Percent", meaning: "Percent means out of one hundred. The symbol $\\%$ is shorthand for $\\frac{1}{100}$." },
      { type: "prose", text: "So $25\\%$ means $25$ out of every $100$, which is $\\frac{25}{100}$, which simplifies to $\\frac{1}{4}$." },
      { type: "prose", text: "Percents are useful because they put different amounts on the same scale. Scoring $17$ out of $20$ and $43$ out of $50$ are hard to compare until you turn both into percents." },
      { type: "callout", kind: "tip", text: "A few worth knowing by heart: $50\\% = \\frac{1}{2}$, $25\\% = \\frac{1}{4}$, $20\\% = \\frac{1}{5}$, $10\\% = \\frac{1}{10}$, $75\\% = \\frac{3}{4}$." },
      {
        type: "worked_example",
        prompt: "A class of $40$ students has $10$ absent. What percent are absent?",
        steps: [
          { action: "Write the comparison as a fraction.", math: "\\frac{10}{40}", why: "The part goes on top and the whole goes on the bottom." },
          { action: "Simplify.", math: "\\frac{1}{4}", why: "Both numbers divide by $10$." },
          { action: "Turn it into hundredths.", math: "\\frac{1}{4} = \\frac{25}{100} = 25\\%", why: "Percent means out of one hundred, so rewrite the fraction with $100$ underneath." },
        ],
        answer: "$25\\%$",
      },
      { type: "checkpoint", questionIds: ["q_00rr8bp7qgsr"] },
    ],
  },
  {
    skillSlug: "percent-change-a-percent-to-a-fraction-or",
    title: "Percent to a fraction or decimal",
    summary: "Convert a percent into the form a calculation needs.",
    estMinutes: 5,
    blocks: [
      { type: "prose", text: "You cannot calculate with a percent sign directly. Turn it into a decimal or a fraction first." },
      { type: "definition", term: "Percent to decimal", meaning: "Divide by $100$, which moves the point two places left. $45\\% = 0.45$." },
      { type: "definition", term: "Percent to fraction", meaning: "Put the number over $100$ and simplify. $45\\% = \\frac{45}{100} = \\frac{9}{20}$." },
      {
        type: "worked_example",
        prompt: "Write $8\\%$ and $150\\%$ as decimals.",
        steps: [
          { action: "Move the point two places left in $8\\%$.", math: "8 \\rightarrow 0.08", why: "$8$ is $8.0$, so two places left gives $0.08$. A zero is needed to fill the tenths place." },
          { action: "Do the same for $150\\%$.", math: "150 \\rightarrow 1.5", why: "Two places left from $150$ gives $1.5$." },
        ],
        answer: "$0.08$ and $1.5$",
      },
      { type: "callout", kind: "common-mistake", text: "Writing $8\\%$ as $0.8$. That is $80\\%$, ten times too big. Count both places." },
      { type: "prose", text: "A percent with a fraction in it works the same way. $\\frac{1}{2}\\%$ is $0.5\\%$, which is $0.005$ as a decimal." },
      { type: "checkpoint", questionIds: ["q_052fheoz5mjt"] },
    ],
  },
  {
    skillSlug: "percent-change-a-fraction-or-decimal-to-a",
    title: "Fraction or decimal to a percent",
    summary: "Go the other way and express any number as a percent.",
    estMinutes: 5,
    blocks: [
      { type: "prose", text: "Going the other way, you multiply by $100$ instead of dividing." },
      { type: "prose", text: "For a decimal, move the point two places right. $0.7$ becomes $70\\%$." },
      { type: "prose", text: "For a fraction, divide the top by the bottom to get a decimal, then move the point." },
      {
        type: "worked_example",
        prompt: "Write $\\frac{3}{8}$ as a percent.",
        steps: [
          { action: "Divide the top by the bottom.", math: "3 \\div 8 = 0.375", why: "A fraction is a division, so this gives the decimal form." },
          { action: "Move the point two places right.", math: "0.375 \\rightarrow 37.5", why: "Multiplying by $100$ converts to hundredths." },
          { action: "Add the sign.", math: "37.5\\%", why: "The number now counts hundredths." },
        ],
        answer: "$37.5\\%$",
      },
      { type: "callout", kind: "tip", text: "A percent does not have to be a whole number. $37.5\\%$ is a perfectly good answer, and rounding it to $38\\%$ loses accuracy you were not asked to lose." },
      { type: "checkpoint", questionIds: ["q_7tt2bmiwabse"] },
    ],
  },
  {
    skillSlug: "percent-perform-calculations-using-the-three-types-of",
    title: "The three kinds of percent question",
    summary: "Recognise which of the three you are being asked, and solve it.",
    estMinutes: 9,
    blocks: [
      { type: "prose", text: "Almost every percent question is one of three shapes. Telling them apart is most of the work." },
      { type: "definition", term: "Type 1: find the part", meaning: "What is $20\\%$ of $60$? You know the percent and the whole, and you want the part. Multiply: $0.20 \\times 60 = 12$." },
      { type: "definition", term: "Type 2: find the percent", meaning: "$15$ is what percent of $60$? You know the part and the whole. Divide the part by the whole, then convert: $15 \\div 60 = 0.25 = 25\\%$." },
      { type: "definition", term: "Type 3: find the whole", meaning: "$12$ is $20\\%$ of what number? You know the part and the percent. Divide the part by the decimal: $12 \\div 0.20 = 60$." },
      { type: "callout", kind: "tip", text: "The word of usually signals multiplication, and the word is signals equals. Reading $20\\%$ of $60$ as $0.20 \\times 60$ follows directly." },
      {
        type: "worked_example",
        prompt: "$31\\%$ of what number is $15.5$?",
        steps: [
          { action: "Work out which type this is.", why: "The percent and the part are given, and the whole is missing. That is type 3." },
          { action: "Turn the percent into a decimal.", math: "31\\% = 0.31", why: "Calculations need a decimal, not a percent sign." },
          { action: "Divide the part by it.", math: "15.5 \\div 0.31 = 50", why: "In type 3 you undo the multiplication, so you divide." },
        ],
        answer: "$50$",
      },
      { type: "callout", kind: "watch-out", text: "Multiplying instead of dividing here would give $15.5 \\times 0.31 = 4.8$, which is smaller than the part you started with. If the whole comes out smaller than the part, you have used the wrong operation." },
      { type: "checkpoint", questionIds: ["q_w997hksub10r"] },
    ],
  },
  {
    skillSlug: "percent-calculate-percent-increase-and-percent-decrease",
    title: "Percent increase and decrease",
    summary: "Work out a new amount after a rise or a fall, and find the percent change.",
    estMinutes: 8,
    blocks: [
      { type: "prose", text: "A price rise or a discount changes an amount by a percent of itself. There are two questions people ask: what is the new amount, and what was the percent change." },
      { type: "definition", term: "Finding the new amount", meaning: "Work out the change, then add it for an increase or subtract it for a decrease. Or use a single multiplier: add $25\\%$ by multiplying by $1.25$, take off $30\\%$ by multiplying by $0.70$." },
      {
        type: "worked_example",
        prompt: "A pair of shoes costs $400$ QR. The price falls by $30\\%$. What is the new price?",
        steps: [
          { action: "Work out what percent is left.", math: "100\\% - 30\\% = 70\\%", why: "Taking away $30\\%$ leaves $70\\%$ of the original." },
          { action: "Turn that into a multiplier.", math: "0.70", why: "$70\\%$ as a decimal." },
          { action: "Multiply.", math: "400 \\times 0.70 = 280", why: "One multiplication gives the new price directly." },
        ],
        answer: "$280$ QR",
      },
      { type: "definition", term: "Finding the percent change", meaning: "Divide the change by the ORIGINAL amount, then convert to a percent. The original is always the number you started from." },
      {
        type: "worked_example",
        prompt: "A price rises from $80$ to $92$. What is the percent increase?",
        steps: [
          { action: "Find the change.", math: "92 - 80 = 12", why: "The rise is the difference between the two prices." },
          { action: "Divide by the original.", math: "\\frac{12}{80} = 0.15", why: "The original price is $80$, because that is where it started." },
          { action: "Convert.", math: "0.15 = 15\\%", why: "Move the point two places right." },
        ],
        answer: "$15\\%$",
      },
      { type: "callout", kind: "common-mistake", text: "Dividing by the new amount. $\\frac{12}{92}$ gives about $13\\%$, which is wrong. Percent change is always measured against where you started." },
      { type: "callout", kind: "watch-out", text: "A $20\\%$ rise followed by a $20\\%$ fall does not return to the start. $100$ becomes $120$, then $120 \\times 0.8 = 96$. The second percent is taken from a different amount." },
      { type: "checkpoint", questionIds: ["q_3o2kr53adped"] },
    ],
  },
  {
    skillSlug: "percent-calculate-unweighted-and-weighted-averages",
    title: "Averages, plain and weighted",
    summary: "Find an ordinary average, and one where some parts count for more.",
    estMinutes: 8,
    blocks: [
      { type: "definition", term: "Average", meaning: "Add the values, then divide by how many there are. Also called the mean." },
      {
        type: "worked_example",
        prompt: "Find the average of $12$, $15$, $18$ and $19$.",
        steps: [
          { action: "Add them.", math: "12 + 15 + 18 + 19 = 64", why: "The total of all the values." },
          { action: "Divide by how many.", math: "64 \\div 4 = 16", why: "There are four values." },
        ],
        answer: "$16$",
      },
      { type: "prose", text: "Sometimes the pieces do not count equally. A final exam might be worth more of your grade than a quiz. Then you need a weighted average." },
      { type: "definition", term: "Weighted average", meaning: "Multiply each value by its weight, add those results, then divide by the total of the weights." },
      {
        type: "worked_example",
        prompt: "A course grade is $30\\%$ coursework and $70\\%$ exam. A student scores $80$ on coursework and $60$ on the exam. What is the final grade?",
        steps: [
          { action: "Multiply each score by its weight.", math: "80 \\times 0.30 = 24, \\quad 60 \\times 0.70 = 42", why: "Each score contributes in proportion to how much it counts." },
          { action: "Add the results.", math: "24 + 42 = 66", why: "This is the total contribution to the grade." },
          { action: "Check the weights.", math: "0.30 + 0.70 = 1", why: "The weights already add to $1$, so no further dividing is needed." },
        ],
        answer: "$66$",
      },
      { type: "callout", kind: "watch-out", text: "The plain average of $80$ and $60$ is $70$, which is wrong here. The exam counts for more, so the answer is pulled toward the exam score." },
      { type: "checkpoint", questionIds: ["q_4gzdgl6ni2v3"] },
    ],
  },
];
