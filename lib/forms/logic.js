// Shared form logic — runs identically in the filler (client) and the submit route (server).
// Covers conditional visibility, pages, validation, numeric coercion, formulas, scoring,
// quiz grading, named outcomes, order totals, merge tags and display formatting.
import { evaluateExpression } from "./formula";
import { getFieldType, hasOptions, isInputField } from "./field-types";

// --- Conditions -------------------------------------------------------------

export const CONDITION_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Does not equal" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
  { value: "starts_with", label: "Starts with" },
  { value: "is_empty", label: "Is empty" },
  { value: "is_not_empty", label: "Is not empty" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "At least" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "At most" },
];

const LEGACY_OPERATORS = {
  Equals: "equals",
  "Does Not Equal": "not_equals",
  Contains: "contains",
  "Is Empty": "is_empty",
};

export function normalizeOperator(op) {
  return LEGACY_OPERATORS[op] || op || "equals";
}

export function operatorNeedsValue(op) {
  const o = normalizeOperator(op);
  return o !== "is_empty" && o !== "is_not_empty";
}

function isEmptyValue(v) {
  if (v == null || v === false) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.values(v).every((x) => isEmptyValue(x));
  return String(v).trim() === "";
}

function textOf(v) {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(textOf).join(", ");
  if (typeof v === "object") return Object.values(v).map(textOf).filter(Boolean).join(" ");
  return String(v);
}

export function evaluateCondition(cond, answers) {
  const op = normalizeOperator(cond.operator);
  const raw = answers?.[cond.fieldId];
  const expected = String(cond.value ?? "").toLowerCase().trim();
  if (op === "is_empty") return isEmptyValue(raw);
  if (op === "is_not_empty") return !isEmptyValue(raw);
  // Multi-value answers match when any entry matches.
  const values = Array.isArray(raw) ? raw.map((x) => textOf(x).toLowerCase().trim()) : [textOf(raw).toLowerCase().trim()];
  const numeric = Number(textOf(raw));
  switch (op) {
    case "equals":
      return values.some((v) => v === expected);
    case "not_equals":
      return values.every((v) => v !== expected);
    case "contains":
      return values.some((v) => v.includes(expected));
    case "not_contains":
      return values.every((v) => !v.includes(expected));
    case "starts_with":
      return values.some((v) => v.startsWith(expected));
    case "gt":
      return Number.isFinite(numeric) && numeric > Number(expected);
    case "gte":
      return Number.isFinite(numeric) && numeric >= Number(expected);
    case "lt":
      return Number.isFinite(numeric) && numeric < Number(expected);
    case "lte":
      return Number.isFinite(numeric) && numeric <= Number(expected);
    default:
      return true;
  }
}

// Conditions combine with `logic` ("any" = OR, the legacy default; "all" = AND).
export function matchesConditions(conditions, logic, answers) {
  const list = (conditions || []).filter((c) => c && c.fieldId);
  if (list.length === 0) return true;
  return logic === "all"
    ? list.every((c) => evaluateCondition(c, answers))
    : list.some((c) => evaluateCondition(c, answers));
}

// --- Pages & visibility -----------------------------------------------------

export function includedFields(fields) {
  return (fields || []).filter((f) => f && f.included !== false);
}

// Splits fields into pages at `page` breaks. A page break's own conditions skip its whole page.
export function splitPages(fields, firstTitle = "") {
  const pages = [{ id: "page-0", title: firstTitle, break: null, fields: [] }];
  for (const field of includedFields(fields)) {
    if (field.type === "page") {
      pages.push({ id: field.id, title: field.title || `Page ${pages.length + 1}`, break: field, fields: [] });
    } else {
      pages[pages.length - 1].fields.push(field);
    }
  }
  return pages.filter((p, i) => i === 0 || p.fields.length > 0 || p.break);
}

