/**
 * Topic, question, and paper type definitions used by the generation pipeline
 * and the seed script.
 */

export type QType = "single_mcq" | "multi_mcq" | "matching" | "fill_blank" | "numeric";
export type Difficulty = "easy" | "medium" | "hard";
export type ExamCode = "AMP1" | "AMP2";

export interface SkillOutline {
  name: string;
  description: string;
}

export interface TopicOutline {
  index: number;
  name: string;
  slug: string;
  exam: ExamCode;
  description: string;
  skills: SkillOutline[];
  difficultySpread: { easy: number; medium: number; hard: number };
}

export interface TopicsFile {
  source: string;
  parsedAt: string;
  amp1: TopicOutline[];
  amp2: TopicOutline[];
}

export interface GeneratedOption {
  content: string;
  is_correct: boolean;
}

export interface GeneratedNumericAnswer {
  value: number;
  tolerance: number;
  accepted: string[];
}

export interface GeneratedMatch {
  left_content: string;
  correct_choice_index: number;
  order_index: number;
}

export interface GeneratedQuestion {
  id: string;
  exam: ExamCode;
  topic_slug: string;
  type: QType;
  difficulty: Difficulty;
  stem: string;
  options?: GeneratedOption[];
  matches?: GeneratedMatch[];
  match_choices?: string[];
  numeric_answer?: GeneratedNumericAnswer;
  final_answer: string;
  explanation_steps: string[];
  distractor_rationales: Record<string, string>;
  concept_summary: string;
}

export interface VerifiedQuestion extends GeneratedQuestion {
  verified: boolean;
  verificationNotes?: string;
  needsReview?: boolean;
}

/**
 * Default topic list from the spec, used as the baseline if PDF parsing
 * fails or as a cross check against the parsed outline.
 */
export const DEFAULT_AMP1_TOPICS: { name: string; slug: string; description: string }[] = [
  { name: "Arithmetic and Order of Operations", slug: "arithmetic-order-operations", description: "Integers, operations, and the correct order of evaluating expressions." },
  { name: "Fractions and Mixed Numbers", slug: "fractions-mixed-numbers", description: "Operations with fractions, mixed numbers, and conversions." },
  { name: "Decimals and Rounding", slug: "decimals-rounding", description: "Decimal arithmetic, place value, and rounding rules." },
  { name: "Ratios, Proportions, and Rates", slug: "ratios-proportions-rates", description: "Ratio, proportion, unit rate, and scaling problems." },
  { name: "Percentages and Percentage Change", slug: "percentages", description: "Percent of a quantity, increase and decrease, and applications." },
  { name: "Exponents and Powers", slug: "exponents-powers", description: "Laws of exponents, negative and zero exponents." },
  { name: "Roots and Radicals", slug: "roots-radicals", description: "Square and cube roots, simplification of radical expressions." },
  { name: "Scientific Notation", slug: "scientific-notation", description: "Conversion, arithmetic, and comparison in scientific notation." },
  { name: "Algebraic Expressions", slug: "algebraic-expressions", description: "Simplifying, expanding, and evaluating algebraic expressions." },
  { name: "Linear Equations in One Variable", slug: "linear-equations-one-variable", description: "Solving single variable linear equations." },
  { name: "Linear Inequalities", slug: "linear-inequalities", description: "Solving and graphing linear inequalities." },
  { name: "Systems of Linear Equations", slug: "systems-linear-equations", description: "Two equation systems solved by substitution and elimination." },
  { name: "Polynomials", slug: "polynomials", description: "Addition, subtraction, multiplication of polynomials." },
  { slug: "factoring", name: "Factoring", description: "Common factor, grouping, trinomials, and difference of squares." },
  { slug: "rational-expressions", name: "Rational Expressions", description: "Simplifying and operating on algebraic fractions." },
  { slug: "coordinate-geometry-lines", name: "Coordinate Geometry and Lines", description: "Slope, distance, midpoint, and equations of lines." },
  { slug: "functions-basics", name: "Functions and Notation", description: "Function notation, domain, range, and evaluation." },
  { slug: "measurement-geometry", name: "Perimeter, Area, and Volume", description: "Plane and solid measurement, composite shapes." },
  { slug: "right-triangle-trig", name: "Right Triangle Trigonometry", description: "Pythagorean theorem, sine, cosine, tangent ratios." },
  { slug: "statistics-probability", name: "Statistics and Probability", description: "Mean, median, mode, and basic probability, word problems." },
];

export const DEFAULT_AMP2_TOPICS: { name: string; slug: string; description: string }[] = [
  { slug: "advanced-algebra", name: "Advanced Algebraic Manipulation", description: "Complex equations and algebraic identities." },
  { slug: "quadratic-functions", name: "Quadratic Functions", description: "Quadratic formula, vertex, discriminant, and graphs." },
  { slug: "polynomial-functions", name: "Polynomial Functions", description: "Roots, end behavior, and graphs of polynomials." },
  { slug: "rational-functions", name: "Rational Functions and Asymptotes", description: "Vertical, horizontal, and oblique asymptotes." },
  { slug: "exponential-functions", name: "Exponential Functions", description: "Growth, decay, and solving exponential equations." },
  { slug: "logarithmic-functions", name: "Logarithmic Functions", description: "Properties of logarithms and logarithmic equations." },
  { slug: "composite-inverse-functions", name: "Composite and Inverse Functions", description: "Composing functions and finding inverses." },
  { slug: "analytic-trigonometry", name: "Analytic Trigonometry and Identities", description: "Fundamental, sum, difference, and double angle identities." },
  { slug: "trigonometric-equations", name: "Trigonometric Equations", description: "Solving trigonometric equations over intervals." },
  { slug: "trig-graphs-transformations", name: "Graphs of Trigonometric Functions", description: "Amplitude, period, phase shift, and transformations." },
  { slug: "sequences-series", name: "Sequences and Series", description: "Arithmetic and geometric sequences, sigma notation, series." },
  { slug: "systems-matrices", name: "Systems and Matrices", description: "Matrix operations and solving systems with matrices." },
];
