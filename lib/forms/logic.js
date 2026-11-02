// Shared form logic — runs identically in the filler (client) and the submit route (server).
// Covers conditional visibility, pages, validation, numeric coercion, formulas, scoring,
// quiz grading, named outcomes and their endings, order totals, merge tags and display formatting.
import { evaluateExpression } from "./formula";
import { getFieldType, hasOptions, isInputField, isMultiChoice, opinionLabel, opinionSteps, ratingMax, scaleRange } from "./field-types";

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

// Comparable value of a date, time or date-time; zoneless values read as UTC so the browser and server always agree.
function momentOf(text) {
  const value = text.trim().toUpperCase().replace(" ", "T");
  if (TIME_RE.test(value)) {
    const [hours, minutes, seconds = 0] = value.split(":").map(Number);
    return { kind: "time", at: hours * 3600 + minutes * 60 + seconds };
  }
  if (!isValidDateText(value)) return null;
  const zoneless = value.includes("T") && !/(Z|[+-]\d{2}:\d{2})$/.test(value);
  return { kind: "date", at: Date.parse(zoneless ? `${value}Z` : value) };
}

export function evaluateCondition(cond, answers) {
  const op = normalizeOperator(cond.operator);
  const raw = answers?.[cond.fieldId];
  const expected = String(cond.value ?? "").toLowerCase().trim();
  if (op === "is_empty") return isEmptyValue(raw);
  if (op === "is_not_empty") return !isEmptyValue(raw);
  // Multi-value answers match when any entry matches; a blank entry is never a number.
  const entries = Array.isArray(raw) ? raw : [raw];
  const values = entries.map((x) => textOf(x).toLowerCase().trim());
  const target = Number(expected);
  const targetMoment = momentOf(expected);
  const anyOrdered = (test) => entries.some((x) => {
    if (isEmptyValue(x)) return false;
    if (targetMoment) {
      const moment = momentOf(textOf(x));
      return moment?.kind === targetMoment.kind && test(moment.at, targetMoment.at);
    }
    const n = Number(textOf(x));
    return Number.isFinite(n) && test(n, target);
  });
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
      return anyOrdered((a, b) => a > b);
    case "gte":
      return anyOrdered((a, b) => a >= b);
    case "lt":
      return anyOrdered((a, b) => a < b);
    case "lte":
      return anyOrdered((a, b) => a <= b);
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

// Jump target meaning "skip everything left and go to the end of the form".
export const JUMP_TO_END = "__end";

// Where a shown field's first matching jump rule goes; unconditional rules never match, and targets must be later in the form.
function jumpTarget(field, values, laterIds) {
  for (const rule of Array.isArray(field.jumps) ? field.jumps : []) {
    if (!rule?.conditions?.length || (rule.to !== JUMP_TO_END && !laterIds.has(rule.to))) continue;
    if (matchesConditions(rule.conditions, rule.conditionLogic, values)) return rule.to;
  }
  return null;
}

// Visible field ids in order. Hidden fields' answers are ignored downstream so conditions cascade.
export function visibleFieldIds(fields, answers) {
  const visible = new Set();
  // Earlier hidden fields are blanked so conditions cascade; later fields read raw answers.
  const effective = { ...(answers || {}) };
  const included = includedFields(fields);
  const laterIds = new Set(included.map((f) => f.id));
  let pageVisible = true;
  let jumpTo = null;
  let skippedBreak = null;
  for (const field of included) {
    laterIds.delete(field.id);
    if (jumpTo && jumpTo !== field.id) {
      if (field.type === "page") skippedBreak = field;
      // Hidden fields carry URL and prefill data, not questions, so a jump never drops them.
      if (field.type === "hidden") visible.add(field.id);
      else effective[field.id] = undefined;
      continue;
    }
    if (jumpTo) {
      jumpTo = null;
      // Landing mid-page keeps that page, so the target isn't stranded behind its skipped break.
      if (field.type !== "page") {
        if (skippedBreak) visible.add(skippedBreak.id);
        pageVisible = true;
      }
      skippedBreak = null;
    }
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
    if (shown) jumpTo = jumpTarget(field, effective, laterIds);
  }
  return visible;
}

export function isFieldVisible(field, answers, allFields) {
  if (!allFields) return matchesConditions(field.conditions, field.conditionLogic, answers || {});
  return visibleFieldIds(allFields, answers).has(field.id);
}

const UNLABELLED_TYPES = new Set(["heading", "content", "statement", "image", "video", "calculated", "total", "product", "hidden", "page"]);

// Questions on the pages before `index` that show a numbered label; the classic views seed their question counter with it.
export function questionsBefore(pages, index) {
  return pages.slice(0, index).flatMap((page) => page.fields).filter((field) => {
    if (UNLABELLED_TYPES.has(field.type)) return false;
    if (field.type === "checkbox" || field.type === "consent") return Boolean(field.title && field.label && field.label !== field.title);
    return true;
  }).length;
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

// What an autosave may keep: no hidden answers and no inline signature images, which are re-signed on resume. Visibility is read first so an unsaved signature still counts.
export function partialAnswers(fields, answers) {
  const out = {};
  for (const [key, value] of Object.entries(stripHiddenAnswers(fields, answers))) {
    if (typeof value === "string" && value.startsWith("data:")) continue;
    out[key] = value;
  }
  return out;
}

// --- Validation -------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/i;

const TEXT_TYPES = new Set(["text", "textarea", "email", "url", "phone"]);
const NUMERIC_TYPES = new Set(["number", "currency", "rating", "scale", "nps", "opinion", "product"]);
const TIME_PATTERN = "([01]\\d|2[0-3]):[0-5]\\d(:[0-5]\\d(\\.\\d{1,6})?)?";
const DATE_RE = new RegExp(`^(\\d{4})-(\\d{2})-(\\d{2})([T ]${TIME_PATTERN}(Z|[+-]\\d{2}:\\d{2})?)?$`);
const TIME_RE = new RegExp(`^${TIME_PATTERN}$`);

function lengthOf(v) {
  return String(v ?? "").trim().length;
}

function isPlainObject(v) {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

const isPrimitive = (v) => v == null || typeof v !== "object";
const isChoiceText = (v) => typeof v === "string" || typeof v === "number";

// A real calendar date, optionally with a time and zone (Date.parse alone rolls 31 Feb over and accepts free text).
function isValidDateText(text) {
  const match = DATE_RE.exec(text);
  if (!match) return false;
  const [year, month, day] = match.slice(1, 4).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// What a choice field offers: its options, else its scored options; null when nothing is configured to check against.
function offeredOptions(field) {
  if (Array.isArray(field.options) && field.options.length) return field.options.map(String);
  const keys = isPlainObject(field.optionPoints) ? Object.keys(field.optionPoints) : [];
  return keys.length ? keys : null;
}

// Choice answers must have the type's shape and be offered; a multi answer can't repeat an option, which would score it twice.
function choiceError(field, value) {
  const picked = isMultiChoice(field.type) || field.type === "ranking" ? value : [value];
  const offered = offeredOptions(field);
  const invalid =
    !Array.isArray(picked) ||
    !picked.every(isChoiceText) ||
    new Set(picked.map(String)).size !== picked.length ||
    (offered && picked.some((o) => !offered.includes(String(o))));
  return invalid ? "Choose one of the options shown." : null;
}

// Each configured row answers one offered column; rows the form no longer has are ignored (a resumed draft can't clear them) and dropped at submit.
function matrixError(field, value) {
  if (!isPlainObject(value)) return "Choose one of the options shown.";
  const rows = field.config?.rows || [];
  const offered = offeredOptions(field);
  for (const row of rows.length ? rows : Object.keys(value)) {
    const col = Object.hasOwn(value, row) ? value[row] : undefined;
    if (col == null || col === "") continue;
    if (!isChoiceText(col) || (offered && !offered.includes(String(col)))) return "Choose one of the options shown.";
  }
  return null;
}

export function validateField(field, value) {
  const v = field.validation || {};
  const empty = isEmptyValue(value);
  const type = field.type;

  if (field.required && empty) return "This field is required.";
  if (type === "product" && field.required && !(Number(value) > 0)) return "Choose a quantity.";
  if (empty) return null;

  // Shape first: the rules below assume the stored type, and a forged answer gets an error instead of a TypeError.
  if (TEXT_TYPES.has(type) && typeof value !== "string") return "Enter text.";
  if ((type === "name" || type === "address") && !(isPlainObject(value) && Object.values(value).every((p) => p == null || typeof p === "string"))) {
    return type === "name" ? "Enter a valid name." : "Enter a valid address.";
  }
  if (type === "daterange") {
    if (!isPlainObject(value) || !Object.values(value).every((p) => p == null || typeof p === "string")) return "Enter a valid date range.";
    const [start, end] = [String(value.start ?? "").trim(), String(value.end ?? "").trim()];
    if (!start || !end) return "Enter a start and an end date.";
    if (!isValidDateText(start) || !isValidDateText(end)) return "Enter a valid date range.";
    if (end < start) return "The end date must be on or after the start date.";
  }
  if ((type === "date" || type === "datetime") && !(typeof value === "string" && isValidDateText(value.trim()))) return "Enter a valid date.";
  if (type === "time" && !(typeof value === "string" && TIME_RE.test(value.trim()))) return "Enter a valid time.";
  if (type === "repeater" && !Array.isArray(value)) return "Add your entries as a list.";
  if (type === "booking" && typeof value !== "string") return "Choose a time slot.";
  if (type === "checkbox" && typeof value === "object") return "Tick or clear the box.";

  if (type === "email" && !EMAIL_RE.test(String(value).trim())) return "Enter a valid email address.";
  if (type === "url" && !URL_RE.test(String(value).trim())) return "Enter a full URL starting with https://.";
  if (type === "phone" && String(value).replace(/\D/g, "").length < 7) return "Enter a valid phone number.";

  if (NUMERIC_TYPES.has(type)) {
    // A ticked fixed-quantity product stores true.
    if (typeof value === "object" || (typeof value === "boolean" && type !== "product")) return "Enter a number.";
    const n = Number(value);
    if (!Number.isFinite(n)) return "Enter a number.";
    if (v.min !== undefined && v.min !== "" && n < Number(v.min)) return `Must be at least ${v.min}.`;
    if (v.max !== undefined && v.max !== "" && n > Number(v.max)) return `Must be at most ${v.max}.`;
    if (type === "opinion" && !(Number.isInteger(n) && n >= 1 && n <= opinionSteps(field))) return "Choose one of the options.";
    if (type === "nps" && !(Number.isInteger(n) && n >= 0 && n <= 10)) return "Choose a number from 0 to 10.";
    if (type === "rating" && !(Number.isInteger(n) && n >= 1 && n <= ratingMax(field))) return `Choose a rating from 1 to ${ratingMax(field)}.`;
    if (type === "scale") {
      const { min, max } = scaleRange(field);
      if (!(Number.isInteger(n - min) && n >= min && n <= max)) return `Choose a number from ${min} to ${max}.`;
    }
  }

  const optionError = type === "matrix" ? matrixError(field, value) : hasOptions(type) ? choiceError(field, value) : null;
  if (optionError) return optionError;
  if (type === "consent" && value !== true) return "Tick the box to give your consent.";

  if (TEXT_TYPES.has(type)) {
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

  if (isMultiChoice(type) && Array.isArray(value)) {
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
    if (rows.some((row) => !Object.hasOwn(value, row) || !value[row])) return "Answer every row.";
  }
  if (type === "repeater") {
    const min = Number(field.config?.minRows || 0);
    if (min && value.length < min) return `Add at least ${min} ${min === 1 ? "entry" : "entries"}.`;
    const subs = field.config?.subFields || [];
    for (const row of value) {
      if (!isPlainObject(row) || !Object.values(row).every(isPrimitive)) return "Each entry needs its own answers.";
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
    if (!isInputField(field.type)) continue;
    if (!visible.has(field.id)) continue;
    if (onlyIds && !onlyIds.has(field.id)) continue;
    const value = answers?.[field.id];
    // Hidden fields skip the respondent rules but still store plain values, never a structure.
    if (field.type === "hidden") {
      if (!isPrimitive(value)) errors[field.id] = "This value isn't valid.";
      continue;
    }
    try {
      const err = validateField(field, value);
      if (err) errors[field.id] = err;
    } catch (e) {
      // A malformed field definition or a pathological answer is a validation failure, never a crash.
      console.error("[logic.validateField]", field.id, e?.message);
      errors[field.id] = "This answer isn't valid.";
    }
  }
  return errors;
}

// A read-only default in the shape the type stores, as the filler's prefill shows it; undefined when it doesn't fit (never a consent or an upload).
export function coerceDefaultAnswer(field, value) {
  if (value == null || value === "") return undefined;
  const match = (v) => (field.options || []).find((o) => String(o).trim().toLowerCase() === String(v).trim().toLowerCase());
  const type = field.type;
  if (type === "consent" || type === "file" || type === "signature" || type === "booking") return undefined;
  if (isMultiChoice(type) || type === "ranking") {
    const picked = (Array.isArray(value) ? value : String(value).split(",")).map(match).filter((o) => o !== undefined);
    return picked.length ? picked : undefined;
  }
  if (type === "select" || type === "dropdown" || type === "picture") return match(value);
  if (TEXT_TYPES.has(type)) return String(value);
  if (type === "name" && typeof value === "string") {
    const parts = value.trim().split(/\s+/);
    return { first: parts[0] || "", last: parts.slice(1).join(" ") };
  }
  return value;
}

// --- Numeric values & formulas ---------------------------------------------

// The points an option is worth: own keys only (never the prototype chain) and finite numbers only.
function optionPoints(field, option) {
  const points = field.optionPoints;
  if (!isPlainObject(points) || !isChoiceText(option) || !Object.hasOwn(points, option)) return null;
  const pts = points[option];
  if (!isChoiceText(pts) || pts === "") return null;
  const n = Number(pts);
  return Number.isFinite(n) ? n : null;
}

// Numeric value of an answer: option points for choices, quantity × price for products.
export function numericValue(field, value, fields, answers) {
  if (!field) return 0;
  switch (field.type) {
    case "checkbox":
    case "consent":
      return value ? 1 : 0;
    case "select":
    case "dropdown":
    case "picture": {
      const pts = optionPoints(field, value);
      if (pts !== null) return pts;
      // An offered option without points counts as its own number; anything else can't name its own score.
      const offered = offeredOptions(field);
      if (!isChoiceText(value) || (offered && !offered.includes(String(value)))) return 0;
      return Number.isFinite(Number(value)) ? Number(value) : 0;
    }
    case "multiselect":
    case "multipicture":
      return (Array.isArray(value) ? value : []).reduce((s, o) => s + (optionPoints(field, o) ?? 0), 0);
    case "product":
      return (Number(value) || 0) * (Number(field.config?.price) || 0);
    case "total":
      return computeOrder({ fieldDefs: fields, settings: {} }, answers).total;
    case "calculated":
      return evaluateFormula(field.formula, fields, answers, new Set([field.id])) ?? 0;
    case "date":
    case "datetime":
      return value ? Date.parse(value) / 86_400_000 || 0 : 0;
    default: {
      if (typeof value === "object") return 0;
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

// Response-level values branch conditions can test alongside answers, so quiz/score funnels route to outcomes.
export const OUTCOME_METRICS = [
  { id: "__score", title: "Score", type: "number" },
  { id: "__quiz", title: "Quiz score (%)", type: "number" },
];

export function resolveOutcome(form, answers, metrics = {}) {
  const settings = form.settings || {};
  if (!settings.branchingEnabled) return null;
  const values = { ...withComputed(form.fieldDefs, answers), ...metrics };
  for (const branch of settings.branches || []) {
    if (!Array.isArray(branch.conditions) || branch.conditions.length === 0) continue;
    if (matchesConditions(branch.conditions, branch.conditionLogic, values)) {
      return { id: branch.id, name: branch.name, outcome: branch.outcome || branch.name, branch };
    }
  }
  return null;
}

// A configured threshold, 0 included; unset or non-numeric falls back to the default.
function thresholdOf(value, fallback) {
  if (value == null || String(value).trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Score = option points on choice fields + calculated fields (unless excluded) + quiz points.
export function scoreResponse(form, answers) {
  const settings = form.settings || {};
  const fields = includedFields(form.fieldDefs);
  const quiz = settings.quiz?.enabled ? gradeQuiz(form, answers) : null;
  let score = quiz ? quiz.earned : null;
  if (settings.scoringEnabled) {
    const visible = visibleFieldIds(fields, answers);
    score = quiz ? quiz.earned : 0;
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
  }
  const rounded = score == null ? null : Math.round(score * 100) / 100;
  const outcome = resolveOutcome(form, answers, { __score: rounded ?? undefined, __quiz: quiz?.percent });
  if (!settings.scoringEnabled) return { score: rounded, priority: outcome?.branch?.priority || "Low", quiz, outcome };
  const high = thresholdOf(settings.highThreshold, 80);
  const medium = thresholdOf(settings.mediumThreshold, 40);
  const priority = outcome?.branch?.priority || (score >= high ? "High" : score >= medium ? "Medium" : "Low");
  return { score: rounded, priority, quiz, outcome };
}

// --- Endings -----------------------------------------------------------------

// Absolute http(s) URL, or "" for anything else (javascript:, relative paths, garbage).
export function safeHttpUrl(value) {
  try {
    const url = new URL(String(value ?? "").trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

// The ending a respondent sees: the matched outcome's own when enabled, else the default; blank texts fall back, URLs must resolve to http(s).
export function resolveEnding(form, answers, extras = {}, outcome = null) {
  const s = form.settings || {};
  const own = outcome?.branch?.ending?.enabled ? outcome.branch.ending : null;
  const text = (t) => interpolate(t, form, answers, extras);
  const link = (t) => safeHttpUrl(interpolate(t, form, answers, extras, encodeURIComponent)) || null;
  const buttonUrl = own?.buttonLabel?.trim() ? link(own.buttonUrl) : null;
  return {
    custom: Boolean(own),
    title: text(own?.title?.trim() ? own.title : s.thankYouTitle),
    text: text(own?.text?.trim() ? own.text : s.thankYouText),
    button: buttonUrl ? { label: text(own.buttonLabel.trim()), url: buttonUrl } : null,
    redirectUrl: link(own ? own.redirectUrl : s.thankYouType === "redirect" ? s.thankYouUrl : ""),
  };
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
    case "consent":
      return value ? "Agreed" : "Not agreed";
    case "multiselect":
    case "multipicture":
    case "ranking":
      return Array.isArray(value) ? value.join(", ") : String(value);
    case "name":
      return [value.first, value.last].filter(Boolean).join(" ");
    case "daterange":
      return [value.start, value.end].filter(Boolean).join(" – ");
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
    case "opinion": {
      const label = opinionLabel(field, value);
      return `${label ? `${label} · ` : ""}${value} / ${opinionSteps(field)}`;
    }
    default:
      return typeof value === "object" ? JSON.stringify(value) : String(value);
  }
}

export function formatSlot(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return String(iso || "");
  return new Date(t).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Replaces {Field Title}/{field-id} and {score} {outcome} {total} tags with plain text; logic-hidden fields recall as "", `encode` escapes values for URLs.
export function interpolate(text, form, answers, extras = {}, encode = String) {
  if (!text || !String(text).includes("{")) return text || "";
  const fields = form?.fieldDefs || [];
  const byKey = new Map();
  for (const f of fields) {
    byKey.set(String(f.id).toLowerCase(), f);
    if (f.title) byKey.set(f.title.toLowerCase().trim(), f);
  }
  let visible = null;
  let shown = null;
  const recall = (field) => {
    if (!visible) {
      visible = visibleFieldIds(fields, answers);
      shown = Object.fromEntries(Object.entries(answers || {}).filter(([id]) => visible.has(id) || id.startsWith("__")));
    }
    if (!visible.has(field.id)) return "";
    if (field.type === "calculated") return String(evaluateFormula(field.formula, fields, shown) ?? "");
    return displayValue(field, shown[field.id]);
  };
  return String(text).replace(/\{([^}]+)\}/g, (match, name) => {
    const key = name.toLowerCase().trim();
    if (Object.hasOwn(extras, key)) return encode(extras[key] ?? "");
    const field = byKey.get(key);
    return field ? encode(recall(field)) : match;
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

// Whether a sensitive field could supply the respondent's name or email; mirrors what detectRespondent reads.
export function sensitiveIdentity(fields) {
  const sensitive = (fields || []).filter((f) => f?.sensitive);
  const labelHas = (f, word) => `${f.title || ""} ${f.label || ""}`.toLowerCase().includes(word);
  return {
    name: sensitive.some((f) => f.type === "name" || (f.type === "text" && labelHas(f, "name"))),
    email: sensitive.some((f) => f.type === "email" || labelHas(f, "email")),
  };
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
