// Survey maths on top of aggregateField: CSAT, trends over time, crosstabs with a significance check, and aggregates safe to publish.

import { displayValue } from "./logic";
import { aggregateField, answerFields, canonicalFields } from "./response-utils";

const DAY = 86_400_000;
const CROSSTAB_TYPES = new Set(["select", "dropdown", "multiselect", "picture", "multipicture", "checkbox", "consent"]);
// Fewer responses than this could identify someone from a public report.
export const MIN_SHARED_RESPONSES = 5;

// Top-two-box CSAT: the share of answers in a short scale's two best points. Longer scales aren't satisfaction ratings, so they get none.
export function csatScore(agg) {
  if ((agg?.kind !== "scale" && agg?.kind !== "opinion") || !agg.answered) return null;
  const counts = Object.values(agg.counts || {});
  if (counts.length < 3 || counts.length > 7) return null;
  const top = counts.slice(-2).reduce((sum, n) => sum + n, 0);
  return Math.round((top / agg.answered) * 100);
}

// Monthly over a long span, else weekly (weeks start Monday, in UTC so everyone sees the same buckets).
function bucketKey(time, monthly) {
  const date = new Date(time);
  if (monthly) return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  const monday = new Date(time - ((date.getUTCDay() + 6) % 7) * DAY);
  return monday.toISOString().slice(0, 10);
}

// [{ key, value, n }] oldest first: NPS for NPS fields, CSAT for short scales; null when the field has no such score.
export function fieldTrend(field, responses, fields) {
  if (!["nps", "rating", "opinion", "scale"].includes(field.type)) return null;
  const dated = responses.map((r) => ({ r, at: Date.parse(r.submittedAt ?? r.submitted_at) })).filter((x) => Number.isFinite(x.at));
  if (!dated.length) return [];
  const times = dated.map((x) => x.at);
  const monthly = Math.max(...times) - Math.min(...times) > 120 * DAY;
  const buckets = new Map();
  for (const { r, at } of dated) {
    const key = bucketKey(at, monthly);
    buckets.set(key, [...(buckets.get(key) || []), r]);
  }
  const out = [];
  for (const key of [...buckets.keys()].sort()) {
    const agg = aggregateField(field, buckets.get(key), fields);
    const value = agg.kind === "nps" ? agg.nps : csatScore(agg);
    if (agg.kind !== "nps" && !Object.values(agg.counts || {}).length) continue;
    if (agg.answered) out.push({ key, value, n: agg.answered });
  }
  return out;
}

function categories(field) {
  return field.type === "checkbox" || field.type === "consent" ? [displayValue(field, true), displayValue(field, false)] : field.options || [];
}

function picks(field, value) {
  if (value == null || value === "") return [];
  if (field.type === "checkbox" || field.type === "consent") return [displayValue(field, value)];
  return Array.isArray(value) ? value : [value];
}

export const crosstabFields = (fields) => fields.filter((f) => CROSSTAB_TYPES.has(f.type) && !f.sensitive && categories(f).length > 0);

// Pearson's test against the 5% critical value (Wilson-Hilferty). It isn't reliable with expected counts under 5, so it says so instead of answering.
function chiSquare(grid, rows, cols, rowTotals, colTotals, total) {
  const df = (rows.length - 1) * (cols.length - 1);
  if (df < 1 || !total) return { significant: false, reliable: false };
  let statistic = 0;
  let reliable = true;
  for (const row of rows) {
    for (const col of cols) {
      const expected = (rowTotals[row] * colTotals[col]) / total;
      if (expected < 5) reliable = false;
      if (expected > 0) statistic += (grid[row][col] - expected) ** 2 / expected;
    }
  }
  const critical = df * (1 - 2 / (9 * df) + 1.645 * Math.sqrt(2 / (9 * df))) ** 3;
  return { statistic: Math.round(statistic * 100) / 100, df, significant: statistic > critical, reliable };
}

// Rows × columns of two choice questions; answers outside the current options are left out, and multi-choice answers count once per pick.
export function crosstab(rowField, colField, responses) {
  const rows = categories(rowField);
  const cols = categories(colField);
  const grid = Object.fromEntries(rows.map((row) => [row, Object.fromEntries(cols.map((col) => [col, 0]))]));
  const rowTotals = Object.fromEntries(rows.map((row) => [row, 0]));
  const colTotals = Object.fromEntries(cols.map((col) => [col, 0]));
  let total = 0;
  for (const r of responses) {
    for (const row of picks(rowField, r.answers?.[rowField.id])) {
      if (!Object.hasOwn(grid, row)) continue;
      for (const col of picks(colField, r.answers?.[colField.id])) {
        if (!Object.hasOwn(colTotals, col)) continue;
        grid[row][col] += 1;
        rowTotals[row] += 1;
        colTotals[col] += 1;
        total += 1;
      }
    }
  }
  return { rows, cols, grid, rowTotals, colTotals, total, test: chiSquare(grid, rows, cols, rowTotals, colTotals, total) };
}

// Kinds that hold only counts and statistics; anything carrying respondents' own words stays out of a public report.
const SHAREABLE_KINDS = new Set(["distribution", "scale", "opinion", "nps", "matrix", "ranking", "numeric"]);
const FIELD_PROPS = ["id", "type", "title", "label"];

function publishable(agg) {
  const { field } = agg;
  const out = { ...agg, field: { ...Object.fromEntries(FIELD_PROPS.map((key) => [key, field[key]])), config: { currency: field.config?.currency } } };
  // "Other" answers are free text, so they're pooled instead of listed.
  if (agg.kind === "distribution") {
    const known = new Set(categories(field));
    const counts = {};
    let other = 0;
    for (const [label, n] of Object.entries(agg.counts)) {
      if (known.has(label)) counts[label] = n;
      else other += n;
    }
    if (other) counts.Other = other;
    out.counts = counts;
  }
  return out;
}

// What a shared report link may show: aggregates of non-sensitive, closed questions, and nothing until there are enough responses to stay anonymous.
export function sharedReport(form, responses) {
  const fields = canonicalFields(form);
  const total = responses.length;
  if (total < MIN_SHARED_RESPONSES) return { title: form.title, total, tooFew: true, aggregates: [] };
  const aggregates = answerFields(fields, { computed: true })
    .filter((f) => f.type !== "hidden" && !f.sensitive)
    .map((f) => aggregateField(f, responses, fields))
    .filter((agg) => SHAREABLE_KINDS.has(agg.kind))
    .map(publishable);
  return { title: form.title, total, tooFew: false, aggregates, currency: form.settings?.payments?.currency || "usd" };
}
