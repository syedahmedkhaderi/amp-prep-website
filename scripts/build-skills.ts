import * as fs from "fs";
import * as path from "path";
import { loadScriptsEnv } from "./lib/env";

loadScriptsEnv();

/**
 * Build data/generated/skills.json, the skill taxonomy the lessons hang off.
 *
 * This supersedes the `skills[]` array inside topics.json, which was produced
 * by asking Gemini to summarise the study guide PDF. That paraphrase is fine as
 * a generation hint and wrong as a syllabus: it compresses several objectives
 * into one line, and its AMP 2 entries are empty arrays.
 *
 * The AMP 1 objectives below are transcribed verbatim from the official
 * Academic Mathematics Placement Study Guide, topics 1 to 20. Verbatim matters
 * — this is what the exam board says it tests, and a lesson that covers a
 * paraphrase of an objective is not covering the objective.
 *
 * The AMP 2 objectives are marked `derived` because no equivalent published
 * document exists for AMP 2. They are written from the topic list UDST's
 * Testing Centre publishes for it, in the same imperative style, and they are
 * the one part of this file a human should review.
 *
 *   npx tsx scripts/build-skills.ts
 */

const OUT_PATH = path.resolve(process.cwd(), "data/generated/skills.json");
const TOPICS_PATH = path.resolve(process.cwd(), "data/generated/topics.json");

