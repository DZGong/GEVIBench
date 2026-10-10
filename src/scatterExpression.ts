// Tiny arithmetic-expression language for custom Performance Scatter axes, e.g.
//   dff_AP * sqrt(brightness)
// A hand-written recursive-descent parser (never `eval`/`Function`), so an expression
// typed by a visitor can only ever read metric values and do arithmetic.
//
// Grammar (lowest → highest precedence):
//   expr    := term (('+' | '-') term)*
//   term    := unary (('*' | '/') unary)*
//   unary   := ('-' | '+') unary | power
//   power   := primary ('^' unary)?          (right-associative, binds tighter than unary minus on the left: -x^2 = -(x^2))
//   primary := number | ident | ident '(' expr (',' expr)* ')' | '(' expr ')'
// `×`, `·`, `÷`, `−` and `√` are accepted as typed aliases.

export type Expr =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'neg'; arg: Expr }
  | { kind: 'bin'; op: '+' | '-' | '*' | '/' | '^'; left: Expr; right: Expr }
  | { kind: 'call'; fn: string; args: Expr[] };

export const FUNCTIONS: Record<string, { arity: number | [number, number]; apply: (...a: number[]) => number }> = {
  sqrt:  { arity: 1, apply: Math.sqrt },
  log10: { arity: 1, apply: Math.log10 },
  log:   { arity: 1, apply: Math.log10 },
  ln:    { arity: 1, apply: Math.log },
  exp:   { arity: 1, apply: Math.exp },
  abs:   { arity: 1, apply: Math.abs },
  pow:   { arity: 2, apply: Math.pow },
  min:   { arity: [2, 8], apply: Math.min },
  max:   { arity: [2, 8], apply: Math.max },
};

export class ExprError extends Error {
  constructor(message: string, public pos: number) { super(message); }
}

type Tok = { t: 'num'; v: number; pos: number } | { t: 'id'; v: string; pos: number } | { t: 'op'; v: string; pos: number };

function tokenize(src: string): Tok[] {
  // One-for-one character aliases, so token positions still index into `src`.
  const s = src.replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  const toks: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '√') { toks.push({ t: 'id', v: 'sqrt', pos: i }); i++; continue; }
    const num = s.slice(i).match(/^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/);
    if (num) { toks.push({ t: 'num', v: parseFloat(num[0]), pos: i }); i += num[0].length; continue; }
    const id = s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (id) { toks.push({ t: 'id', v: id[0], pos: i }); i += id[0].length; continue; }
    if ('+-*/^(),'.includes(c)) { toks.push({ t: 'op', v: c, pos: i }); i++; continue; }
    throw new ExprError(`Unexpected character “${c}”`, i);
  }
  return toks;
}