// Visible field ids in order. Hidden fields' answers are ignored downstream so conditions cascade.
export function visibleFieldIds(fields, answers) {
  const visible = new Set();
  // Earlier hidden fields are blanked so conditions cascade; later fields read raw answers.
  const effective = { ...(answers || {}) };
  let pageVisible = true;
  for (const field of includedFields(fields)) {
    if (field.type === "page") {
      pageVisible = matchesConditions(field.conditions, field.conditionLogic, effective);
      if (pageVisible) visible.add(field.id);
      continue;
    }
    const shown = pageVisible && (field.type === "hidden" || matchesConditions(field.conditions, field.conditionLogic, effective));
    if (shown) visible.add(field.id);
    else effective[field.id] = undefined;
    // Calculated values become condition sources for later fields.
    if (shown && field.type === "calculated") effective[field.id] = evaluateFormula(field.formula, fields, effective);
  }
  return visible;
}

export function isFieldVisible(field, answers, allFields) {
  if (!allFields) return matchesConditions(field.conditions, field.conditionLogic, answers || {});
  return visibleFieldIds(allFields, answers).has(field.id);
}

// Pages that are reachable for the current answers (skipped pages removed).
export function visiblePages(fields, answers, firstTitle) {
  const visible = visibleFieldIds(fields, answers);
  return splitPages(fields, firstTitle)
    .filter((p) => !p.break || visible.has(p.break.id))
    .map((p) => ({ ...p, fields: p.fields.filter((f) => visible.has(f.id)) }));
}

// Drops answers for hidden or non-input fields so they are never stored or scored.
export function stripHiddenAnswers(fields, answers) {
  const visible = visibleFieldIds(fields, answers);
  const out = {};
  for (const field of includedFields(fields)) {
    if (!visible.has(field.id) || !isInputField(field.type)) continue;
    const value = answers?.[field.id];
    if (value !== undefined) out[field.id] = value;
  }
  for (const key of Object.keys(answers || {})) {
    if (key.startsWith("__")) out[key] = answers[key];
  }
  return out;
}

// --- Validation -------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/i;

function lengthOf(v) {
  return String(v ?? "").trim().length;
}

export function validateField(field, value) {
  const v = field.validation || {};
  const empty = isEmptyValue(value);
  const type = field.type;

  if (field.required && empty) return "This field is required.";
  if (type === "product" && field.required && !(Number(value) > 0)) return "Choose a quantity.";
  if (empty) return null;

  if (type === "email" && !EMAIL_RE.test(String(value).trim())) return "Enter a valid email address.";
  if (type === "url" && !URL_RE.test(String(value).trim())) return "Enter a full URL starting with https://.";
  if (type === "phone" && String(value).replace(/\D/g, "").length < 7) return "Enter a valid phone number.";

  if (["number", "currency", "rating", "scale", "nps", "product"].includes(type)) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "Enter a number.";
    if (v.min !== undefined && v.min !== "" && n < Number(v.min)) return `Must be at least ${v.min}.`;
    if (v.max !== undefined && v.max !== "" && n > Number(v.max)) return `Must be at most ${v.max}.`;
  }

  if (["text", "textarea", "email", "url", "phone"].includes(type)) {
    if (v.minLength && lengthOf(value) < Number(v.minLength)) return `Use at least ${v.minLength} characters.`;
    if (v.maxLength && lengthOf(value) > Number(v.maxLength)) return `Use at most ${v.maxLength} characters.`;
  }

  if (v.pattern && typeof value === "string") {
    try {
      if (!new RegExp(v.pattern).test(value)) return v.patternMessage || "This value isn't in the expected format.";
    } catch {
      // An invalid pattern from the builder never blocks a respondent.
    }
  }

  if (type === "multiselect" && Array.isArray(value)) {
    if (v.minSelect && value.length < Number(v.minSelect)) return `Choose at least ${v.minSelect}.`;
    if (v.maxSelect && value.length > Number(v.maxSelect)) return `Choose at most ${v.maxSelect}.`;
  }

  if (type === "name" && field.required && (!value?.first?.trim() || !value?.last?.trim())) {
    return "Enter a first and last name.";
  }
  if (type === "address" && field.required && (!value?.line1?.trim() || !value?.city?.trim())) {
    return "Enter at least a street and city.";
  }
  if (type === "matrix" && field.required) {
    const rows = field.config?.rows || [];
    if (rows.some((row) => !value?.[row])) return "Answer every row.";
  }
  if (type === "repeater" && Array.isArray(value)) {
    const min = Number(field.config?.minRows || 0);
    if (min && value.length < min) return `Add at least ${min} ${min === 1 ? "entry" : "entries"}.`;
    const subs = field.config?.subFields || [];
    for (const row of value) {
      for (const sub of subs) {
        const err = validateField(sub, row?.[sub.id]);
        if (err) return `${sub.label || "A row"}: ${err}`;
      }
    }
  }
  return null;
}

