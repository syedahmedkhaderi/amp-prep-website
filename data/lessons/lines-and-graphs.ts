import type { LessonSource } from "./types";

/**
 * Equation of the Line, Functions and Geometry.
 *
 * These are the lessons that need pictures. Slope is a shape before it is a
 * formula, a parabola's vertex is a place on a graph, and a mensuration
 * question is much easier to read with the figure labelled.
 */
export const linesAndGraphsLessons: LessonSource[] = [
  {
    skillSlug: "equation-of-the-line-determine-slope-of-a-line-including-parallel",
    title: "Slope: how steep a line is",
    summary: "Measure the steepness of a line from two points on it.",
    estMinutes: 8,
    blocks: [
      {
        type: "prose",
        text: "Slope is a number that says how steep a line is, and which way it tilts. A big number means a steep line. A small number means a nearly flat line.",
      },
      {
        type: "definition",
        term: "Slope",
        meaning:
          "How far the line goes up, divided by how far it goes across. People often say rise over run. Rise is the change in $y$, and run is the change in $x$.",
      },
      {
        type: "graph",
        spec: {
          kind: "cartesian",
          description: "A straight line rising from left to right through the points (1, 2) and (4, 8).",
          viewport: { xMin: -1, xMax: 8, yMin: -1, yMax: 10 },
          curves: [{ fn: "2x", label: "y = 2x" }],
          points: [
            { x: 1, y: 2, label: "(1, 2)" },
            { x: 4, y: 8, label: "(4, 8)" },
          ],
          segments: [
            { from: { x: 1, y: 2 }, to: { x: 4, y: 2 }, dashed: true, label: "run" },
            { from: { x: 4, y: 2 }, to: { x: 4, y: 8 }, dashed: true, label: "rise" },
          ],
        },
        caption: "Going from $(1, 2)$ to $(4, 8)$: the run is $3$ across, and the rise is $6$ up.",
      },
      {
        type: "prose",
        text: "In the picture the line goes across $3$ and up $6$. So the slope is $6$ divided by $3$, which is $2$. Every time the line moves 1 step right, it climbs 2 steps up.",
      },
      {
        type: "prose",
        text: "The formula just writes that down. If the two points are $(x_1, y_1)$ and $(x_2, y_2)$, then the slope $m$ is:",
      },
      {
        type: "definition",
        term: "Slope formula",
        meaning:
          "$m = \\frac{y_2 - y_1}{x_2 - x_1}$. The small numbers below the letters are labels, not multiplication. $y_1$ just means the $y$ of the first point.",
      },
      {
        type: "worked_example",
        prompt: "Find the slope of the line through $(2, 3)$ and $(6, 11)$.",
        steps: [
          {
            action: "Name the points.",
            math: "(x_1, y_1) = (2, 3), \\quad (x_2, y_2) = (6, 11)",
            why: "Deciding which point is first keeps the subtraction consistent in the next two steps.",
          },
          {
            action: "Subtract the $y$ values to get the rise.",
            math: "11 - 3 = 8",
            why: "This is how far the line climbs between the two points.",
          },
          {
            action: "Subtract the $x$ values in the same order to get the run.",
            math: "6 - 2 = 4",
            why: "The order must match the top. Doing $11 - 3$ on top but $2 - 6$ underneath would flip the sign and give the wrong answer.",
          },
          {
            action: "Divide.",
            math: "m = \\frac{8}{4} = 2",
            why: "Rise divided by run is the slope.",
          },
        ],
        answer: "$m = 2$",
      },
      {
        type: "callout",
        kind: "watch-out",
        text: "Subtract in the same order top and bottom. Either $\\frac{11-3}{6-2}$ or $\\frac{3-11}{2-6}$ gives $2$. Mixing them gives $-2$, which is a line tilting the other way.",
      },
      {
        type: "prose",
        text: "The sign of the slope tells you the direction. A positive slope rises from left to right. A negative slope falls. A horizontal line has slope $0$, because it never rises. A vertical line has no slope at all, because the run is $0$ and dividing by zero is not possible.",
      },
      {
        type: "graph",
        spec: {
          kind: "cartesian",
          description: "Three lines through the origin: one rising steeply, one rising gently, and one falling.",
          viewport: { xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
          curves: [
            { fn: "2x", label: "m = 2", color: "primary" },
            { fn: "0.5x", label: "m = 0.5", color: "accent" },
            { fn: "-x", label: "m = -1", color: "muted", dashed: true },
          ],
        },
        caption: "Steeper lines have a bigger slope. A falling line has a negative slope.",
      },
      {
        type: "prose",
        text: "Two more facts come up often. Parallel lines have the same slope, because they tilt identically. Perpendicular lines, which cross at a right angle, have slopes that multiply to $-1$. So a line perpendicular to one with slope $2$ has slope $-\\frac{1}{2}$.",
      },
      { type: "checkpoint", questionIds: ["q_a8hn0p73ilqh"] },
    ],
  },

  {
    skillSlug: "functions-given-determine-the-coordinates-of-its-vertex",
    title: "Reading a parabola from vertex form",
    summary: "Find the vertex, the line of symmetry and which way a parabola opens.",
    estMinutes: 9,
    blocks: [
      {
        type: "prose",
        text: "A parabola is the U shaped curve you get from squaring. When its equation is written in vertex form, you can read almost everything about it without doing any calculation.",
      },
      {
        type: "definition",
        term: "Vertex form",
        meaning:
          "$y = a(x - h)^{2} + k$. The vertex, which is the turning point of the U, sits at the point $(h, k)$. The number $a$ controls how wide the curve is and whether it opens upwards or downwards.",
      },
      {
        type: "graph",
        spec: {
          kind: "cartesian",
          description: "A parabola with its lowest point at (2, -3), opening upwards.",
          viewport: { xMin: -3, xMax: 7, yMin: -5, yMax: 8 },
          curves: [{ fn: "(x-2)^2-3", label: "y = (x-2)^2 - 3" }],
          points: [{ x: 2, y: -3, label: "vertex (2, -3)" }],
          segments: [{ from: { x: 2, y: -5 }, to: { x: 2, y: 8 }, dashed: true }],
        },
        caption: "The dashed line $x = 2$ is the axis of symmetry. The curve is a mirror image across it.",
      },
      {
        type: "callout",
        kind: "watch-out",
        text: "The sign of $h$ flips. In $y = (x - 2)^{2} - 3$ the vertex is at $x = 2$, not $-2$. The form has a minus sign built into it, so $(x - 2)$ means $h = 2$, and $(x + 5)$ means $h = -5$.",
      },
      {
        type: "worked_example",
        prompt: "For $y = -2(x + 1)^{2} + 8$, find the vertex, the axis of symmetry, the direction of opening, and the maximum or minimum value.",
        steps: [
          {
            action: "Match the equation to $y = a(x - h)^{2} + k$.",
            math: "a = -2, \\quad h = -1, \\quad k = 8",
            why: "The bracket reads $(x + 1)$, which is $(x - (-1))$, so $h$ is $-1$.",
          },
          {
            action: "Read the vertex straight off as $(h, k)$.",
            math: "(-1, 8)",
            why: "That is what vertex form is for. No calculation is needed.",
          },
          {
            action: "Write the axis of symmetry.",
            math: "x = -1",
            why: "The axis of symmetry is always the vertical line through the vertex, so it is $x = h$.",
          },
          {
            action: "Look at the sign of $a$.",
            math: "a = -2 < 0",
            why: "A negative $a$ turns the U upside down, so the curve opens downwards.",
          },
          {
            action: "Decide whether the vertex is a maximum or a minimum.",
            why: "Because the curve opens downwards, the vertex is the highest point. So $8$ is the maximum value, reached at $x = -1$.",
          },
        ],
        answer: "Vertex $(-1, 8)$, axis of symmetry $x = -1$, opens downwards, maximum value $8$.",
      },
      {
        type: "prose",
        text: "The size of $a$ changes the width. A larger number squeezes the curve narrower. A number between $0$ and $1$ stretches it wider.",
      },
      {
        type: "interactive",
        spec: {
          kind: "interactive",
          fn: "a*(x-h)^2+k",
          reference: "x^2",
          equationTemplate: "$y = {a}(x - {h})^{2} + {k}$",
          viewport: { xMin: -8, xMax: 8, yMin: -8, yMax: 8 },
          description: "A parabola whose stretch, horizontal shift and vertical shift can each be changed with a slider.",
          sliders: [
            { name: "a", label: "$a$ (stretch, flips if negative)", min: -3, max: 3, step: 0.5, initial: 1 },
            { name: "h", label: "$h$ (moves left and right)", min: -5, max: 5, step: 1, initial: 0 },
            { name: "k", label: "$k$ (moves up and down)", min: -5, max: 5, step: 1, initial: 0 },
          ],
        },
        caption: "Drag $h$ and watch the vertex slide. It moves the same way as the number, even though the form has a minus sign in it.",
      },
      { type: "checkpoint", questionIds: ["q_32qoiyh8r0ba"] },
    ],
  },

  {
    skillSlug: "geometry-use-the-pythagorean-theorem-to-calculate-the",
    title: "The Pythagorean theorem",
    summary: "Find a missing side of a right triangle.",
    estMinutes: 7,
    blocks: [
      {
        type: "prose",
        text: "A right triangle is one with a square corner, an angle of exactly $90$ degrees. In any right triangle the three sides are linked by one rule, and that rule lets you find a missing side from the other two.",
      },
      {
        type: "definition",
        term: "Hypotenuse",
        meaning:
          "The side opposite the right angle. It is always the longest side of a right triangle. In the formula it is the letter on its own.",
      },
      {
        type: "diagram",
        spec: {
          kind: "triangle",
          rightAngleAt: 0,
          sides: ["b = 4", "a = 3", "c = ?"],
          description: "A right triangle with the right angle at the bottom left, legs of 3 and 4, and the hypotenuse unknown.",
        },
        caption: "The two short sides are the legs. The slanted side opposite the square corner is the hypotenuse.",
      },
      {
        type: "definition",
        term: "Pythagorean theorem",
        meaning: "$a^{2} + b^{2} = c^{2}$, where $a$ and $b$ are the two legs and $c$ is the hypotenuse.",
      },
      {
        type: "worked_example",
        prompt: "A right triangle has legs of $3$ cm and $4$ cm. How long is the hypotenuse?",
        steps: [
          {
            action: "Write the theorem and put the known lengths in.",
            math: "3^{2} + 4^{2} = c^{2}",
            why: "The two given sides are the legs, because the hypotenuse is the unknown one opposite the right angle.",
          },
          {
            action: "Square each number.",
            math: "9 + 16 = c^{2}",
            why: "Squaring means multiplying a number by itself: $3 \\times 3 = 9$ and $4 \\times 4 = 16$.",
          },
          {
            action: "Add.",
            math: "25 = c^{2}",
            why: "This is the square of the hypotenuse, not the hypotenuse itself. One step remains.",
          },
          {
            action: "Take the square root of both sides.",
            math: "c = \\sqrt{25} = 5",
            why: "The square root undoes the squaring, leaving the actual length.",
          },
        ],
        answer: "$5$ cm",
      },
      {
        type: "callout",
        kind: "common-mistake",
        text: "Stopping at $25$ is the most common slip. $c^{2} = 25$ means the hypotenuse squared is $25$, so the hypotenuse is $\\sqrt{25} = 5$. Always finish with the square root.",
      },
      {
        type: "prose",
        text: "The same rule finds a leg. If you know the hypotenuse and one leg, subtract instead of adding: $a^{2} = c^{2} - b^{2}$. The hypotenuse is always the one on its own, whichever side you are looking for.",
      },
      { type: "checkpoint", questionIds: ["q_ihrynrbjil6k"] },
    ],
  },
];