/** Parse an expression; `variables` is the set of allowed metric names. */
export function parseExpr(src: string, variables: Set<string>): Expr {
  const toks = tokenize(src);
  if (!toks.length) throw new ExprError('Enter an expression', 0);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v;
  const endPos = src.length;

  const expect = (v: string) => {
    if (!isOp(v)) throw new ExprError(`Expected “${v}”`, peek()?.pos ?? endPos);
    p++;
  };

  const expr = (): Expr => {
    let left = term();
    while (isOp('+') || isOp('-')) {
      const op = toks[p++].v as '+' | '-';
      left = { kind: 'bin', op, left, right: term() };
    }
    return left;
  };
  const term = (): Expr => {
    let left = unary();
    while (isOp('*') || isOp('/')) {
      const op = toks[p++].v as '*' | '/';
      left = { kind: 'bin', op, left, right: unary() };
    }
    return left;
  };
  const unary = (): Expr => {
    if (isOp('-')) { p++; return { kind: 'neg', arg: unary() }; }
    if (isOp('+')) { p++; return unary(); }
    return power();
  };
  const power = (): Expr => {
    const base = primary();
    if (isOp('^')) { p++; return { kind: 'bin', op: '^', left: base, right: unary() }; }
    return base;
  };
  const primary = (): Expr => {
    const tok = peek();
    if (!tok) throw new ExprError('Expression ends unexpectedly', endPos);
    if (tok.t === 'num') { p++; return { kind: 'num', value: tok.v }; }
    if (tok.t === 'id') {
      p++;
      if (isOp('(')) {
        const fn = FUNCTIONS[tok.v];
        if (!fn) throw new ExprError(`Unknown function “${tok.v}”`, tok.pos);
        p++;
        const args = [expr()];
        while (isOp(',')) { p++; args.push(expr()); }
        expect(')');
        const [lo, hi] = Array.isArray(fn.arity) ? fn.arity : [fn.arity, fn.arity];
        if (args.length < lo || args.length > hi) {
          throw new ExprError(`${tok.v}() takes ${lo === hi ? lo : `${lo}–${hi}`} argument${hi === 1 ? '' : 's'}`, tok.pos);
        }
        return { kind: 'call', fn: tok.v, args };
      }
      if (!variables.has(tok.v)) {
        throw new ExprError(FUNCTIONS[tok.v] ? `${tok.v} needs parentheses, e.g. ${tok.v}(x)` : `Unknown metric “${tok.v}”`, tok.pos);
      }
      return { kind: 'var', name: tok.v };
    }
    if (tok.v === '(') { p++; const e = expr(); expect(')'); return e; }
    throw new ExprError(`Unexpected “${tok.v}”`, tok.pos);
  };

  const tree = expr();
  if (p < toks.length) throw new ExprError(`Unexpected “${toks[p].v}”`, toks[p].pos);
  return tree;
}

/** Evaluate; returns null when a metric is missing or the result is not a finite number. */
export function evalExpr(e: Expr, vars: (name: string) => number | null): number | null {
  const go = (n: Expr): number | null => {
    switch (n.kind) {
      case 'num': return n.value;
      case 'var': return vars(n.name);
      case 'neg': { const a = go(n.arg); return a == null ? null : -a; }
      case 'bin': {
        const a = go(n.left), b = go(n.right);
        if (a == null || b == null) return null;
        switch (n.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return a / b;
          case '^': return Math.pow(a, b);
        }
        return null;
      }
      case 'call': {
        const args: number[] = [];
        for (const x of n.args) { const v = go(x); if (v == null) return null; args.push(v); }
        return FUNCTIONS[n.fn].apply(...args);
      }
    }
  };
  const v = go(e);
  return v != null && Number.isFinite(v) ? v : null;
}

/** Metric names referenced by an expression. */
export function exprVariables(e: Expr, out = new Set<string>()): Set<string> {
  if (e.kind === 'var') out.add(e.name);
  else if (e.kind === 'neg') exprVariables(e.arg, out);
  else if (e.kind === 'bin') { exprVariables(e.left, out); exprVariables(e.right, out); }
  else if (e.kind === 'call') e.args.forEach(a => exprVariables(a, out));
  return out;
}

const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 };

/**
 * Print an expression for display, substituting each metric's short label
 * (e.g. dff_AP → "ΔF/F per AP") and using ×, ÷, √ symbols. Parentheses are only
 * kept where precedence needs them.
 */
export function formatExpr(e: Expr, label: (name: string) => string): string {
  const go = (n: Expr, parentPrec: number): string => {
    switch (n.kind) {
      case 'num': return String(n.value);
      case 'var': return label(n.name);
      case 'neg': return `−${go(n.arg, 3)}`;
      case 'call': {
        const inner = n.args.map(a => go(a, 0)).join(', ');
        return n.fn === 'sqrt' ? `√(${inner})` : `${n.fn}(${inner})`;
      }
      case 'bin': {
        const prec = PREC[n.op];
        const sym = n.op === '*' ? ' × ' : n.op === '/' ? ' ÷ ' : n.op === '-' ? ' − ' : n.op === '^' ? '^' : ' + ';
        // '^' is right-associative; the others are left-associative.
        const l = go(n.left, n.op === '^' ? prec + 1 : prec);
        const r = go(n.right, n.op === '^' ? prec : prec + 1);
        const s = `${l}${sym}${r}`;
        return prec < parentPrec ? `(${s})` : s;
      }
    }
  };
  return go(e, 0);
}
