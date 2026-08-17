/**
 * A small, safe arithmetic expression parser and evaluator.
 *
 * Lesson graphs are authored as strings ("x^2-3", "a(x-h)^2+k") and rendered on
 * the server, so the evaluator has to be safe against content it did not write:
 * there is no `eval` and no `Function` constructor anywhere in this module. Every
 * identifier is resolved at *parse* time against a closed allowlist, which means
 * something like `constructor` or `process` is a syntax error the offline lesson
 * verifier catches without ever running the expression.
 *
 * Two invariants the rest of the graphing code relies on:
 *
 *   1. Parsing throws `ExpressionSyntaxError` (and nothing else) on bad input.
 *   2. Evaluation never throws. Undefined points return `NaN`, which is what the
 *      plotter breaks its polylines on.
 *
 * Documented choices, because both are genuinely ambiguous:
 *
 *   - `log` is base 10 and `ln` is natural, matching the AMP study guide and every
 *     calculator a student will sit the exam with. `log10` is accepted as a synonym
 *     of `log` so authored content can be explicit when it wants to be.
 *   - Implicit multiplication binds at the same precedence as `*` and associates
 *     left, so `1/2x` is `(1/2)*x`, not `1/(2x)`. `2x^2` is `2*(x^2)` because `^`
 *     binds tighter than multiplication either way.
 *
 * Scientific notation is deliberately not supported: `e` is Euler's number here, so
 * `2e` means `2*e` and `1e3` means `1*e*3`. Allowing both would make `2e` ambiguous.
 */

/** Longest expression we will parse. Server-rendered, so it needs an upper bound. */
const MAX_SOURCE_LENGTH = 512;

/** Deepest AST we will build. The evaluator recurses, so depth is the real limit. */
const MAX_DEPTH = 64;

export class ExpressionSyntaxError extends Error {
  /** 1-based character position, so the message reads the way an author counts. */
  readonly position: number;
  readonly source: string;

  constructor(message: string, position: number, source: string) {
    super(`${message} at position ${position} in "${source}"`);
    this.name = "ExpressionSyntaxError";
    this.position = position;
    this.source = source;
  }
}

export type ExpressionNode =
  | { kind: "number"; value: number }
  | { kind: "variable"; name: string }
  | { kind: "unary"; op: "-" | "+"; arg: ExpressionNode }
  | { kind: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: ExpressionNode; right: ExpressionNode }
  | { kind: "call"; fn: string; arg: ExpressionNode };

export interface ParsedExpression {
  readonly source: string;
  readonly ast: ExpressionNode;
  /** Free variables actually used, e.g. `x` and any declared parameters. */
  readonly variables: ReadonlySet<string>;
}

export interface ParseOptions {
  /**
   * Named parameters the expression may reference in addition to `x`, e.g. the
   * `a`, `h`, `k` of a slider plot. Anything not listed here and not a known
   * function or constant is a syntax error.
   */
  parameters?: readonly string[];
  /** Set false for expressions that must not depend on `x`. Defaults to true. */
  allowX?: boolean;
}

export type ExpressionScope = Readonly<Record<string, number>>;

/**
 * Unary functions, in a Map rather than an object literal so that a lookup of
 * `constructor` or `__proto__` misses instead of walking Object.prototype.
 */
const FUNCTIONS = new Map<string, (v: number) => number>([
  ["sin", Math.sin],
  ["cos", Math.cos],
  ["tan", Math.tan],
  ["asin", Math.asin],
  ["acos", Math.acos],
  ["atan", Math.atan],
  ["sinh", Math.sinh],
  ["cosh", Math.cosh],
  ["tanh", Math.tanh],
  ["exp", Math.exp],
  ["abs", Math.abs],
  ["floor", Math.floor],
  ["ceil", Math.ceil],
  // Domain guards, so an undefined point is NaN rather than -Infinity.
  ["sqrt", (v) => (v >= 0 ? Math.sqrt(v) : NaN)],
  ["ln", (v) => (v > 0 ? Math.log(v) : NaN)],
  ["log", (v) => (v > 0 ? Math.log10(v) : NaN)],
  ["log10", (v) => (v > 0 ? Math.log10(v) : NaN)],
]);