// Validates every visible input field (or only `onlyIds` for per-page checks).
export function validateAnswers(fields, answers, onlyIds) {
  const errors = {};
  const visible = visibleFieldIds(fields, answers);
  for (const field of includedFields(fields)) {
    if (!isInputField(field.type) || field.type === "hidden") continue;
    if (!visible.has(field.id)) continue;
    if (onlyIds && !onlyIds.has(field.id)) continue;
    const err = validateField(field, answers?.[field.id]);
    if (err) errors[field.id] = err;
  }
  return errors;
}

// --- Numeric values & formulas ---------------------------------------------

function optionPoints(field, option) {
  const pts = field.optionPoints?.[option];
  return pts === undefined || pts === "" ? null : Number(pts);
}

// Numeric value of an answer: option points for choices, quantity × price for products.
export function numericValue(field, value, fields, answers) {
  if (!field) return 0;
  switch (field.type) {
    case "checkbox":
      return value ? 1 : 0;
    case "select":
    case "dropdown": {
      const pts = optionPoints(field, value);
      return pts ?? (Number.isFinite(Number(value)) ? Number(value) : 0);
    }
    case "multiselect":
      return (Array.isArray(value) ? value : []).reduce((s, o) => s + (optionPoints(field, o) ?? 0), 0);
    case "product":
      return (Number(value) || 0) * (Number(field.config?.price) || 0);
    case "total":
      return computeOrder({ fieldDefs: fields, settings: {} }, answers).total;
    case "calculated":
      return evaluateFormula(field.formula, fields, answers, new Set([field.id])) ?? 0;
    case "date":
    case "datetime":
      return value ? Date.parse(value) / 86_400_000 : 0;
    default: {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    }
  }
}

// Evaluates a calculated-field formula against the current answers. `seen` guards self-reference cycles.
export function evaluateFormula(formula, fields, answers, seen = new Set()) {
  if (!formula) return null;
  const list = fields || [];
  const byKey = new Map();
  for (const f of list) {
    byKey.set(String(f.id).toLowerCase(), f);
    if (f.title) byKey.set(f.title.toLowerCase().trim(), f);
    if (f.label) byKey.set(String(f.label).toLowerCase().trim(), f);
  }
  return evaluateExpression(formula, (name) => {
    const field = byKey.get(String(name).toLowerCase().trim());
    if (!field || seen.has(field.id)) return 0;
    if (field.type === "calculated") {
      return evaluateFormula(field.formula, list, answers, new Set([...seen, field.id])) ?? 0;
    }
    const raw = answers?.[field.id];
    if (field.type === "date" || field.type === "datetime") return raw || "";
    return numericValue(field, raw, list, answers);
  });
}

// --- Scoring, quiz, outcomes ------------------------------------------------

function isCorrect(field, value) {
  const correct = field.correctAnswer;
  if (correct == null || correct === "" || (Array.isArray(correct) && correct.length === 0)) return null;
  if (Array.isArray(correct)) {
    const given = Array.isArray(value) ? value : [value];
    return correct.length === given.length && correct.every((c) => given.includes(c));
  }
  return String(value ?? "").trim().toLowerCase() === String(correct).trim().toLowerCase();
}

