// Response helpers shared by the inbox, detail panel, survey report, exports and print views.
import { toCanonicalField } from "./schema";
import { displayValue, evaluateFormula, gradeQuiz, includedFields } from "./logic";
import { isInputField } from "./field-types";
import { withPrefix } from "@/lib/workspace/base-path";

const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };

// Canonical, included fields of a form (tolerates legacy builder shapes).
export function canonicalFields(form) {
  return includedFields((form?.fieldDefs || []).filter(Boolean).map(toCanonicalField));
}

// Fields that collect an answer (layout/computed blocks excluded unless asked).
export function answerFields(fields, { computed = false } = {}) {
  return (fields || []).filter((f) => isInputField(f.type) || (computed && f.type === "calculated"));
}

export function fieldLabel(field) {
  return field?.label || field?.title || field?.id || "Field";
}

// Workspace file endpoint (302 to a short-lived signed URL, access-logged).
export function responseFileUrl(responseId, path) {
  if (!path) return "";
  if (/^(data:|https?:)/.test(path)) return path;
  return withPrefix(`/api/responses/${responseId}/file?path=${encodeURIComponent(path)}`);
}

export function isEncrypted(field, response) {
  const ids = response?.metadata?.encryptedFields;
  return Boolean(field?.sensitive) || (Array.isArray(ids) && ids.includes(field?.id));
}

export function isEmptyAnswer(v) {
  if (v == null || v === "") return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.values(v).every((x) => isEmptyAnswer(x));
  return false;
}

// Display string for one answer, including computed fields.
export function answerText(field, response, fields) {
  if (field.type === "calculated") {
    const v = evaluateFormula(field.formula, fields, response.answers || {});
    return v == null ? "" : String(v);
  }
  const value = response.answers?.[field.id];
  if (field.type === "signature") return value ? `Signed${value.signedAt ? ` ${new Date(value.signedAt).toLocaleDateString()}` : ""}` : "";
  if (field.type === "repeater" && Array.isArray(value)) {
    const subs = field.config?.subFields || [];
    return value
      .map((row) => subs.map((s) => `${s.label || s.id}: ${displayValue(s, row?.[s.id])}`).filter((x) => !x.endsWith(": ")).join("; "))
      .join(" | ");
  }
  return displayValue(field, value);
}

export function outcomeLabel(outcome) {
  if (!outcome) return "";
  if (typeof outcome === "object") return outcome.outcome || outcome.name || "";
  return String(outcome);
}

// Free-text haystack: respondent, form, tags, assignee and every displayed answer.
export function responseSearchText(response, fields) {
  const parts = [response.name, response.email, response.form, response.assignee, response.outcome, ...(response.tags || [])];
  if (fields?.length) {
    for (const f of answerFields(fields)) {
      if (isEncrypted(f, response)) continue;
      parts.push(answerText(f, response, fields));
    }
  } else {
    for (const v of Object.values(response.answers || {})) parts.push(typeof v === "object" ? JSON.stringify(v) : v);
  }
  return parts.filter(Boolean).join(" ").toLowerCase();
}

// Applies the inbox filter object; `fieldsFor(formId)` returns canonical fields for answer search.
export function filterResponses(rows, filters, fieldsFor) {
  const f = filters || {};
  const q = String(f.search || "").trim().toLowerCase();
  const from = f.from ? new Date(`${f.from}T00:00:00`).getTime() : null;
  const to = f.to ? new Date(`${f.to}T23:59:59.999`).getTime() : null;
  return rows.filter((r) => {
    if (f.formId && f.formId !== "all" && r.formId !== f.formId) return false;
    if (f.status && f.status !== "all" && r.status !== f.status) return false;
    if (f.priority && f.priority !== "all" && r.priority !== f.priority) return false;
    if (f.tag && f.tag !== "all" && !(r.tags || []).includes(f.tag)) return false;
    if (f.assignee && f.assignee !== "all") {
      if (f.assignee === "__none" ? Boolean(r.assignee) : r.assignee !== f.assignee) return false;
    }
    if (f.outcome && f.outcome !== "all" && outcomeLabel(r.outcome) !== f.outcome) return false;
    const t = new Date(r.submittedAt).getTime();
    if (from != null && !(t >= from)) return false;
    if (to != null && !(t <= to)) return false;
    if (q && !responseSearchText(r, fieldsFor?.(r.formId)).includes(q)) return false;
    return true;
  });
}

export function sortResponses(rows, sort = "newest") {
  const time = (r) => new Date(r.submittedAt).getTime() || 0;
  const list = [...rows];
  if (sort === "oldest") list.sort((a, b) => time(a) - time(b));
  else if (sort === "score") list.sort((a, b) => (Number(b.score) || -Infinity) - (Number(a.score) || -Infinity) || time(b) - time(a));
  else if (sort === "priority") list.sort((a, b) => (PRIORITY_RANK[b.priority] || 0) - (PRIORITY_RANK[a.priority] || 0) || time(b) - time(a));
  else list.sort((a, b) => time(b) - time(a));
  return list;
}

// Distinct tags / assignees / outcomes across rows, sorted.
export function facetValues(rows) {
  const tags = new Set();
  const assignees = new Set();
  const outcomes = new Set();
  for (const r of rows) {
    (r.tags || []).forEach((t) => tags.add(t));
    if (r.assignee) assignees.add(r.assignee);
    const o = outcomeLabel(r.outcome);
    if (o) outcomes.add(o);
  }
  const sorted = (s) => [...s].sort((a, b) => a.localeCompare(b));
  return { tags: sorted(tags), assignees: sorted(assignees), outcomes: sorted(outcomes) };
}

// --- Survey report aggregates ------------------------------------------------