/** Verbatim from the study guide, keyed by the topic slug already in topics.json. */
const AMP1: Record<string, string[]> = {
  "real-number-system": [
    "Define the various sets of the real number system",
    "Give examples that require the use of different number systems",
    "Identify the characteristics of various number sets",
    "Show the relations between the natural, whole, rational, irrational, and real numbers",
    "Use radical notation to express roots",
    "Evaluate roots of perfect squares and cubes",
    "Approximate square roots and cube roots using a calculator",
    "Place real numbers on the real number line",
  ],
  "whole-numbers-and-integers": [
    "Perform operations with whole numbers",
    "Find the factors of a whole number",
    "Determine whether a whole number is prime, composite, or neither",
    "Find the prime factorization of a number",
    "Use exponents on whole numbers",
    "Find the greatest common factor (GCF) for two or more numbers",
    "Find the lowest common multiple (LCM) for two or more numbers",
    "Use order of operations to perform calculations on integers",
    "Evaluate numerical expressions using absolute value",
  ],
  fractions: [
    "Perform operations on fractions and mixed numbers",
    "Define proper fractions, improper fractions, and mixed numbers",
    "Convert mixed numbers to improper fractions and vice versa",
    "Simplify a fraction",
    "Define reciprocal",
    "Add and subtract proper fractions, improper fractions, and mixed numbers",
    "Multiply and divide proper fractions, improper fractions, and mixed numbers",
    "Perform operations on complex fractions",
  ],
  decimals: [
    "Change a decimal to a fraction",
    "Change a decimal to a percent",
    "Identify the base units of measure for mass, volume, and length",
    "Convert from one unit of metric measure to another (kilo- to milli-range)",
    "Evaluate algebraic expressions",
    "Write a decimal number in scientific notation, and vice versa",
    "Round numbers to one or two decimal places",
  ],
  percent: [
    "Define percent",
    "Change a percent to a fraction or decimal",
    "Change a fraction or decimal to a percent",
    "Perform calculations using the three types of percent problems",
    "Calculate percent increase and percent decrease",
    "Calculate unweighted and weighted averages",
  ],
  "solving-equations": [
    "Determine whether a given number is a solution for an equation",
    "Use the addition property to solve an equation",
    "Use the division property to solve an equation",
    "Combine the addition and division properties to solve an equation",
    "Solve equations that contain brackets",
    "Solve equations that contain fractions",
    "Solve a proportion for an unknown value",
  ],
  "formula-rearrangement": ["Solve an equation or formula for a given variable"],
  "laws-of-exponents": [
    "Perform calculations with exponents",
    "Simplify expressions involving zero and positive exponents",
  ],
  "negative-exponents": [
    "Perform calculations with negative exponents",
    "Simplify expressions involving negative exponents",
  ],
  polynomials: [
    "Define polynomials",
    "Identify monomials, binomials, and trinomials",
    "Find the degree of a polynomial that has one variable",
    "Write a polynomial in descending-exponent form",
    "Add, subtract, multiply and divide polynomials",
    "Square a binomial",
  ],
  factoring: [
    "Find the greatest common factor from a polynomial",
    "Factor trinomials of the form $x^{2} + bx + c$",
    "Factor trinomials of the form $ax^{2} + bx + c$",
    "Factor a difference of squares",
    "Factor by grouping",
    "Factor a sum and a difference of cubes",
  ],
  "rational-expressions": [
    "Determine the values for which a rational algebraic expression is defined",
    "Simplify rational algebraic expressions",
    "Add, subtract, multiply and divide rational algebraic expressions",
    "Find lowest common denominator of rational algebraic expressions",
  ],
  geometry: [
    "Determine the number of significant digits of an approximate number",
    "Identify pairs of complementary angles and pairs of supplementary angles",
    "Classify angles as right, acute, obtuse, or straight",
    "Classify triangles as scalene, equilateral, right, or isosceles",
    "Use the angle-sum principle to calculate unknown angles in triangles",
    "Use the Pythagorean Theorem to calculate the unknown side lengths",
    "Find the area and perimeter of a square, rectangle, triangle, and circle",
    "Find the volume and surface area of a sphere, cone, cylinder, and prisms",
    "Recognize similar triangles and identify the corresponding parts",
    "Find the missing measures in similar triangles",
  ],
  "equation-of-the-line": [
    "Determine distance between two points",
    "Determine midpoint of a line segment",
    "Determine slope of a line including parallel and perpendicular lines",
    "Given a line, find steepness and direction of slope",
    "Graph a line given its slope and y-intercept, its slope and any point, or any two points on the line",
    "Write equation of a line from standard form to slope-intercept form and vice versa",
    "Graph a linear equation using its slope and y-intercept, its two intercepts, or a point on the line and the equation of a parallel or perpendicular line",
    "Graph horizontal and vertical lines from their equations",
    "Find the equation of a line given slope and y-intercept, slope and a point, two points, a point and a parallel or perpendicular line, or the graph of a line",
  ],
  "systems-of-equations-and-inequalities": [
    "Determine the number of solutions for a system of equations",
    "Solve a system of linear equations in two variables by graphing, elimination, or substitution",
    "Solve a system of linear inequalities in two variables by graphing",
    "Graph linear inequalities on a number line or x-y plane",
  ],
  trigonometry: [
    "Define the primary trigonometric ratios - sine, cosine, and tangent",
    "Use a calculator to determine the numerical values of the sine, cosine and tangent of angles between 0 and 90 degrees",
    "Use a primary trigonometric ratio to calculate the unknown length of one side of a right triangle",
    "Use the calculator to determine the size of an angle when the numerical value of its sine, cosine, or tangent is given",
    "Use a trigonometric ratio to calculate an unknown acute angle of a right triangle",
    "Define the secondary trigonometric ratios - cosecant, secant and cotangent",
    "Use the calculator to determine the numerical values of the cosecant, secant, and cotangent of angles between 0 and 90 degrees",
    "Define minutes and seconds as subdivisions of a degree, and convert between them and degrees",
  ],
  "data-management": [
    "Interpret data from circle graphs, histograms, bar charts, tables, scatterplots, and line graphs",
  ],
  functions: [
    "Define relations",
    "Represent relations as a set of ordered pairs, as a table of values, as a graph, or as an equation",
    "Determine the domain and range of a relation",
    "Determine if a particular relation is a function",
    "Evaluate a function at a value in its domain",
    "Describe and sketch graphs of the functions given horizontal translations, vertical translations, and vertical stretch",
    "Given $y = a(x-h)^{2} + k$ determine the coordinates of its vertex, the equation of the axis of symmetry, direction of opening, maximum or minimum point, its domain and range",
    "Change $y = ax^{2} + bx + c$ to the form $y = a(x-h)^{2} + k$",
  ],
  logarithms: [
    "Change expressions from exponential to logarithmic form and vice versa",
    "Use the laws of logarithms to rewrite expressions",
    "Use the calculator to find common logarithms",
    "Use the laws of logarithms to solve literal equations",
    "Change the form of logarithmic and exponential equations",
    "Use the calculator to find antilogarithms",
  ],
  "word-problems": [
    "Answer questions based on English simple-sentence descriptions, with or without a diagram, using the skills from all other topics",
  ],
};

/**
 * AMP 2 has no published objective list. These are written from the topic
 * scope UDST's Testing Centre publishes for AMP 2 (trigonometric functions;
 * trigonometric expressions and equations; polynomial and logarithmic
 * functions; exponential functions; inverse functions; absolute value and
 * radical equations; advanced algebra) and are flagged `derived` so a reviewer
 * can tell them apart from the transcribed AMP 1 set.
 */
