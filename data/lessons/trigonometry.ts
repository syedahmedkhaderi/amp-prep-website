import type { LessonSource } from "./types";

/** Trigonometry: the ratios, using them both ways, and degree subdivisions. */
export const trigonometryLessons: LessonSource[] = [
  {
    skillSlug: "trigonometry-define-the-primary-trigonometric-ratios-sine-cosine",
    title: "Sine, cosine and tangent",
    summary: "Learn the three ratios and which sides they use.",
    estMinutes: 8,
    blocks: [
      { type: "prose", text: "In a right triangle, the three sides have names that depend on which angle you are looking at." },
      { type: "definition", term: "The three sides", meaning: "The hypotenuse is opposite the right angle and is always the longest. The opposite side is across from the angle you are working with. The adjacent side is next to that angle and is not the hypotenuse." },
      {
        type: "diagram",
        spec: { kind: "triangle", rightAngleAt: 0, sides: ["adjacent", "opposite", "hypotenuse"], angles: ["", "θ", ""], description: "A right triangle labelled with the opposite side, adjacent side and hypotenuse relative to the marked angle." },
        caption: "Opposite and adjacent swap over if you look at the other angle. The hypotenuse never changes.",
      },
      { type: "definition", term: "The three ratios", meaning: "$\\sin\\theta = \\frac{\\text{opposite}}{\\text{hypotenuse}}$, $\\cos\\theta = \\frac{\\text{adjacent}}{\\text{hypotenuse}}$, $\\tan\\theta = \\frac{\\text{opposite}}{\\text{adjacent}}$." },
      { type: "callout", kind: "tip", text: "The word SOH CAH TOA holds all three. Sine is Opposite over Hypotenuse, Cosine is Adjacent over Hypotenuse, Tangent is Opposite over Adjacent." },
      {
        type: "worked_example",
        prompt: "A right triangle has opposite $3$, adjacent $4$ and hypotenuse $5$. Find all three ratios for that angle.",
        steps: [
          { action: "Sine uses opposite over hypotenuse.", math: "\\sin\\theta = \\frac{3}{5} = 0.6", why: "Take the two named sides in the right order." },
          { action: "Cosine uses adjacent over hypotenuse.", math: "\\cos\\theta = \\frac{4}{5} = 0.8", why: "Same hypotenuse, different top." },
          { action: "Tangent uses opposite over adjacent.", math: "\\tan\\theta = \\frac{3}{4} = 0.75", why: "This one does not use the hypotenuse at all." },
        ],
        answer: "$\\sin\\theta = 0.6$, $\\cos\\theta = 0.8$, $\\tan\\theta = 0.75$",
      },
      { type: "callout", kind: "watch-out", text: "Sine and cosine can never be greater than $1$, because the hypotenuse is the longest side. If you get $1.4$, you have used the wrong side on the bottom." },
      { type: "checkpoint", questionIds: ["q_06iv5vxy0oj9"] },
    ],
  },
  {
    skillSlug: "trigonometry-use-a-calculator-to-determine-the-numerical",
    title: "Getting trig values from a calculator",
    summary: "Find sine, cosine and tangent of an angle, with the calculator set correctly.",
    estMinutes: 5,
    blocks: [
      { type: "callout", kind: "watch-out", text: "Check your calculator is in degree mode before anything else. Look for DEG on the screen. In radian mode $\\sin 30$ gives $-0.988$ instead of $0.5$, and every answer will be wrong." },
      { type: "prose", text: "With the mode set, press the function key, type the angle, and press equals." },
      {
        type: "worked_example",
        prompt: "Find $\\sin 30^{\\circ}$, $\\cos 60^{\\circ}$ and $\\tan 45^{\\circ}$.",
        steps: [
          { action: "Check DEG is showing.", why: "Every answer depends on this being right." },
          { action: "Enter each one.", math: "\\sin 30 = 0.5, \\quad \\cos 60 = 0.5, \\quad \\tan 45 = 1", why: "These three are worth memorising as a check that your calculator is behaving." },
        ],
        answer: "$0.5$, $0.5$ and $1$",
      },
      { type: "callout", kind: "tip", text: "If $\\tan 45^{\\circ}$ does not give exactly $1$, your calculator is in the wrong mode. It is the fastest test there is." },
      { type: "checkpoint", questionIds: ["q_0enn5co6s7wy"] },
    ],
  },
  {
    skillSlug: "trigonometry-use-a-primary-trigonometric-ratio-to-calculate",
    title: "Finding a missing side",
    summary: "Use a trig ratio to work out an unknown length.",
    estMinutes: 8,
    blocks: [
      { type: "prose", text: "When you know one angle and one side of a right triangle, you can find any other side." },
      { type: "definition", term: "The method", meaning: "Label the sides relative to the known angle. Pick the ratio that uses the side you know and the side you want. Substitute and solve." },
      {
        type: "worked_example",
        prompt: "A right triangle has an angle of $35^{\\circ}$ and a hypotenuse of $12$ cm. Find the side opposite the angle.",
        steps: [
          { action: "Note which sides are involved.", why: "You have the hypotenuse and want the opposite. Sine is the ratio that links those two." },
          { action: "Write the ratio.", math: "\\sin 35^{\\circ} = \\frac{x}{12}", why: "Sine is opposite over hypotenuse, and the opposite side is the unknown $x$." },
          { action: "Multiply both sides by $12$.", math: "x = 12 \\sin 35^{\\circ}", why: "This gets $x$ on its own." },
          { action: "Work it out.", math: "12 \\times 0.5736 \\approx 6.88", why: "Use the calculator in degree mode." },
        ],
        answer: "About $6.88$ cm",
      },
      { type: "callout", kind: "tip", text: "Check the answer is sensible. The opposite side must be shorter than the hypotenuse, and $6.88$ is less than $12$, so this passes." },
      { type: "callout", kind: "watch-out", text: "When the unknown is on the bottom, the last step is a division. From $\\cos 40^{\\circ} = \\frac{5}{x}$ you get $x = \\frac{5}{\\cos 40^{\\circ}}$, not $5\\cos 40^{\\circ}$." },
      { type: "checkpoint", questionIds: ["q_19behvhsuaq4"] },
    ],
  },
  {
    skillSlug: "trigonometry-use-the-calculator-to-determine-the-size",
    title: "Finding an angle from a ratio",
    summary: "Use the inverse trig keys to go from a ratio back to an angle.",
    estMinutes: 6,
    blocks: [
      { type: "prose", text: "The sine key turns an angle into a ratio. To go the other way, you need the inverse key." },
      { type: "definition", term: "Inverse trig functions", meaning: "Written $\\sin^{-1}$, $\\cos^{-1}$ and $\\tan^{-1}$. They take a ratio and give back the angle. On most calculators they are the shift function above the ordinary keys." },
      { type: "callout", kind: "watch-out", text: "The $-1$ here is not an exponent. $\\sin^{-1}(0.5)$ means the angle whose sine is $0.5$, which is $30^{\\circ}$. It does not mean $\\frac{1}{\\sin 0.5}$." },
      {
        type: "worked_example",
        prompt: "Find the angle whose cosine is $0.8$, to one decimal place.",
        steps: [
          { action: "Write what you want.", math: "\\theta = \\cos^{-1}(0.8)", why: "You have the ratio and want the angle, so the inverse is needed." },
          { action: "Enter it in degree mode.", math: "\\approx 36.9", why: "Shift then cos, then $0.8$." },
        ],
        answer: "About $36.9^{\\circ}$",
      },
      { type: "checkpoint", questionIds: ["q_1bcjynh5oayp"] },
    ],
  },
  {
    skillSlug: "trigonometry-use-a-trigonometric-ratio-to-calculate-an",
    title: "Finding an angle from two sides",
    summary: "Choose the right ratio when two sides are known.",
    estMinutes: 7,
    blocks: [
      { type: "prose", text: "If you know two sides of a right triangle, you can find either acute angle. Pick the ratio that uses the two sides you have." },
      {
        type: "worked_example",
        prompt: "A right triangle has an opposite side of $7$ and an adjacent side of $10$ for angle $\\theta$. Find $\\theta$.",
        steps: [
          { action: "Note which sides you have.", why: "Opposite and adjacent. Tangent is the ratio that uses exactly those two." },
          { action: "Write the ratio.", math: "\\tan\\theta = \\frac{7}{10} = 0.7", why: "Tangent is opposite over adjacent." },
          { action: "Apply the inverse.", math: "\\theta = \\tan^{-1}(0.7)", why: "You have the ratio and want the angle." },
          { action: "Calculate.", math: "\\approx 35.0^{\\circ}", why: "In degree mode." },
        ],
        answer: "About $35.0^{\\circ}$",
      },
      { type: "callout", kind: "tip", text: "Sanity check with the sides. The opposite is shorter than the adjacent here, so the angle should be under $45^{\\circ}$. It is." },
      { type: "checkpoint", questionIds: ["q_4cogqlv6mb7i"] },
    ],
  },
  {
    skillSlug: "trigonometry-define-the-secondary-trigonometric-ratios-cosecant-secant",
    title: "Cosecant, secant and cotangent",
    summary: "Learn the three reciprocal ratios and which is paired with which.",
    estMinutes: 6,
    blocks: [
      { type: "prose", text: "Each of the three main ratios has a partner that is simply one over it." },
      { type: "definition", term: "The three reciprocals", meaning: "$\\csc\\theta = \\frac{1}{\\sin\\theta}$, $\\sec\\theta = \\frac{1}{\\cos\\theta}$, $\\cot\\theta = \\frac{1}{\\tan\\theta}$." },
      { type: "callout", kind: "watch-out", text: "The pairings are not what the names suggest. Secant goes with cosine, and cosecant goes with sine. Look at the third letter: se-C-ant pairs with Cosine, co-S-ecant pairs with Sine." },
      { type: "prose", text: "Calculators have no buttons for these. Work out the main ratio, then press the reciprocal key." },
      {
        type: "worked_example",
        prompt: "Find $\\sec 60^{\\circ}$.",
        steps: [
          { action: "Identify the partner.", why: "Secant pairs with cosine, so start with $\\cos 60^{\\circ}$." },
          { action: "Find the cosine.", math: "\\cos 60^{\\circ} = 0.5", why: "Straight from the calculator." },
          { action: "Take one over it.", math: "\\frac{1}{0.5} = 2", why: "Secant is the reciprocal of cosine." },
        ],
        answer: "$2$",
      },
      { type: "checkpoint", questionIds: ["q_4rkhgbuimn8v"] },
    ],
  },
  {
    skillSlug: "trigonometry-use-the-calculator-to-determine-the-numerical",
    title: "Reciprocal ratios on a calculator",
    summary: "Work out cosecant, secant and cotangent values, and reverse them.",
    estMinutes: 5,
    blocks: [
      { type: "prose", text: "There are no keys for these. So each one takes two steps." },
      {
        type: "worked_example",
        prompt: "Find $\\cot 25^{\\circ}$, to three decimal places.",
        steps: [
          { action: "Find the tangent first.", math: "\\tan 25^{\\circ} \\approx 0.4663", why: "Cotangent is the reciprocal of tangent." },
          { action: "Take one over it.", math: "\\frac{1}{0.4663} \\approx 2.145", why: "Use the reciprocal key. Retyping the number would lose accuracy." },
        ],
        answer: "About $2.145$",
      },
      { type: "prose", text: "To go back to an angle, flip the value first. If $\\csc\\theta = 2$, then $\\sin\\theta = 0.5$. So $\\theta = 30^{\\circ}$." },
      { type: "callout", kind: "tip", text: "Do not round the middle value. Rounding $0.4663$ to $0.47$ changes the third decimal place of the answer." },
      { type: "checkpoint", questionIds: ["q_4vyaccyc37w7"] },
    ],
  },
  {
    skillSlug: "trigonometry-define-minutes-and-seconds-as-subdivisions-of",
    title: "Degrees, minutes and seconds",
    summary: "Convert between decimal degrees and minutes and seconds.",
    estMinutes: 6,
    blocks: [
      { type: "prose", text: "An angle can be written with a decimal, or split into smaller units in the same way as time." },
      { type: "definition", term: "Minutes and seconds", meaning: "One degree is $60$ minutes, written $60'$. One minute is $60$ seconds, written $60''$. So $1^{\\circ} = 60' = 3600''$." },
      {
        type: "worked_example",
        prompt: "Convert $32.5^{\\circ}$ to degrees and minutes.",
        steps: [
          { action: "Keep the whole degrees.", math: "32^{\\circ}", why: "The whole number part stays as it is." },
          { action: "Multiply the decimal part by $60$.", math: "0.5 \\times 60 = 30", why: "There are $60$ minutes in a degree, so half a degree is $30$ minutes." },
        ],
        answer: "$32^{\\circ} 30'$",
      },
      {
        type: "worked_example",
        prompt: "Convert $45^{\\circ} 15'$ to decimal degrees.",
        steps: [
          { action: "Divide the minutes by $60$.", math: "\\frac{15}{60} = 0.25", why: "Going the other way, so divide instead of multiply." },
          { action: "Add to the whole degrees.", math: "45 + 0.25 = 45.25", why: "The decimal part is the minutes expressed as a fraction of a degree." },
        ],
        answer: "$45.25^{\\circ}$",
      },
      { type: "callout", kind: "tip", text: "Multiply to break a degree down into minutes. Divide to build minutes back up into a degree. It is the same as hours and minutes on a clock." },
      { type: "checkpoint", questionIds: ["q_56n58954gori"] },
    ],
  },
];
