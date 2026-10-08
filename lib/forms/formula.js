// Safe formula evaluator for calculated fields — a tokenizer + recursive-descent parser, never eval().
// Grammar: ternary-free expressions with + - * / %, comparisons, && || !, parentheses,
// {Field Title} / {field-id} references, and functions IF SUM MIN MAX AVG ROUND ABS DAYS LEN.

const FUNCTIONS = {
  IF: (c, a, b) => (truthy(c) ? a : b ?? 0),
  SUM: (...xs) => xs.flat().reduce((s, x) => s + num(x), 0),
  MIN: (...xs) => Math.min(...xs.flat().map(num)),
  MAX: (...xs) => Math.max(...xs.flat().map(num)),
  AVG: (...xs) => {
    const list = xs.flat().map(num);
    return list.length ? list.reduce((s, x) => s + x, 0) / list.length : 0;
  },
  ROUND: (x, places = 0) => {
    const f = 10 ** num(places);
    return Math.round(num(x) * f) / f;
  },
  ABS: (x) => Math.abs(num(x)),
  DAYS: (a, b) => Math.round((toDays(a) - toDays(b)) || 0),
  LEN: (x) => (Array.isArray(x) ? x.length : String(x ?? "").length),
};

function num(x) {
  if (typeof x === "boolean") return x ? 1 : 0;
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function truthy(x) {
  return typeof x === "string" ? x !== "" && x !== "0" : Boolean(num(x));
}

function toDays(x) {
  if (typeof x === "number") return x;
  const t = Date.parse(String(x ?? ""));
  return Number.isNaN(t) ? 0 : t / 86_400_000;
}

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i += 1; continue; }
    if (ch === "{") {
      const end = src.indexOf("}", i);
      if (end === -1) throw new Error("Unclosed reference");
      tokens.push({ t: "ref", v: src.slice(i + 1, end).trim() });
      i = end + 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const end = src.indexOf(ch, i + 1);
      if (end === -1) throw new Error("Unclosed string");
      tokens.push({ t: "str", v: src.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    const numMatch = /^\d+(\.\d+)?/.exec(src.slice(i));
    if (numMatch) {
      tokens.push({ t: "num", v: Number(numMatch[0]) });
      i += numMatch[0].length;
      continue;
    }
    const idMatch = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (idMatch) {
      tokens.push({ t: "id", v: idMatch[0].toUpperCase() });
      i += idMatch[0].length;
      continue;
    }
    const two = src.slice(i, i + 2);
    if ([">=", "<=", "==", "!=", "&&", "||"].includes(two)) {
      tokens.push({ t: "op", v: two });
      i += 2;
      continue;
    }
    if ("+-*/%()<>!,=".includes(ch)) {
      tokens.push({ t: "op", v: ch === "=" ? "==" : ch });
      i += 1;
      continue;
    }
    throw new Error(`Unexpected "${ch}"`);
  }
  return tokens;
}

function parse(tokens, resolve) {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (v) => {
    const tok = tokens[pos];
    if (!tok || tok.v !== v) throw new Error(`Expected ${v}`);
    pos += 1;
  };

  const primary = () => {
    const tok = tokens[pos++];
    if (!tok) throw new Error("Unexpected end");
    if (tok.t === "num" || tok.t === "str") return tok.v;
    if (tok.t === "ref") return resolve(tok.v);
    if (tok.t === "id") {
      if (tok.v === "TRUE") return 1;
      if (tok.v === "FALSE") return 0;
      const fn = FUNCTIONS[tok.v];
      if (!fn) throw new Error(`Unknown function ${tok.v}`);
      eat("(");
      const args = [];
      if (peek()?.v !== ")") {
        args.push(or());
        while (peek()?.v === ",") { pos += 1; args.push(or()); }
      }
      eat(")");
      return fn(...args);
    }
    if (tok.v === "(") {
      const v = or();
      eat(")");
      return v;
    }
    if (tok.v === "-") return -num(unary());
    if (tok.v === "+") return num(unary());
    if (tok.v === "!") return truthy(unary()) ? 0 : 1;
    throw new Error(`Unexpected ${tok.v}`);
  };
  const unary = () => primary();
  const mul = () => {
    let v = unary();
    while (["*", "/", "%"].includes(peek()?.v)) {
      const op = tokens[pos++].v;
      const r = num(unary());
      v = op === "*" ? num(v) * r : op === "/" ? (r === 0 ? 0 : num(v) / r) : num(v) % r;
    }
    return v;
  };
  const add = () => {
    let v = mul();
    while (["+", "-"].includes(peek()?.v)) {
      const op = tokens[pos++].v;
      const r = mul();
      v = op === "+" ? num(v) + num(r) : num(v) - num(r);
    }
    return v;
  };
  const cmp = () => {
    let v = add();
    while (["<", ">", "<=", ">=", "==", "!="].includes(peek()?.v)) {
      const op = tokens[pos++].v;
      const r = add();
      const bothNum = Number.isFinite(Number(v)) && Number.isFinite(Number(r)) && v !== "" && r !== "";
      const a = bothNum ? Number(v) : String(v).toLowerCase();
      const b = bothNum ? Number(r) : String(r).toLowerCase();
      v = { "<": a < b, ">": a > b, "<=": a <= b, ">=": a >= b, "==": a === b, "!=": a !== b }[op] ? 1 : 0;
    }
    return v;
  };
  const and = () => {
    let v = cmp();
    while (peek()?.v === "&&") { pos += 1; const r = cmp(); v = truthy(v) && truthy(r) ? 1 : 0; }
    return v;
  };
  const or = () => {
    let v = and();
    while (peek()?.v === "||") { pos += 1; const r = and(); v = truthy(v) || truthy(r) ? 1 : 0; }
    return v;
  };

  const result = or();
  if (pos < tokens.length) throw new Error("Unexpected trailing input");
  return result;
}

// Normalise legacy symbols (×, ÷, −, x between operands) before tokenizing.
function prepare(formula) {
  return String(formula)
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/(\d|\})\s+x\s+(\d|\{)/gi, "$1 * $2");
}

// `resolve(name)` maps a reference to a value; returns a rounded number, or null on error.
export function evaluateExpression(formula, resolve) {
  if (!formula || !String(formula).trim()) return null;
  try {
    const value = parse(tokenize(prepare(formula)), resolve);
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  } catch {
    return null;
  }
}

// Returns an error message for an invalid formula, or null when it parses.
export function checkFormula(formula, resolve = () => 0) {
  if (!formula || !String(formula).trim()) return null;
  try {
    parse(tokenize(prepare(formula)), resolve);
    return null;
  } catch (e) {
    return e.message || "Invalid formula";
  }
}