const AMP2: Record<string, string[]> = {
  "advanced-algebra": [
    "Simplify complex algebraic expressions involving nested radicals and rational exponents",
    "Solve absolute value equations and inequalities",
    "Solve radical equations and identify extraneous solutions",
    "Rationalize denominators containing radicals or binomial surds",
    "Manipulate expressions with fractional and negative rational exponents",
  ],
  "quadratic-functions": [
    "Solve quadratic equations by factoring, completing the square, and the quadratic formula",
    "Use the discriminant to determine the number and nature of the roots",
    "Convert between standard, vertex, and factored form of a quadratic",
    "Identify the vertex, axis of symmetry, intercepts, and range from a quadratic",
    "Solve quadratic inequalities and express the solution in interval notation",
  ],
  "polynomial-functions": [
    "Determine end behaviour of a polynomial from its degree and leading coefficient",
    "Apply the factor theorem and remainder theorem to find roots",
    "Divide polynomials using long division and synthetic division",
    "Find all real and complex zeros of a polynomial and state their multiplicity",
    "Sketch a polynomial from its zeros, multiplicities, and end behaviour",
  ],
  "rational-functions": [
    "Determine the domain of a rational function and identify holes",
    "Find vertical asymptotes from the denominator's zeros",
    "Determine horizontal or oblique asymptotes by comparing degrees",
    "Find the intercepts of a rational function",
    "Sketch a rational function from its asymptotes and intercepts",
  ],
  "exponential-functions": [
    "Evaluate and graph exponential functions with base $e$ and other bases",
    "Determine the domain, range, and horizontal asymptote of an exponential function",
    "Solve exponential equations by matching bases",
    "Apply exponential models to growth, decay, and compound interest problems",
    "Describe transformations of an exponential graph",
  ],
  "logarithmic-functions": [
    "Convert between exponential and logarithmic form",
    "Apply the product, quotient, and power laws of logarithms",
    "Use the change of base formula",
    "Solve logarithmic equations and check for extraneous solutions",
    "Determine the domain, range, and vertical asymptote of a logarithmic function",
  ],
  "composite-inverse-functions": [
    "Form and evaluate the composition of two functions",
    "Determine the domain of a composite function",
    "Determine whether a function is one-to-one using the horizontal line test",
    "Find the inverse of a function algebraically",
    "Verify that two functions are inverses by composition",
  ],
  "analytic-trigonometry": [
    "Apply the Pythagorean, reciprocal, and quotient identities",
    "Use sum and difference identities to evaluate exact trigonometric values",
    "Apply double angle and half angle identities",
    "Verify trigonometric identities algebraically",
    "Simplify trigonometric expressions to a single function",
  ],
  "trigonometric-equations": [
    "Solve basic trigonometric equations over a given interval",
    "Solve trigonometric equations requiring factoring or an identity substitution",
    "Find the general solution of a trigonometric equation",
    "Use inverse trigonometric functions to solve for an angle",
    "Solve equations involving multiple angles such as $\\sin(2x)$",
  ],
  "trig-graphs-transformations": [
    "Determine the amplitude, period, phase shift, and vertical shift of a sinusoid",
    "Graph transformations of sine and cosine functions",
    "Graph the tangent function and identify its asymptotes",
    "Write the equation of a sinusoid from its graph",
    "Convert between degree and radian measure",
  ],
  "sequences-series": [
    "Identify arithmetic and geometric sequences and find the common difference or ratio",
    "Find the general term of an arithmetic or geometric sequence",
    "Compute the sum of a finite arithmetic or geometric series",
    "Determine whether an infinite geometric series converges and find its sum",
    "Use sigma notation to express and evaluate a series",
  ],
  "systems-matrices": [
    "Solve systems of three linear equations in three variables",
    "Perform matrix addition, subtraction, and multiplication",
    "Compute the determinant of a 2x2 and 3x3 matrix",
    "Solve a linear system using an inverse matrix or Cramer's rule",
    "Solve non-linear systems of equations",
  ],
};

/**
 * Teaching decompositions for the five topics the study guide states as a
 * single broad objective.
 *
 * "Answer questions based on English simple-sentence descriptions" is an
 * accurate description of the Word Problems section and useless as a lesson
 * plan. These break such topics into units a student can actually be taught one
 * at a time. The official objective above is kept verbatim and these are marked
 * `derived`, so the syllabus is not misrepresented — the exam still tests the
 * broad objective; this is only how the teaching is sequenced.
 */