function countMap(keys) {
  return Object.fromEntries(keys.map((k) => [k, 0]));
}

function numbers(responses, id) {
  return responses
    .map((r) => r.answers?.[id])
    .filter((v) => v !== null && v !== "" && v !== undefined)
    .map(Number)
    .filter(Number.isFinite);
}

function stats(values) {
  if (!values.length) return { count: 0, min: null, max: null, avg: null };
  const sum = values.reduce((s, v) => s + v, 0);
  return { count: values.length, min: Math.min(...values), max: Math.max(...values), avg: Math.round((sum / values.length) * 100) / 100 };
}

// Per-field summary; `kind` drives the report renderer.
export function aggregateField(field, responses, fields) {
  const id = field.id;
  const answered = responses.filter((r) => !isEmptyAnswer(r.answers?.[id]));
  const base = { field, answered: answered.length, total: responses.length };
  switch (field.type) {
    case "select":
    case "dropdown":
    case "multiselect":
    case "checkbox": {
      const keys = field.type === "checkbox" ? ["Yes", "No"] : field.options || [];
      const counts = countMap(keys);
      for (const r of answered) {
        const v = r.answers[id];
        const list = field.type === "checkbox" ? [v ? "Yes" : "No"] : Array.isArray(v) ? v : [v];
        for (const item of list) counts[item] = (counts[item] || 0) + 1;
      }
      return { ...base, kind: "distribution", counts, multi: field.type === "multiselect" };
    }
    case "rating":
    case "scale": {
      const min = field.type === "rating" ? 1 : Number(field.config?.min ?? 1);
      const max = Number(field.config?.max ?? (field.type === "rating" ? 5 : 10));
      const vals = numbers(answered, id);
      const counts = {};
      for (let i = min; i <= max; i += 1) counts[i] = 0;
      vals.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
      return { ...base, kind: "scale", counts, min, max, ...stats(vals) };
    }
    case "nps": {
      const vals = numbers(answered, id);
      const promoters = vals.filter((v) => v >= 9).length;
      const passives = vals.filter((v) => v >= 7 && v <= 8).length;
      const detractors = vals.filter((v) => v <= 6).length;
      const n = vals.length || 1;
      const counts = {};
      for (let i = 0; i <= 10; i += 1) counts[i] = 0;
      vals.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
      return {
        ...base,
        kind: "nps",
        counts,
        promoters,
        passives,
        detractors,
        nps: vals.length ? Math.round(((promoters - detractors) / n) * 100) : null,
        ...stats(vals),
      };
    }
    case "matrix": {
      const rows = field.config?.rows || [];
      const cols = field.options || [];
      const grid = Object.fromEntries(rows.map((row) => [row, countMap(cols)]));
      for (const r of answered) {
        for (const [row, col] of Object.entries(r.answers[id] || {})) {
          if (!grid[row]) grid[row] = countMap(cols);
          grid[row][col] = (grid[row][col] || 0) + 1;
        }
      }
      return { ...base, kind: "matrix", rows: Object.keys(grid), cols, grid };
    }
    case "ranking": {
      const sums = {};
      const seen = {};
      for (const r of answered) {
        (r.answers[id] || []).forEach((opt, i) => {
          sums[opt] = (sums[opt] || 0) + i + 1;
          seen[opt] = (seen[opt] || 0) + 1;
        });
      }
      const items = Object.keys(sums)
        .map((opt) => ({ option: opt, avg: Math.round((sums[opt] / seen[opt]) * 100) / 100 }))
        .sort((a, b) => a.avg - b.avg);
      return { ...base, kind: "ranking", items };
    }
    case "number":
    case "currency":
    case "product":
      return { ...base, kind: "numeric", ...stats(numbers(answered, id)) };
    case "calculated": {
      const vals = responses.map((r) => evaluateFormula(field.formula, fields, r.answers || {})).filter((v) => Number.isFinite(v));
      return { ...base, answered: vals.length, kind: "numeric", ...stats(vals) };
    }
    case "text":
    case "textarea":
    case "email":
    case "phone":
    case "url":
    case "name":
    case "address":
    case "date":
    case "time":
    case "datetime":
    case "booking":
    case "hidden": {
      const latest = [...answered]
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 8)
        .map((r) => ({ id: r.id, name: r.name, at: r.submittedAt, text: displayValue(field, r.answers[id]) }));
      return { ...base, kind: "text", latest };
    }
    default:
      return { ...base, kind: "count" };
  }
}

// Quiz summary: average %, pass rate and per-question correct rate.
export function quizSummary(form, responses) {
  if (!form?.settings?.quiz?.enabled) return null;
  const fields = canonicalFields(form);
  const graded = { ...form, fieldDefs: fields };
  const perField = {};
  const percents = [];
  let passed = 0;
  for (const r of responses) {
    const q = gradeQuiz(graded, r.answers || {});
    if (!q) continue;
    const pct = Number(r.metadata?.quiz?.percent ?? q.percent);
    percents.push(pct);
    if (r.metadata?.quiz?.passed ?? q.passed) passed += 1;
    for (const [fid, ok] of Object.entries(q.results || {})) {
      perField[fid] = perField[fid] || { correct: 0, total: 0 };
      perField[fid].total += 1;
      if (ok) perField[fid].correct += 1;
    }
  }
  if (!percents.length) return { graded: 0, avg: null, passRate: null, questions: [] };
  return {
    graded: percents.length,
    avg: Math.round(percents.reduce((s, p) => s + p, 0) / percents.length),
    passRate: Math.round((passed / percents.length) * 100),
    questions: fields
      .filter((f) => perField[f.id])
      .map((f) => ({ field: f, rate: Math.round((perField[f.id].correct / perField[f.id].total) * 100), ...perField[f.id] })),
  };
}
