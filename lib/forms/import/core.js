// Shared import layer: each source (Typeform, JSON, CSV, later Google Forms) builds a draft with its own ids and finalizeImport sanitises, re-ids and normalises it.
import { FIELD_TYPES, hasOptions } from "../field-types";
import { findFont } from "../fonts";
import { LOCALES } from "../i18n";
import { checkCustomCss } from "../custom-css";
import { CONDITION_OPERATORS, JUMP_TO_END, safeHttpUrl } from "../logic";
import { makeFieldId, normalizeEnding, normalizeSettings, toCanonicalField } from "../schema";
import { THEME_PALETTES, isValidAccent } from "../theme";

export const IMPORT_LIMITS = {
  maxInputBytes: 2 * 1024 * 1024,
  maxFormBytes: 2 * 1024 * 1024,
  maxFields: 500,
  maxOptions: 500,
  maxConditions: 50,
  maxBranches: 100,
  maxTitleLength: 500,
  maxTextLength: 20000,
  maxDepth: 8,
  maxWarnings: 200,
};

export const IMPORT_SOURCES = ["typeform", "json", "csv"];

// A failure the caller may show verbatim; messages never contain input secrets.
export class ImportError extends Error {
  constructor(message, code = "invalid") {
    super(message);
    this.name = "ImportError";
    this.code = code;
  }
}