const AMP1_TEACHING_SPLITS: Record<string, string[]> = {
  "formula-rearrangement": [
    "Isolate a variable that appears only once, using inverse operations",
    "Rearrange a formula where the target variable is inside a bracket",
    "Rearrange a formula where the target variable is in a denominator",
    "Rearrange a formula involving a power or a root",
    "Rearrange a formula where the target variable appears on both sides",
  ],
  "laws-of-exponents": [
    "Multiply powers with the same base by adding exponents",
    "Divide powers with the same base by subtracting exponents",
    "Raise a power to a power by multiplying exponents",
    "Apply an exponent to a product or a quotient",
  ],
  "negative-exponents": [
    "Rewrite a negative exponent as a reciprocal",
    "Simplify a fraction containing negative exponents in the numerator and denominator",
    "Combine the exponent laws with negative exponents in a single expression",
  ],
  "data-management": [
    "Read a value from a bar chart, line graph, or table",
    "Interpret a circle graph and convert between percentages and quantities",
    "Read and interpret a histogram, including class intervals",
    "Describe the relationship shown by a scatterplot",
    "Calculate the mean, median, mode, and range of a data set",
  ],
  "word-problems": [
    "Translate an English sentence into an algebraic equation",
    "Solve distance, rate, and time problems",
    "Solve mixture and concentration problems",
    "Solve work-rate problems",
    "Solve problems about consecutive integers and ages",
    "Solve money, discount, and interest problems",
    "Solve geometry word problems involving perimeter, area, and volume",
  ],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\$[^$]*\$/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 7)
    .join("-");
}

/** A short teaching title, distinct from the full objective sentence. */
function titleFor(objective: string): string {
  const stripped = objective.replace(/\$[^$]*\$/g, "").trim();
  const words = stripped.split(/\s+/);
  if (words.length <= 8) return stripped.replace(/\s+/g, " ");
  return words.slice(0, 8).join(" ").replace(/[,:;]$/, "");
}

function main() {
  const topicsFile = JSON.parse(fs.readFileSync(TOPICS_PATH, "utf-8"));
  const known = new Map<string, string>();
  for (const t of [...topicsFile.amp1, ...topicsFile.amp2]) known.set(t.slug, t.exam);

  const skills: any[] = [];
  const seen = new Set<string>();

  const add = (topicSlug: string, objectives: string[], source: "study-guide" | "derived") => {
    if (!known.has(topicSlug)) {
      throw new Error(`Unknown topic slug ${topicSlug} — must match topics.json`);
    }
    objectives.forEach((objective, i) => {
      let slug = `${topicSlug}-${slugify(objective)}`;
      if (slug.length > 80) slug = slug.slice(0, 80).replace(/-+$/, "");
      let unique = slug;
      let n = 2;
      while (seen.has(unique)) unique = `${slug}-${n++}`;
      seen.add(unique);
      skills.push({
        topicSlug,
        exam: known.get(topicSlug),
        name: titleFor(objective),
        slug: unique,
        orderIndex: i + 1,
        objective,
        source,
      });
    });
  };

  for (const [slug, objectives] of Object.entries(AMP1)) add(slug, objectives, "study-guide");
  for (const [slug, objectives] of Object.entries(AMP1_TEACHING_SPLITS)) add(slug, objectives, "derived");
  for (const [slug, objectives] of Object.entries(AMP2)) add(slug, objectives, "derived");

  const missing = [...known.keys()].filter((s) => !skills.some((k) => k.topicSlug === s));
  if (missing.length > 0) throw new Error(`Topics with no skills: ${missing.join(", ")}`);

  const out = {
    source: "UDST Academic Mathematics Placement Study Guide (AMP 1, verbatim); UDST Testing Centre AMP 2 scope (derived)",
    builtAt: new Date().toISOString(),
    skills,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n");

  const amp1 = skills.filter((s) => s.exam === "AMP1").length;
  const amp2 = skills.filter((s) => s.exam === "AMP2").length;
  console.log(`[skills] ${skills.length} skills (AMP1 ${amp1} verbatim, AMP2 ${amp2} derived)`);
  console.log(`[skills] across ${new Set(skills.map((s) => s.topicSlug)).size} topics`);
  console.log(`[skills] Written to ${OUT_PATH}`);
}

if (require.main === module) main();