const CONSTANTS = new Map<string, number>([
  ["pi", Math.PI],
  ["e", Math.E],
]);

export const EXPRESSION_FUNCTIONS: readonly string[] = [...FUNCTIONS.keys()];
export const EXPRESSION_CONSTANTS: readonly string[] = [...CONSTANTS.keys()];

type BinaryOp = "+" | "-" | "*" | "/" | "^";

interface OpInfo {
  precedence: number;
  rightAssociative: boolean;
}

/**
 * Unary minus sits *below* `^` so that `-x^2` is `-(x^2)`, which is what every
 * textbook means by it, and above `*` so `-2*3` groups the obvious way.
 */
const UNARY_PRECEDENCE = 3;

const BINARY_OPS = new Map<BinaryOp, OpInfo>([
  ["+", { precedence: 1, rightAssociative: false }],
  ["-", { precedence: 1, rightAssociative: false }],
  ["*", { precedence: 2, rightAssociative: false }],
  ["/", { precedence: 2, rightAssociative: false }],
  // Right-associative, so 2^3^2 is 2^(3^2) = 512.
  ["^", { precedence: 4, rightAssociative: true }],
]);

type Token =
  | { type: "number"; value: number; pos: number }
  | { type: "name"; value: string; pos: number }
  | { type: "op"; value: BinaryOp; pos: number }
  | { type: "lparen"; pos: number }
  | { type: "rparen"; pos: number };

const DIGIT = /[0-9]/;
const NAME_START = /[A-Za-z]/;
const NAME_PART = /[A-Za-z0-9_]/;

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i += 1;
      continue;
    }

    if (DIGIT.test(ch) || (ch === "." && DIGIT.test(source[i + 1] ?? ""))) {
      const start = i;
      let seenDot = false;
      while (i < source.length && (DIGIT.test(source[i]) || source[i] === ".")) {
        if (source[i] === ".") {
          if (seenDot) {
            throw new ExpressionSyntaxError("malformed number", i + 1, source);
          }
          seenDot = true;
        }
        i += 1;
      }
      const text = source.slice(start, i);
      const value = Number(text);
      if (!Number.isFinite(value)) {
        throw new ExpressionSyntaxError(`malformed number "${text}"`, start + 1, source);
      }
      tokens.push({ type: "number", value, pos: start });
      continue;
    }

    if (NAME_START.test(ch)) {
      const start = i;
      while (i < source.length && NAME_PART.test(source[i])) i += 1;
      tokens.push({ type: "name", value: source.slice(start, i), pos: start });
      continue;
    }

    if (ch === "(") {
      tokens.push({ type: "lparen", pos: i });
      i += 1;
      continue;
    }

    if (ch === ")") {
      tokens.push({ type: "rparen", pos: i });
      i += 1;
      continue;
    }

    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "^") {
      tokens.push({ type: "op", value: ch, pos: i });
      i += 1;
      continue;
    }

    throw new ExpressionSyntaxError(`unexpected character "${ch}"`, i + 1, source);
  }

  return tokens;
}

/** Operator-stack entries for the shunting-yard loop. */
type PendingOp =
  | { type: "binary"; op: BinaryOp; precedence: number; rightAssociative: boolean; pos: number }
  | { type: "unary"; op: "-" | "+"; precedence: number; rightAssociative: true; pos: number }
  | { type: "call"; fn: string; pos: number }
  | { type: "lparen"; pos: number };

function depthOf(node: ExpressionNode): number {
  switch (node.kind) {
    case "number":
    case "variable":
      return 1;
    case "unary":
      return 1 + depthOf(node.arg);
    case "call":
      return 1 + depthOf(node.arg);
    case "binary":
      return 1 + Math.max(depthOf(node.left), depthOf(node.right));
  }
}

/**
 * Parse `source` into an AST, resolving every identifier as it goes.
 *
 * @throws {ExpressionSyntaxError} on any malformed or unrecognised input.
 */