export function gradeQuiz(form, answers) {
  const fields = includedFields(form.fieldDefs);
  const visible = visibleFieldIds(fields, answers);
  let earned = 0;
  let possible = 0;
  const results = {};
  for (const field of fields) {
    if (!visible.has(field.id)) continue;
    const outcome = isCorrect(field, answers?.[field.id]);
    if (outcome === null) continue;
    const pts = Number(field.config?.points ?? 1) || 1;
    possible += pts;
    if (outcome) earned += pts;
    results[field.id] = outcome;
  }
  if (possible === 0) return null;
  const percent = Math.round((earned / possible) * 100);
  const passMark = Number(form.settings?.quiz?.passMark ?? 70);
  return { earned, possible, percent, passed: percent >= passMark, results };
}

// First branch whose conditions match wins; legacy free-text branches never match.
// Answers plus the current value of every calculated field, so conditions can reference them.
export function withComputed(fields, answers) {
  const out = { ...(answers || {}) };
  for (const field of includedFields(fields)) {
    if (field.type === "calculated") out[field.id] = evaluateFormula(field.formula, fields, out);
  }
  return out;
}

export function resolveOutcome(form, answers) {
  const settings = form.settings || {};
  if (!settings.branchingEnabled) return null;
  const values = withComputed(form.fieldDefs, answers);
  for (const branch of settings.branches || []) {
    if (!Array.isArray(branch.conditions) || branch.conditions.length === 0) continue;
    if (matchesConditions(branch.conditions, branch.conditionLogic, values)) {
      return { id: branch.id, name: branch.name, outcome: branch.outcome || branch.name, branch };
    }
  }
  return null;
}

// Score = option points on choice fields + calculated fields (unless excluded) + quiz points.
export function scoreResponse(form, answers) {
  const settings = form.settings || {};
  const fields = includedFields(form.fieldDefs);
  const quiz = settings.quiz?.enabled ? gradeQuiz(form, answers) : null;
  const outcome = resolveOutcome(form, answers);
  if (!settings.scoringEnabled) {
    return { score: quiz ? quiz.earned : null, priority: outcome?.branch?.priority || "Low", quiz, outcome };
  }
  const visible = visibleFieldIds(fields, answers);
  let score = 0;
  for (const field of fields) {
    if (!visible.has(field.id)) continue;
    const value = answers?.[field.id];
    if (field.type === "calculated") {
      if (field.config?.countInScore === false) continue;
      score += evaluateFormula(field.formula, fields, answers) ?? 0;
    } else if (hasOptions(field.type) && field.optionPoints) {
      score += numericValue(field, value, fields, answers);
    }
  }
  if (quiz) score += quiz.earned;
  const high = Number(settings.highThreshold) || 80;
  const medium = Number(settings.mediumThreshold) || 40;
  const priority = outcome?.branch?.priority || (score >= high ? "High" : score >= medium ? "Medium" : "Low");
  return { score: Math.round(score * 100) / 100, priority, quiz, outcome };
}

// --- Payments ----------------------------------------------------------------

export function computeOrder(form, answers) {
  const settings = form.settings || {};
  const payments = settings.payments || {};
  const fields = includedFields(form.fieldDefs);
  const visible = visibleFieldIds(fields, answers);
  const items = [];
  for (const field of fields) {
    if (field.type !== "product" || !visible.has(field.id)) continue;
    const price = Number(field.config?.price) || 0;
    const fixed = field.config?.quantityMode === "fixed";
    const quantity = fixed ? (answers?.[field.id] ? 1 : 0) : Math.max(0, Math.floor(Number(answers?.[field.id]) || 0));
    if (!quantity || price <= 0) continue;
    items.push({ fieldId: field.id, name: field.label || field.title, price, quantity, amount: Math.round(price * quantity * 100) / 100 });
  }
  const subtotal = Math.round(items.reduce((s, i) => s + i.amount, 0) * 100) / 100;
  const code = String(answers?.__coupon || "").trim().toLowerCase();
  const coupon = code
    ? (payments.coupons || []).find((c) => c.active !== false && String(c.code).trim().toLowerCase() === code)
    : null;
  let discount = 0;
  if (coupon) {
    discount = coupon.type === "amount" ? Number(coupon.value) || 0 : (subtotal * (Number(coupon.value) || 0)) / 100;
    discount = Math.min(subtotal, Math.round(discount * 100) / 100);
  }
  const total = Math.round((subtotal - discount) * 100) / 100;
  return {
    items,
    subtotal,
    discount,
    coupon: coupon ? { code: coupon.code, type: coupon.type, value: coupon.value } : null,
    total,
    currency: (payments.currency || "usd").toLowerCase(),
    mode: payments.mode === "subscription" ? "subscription" : "payment",
    interval: payments.interval || "month",
  };
}

