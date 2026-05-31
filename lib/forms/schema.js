export const FORM_STATUSES = ["Draft", "Published", "Archived"];

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function titleFromSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function makeFieldId(prefix = "field") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function toCanonicalField(field) {
  const isFile = field.type === "file";
  return {
    id: field.id,
    type: field.type || "text",
    title: field.title || "Field",
    label: field.label ?? field.firstValue ?? field.title ?? "",
    placeholder: isFile ? "" : field.placeholder ?? field.secondValue ?? "",
    hint: isFile ? field.hint ?? field.secondValue ?? "" : field.hint ?? "",
    required: Boolean(field.required),
    info: Boolean(field.info),
    options: Array.isArray(field.options) ? field.options.filter(Boolean) : [],
    formula: field.formula ?? "",
    conditions: Array.isArray(field.conditions) ? field.conditions : [],
    included: field.included !== false,
  };
}

export function blankFormDoc(slug, title) {
  return {
    slug,
    title: title || titleFromSlug(slug) || "Untitled form",
    description: "",
    status: "Draft",
    category: null,
    tags: [],
    schema: { fields: [] },
    fieldDefs: [],
    settings: defaultSettings(),
    responses: 0,
    response_count: 0,
  };
}

export function defaultSettings() {
  return {
    coverStyle: "none",
    showIcon: false,
    branding: true,
    submitAnother: false,
    steps: [],
    openDate: "",
    closeDate: "",
    responseLimit: "",
    confirmEmail: false,
    confirmSubject: "Thank you for your submission",
    confirmBody: "We've received your response and will be in touch shortly.",
    thankYouType: "message",
    thankYouText: "Thanks for submitting. We'll review and follow up soon.",
    thankYouUrl: "",
    prefillEnabled: false,
    editWindow: "disabled",
    accessRestricted: false,
    orgDomain: "",
    scoringEnabled: false,
    highThreshold: 80,
    mediumThreshold: 40,
    branchingEnabled: false,
    branches: [],
  };
}

export function normalizeForm(row) {
  if (!row) return null;
  const fields = Array.isArray(row.schema?.fields) ? row.schema.fields : [];
  const included = fields.filter((f) => f.included !== false);
  return {
    id: row.id,
    slug: row.slug,
    name: row.title,
    title: row.title,
    description: row.description || "",
    status: row.status || "Draft",
    category: row.category || null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    fields: included.length,
    fieldDefs: fields,
    settings: { ...defaultSettings(), ...(row.settings || {}) },
    responses: row.response_count ?? 0,
    rate: completionRate(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    lastEdited: relativeTime(row.updated_at),
  };
}

function completionRate(row) {
  if (row.status !== "Published" || !row.response_count) return null;
  return null;
}

export function relativeTime(iso) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function isFieldVisible(field, answers) {
  const conditions = field.conditions || [];
  if (conditions.length === 0) return true;
  return conditions.some((c) => evaluateCondition(c, answers));
}

function evaluateCondition(cond, answers) {
  const raw = answers[cond.fieldId];
  const actual = raw == null ? "" : String(raw).toLowerCase().trim();
  const expected = String(cond.value ?? "").toLowerCase().trim();
  switch (cond.operator) {
    case "Equals":
      return actual === expected;
    case "Does Not Equal":
      return actual !== expected;
    case "Contains":
      return actual.includes(expected);
    case "Is Empty":
      return actual === "";
    default:
      return true;
  }
}

export function evaluateFormula(formula, fields, answers) {
  if (!formula) return null;
  const byTitle = new Map(fields.map((f) => [f.title.toLowerCase(), f.id]));
  const substituted = formula.replace(/\{([^}]+)\}/g, (_, name) => {
    const id = byTitle.get(name.toLowerCase().trim());
    const value = id != null ? Number(answers[id]) : NaN;
    return Number.isFinite(value) ? String(value) : "0";
  });
  const expr = substituted.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
  if (!/^[\d\s+\-*/().]*$/.test(expr) || expr.trim() === "") return null;
  try {
    const result = Function(`"use strict"; return (${expr});`)();
    return Number.isFinite(result) ? Math.round(result * 100) / 100 : null;
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAnswers(fields, answers) {
  const errors = {};
  for (const field of fields) {
    if (field.type === "calculated") continue;
    if (!isFieldVisible(field, answers)) continue;
    const value = answers[field.id];
    const empty = value == null || String(value).trim() === "" || value === false;
    if (field.required && empty) {
      errors[field.id] = "This field is required.";
      continue;
    }
    if (!empty && field.type === "email" && !EMAIL_RE.test(String(value))) {
      errors[field.id] = "Enter a valid email address.";
    }
  }
  return errors;
}

export function scoreResponse(form, answers) {
  const settings = form.settings || {};
  if (!settings.scoringEnabled) return { score: null, priority: "Low" };
  let score = 0;
  for (const field of form.fieldDefs || []) {
    if (field.type !== "calculated") continue;
    const value = evaluateFormula(field.formula, form.fieldDefs, answers);
    if (Number.isFinite(value)) score += value;
  }
  const high = Number(settings.highThreshold) || 80;
  const medium = Number(settings.mediumThreshold) || 40;
  const priority = score >= high ? "High" : score >= medium ? "Medium" : "Low";
  return { score: Math.round(score * 100) / 100, priority };
}