export function parseExpression(source: string, options: ParseOptions = {}): ParsedExpression {
  if (typeof source !== "string") {
    throw new ExpressionSyntaxError("expression must be a string", 1, String(source));
  }
  if (source.length > MAX_SOURCE_LENGTH) {
    throw new ExpressionSyntaxError(
      `expression is longer than ${MAX_SOURCE_LENGTH} characters`,
      MAX_SOURCE_LENGTH,
      source.slice(0, 40)
    );
  }
  if (source.trim() === "") {
    throw new ExpressionSyntaxError("expression is empty", 1, source);
  }

  const allowX = options.allowX !== false;
  const parameters = new Set(options.parameters ?? []);
  const variables = new Set<string>();

  const tokens = tokenize(source);
  const output: ExpressionNode[] = [];
  const operators: PendingOp[] = [];

  function fail(message: string, pos: number): never {
    throw new ExpressionSyntaxError(message, pos + 1, source);
  }

  function popOperand(pos: number): ExpressionNode {
    const node = output.pop();
    if (!node) fail("missing operand", pos);
    return node;
  }

  function applyTop(): void {
    const op = operators.pop();
    if (!op) return;
    if (op.type === "lparen") fail("unmatched \"(\"", op.pos);
    if (op.type === "unary") {
      output.push({ kind: "unary", op: op.op, arg: popOperand(op.pos) });
      return;
    }
    if (op.type === "call") {
      output.push({ kind: "call", fn: op.fn, arg: popOperand(op.pos) });
      return;
    }
    const right = popOperand(op.pos);
    const left = popOperand(op.pos);
    output.push({ kind: "binary", op: op.op, left, right });
  }

  function pushBinary(op: BinaryOp, pos: number): void {
    const info = BINARY_OPS.get(op)!;
    while (operators.length > 0) {
      const top = operators[operators.length - 1];
      if (top.type === "lparen") break;
      if (top.type === "call") break;
      const shouldPop = info.rightAssociative
        ? top.precedence > info.precedence
        : top.precedence >= info.precedence;
      if (!shouldPop) break;
      applyTop();
    }
    operators.push({
      type: "binary",
      op,
      precedence: info.precedence,
      rightAssociative: info.rightAssociative,
      pos,
    });
  }

  let expectOperand = true;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    // Implicit multiplication: an operand where an operator was expected means
    // the author wrote 2x, 3(x+1) or (x+1)(x-1). Inject a `*` and fall through.
    if (
      !expectOperand &&
      (token.type === "number" || token.type === "name" || token.type === "lparen")
    ) {
      pushBinary("*", token.pos);
      expectOperand = true;
    }

    if (expectOperand) {
      switch (token.type) {
        case "number":
          output.push({ kind: "number", value: token.value });
          expectOperand = false;
          break;

        case "name": {
          const name = token.value;
          if (FUNCTIONS.has(name)) {
            const next = tokens[index + 1];
            if (!next || next.type !== "lparen") {
              fail(`function "${name}" needs parentheses, e.g. ${name}(x)`, token.pos);
            }
            operators.push({ type: "call", fn: name, pos: token.pos });
            break; // still expecting an operand: the "(" comes next
          }
          const constant = CONSTANTS.get(name);
          if (constant !== undefined) {
            output.push({ kind: "number", value: constant });
            expectOperand = false;
            break;
          }
          if ((name === "x" && allowX) || parameters.has(name)) {
            variables.add(name);
            output.push({ kind: "variable", name });
            expectOperand = false;
            break;
          }
          fail(`unknown name "${name}"`, token.pos);
          break;
        }

        case "lparen":
          operators.push({ type: "lparen", pos: token.pos });
          break;

        case "op":
          if (token.value === "-" || token.value === "+") {
            operators.push({
              type: "unary",
              op: token.value,
              precedence: UNARY_PRECEDENCE,
              rightAssociative: true,
              pos: token.pos,
            });
          } else {
            fail(`operator "${token.value}" needs a value before it`, token.pos);
          }
          break;

        case "rparen":
          fail('unexpected ")"', token.pos);
          break;
      }
      continue;
    }

    switch (token.type) {
      case "op":
        pushBinary(token.value, token.pos);
        expectOperand = true;
        break;

      case "rparen": {
        let matched = false;
        while (operators.length > 0) {
          const top = operators[operators.length - 1];
          if (top.type === "lparen") {
            operators.pop();
            matched = true;
            break;
          }
          applyTop();
        }
        if (!matched) fail('unmatched ")"', token.pos);
        if (operators.length > 0 && operators[operators.length - 1].type === "call") {
          applyTop();
        }
        break;
      }

      default:
        fail("unexpected value", token.pos);
    }
  }

  if (expectOperand) {
    throw new ExpressionSyntaxError("expression ends early", source.length, source);
  }

  while (operators.length > 0) {
    const top = operators[operators.length - 1];
    if (top.type === "lparen") fail('unclosed "("', top.pos);
    applyTop();
  }

  if (output.length !== 1) {
    throw new ExpressionSyntaxError("could not parse expression", source.length, source);
  }

  const ast = output[0];
  if (depthOf(ast) > MAX_DEPTH) {
    throw new ExpressionSyntaxError(`expression nests deeper than ${MAX_DEPTH} levels`, 1, source);
  }

  return { source, ast, variables };
}