export function formatMoney(amount, currency = "usd") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(Number(amount) || 0);
  } catch {
    return `${(Number(amount) || 0).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

// --- Display & merge tags ---------------------------------------------------

// Human-readable answer for inboxes, exports, emails and merge tags.
export function displayValue(field, value) {
  if (value == null || value === "") return "";
  switch (field?.type) {
    case "checkbox":
      return value ? "Yes" : "No";
    case "multiselect":
    case "ranking":
      return Array.isArray(value) ? value.join(", ") : String(value);
    case "name":
      return [value.first, value.last].filter(Boolean).join(" ");
    case "address":
      return [value.line1, value.line2, value.city, value.state, value.zip, value.country].filter(Boolean).join(", ");
    case "matrix":
      return Object.entries(value || {}).map(([row, col]) => `${row}: ${col}`).join("; ");
    case "file":
      return (Array.isArray(value) ? value : [value]).map((f) => f?.name || f).filter(Boolean).join(", ");
    case "signature":
      return value ? "Signed" : "";
    case "repeater":
      return Array.isArray(value) ? `${value.length} ${value.length === 1 ? "entry" : "entries"}` : "";
    case "booking":
      return formatSlot(value);
    case "product":
      return `${value} × ${field.label || field.title}`;
    case "rating":
      return `${value} / ${field.config?.max || 5}`;
    default:
      return typeof value === "object" ? JSON.stringify(value) : String(value);
  }
}

export function formatSlot(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return String(iso || "");
  return new Date(t).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Replaces {Field Title}/{field-id} and {score} {outcome} {total} tags in respondent-facing text.
export function interpolate(text, form, answers, extras = {}) {
  if (!text || !String(text).includes("{")) return text || "";
  const fields = form?.fieldDefs || [];
  const byKey = new Map();
  for (const f of fields) {
    byKey.set(String(f.id).toLowerCase(), f);
    if (f.title) byKey.set(f.title.toLowerCase().trim(), f);
  }
  return String(text).replace(/\{([^}]+)\}/g, (match, name) => {
    const key = name.toLowerCase().trim();
    if (key in extras) return extras[key] ?? "";
    const field = byKey.get(key);
    if (!field) return match;
    if (field.type === "calculated") return String(evaluateFormula(field.formula, fields, answers) ?? "");
    return displayValue(field, answers?.[field.id]);
  });
}

// Best-effort respondent identity from the answers (email/name typed fields first).
export function detectRespondent(fields, answers) {
  let email = null;
  let name = null;
  for (const f of includedFields(fields)) {
    const v = answers?.[f.id];
    if (isEmptyValue(v)) continue;
    const label = `${f.title} ${f.label || ""}`.toLowerCase();
    if (!email && (f.type === "email" || (typeof v === "string" && label.includes("email") && EMAIL_RE.test(v)))) email = String(v).trim();
    if (!name && f.type === "name") name = displayValue(f, v);
    if (!name && f.type === "text" && label.includes("name")) name = String(v).trim();
  }
  return { name, email };
}

// Answers keyed by question label, for exports and notifications.
export function labelAnswers(answers, fieldDefs) {
  const out = {};
  for (const field of includedFields(fieldDefs)) {
    if (!isInputField(field.type)) continue;
    const value = answers?.[field.id];
    if (isEmptyValue(value)) continue;
    out[field.label || field.title || field.id] = displayValue(field, value);
  }
  return out;
}

export function fieldTypeLabel(type) {
  return getFieldType(type).label;
}