// Collects { field, message } entries; `field` names the title concerned, null for form-level notes.
export function createWarnings() {
  const list = [];
  const seen = new Set();
  let overflow = 0;
  return {
    add(field, message) {
      const key = `${field ?? ""}|${message}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (list.length >= IMPORT_LIMITS.maxWarnings) overflow += 1;
      else list.push({ field: field || null, message });
    },
    toList() {
      return overflow ? [...list, { field: null, message: `${overflow} more warnings were not listed.` }] : [...list];
    },
  };
}

const RESERVED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const HTML_TAG = /<\/?[a-zA-Z!?][^<>]*>/g;

// True when the text carries something a browser would parse as markup.
export function hasMarkup(value) {
  return /<\/?[a-zA-Z!?]/.test(String(value ?? ""));
}

// Plain text only: drops control characters and HTML (script/style bodies included), then caps the length.
export function cleanText(value, max = IMPORT_LIMITS.maxTextLength) {
  if (value == null || typeof value === "object") return "";
  let text = String(value).slice(0, max * 4);
  text = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
  text = text.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "");
  for (let i = 0; i < 10 && hasMarkup(text); i += 1) {
    const next = text.replace(HTML_TAG, "");
    if (next === text) break;
    text = next;
  }
  // An unterminated or malformed tag survives the pass above, so its opener goes too.
  if (hasMarkup(text)) text = text.replace(/<(?=\/?[a-zA-Z!?])/g, "");
  return text.trim().slice(0, max);
}

// http(s) URLs only, else "". Merge tags survive so answers can still be recalled into redirects (re-checked when the ending resolves).
export function cleanUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.length > 2048) return "";
  const parsed = safeHttpUrl(raw);
  if (!parsed) return "";
  return raw.includes("{") ? raw : parsed;
}

// Plain-data copy of untrusted JSON: reserved keys and functions gone, depth capped, strings cleaned, *url/*href keys limited to http(s).
export function cleanData(value, warn, subject, key = "", depth = 0) {
  if (depth > IMPORT_LIMITS.maxDepth) return undefined;
  if (typeof value === "string") {
    if (/(url|href)$/i.test(key)) {
      const url = cleanUrl(value);
      if (value.trim() && !url) warn.add(subject, "Removed a link that wasn't http or https.");
      return url;
    }
    if (value.length > IMPORT_LIMITS.maxTextLength) warn.add(subject, `Long text shortened to ${IMPORT_LIMITS.maxTextLength} characters.`);
    return cleanText(value);
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) {
    return value
      .slice(0, IMPORT_LIMITS.maxOptions)
      .map((item) => cleanData(item, warn, subject, key, depth + 1))
      .filter((item) => item !== undefined);
  }
  if (typeof value !== "object") return undefined;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (RESERVED_KEYS.has(k)) continue;
    const cleaned = cleanData(v, warn, subject, k, depth + 1);
    if (cleaned !== undefined) out[cleanText(k, IMPORT_LIMITS.maxTitleLength)] = cleaned;
  }
  return out;
}

const OPERATORS = new Set(CONDITION_OPERATORS.map((o) => o.value));
const NUMERIC_RULES = ["min", "max", "minLength", "maxLength", "minSelect", "maxSelect"];
// Nested quantifiers are the classic catastrophic-backtracking shape; validation patterns also run in the submit route.
const RISKY_PATTERN = /\([^)]*[+*][^)]*\)\s*[+*{]/;

function cleanValidation(raw, warn, title) {
  if (!raw || typeof raw !== "object") return undefined;
  const out = {};
  for (const key of NUMERIC_RULES) {
    if (raw[key] === undefined || raw[key] === "" || raw[key] === null) continue;
    const n = Number(raw[key]);
    if (Number.isFinite(n)) out[key] = n;
  }
  if (typeof raw.pattern === "string" && raw.pattern) {
    let safe = raw.pattern.length <= 200 && !RISKY_PATTERN.test(raw.pattern);
    try {
      new RegExp(raw.pattern);
    } catch {
      safe = false;
    }
    if (safe) {
      out.pattern = raw.pattern;
      if (raw.patternMessage) out.patternMessage = cleanText(raw.patternMessage, 300);
    } else {
      warn.add(title, "Removed a validation pattern that was invalid or could run too slowly.");
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function cleanOptions(raw, warn, title) {
  if (!Array.isArray(raw)) return [];
  if (raw.length > IMPORT_LIMITS.maxOptions) warn.add(title, `Only the first ${IMPORT_LIMITS.maxOptions} options were kept.`);
  const seen = new Set();
  const out = [];
  for (const option of raw.slice(0, IMPORT_LIMITS.maxOptions)) {
    const text = cleanText(option, IMPORT_LIMITS.maxTitleLength);
    if (!text || RESERVED_KEYS.has(text) || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function cleanConditions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, IMPORT_LIMITS.maxConditions)
    .filter((c) => c && typeof c === "object" && c.fieldId != null)
    .map((c) => ({
      fieldId: String(c.fieldId),
      operator: OPERATORS.has(c.operator) ? c.operator : "equals",
      value: cleanText(c.value, IMPORT_LIMITS.maxTitleLength),
    }));
}

function cleanJumps(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, IMPORT_LIMITS.maxConditions)
    .filter((r) => r && typeof r === "object" && r.to != null)
    .map((r) => ({ to: String(r.to), conditionLogic: r.conditionLogic === "all" ? "all" : "any", conditions: cleanConditions(r.conditions) }));
}

// Whitelists a draft field's keys and cleans each value; `title` is what warnings name.
export function sanitizeField(raw, warn) {
  const title = cleanText(raw.title, IMPORT_LIMITS.maxTitleLength);
  const name = title || null;
  const known = typeof raw.type === "string" && Object.hasOwn(FIELD_TYPES, raw.type);
  if (!known) warn.add(name, `Unknown field type "${cleanText(raw.type, 60)}" imported as short text.`);
  const type = known ? raw.type : "text";
  for (const key of ["title", "label", "hint"]) {
    if (hasMarkup(raw[key])) warn.add(name, "Removed HTML from the imported text.");
  }
  if (String(raw.title ?? "").length > IMPORT_LIMITS.maxTitleLength) warn.add(name, `Title shortened to ${IMPORT_LIMITS.maxTitleLength} characters.`);
  if (String(raw.hint ?? "").length > IMPORT_LIMITS.maxTextLength) warn.add(name, `Description shortened to ${IMPORT_LIMITS.maxTextLength} characters.`);

  const options = hasOptions(type) ? cleanOptions(raw.options, warn, name) : [];
  let optionPoints;
  if (raw.optionPoints && typeof raw.optionPoints === "object") {
    const pairs = Object.entries(raw.optionPoints)
      .map(([option, points]) => [cleanText(option, IMPORT_LIMITS.maxTitleLength), Number(points)])
      .filter(([option, points]) => options.includes(option) && Number.isFinite(points));
    if (pairs.length) optionPoints = Object.fromEntries(pairs);
  }
  const config = raw.config && typeof raw.config === "object" ? cleanData(raw.config, warn, name) : undefined;
  if (Array.isArray(config?.rows)) config.rows = cleanOptions(config.rows, warn, name);
  const correct = raw.correctAnswer;
  return {
    sourceId: raw.id == null ? null : String(raw.id),
    type,
    title: title || FIELD_TYPES[type].label,
    label: cleanText(raw.label ?? raw.title, IMPORT_LIMITS.maxTitleLength),
    placeholder: cleanText(raw.placeholder, IMPORT_LIMITS.maxTitleLength),
    hint: cleanText(raw.hint),
    info: typeof raw.info === "string" ? cleanText(raw.info) : "",
    required: raw.required === true,
    options,
    optionPoints,
    correctAnswer: Array.isArray(correct) ? correct.map((c) => cleanText(c)) : typeof correct === "string" ? cleanText(correct) : undefined,
    // Formulas may hold `<` comparisons, so they skip HTML stripping; the evaluator is a parser and they are never rendered.
    formula: typeof raw.formula === "string" ? raw.formula.slice(0, 2000) : "",
    conditions: cleanConditions(raw.conditions),
    conditionLogic: raw.conditionLogic === "all" ? "all" : "any",
    jumps: cleanJumps(raw.jumps),
    included: raw.included !== false,
    width: raw.width,
    defaultValue: typeof raw.defaultValue === "string" ? cleanText(raw.defaultValue) : typeof raw.defaultValue === "number" || typeof raw.defaultValue === "boolean" ? raw.defaultValue : undefined,
    prefillKey: typeof raw.prefillKey === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(raw.prefillKey) ? raw.prefillKey : undefined,
    readOnly: raw.readOnly === true,
    sensitive: raw.sensitive === true,
    validation: cleanValidation(raw.validation, warn, name),
    config,
  };
}

// Settings an import may carry: design, submission and logic. Secrets, recipients and integrations never travel.
const IMPORTABLE_SETTINGS = [
  "coverStyle", "coverUrl", "showIcon", "logoUrl", "logoAlt", "branding", "theme", "layout", "progressBar", "locale", "welcome", "translations",
  "pageLayout", "sidePosition", "sideImageUrl", "sideImageAlt", "sideEyebrow", "sideHeadline", "sideTags", "sideCredit", "customCss",
  "submitAnother", "openDate", "closeDate", "closedMessage", "responseLimit", "showResponseLimit",
  "thankYouType", "thankYouTitle", "thankYouText", "thankYouUrl", "showScore", "saveResume", "offline", "partialConsent",
  "confirmEmail", "confirmSubject", "confirmBody", "anonymous", "minReviewSeconds", "duplicates", "prefillEnabled", "prefill",
  "editWindow", "allowDelegate", "attestation", "policy",
  "scoringEnabled", "highThreshold", "mediumThreshold", "branchingEnabled", "branches", "quiz", "showPollResults", "abTest",
  "documentTemplate", "payments",
];

const THEME_MODES = ["dark", "light", "auto"];
const THEME_RADII = ["none", "sm", "md", "lg", "full"];
const THEME_BACKGROUNDS = ["plain", "gradient", "glow", "image"];
const PRIORITIES = ["High", "Medium", "Low"];

function cleanTheme(raw) {
  const theme = {};
  if (!raw || typeof raw !== "object") return theme;
  if (THEME_MODES.includes(raw.mode)) theme.mode = raw.mode;
  if (typeof raw.palette === "string" && Object.hasOwn(THEME_PALETTES, raw.palette)) theme.palette = raw.palette;
  if (isValidAccent(raw.accent)) theme.accent = raw.accent.trim();
  if (isValidAccent(raw.accent2)) theme.accent2 = raw.accent2.trim();
  if (THEME_RADII.includes(raw.radius)) theme.radius = raw.radius;
  if (typeof raw.font === "string" && findFont(raw.font)) theme.font = raw.font;
  if (typeof raw.headingFont === "string" && findFont(raw.headingFont)) theme.headingFont = raw.headingFont;
  if (THEME_BACKGROUNDS.includes(raw.background)) theme.background = raw.background;
  // Element choices only ever select from a fixed rule table when the theme is built, so unknown values do nothing.
  if (raw.elements && typeof raw.elements === "object") theme.elements = Object.fromEntries(Object.entries(raw.elements).filter(([key, value]) => !RESERVED_KEYS.has(key) && typeof value === "string" && value.length <= 20));
  return theme;
}

function cleanBranches(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, IMPORT_LIMITS.maxBranches).filter((b) => b && typeof b === "object").map((b) => {
    const branch = {
      id: makeFieldId("branch"),
      sourceId: b.id == null ? null : String(b.id),
      name: cleanText(b.name, IMPORT_LIMITS.maxTitleLength) || "Path",
      outcome: cleanText(b.outcome, IMPORT_LIMITS.maxTitleLength),
      conditionLogic: b.conditionLogic === "any" ? "any" : "all",
      conditions: cleanConditions(b.conditions),
    };
    if (PRIORITIES.includes(b.priority)) branch.priority = b.priority;
    if (b.ending && typeof b.ending === "object") {
      const ending = normalizeEnding(b.ending);
      branch.ending = {
        enabled: ending.enabled,
        title: cleanText(ending.title, IMPORT_LIMITS.maxTitleLength),
        text: cleanText(ending.text),
        buttonLabel: cleanText(ending.buttonLabel, 200),
        buttonUrl: cleanUrl(ending.buttonUrl),
        redirectUrl: cleanUrl(ending.redirectUrl),
      };
    }
    return branch;
  });
}

// Whitelisted, cleaned settings patch; anything else that differs from the defaults is named in a warning.
export function sanitizeSettings(raw, warn) {
  const input = raw && typeof raw === "object" ? raw : {};
  const defaults = normalizeSettings({});
  const out = {};
  for (const key of IMPORTABLE_SETTINGS) {
    if (!Object.hasOwn(input, key) || key === "theme" || key === "branches" || key === "payments") continue;
    const cleaned = cleanData(input[key], warn, null, key);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  if (!["classic", "conversational"].includes(out.layout)) delete out.layout;
  if (!LOCALES.some((l) => l.value === out.locale)) delete out.locale;
  if (!["message", "redirect"].includes(out.thankYouType)) delete out.thankYouType;
  if (Object.hasOwn(input, "theme")) out.theme = cleanTheme(input.theme);
  if (Object.hasOwn(input, "branches")) out.branches = cleanBranches(input.branches);
  if (input.payments && typeof input.payments === "object") {
    const { coupons, ...payments } = input.payments;
    out.payments = cleanData(payments, warn, null);
    if (Array.isArray(coupons) && coupons.length) warn.add(null, "Payment coupons were not imported.");
  }
  const skipped = Object.keys(input).filter(
    (key) => !IMPORTABLE_SETTINGS.includes(key) && Object.hasOwn(defaults, key) && JSON.stringify(input[key]) !== JSON.stringify(defaults[key]),
  );
  if (skipped.length) warn.add(null, `Not imported, set these up again if you need them: ${skipped.join(", ")}.`);
  return out;
}

function freshId(prefix, used) {
  let id = makeFieldId(prefix);
  while (used.has(id)) id = makeFieldId(prefix);
  used.add(id);
  return id;
}

const METRICS = new Set(["__score", "__quiz"]);

// Rewrites {old-id} merge tags to fresh ids; titles and extras such as {score} pass through untouched.
function remapTags(text, ids) {
  if (typeof text !== "string" || !text.includes("{")) return text;
  return text.replace(/\{([^{}]+)\}/g, (match, name) => {
    const hit = ids.get(name.trim()) ?? ids.get(name.trim().toLowerCase());
    return hit ? `{${hit}}` : match;
  });
}

// Remaps every merge tag and field reference nested in a settings or config value.
function remapDeep(value, ids, key = "") {
  if (typeof value === "string") {
    if (/^fieldId$/.test(key)) return ids.get(value) ?? value;
    return remapTags(value, ids);
  }
  if (Array.isArray(value)) {
    if (/^fieldIds$/.test(key)) return value.map((id) => ids.get(id)).filter(Boolean);
    return value.map((item) => remapDeep(item, ids));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remapDeep(v, ids, k)]));
  }
  return value;
}

function remapConditions(conditions, ids, warn, subject, used, allowMetrics) {
  const out = [];
  for (const cond of conditions) {
    const fieldId = allowMetrics && METRICS.has(cond.fieldId) ? cond.fieldId : ids.get(cond.fieldId);
    if (!fieldId) {
      warn.add(subject, "Removed a condition that pointed at a field missing from the import.");
      continue;
    }
    out.push({ id: freshId("cond", used), fieldId, operator: cond.operator, value: cond.value });
  }
  return out;
}

function remapJumps(jumps, ids, warn, subject, used) {
  const out = [];
  for (const rule of jumps || []) {
    const to = rule.to === JUMP_TO_END ? rule.to : ids.get(rule.to);
    const conditions = remapConditions(rule.conditions, ids, warn, subject, used, false);
    if (!to || !conditions.length) {
      warn.add(subject, "Removed a jump rule that pointed at a field missing from the import.");
      continue;
    }
    out.push({ id: freshId("jump", used), conditions, conditionLogic: rule.conditionLogic, to });
  }
  return out;
}

// Translation keys embed field, sub-field and branch ids, all of which are fresh after an import; keys that no longer resolve are dropped.
function remapTranslations(translations, ids, subIds, branchIds, warn) {
  let dropped = false;
  const moveKey = (key) => {
    const [, kind, id, rest] = key.match(/^(f|branch)\.([^.]+)\.(.+)$/) || [];
    if (!kind) return key;
    const target = (kind === "f" ? ids : branchIds).get(id);
    if (!target) return null;
    if (!rest.startsWith("sub.")) return `${kind}.${target}.${rest}`;
    const sub = subIds.get(rest.slice(4));
    return sub ? `${kind}.${target}.sub.${sub}` : null;
  };
  const out = {};
  for (const [locale, strings] of Object.entries(translations)) {
    if (!LOCALES.some((l) => l.value === locale) || !strings || typeof strings !== "object") continue;
    out[locale] = {};
    for (const [key, text] of Object.entries(strings)) {
      const moved = moveKey(key);
      if (moved && typeof text === "string") out[locale][moved] = remapTags(text, ids);
      else dropped = true;
    }
  }
  if (dropped) warn.add(null, "Some translations pointed at questions missing from the import, so they were removed.");
  return out;
}

// Draft in, ready-to-create form out: { form, warnings, stats }. Always a Draft, with fresh ids and only sanitised content.
export function finalizeImport({ source, sourceId = null, title, description = "", tags = [], category = null, fields = [], settings = {}, warnings }) {
  const warn = warnings || createWarnings();
  const incoming = (Array.isArray(fields) ? fields : []).filter((f) => f && typeof f === "object");
  if (incoming.length > IMPORT_LIMITS.maxFields) {
    warn.add(null, `Only the first ${IMPORT_LIMITS.maxFields} of ${incoming.length} fields were imported.`);
  }
  const cleaned = incoming.slice(0, IMPORT_LIMITS.maxFields).map((f) => sanitizeField(f, warn));
  const patch = sanitizeSettings(settings, warn);

  const used = new Set();
  const ids = new Map();
  const newIds = cleaned.map((field) => {
    const id = freshId("field", used);
    if (field.sourceId != null && !ids.has(field.sourceId)) {
      ids.set(field.sourceId, id);
      if (!ids.has(field.sourceId.toLowerCase())) ids.set(field.sourceId.toLowerCase(), id);
    }
    return id;
  });

  const subIds = new Map();
  const canonical = cleaned.map(({ sourceId: _old, ...field }, i) => {
    const config = field.config ? remapDeep(field.config, ids) : undefined;
    // A repeater's sub-fields key its row answers, so they get fresh ids of their own.
    if (Array.isArray(config?.subFields)) {
      config.subFields = config.subFields.map((sub) => {
        const id = freshId("sub", used);
        if (sub.id != null) subIds.set(String(sub.id), id);
        return { ...sub, id };
      });
    }
    return toCanonicalField({
      ...field,
      id: newIds[i],
      title: remapTags(field.title, ids),
      label: remapTags(field.label, ids),
      hint: remapTags(field.hint, ids),
      placeholder: remapTags(field.placeholder, ids),
      info: remapTags(field.info, ids),
      formula: remapTags(field.formula, ids),
      config,
      conditions: remapConditions(field.conditions, ids, warn, field.title, used, false),
      jumps: remapJumps(field.jumps, ids, warn, field.title, used),
    });
  });

  const remapped = remapDeep(patch, ids);
  const branchIds = new Map();
  if (patch.branches) {
    remapped.branches = patch.branches.map(({ sourceId: oldId, ...branch }) => {
      if (oldId != null) branchIds.set(oldId, branch.id);
      return {
        ...remapDeep({ ...branch, conditions: undefined }, ids),
        conditions: remapConditions(branch.conditions, ids, warn, branch.name, used, true),
      };
    });
  }
  if (patch.translations) remapped.translations = remapTranslations(patch.translations, ids, subIds, branchIds, warn);
  // CSS braces aren't merge tags, so it keeps its sanitised text; it's checked again every time it renders.
  if (typeof patch.customCss === "string") {
    const { error } = checkCustomCss(patch.customCss);
    if (error) warn.add(null, `Custom CSS was not imported: ${error}`);
    remapped.customCss = error ? "" : patch.customCss;
  }

  const name = cleanText(title, IMPORT_LIMITS.maxTitleLength);
  if (hasMarkup(title)) warn.add(null, "Removed HTML from the form title.");
  const form = {
    title: name || "Imported form",
    description: remapTags(cleanText(description), ids),
    status: "Draft",
    category: category ? cleanText(category, 200) || null : null,
    tags: (Array.isArray(tags) ? tags : []).slice(0, 20).map((t) => cleanText(t, 60)).filter(Boolean),
    schema: { fields: canonical },
    settings: normalizeSettings(remapped),
    metadata: { import: { source: IMPORT_SOURCES.includes(source) ? source : "json", sourceId: /^[A-Za-z0-9_-]{1,64}$/.test(String(sourceId ?? "")) ? String(sourceId) : null } },
  };
  if (JSON.stringify(form).length > IMPORT_LIMITS.maxFormBytes) throw new ImportError("This form is too large to import.", "too_large");

  const layout = canonical.filter((f) => FIELD_TYPES[f.type].layout).length;
  return { form, warnings: warn.toList(), stats: { fieldCount: canonical.length - layout, layoutCount: layout } };
}