const hasOwn = Object.prototype.hasOwnProperty;

function evaluateNode(node: ExpressionNode, scope: ExpressionScope): number {
  switch (node.kind) {
    case "number":
      return node.value;

    case "variable": {
      if (!hasOwn.call(scope, node.name)) return NaN;
      const value = scope[node.name];
      return typeof value === "number" ? value : NaN;
    }

    case "unary": {
      const value = evaluateNode(node.arg, scope);
      return node.op === "-" ? -value : value;
    }

    case "call": {
      const fn = FUNCTIONS.get(node.fn);
      if (!fn) return NaN;
      return fn(evaluateNode(node.arg, scope));
    }

    case "binary": {
      const left = evaluateNode(node.left, scope);
      const right = evaluateNode(node.right, scope);
      switch (node.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          // Undefined, not infinite: the plotter treats NaN as "break the line".
          return right === 0 ? NaN : left / right;
        case "^":
          return Math.pow(left, right);
      }
    }
  }
}

/**
 * Evaluate a parsed expression. Never throws.
 *
 * Non-finite results are normalised to `NaN` at the boundary so callers have a
 * single "no value here" sentinel. Intermediate infinities are left alone, so
 * `1/exp(1000)` still collapses to 0 the way the maths says it should.
 */
export function evaluateExpression(
  expression: ParsedExpression | ExpressionNode,
  scope: ExpressionScope = {}
): number {
  const ast = "ast" in expression ? expression.ast : expression;
  const result = evaluateNode(ast, scope);
  return Number.isFinite(result) ? result : NaN;
}

export interface CompiledExpression {
  readonly source: string;
  readonly variables: ReadonlySet<string>;
  /** Evaluate against a scope of named values. Never throws; returns NaN. */
  evaluate(scope?: ExpressionScope): number;
  /** Convenience for the common single-variable case. */
  at(x: number): number;
}

/**
 * Parse once, evaluate many times. This is what the sampler uses, because a plot
 * evaluates the same expression several hundred times across its domain.
 *
 * @throws {ExpressionSyntaxError} if the source does not parse.
 */
export function compileExpression(source: string, options: ParseOptions = {}): CompiledExpression {
  const parsed = parseExpression(source, options);
  // One reused scope object: sampling a curve allocates nothing per point.
  const singleScope: Record<string, number> = { x: 0 };

  return {
    source: parsed.source,
    variables: parsed.variables,
    evaluate(scope: ExpressionScope = {}) {
      return evaluateExpression(parsed, scope);
    },
    at(x: number) {
      singleScope.x = x;
      return evaluateExpression(parsed, singleScope);
    },
  };
}
