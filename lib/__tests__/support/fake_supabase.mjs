// In-memory stand-in for the service-role supabase-js client: tables, PostgREST-style filters, storage and auth, plus failure injection.
import { randomUUID } from "node:crypto";

const clone = (value) => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

const compare = {
  eq: (a, b) => a != null && String(a) === String(b),
  neq: (a, b) => a != null && String(a) !== String(b),
  gt: (a, b) => a != null && String(a) > String(b),
  gte: (a, b) => a != null && String(a) >= String(b),
  lt: (a, b) => a != null && String(a) < String(b),
  lte: (a, b) => a != null && String(a) <= String(b),
};

// jsonb @> semantics for the object and array shapes answers use.
function contains(have, want) {
  if (Array.isArray(want)) return Array.isArray(have) && want.every((w) => have.some((h) => contains(h, w)));
  if (want && typeof want === "object") return Boolean(have) && typeof have === "object" && Object.entries(want).every(([k, v]) => contains(have[k], v));
  return have === want;
}

function splitTopLevel(text) {
  const parts = [];
  let depth = 0;
  let quoted = false;
  let current = "";
  for (const ch of text) {
    if (ch === '"') quoted = !quoted;
    if (!quoted && ch === "(") depth += 1;
    if (!quoted && ch === ")") depth -= 1;
    if (!quoted && depth === 0 && ch === ",") {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  parts.push(current);
  return parts;
}

function parseTerm(term) {
  const match = /^([a-z_]+)\.(eq|neq|gt|gte|lt|lte)\.(.*)$/.exec(term);
  if (!match) throw new Error(`failed to parse logic tree (${term})`);
  const value = match[3].replace(/^"|"$/g, "");
  return (row) => compare[match[2]](row[match[1]], value);
}

// Parses PostgREST's `or=` grammar (col.op.value, and(...)) into a predicate; throws on what the server would reject.
function parseOr(expression) {
  const terms = splitTopLevel(expression).map((term) => {
    if (term.startsWith("and(") && term.endsWith(")")) {
      const inner = splitTopLevel(term.slice(4, -1)).map(parseTerm);
      return (row) => inner.every((t) => t(row));
    }
    return parseTerm(term);
  });
  return (row) => terms.some((t) => t(row));
}

class Query {
  constructor(db, key) {
    this.db = db;
    this.key = key;
    this.op = null;
    this.returning = false;
    this.options = {};
    this.predicates = [];
    this.record = { table: key, op: null, filters: [], payload: undefined, limit: null, order: [], or: null };
    this.mode = "many";
    this.parseError = null;
  }

  select(columns, options = {}) {
    if (this.op) this.returning = true;
    else {
      this.op = "select";
      this.options = options;
    }
    this.record.columns = columns;
    return this;
  }

  insert(payload) {
    this.op = "insert";
    this.record.payload = clone(payload);
    return this;
  }

  update(patch) {
    this.op = "update";
    this.record.payload = clone(patch);
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  filter(column, op, value, predicate) {
    this.record.filters.push({ column, op, value });
    this.predicates.push(predicate);
    return this;
  }

  eq(column, value) {
    return this.filter(column, "eq", value, (r) => compare.eq(r[column], value));
  }

  // Only the exact, wildcard-escaped patterns the app sends.
  ilike(column, pattern) {
    const want = String(pattern).replace(/\\([\\%_])/g, "$1").toLowerCase();
    return this.filter(column, "ilike", pattern, (r) => r[column] != null && String(r[column]).toLowerCase() === want);
  }

  neq(column, value) {
    return this.filter(column, "neq", value, (r) => compare.neq(r[column], value));
  }

  gt(column, value) {
    return this.filter(column, "gt", value, (r) => compare.gt(r[column], value));
  }

  gte(column, value) {
    return this.filter(column, "gte", value, (r) => compare.gte(r[column], value));
  }

  lt(column, value) {
    return this.filter(column, "lt", value, (r) => compare.lt(r[column], value));
  }

  lte(column, value) {
    return this.filter(column, "lte", value, (r) => compare.lte(r[column], value));
  }

  is(column, value) {
    return this.filter(column, "is", value, (r) => (value === null ? r[column] == null : r[column] === value));
  }

  in(column, values) {
    return this.filter(column, "in", values, (r) => values.includes(r[column]));
  }

  not(column, op, value) {
    if (op !== "is" || value !== null) throw new Error(`Fake Supabase: unsupported not(${op})`);
    return this.filter(column, "not.is", value, (r) => r[column] != null);
  }

  contains(column, value) {
    return this.filter(column, "contains", value, (r) => contains(r[column], value));
  }

  or(expression) {
    this.record.or = expression;
    try {
      this.predicates.push(parseOr(expression));
    } catch (e) {
      this.parseError = e.message;
    }
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.record.order.push({ column, ascending });
    return this;
  }

  limit(count) {
    this.record.limit = count;
    return this;
  }

  single() {
    this.mode = "single";
    return this;
  }

  maybeSingle() {
    this.mode = "maybe";
    return this;
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  async execute() {
    this.record.op = this.op;
    this.db.calls.push(this.record);
    const failure = this.db.takeFailure(this.key, this.op);
    if (failure) return { data: null, error: { message: failure }, count: null };
    if (this.parseError) return { data: null, error: { message: this.parseError }, count: null };
    if (this.db.beforeExecute) await this.db.beforeExecute(this.record);
    const rows = this.db.rows(this.key);
    let result;
    if (this.op === "insert") {
      const payload = this.record.payload;
      const items = (Array.isArray(payload) ? payload : [payload]).map((item) => this.db.withDefaults(this.key, item));
      rows.push(...items);
      result = items;
    } else {
      const matched = rows.filter((r) => this.predicates.every((p) => p(r)));
      if (this.op === "update") {
        matched.forEach((r) => Object.assign(r, clone(this.record.payload)));
        result = matched;
      } else if (this.op === "delete") {
        this.db.tables.set(this.key, rows.filter((r) => !matched.includes(r)));
        result = matched;
      } else {
        result = this.sorted(matched);
        if (this.record.limit != null) result = result.slice(0, this.record.limit);
      }
    }
    if (this.op === "select" && this.options.head) return { data: null, error: null, count: result.length };
    if (this.op !== "select" && !this.returning) return { data: null, error: null, count: null };
    const data = clone(result);
    if (this.mode === "many") return { data, error: null, count: this.options.count ? data.length : null };
    if (data.length > 1) return { data: null, error: { message: "more than one row" }, count: null };
    if (!data.length && this.mode === "single") return { data: null, error: { message: "no rows returned" }, count: null };
    return { data: data[0] ?? null, error: null, count: null };
  }

  sorted(rows) {
    const list = [...rows];
    for (const { column, ascending } of [...this.record.order].reverse()) {
      list.sort((a, b) => {
        const left = String(a[column] ?? "");
        const right = String(b[column] ?? "");
        const order = left < right ? -1 : left > right ? 1 : 0;
        return ascending ? order : -order;
      });
    }
    return list;
  }
}

const qualified = (table) => (table.includes(".") ? table : `forms.${table}`);

export class FakeSupabase {
  constructor() {
    this.tables = new Map();
    this.calls = [];
    this.failures = [];
    this.rpcs = {};
    this.rpcCalls = [];
    this.uploads = [];
    this.uploadError = null;
    this.users = {};
    this.beforeExecute = null;
    this.auth = { admin: { getUserById: async (id) => ({ data: { user: this.users[id] ?? null }, error: null }) } };
    this.storage = {
      from: (bucket) => ({
        upload: async (path, body, options) => {
          this.uploads.push({ bucket, path, body, options });
          return { data: this.uploadError ? null : { path }, error: this.uploadError ? { message: this.uploadError } : null };
        },
      }),
    };
  }

  schema(name) {
    return { from: (table) => new Query(this, `${name}.${table}`), rpc: (fn, args) => this.rpc(fn, args) };
  }

  from(table) {
    return new Query(this, `public.${table}`);
  }

  async rpc(name, args) {
    this.rpcCalls.push({ name, args });
    const handler = this.rpcs[name];
    return handler ? handler(args) : { data: true, error: null };
  }

  // Live rows of a table; bare names mean the `forms` schema.
  rows(table) {
    const key = qualified(table);
    if (!this.tables.has(key)) this.tables.set(key, []);
    return this.tables.get(key);
  }

  // Returns copies, so a test can compare later state against what it seeded.
  seed(table, rows) {
    const items = (Array.isArray(rows) ? rows : [rows]).map((row) => this.withDefaults(table, row));
    this.rows(table).push(...items);
    return clone(items);
  }

  withDefaults(table, row) {
    const now = new Date().toISOString();
    const base = { id: randomUUID(), created_at: now, updated_at: now, deleted_at: null };
    if (table.endsWith("responses")) base.submitted_at = now;
    return { ...base, ...clone(row) };
  }

  // Makes the next `times` matching calls fail with `message`; op null matches any operation.
  failOn(table, op, message = "boom", times = 1) {
    this.failures.push({ key: qualified(table), op, message, times });
  }

  takeFailure(key, op) {
    const failure = this.failures.find((f) => f.key === key && (!f.op || f.op === op) && f.times > 0);
    if (!failure) return null;
    failure.times -= 1;
    return failure.message;
  }

  callsTo(table, op) {
    const key = qualified(table);
    return this.calls.filter((c) => c.table === key && (!op || c.op === op));
  }
}
