// Maps a Typeform definition to a Geiger form (fetching lives in lib/server/typeform.js); logic that can't be expressed is named in `warnings`, never faked.
import { findFont } from "../fonts";
import { LOCALES } from "../i18n";
import { matchesConditions } from "../logic";
import { slugify } from "../schema";
import { ImportError, IMPORT_LIMITS, cleanText, cleanUrl, createWarnings, finalizeImport } from "./core";

export const TYPEFORM_ID = /^[A-Za-z0-9]{4,32}$/;
const TOKEN = /^[A-Za-z0-9_.:=-]{10,512}$/;

// Typeform type -> Geiger type (the group family and composites also get structural handling below).
export const TYPEFORM_TYPE_MAP = {
  short_text: "text",
  long_text: "textarea",
  email: "email",
  phone_number: "phone",
  website: "url",
  number: "number",
  multiple_choice: "select",
  dropdown: "dropdown",
  picture_choice: "picture",
  yes_no: "select",
  legal: "consent",
  rating: "rating",
  opinion_scale: "scale",
  nps: "nps",
  ranking: "ranking",
  date: "date",
  file_upload: "file",
  multi_format: "file",
  payment: "product",
  matrix: "matrix",
  address: "address",
  statement: "statement",
  calendly: "statement",
  group: "page",
  inline_group: "heading",
  contact_info: "heading",
};

// The form id from a bare id or a typeform.com link, else null; the only value ever placed in an API path.
export function parseTypeformId(input) {
  const raw = String(input ?? "").trim();
  if (!raw || raw.length > 2048) return null;
  if (TYPEFORM_ID.test(raw)) return raw;
  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || (host !== "typeform.com" && !host.endsWith(".typeform.com"))) return null;
  const match = url.pathname.match(/^\/(?:to|form|forms)\/([^/]+)(?:\/.*)?$/);
  return match && TYPEFORM_ID.test(match[1]) ? match[1] : null;
}

export function isValidTypeformToken(token) {
  return typeof token === "string" && TOKEN.test(token);
}

// --- Condition algebra over the flat { logic, conds } shape Geiger stores -----

const ALWAYS = { logic: "all", conds: [] };
const NEVER = { never: true };
const cannot = (why) => ({ cannot: true, why });
const isAlways = (e) => Boolean(e.conds) && e.conds.length === 0;
const sameLeaf = (a, b) => a.fieldId === b.fieldId && a.operator === b.operator && a.value === b.value;

function combine(logic, a, b) {
  const merged = [...a.conds];
  for (const leaf of b.conds) if (!merged.some((m) => sameLeaf(m, leaf))) merged.push(leaf);
  if (merged.length > IMPORT_LIMITS.maxConditions) return cannot("it needs too many conditions on one field");
  return { logic, conds: merged };
}

function and(a, b) {
  if (a.cannot) return a;
  if (b.cannot) return b;
  if (a.never || b.never) return NEVER;
  if (isAlways(a)) return b;
  if (isAlways(b)) return a;
  const flat = (e) => e.logic === "all" || e.conds.length === 1;
  return flat(a) && flat(b) ? combine("all", a, b) : cannot("it combines AND and OR in a way one field's conditions can't hold");
}

function or(a, b) {
  if (a.cannot) return a;
  if (b.cannot) return b;
  if (isAlways(a) || isAlways(b)) return ALWAYS;
  if (a.never) return b;
  if (b.never) return a;
  const flat = (e) => e.logic === "any" || e.conds.length === 1;
  return flat(a) && flat(b) ? combine("any", a, b) : cannot("it combines AND and OR in a way one field's conditions can't hold");
}

// A blank answer never matches a numeric comparison, so a numeric negation adds is_empty to keep blanks on the default path.
function negateLeaf(leaf) {
  const swap = (operator) => ({ logic: "all", conds: [{ ...leaf, operator }] });
  const numeric = (operator) => ({ logic: "any", conds: [{ ...leaf, operator }, { ...leaf, operator: "is_empty", value: "" }] });
  switch (leaf.operator) {
    case "equals":
      return swap("not_equals");
    case "not_equals":
      return swap("equals");
    case "contains":
      return swap("not_contains");
    case "not_contains":
      return swap("contains");
    case "is_empty":
      return swap("is_not_empty");
    case "is_not_empty":
      return swap("is_empty");
    case "gt":
      return numeric("lte");
    case "gte":
      return numeric("lt");
    case "lt":
      return numeric("gte");
    case "lte":
      return numeric("gt");
    default:
      return cannot(`"${leaf.operator.replace(/_/g, " ")}" has no opposite to hide fields with`);
  }
}

function not(e) {
  if (e.cannot) return e;
  if (e.never) return ALWAYS;
  if (isAlways(e)) return NEVER;
  const parts = e.conds.map(negateLeaf);
  return parts.reduce(e.logic === "all" ? or : and, e.logic === "all" ? NEVER : ALWAYS);
}

const OP_MAP = {
  is: "equals",
  equal: "equals",
  on: "equals",
  is_not: "not_equals",
  not_equal: "not_equals",
  not_on: "not_equals",
  begins_with: "starts_with",
  contains: "contains",
  not_contains: "not_contains",
  lower_than: "lt",
  lower_equal_than: "lte",
  greater_than: "gt",
  greater_equal_than: "gte",
};

// A Typeform condition tree -> flat expression, or { cannot, why } when it has no faithful equivalent.
function toExpression(cond, ctx, depth = 0) {
  if (!cond || typeof cond !== "object") return ALWAYS;
  if (cond.op === "always") return ALWAYS;
  if (depth > IMPORT_LIMITS.maxDepth) return cannot("its conditions are nested too deeply");
  const vars = Array.isArray(cond.vars) ? cond.vars : [];
  if (cond.op === "and" || cond.op === "or") {
    const parts = vars.map((v) => toExpression(v, ctx, depth + 1));
    return parts.reduce(cond.op === "and" ? and : or, cond.op === "and" ? ALWAYS : NEVER);
  }
  const operator = OP_MAP[cond.op];
  if (!operator) return cannot(`Geiger conditions have no "${String(cond.op).replace(/_/g, " ")}" comparison`);
  const subject = vars.find((v) => ["field", "hidden", "variable"].includes(v?.type));
  const other = vars.find((v) => v !== subject);
  if (!subject || !other) return cannot("its condition has an unexpected shape");
  if (!["choice", "constant"].includes(other.type)) return cannot("it compares two answers with each other");

  if (subject.type === "variable") {
    if (subject.value !== "score") return cannot(`it depends on the "${cleanText(subject.value, 60)}" variable`);
    return { logic: "all", conds: [{ fieldId: "__score", operator, value: String(other.value ?? "") }] };
  }
  const id = subject.type === "hidden" ? `hidden:${subject.value}` : String(subject.value);
  const info = ctx.byRef.get(id);
  if (!info) return cannot("its condition points at a field that wasn't found");
  if (info.composite) return cannot("Geiger conditions can't target one part of a matrix, address or contact block");
  if (other.type === "choice") {
    const label = info.choices?.get(String(other.value));
    if (label === undefined) return cannot("its condition points at a choice that wasn't found");
    return { logic: "all", conds: [{ fieldId: id, operator, value: label }] };
  }
  if (info.kind === "legal") {
    const accepted = operator === "not_equals" ? !other.value : Boolean(other.value);
    return { logic: "all", conds: [{ fieldId: id, operator: accepted ? "is_not_empty" : "is_empty", value: "" }] };
  }
  const value = info.kind === "yes_no" && typeof other.value === "boolean" ? (other.value ? "Yes" : "No") : String(other.value ?? "");
  return { logic: "all", conds: [{ fieldId: id, operator, value }] };
}

// --- Fields -------------------------------------------------------------------

const isObject = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const refOf = (f, i) => String(f.ref || f.id || `field-${i}`);
const props = (f) => (isObject(f.properties) ? f.properties : {});
const rules = (f) => (isObject(f.validations) ? f.validations : {});

// Typeform's *bold* and _italic_ markers are removed because Geiger titles are plain text.
function stripEmphasis(text) {
  return text.replace(/\*{1,2}(\S(?:[^*\n]*\S)?)\*{1,2}/g, "$1").replace(/(^|[\s(])_([^\s_](?:[^_\n]*[^\s_])?)_(?=$|[\s.,;:!?)])/g, "$1$2");
}

// {{field:ref}} / {{hidden:x}} / {{var:score}} recall -> Geiger merge tags; finalizeImport remaps them to fresh ids.
function translateText(value, ctx, subject) {
  if (value == null || typeof value === "object") return "";
  const raw = String(value).slice(0, IMPORT_LIMITS.maxTextLength * 2);
  const plain = stripEmphasis(raw);
  if (plain !== raw) ctx.emphasis += 1;
  return plain.replace(/\{\{\s*([a-z_]+)\s*:\s*([^{}]*?)\s*\}\}/gi, (match, kind, ref) => {
    const scope = kind.toLowerCase();
    if (scope === "field" && ctx.recallable.has(ref)) return `{${ref}}`;
    if (scope === "hidden" && ctx.hiddenNames.has(ref)) return `{hidden:${ref}}`;
    if ((scope === "var" || scope === "variable") && ref === "score") return "{score}";
    ctx.warn.add(subject, `Removed a piece of recalled information Geiger can't fill in (${scope}: ${cleanText(ref, 60)}).`);
    return "";
  });
}

// Choice labels are unique Geiger option strings; returns { labels, map (ref/id -> label), images }.
function readChoices(f, ctx, title) {
  const list = Array.isArray(props(f).choices) ? props(f).choices : [];
  const labels = [];
  const map = new Map();
  const images = {};
  const taken = new Set();
  list.slice(0, IMPORT_LIMITS.maxOptions).forEach((choice, i) => {
    if (!isObject(choice)) return;
    let label = cleanText(translateText(choice.label, ctx, title), IMPORT_LIMITS.maxTitleLength) || `Option ${i + 1}`;
    if (taken.has(label)) {
      ctx.warn.add(title, `Two choices share the label "${label}", so one was renamed.`);
      label = `${label} (${i + 1})`;
    }
    taken.add(label);
    labels.push(label);
    if (choice.ref != null) map.set(String(choice.ref), label);
    if (choice.id != null) map.set(String(choice.id), label);
    if (choice.attachment?.href) images[label] = { url: choice.attachment.href, alt: label };
  });
  if (list.length > IMPORT_LIMITS.maxOptions) ctx.warn.add(title, `Only the first ${IMPORT_LIMITS.maxOptions} choices were kept.`);
  return { labels, map, images };
}

function warnFlags(f, ctx, title) {
  const p = props(f);
  if (p.randomize) ctx.warn.add(title, "Randomised choice order isn't supported, so choices keep their listed order.");
  if (p.allow_other_choice) ctx.warn.add(title, 'The free-text "Other" answer became a plain "Other" choice with no text box.');
}

const SIMPLE = {
  short_text: (f) => ({ type: "text", validation: rules(f).max_length ? { maxLength: rules(f).max_length } : undefined }),
  long_text: (f) => ({ type: "textarea", validation: rules(f).max_length ? { maxLength: rules(f).max_length } : undefined }),
  email: () => ({ type: "email" }),
  website: () => ({ type: "url" }),
  date: () => ({ type: "date" }),
  file_upload: () => ({ type: "file", config: { maxFiles: 1, maxSizeMb: 10 } }),
  number: (f) => {
    const { min_value: min, max_value: max } = rules(f);
    return { type: "number", validation: min != null || max != null ? { min: min ?? undefined, max: max ?? undefined } : undefined };
  },
  phone_number: (f, ctx, title) => {
    if (props(f).default_country_code) ctx.warn.add(title, "The default country code wasn't kept, so respondents type the full number.");
    return { type: "phone" };
  },
  multi_format: (f, ctx, title) => {
    ctx.warn.add(title, "Video and audio answers aren't supported, so this became a file upload.");
    return { type: "file", config: { maxFiles: 1, maxSizeMb: 10 } };
  },
  yes_no: () => ({ type: "select", options: ["Yes", "No"], kind: "yes_no", choices: new Map([["true", "Yes"], ["false", "No"]]) }),
  legal: () => ({ type: "consent", kind: "legal" }),
  rating: (f, ctx, title) => {
    const shape = props(f).shape;
    if (shape && shape !== "star") ctx.warn.add(title, `The "${cleanText(shape, 30)}" rating icon became stars.`);
    return { type: "rating", config: { max: Math.min(10, Math.max(3, Number(props(f).steps) || 5)) } };
  },
  opinion_scale: (f, ctx, title) => {
    const p = props(f);
    const labels = isObject(p.labels) ? p.labels : {};
    if (labels.center) ctx.warn.add(title, `The middle scale label "${cleanText(labels.center, 60)}" was dropped.`);
    const min = p.start_at_one === false ? 0 : 1;
    const steps = Math.min(21, Math.max(2, Number(p.steps) || 10));
    return { type: "scale", config: { min, max: min + steps - 1, minLabel: labels.left || "", maxLabel: labels.right || "" } };
  },
  nps: (f, ctx, title) => {
    const labels = isObject(props(f).labels) ? props(f).labels : {};
    if (labels.center) ctx.warn.add(title, `The middle scale label "${cleanText(labels.center, 60)}" was dropped.`);
    return { type: "nps", config: { minLabel: labels.left || "", maxLabel: labels.right || "" } };
  },
  statement: (f, ctx, title) => {
    const button = props(f).button_text;
    if (button && button !== "Continue") ctx.warn.add(title, `The custom button text "${cleanText(button, 60)}" was dropped.`);
    return { type: "statement", required: false };
  },
  calendly: (f, ctx, title) => {
    const url = cleanUrl(props(f).calendly_url ?? props(f).url);
    ctx.warn.add(title, `Calendly scheduling isn't supported, so this became a text block${url ? " showing the link" : ""}. Use a Booking slot field for native scheduling.`);
    return { type: "statement", required: false, hint: [translateText(props(f).description, ctx, title), url].filter(Boolean).join("\n\n") };
  },
};

function mapChoice(f, ctx, title, type) {
  warnFlags(f, ctx, title);
  const { labels, map } = readChoices(f, ctx, title);
  if (props(f).allow_other_choice) labels.push("Other");
  const options = props(f).alphabetical_order ? [...labels].sort((a, b) => a.localeCompare(b)) : labels;
  const { min_selection: minSelect, max_selection: maxSelect } = rules(f);
  const validation = minSelect != null || maxSelect != null ? { minSelect: minSelect ?? undefined, maxSelect: maxSelect ?? undefined } : undefined;
  return { type, options, choices: map, validation };
}

function mapPicture(f, ctx, title) {
  warnFlags(f, ctx, title);
  const p = props(f);
  const { labels, map, images } = readChoices(f, ctx, title);
  if (p.allow_other_choice) labels.push("Other");
  const missing = labels.filter((l) => !images[l] && l !== "Other");
  if (missing.length) ctx.warn.add(title, `${missing.length} picture choice${missing.length === 1 ? " has" : "s have"} no image.`);
  if (Object.keys(images).length) ctx.hotlinked = true;
  return { type: p.allow_multiple_selection ? "multipicture" : "picture", options: labels, choices: map, config: { images, hideLabels: p.show_labels === false, columns: p.supersized ? 2 : 3 } };
}

function mapMatrix(f, ctx, title) {
  const rows = Array.isArray(props(f).fields) ? props(f).fields.filter(isObject).slice(0, IMPORT_LIMITS.maxOptions) : [];
  const first = rows[0] ? readChoices(rows[0], ctx, title).labels : [];
  const signature = JSON.stringify(first);
  rows.forEach((row) => {
    ctx.byRef.set(refOf(row, 0), { composite: true });
    if (JSON.stringify(readChoices(row, ctx, title).labels) !== signature) ctx.warn.add(title, "Matrix rows had different choices, so every row now uses the first row's columns.");
    if (props(row).allow_multiple_selection) ctx.warn.add(title, "Matrix rows that allowed several answers now take one answer per row.");
  });
  const required = rows.some((row) => rules(row).required) || Boolean(rules(f).required);
  return { type: "matrix", options: first, required, config: { rows: rows.map((row, i) => cleanText(translateText(row.title, ctx, title), IMPORT_LIMITS.maxTitleLength) || `Row ${i + 1}`) } };
}

function mapAddress(f, ctx) {
  const parts = Array.isArray(props(f).fields) ? props(f).fields.filter(isObject) : [];
  parts.forEach((part, i) => ctx.byRef.set(refOf(part, i), { composite: true }));
  return { type: "address", required: parts.some((part) => rules(part).required) || Boolean(rules(f).required) };
}

function mapPayment(f, ctx, title, definition) {
  const p = props(f);
  const price = isObject(p.price) ? p.price : {};
  let amount = Number(price.value);
  if (price.type === "variable") {
    const start = isObject(definition.variables) ? Number(definition.variables[price.value]) : NaN;
    amount = Number.isFinite(start) ? start : 0;
    ctx.warn.add(title, `The price came from the "${cleanText(price.value, 60)}" variable, so it's fixed at its starting value (${amount}). Check it, because answer-based price changes weren't carried over.`);
  }
  const currency = /^[A-Za-z]{3}$/.test(String(p.currency || "")) ? String(p.currency).toLowerCase() : "usd";
  ctx.settings.payments = { ...ctx.settings.payments, currency };
  ctx.warn.add(title, "Payment became a Product field. Payments stay off until you enable them in the Payments section and connect Stripe.");
  return { type: "product", config: { price: Number.isFinite(amount) ? Math.max(0, amount) : 0, quantityMode: "fixed", currency } };
}

function mapType(f, ctx, title, definition) {
  const type = String(f.type);
  if (Object.hasOwn(SIMPLE, type)) return SIMPLE[type](f, ctx, title);
  switch (type) {
    case "multiple_choice":
      return mapChoice(f, ctx, title, props(f).allow_multiple_selection ? "multiselect" : "select");
    case "dropdown":
      return mapChoice(f, ctx, title, "dropdown");
    case "ranking":
      return mapChoice(f, ctx, title, "ranking");
    case "picture_choice":
      return mapPicture(f, ctx, title);
    case "matrix":
      return mapMatrix(f, ctx, title);
    case "address":
      return mapAddress(f, ctx);
    case "payment":
      return mapPayment(f, ctx, title, definition);
    default:
      ctx.warn.add(title, `Typeform's "${cleanText(type, 60)}" question isn't recognised, so it became short text.`);
      return { type: "text" };
  }
}

// A question's image or video becomes its own block just above it.
function pushAttachment(f, ctx, title, ref) {
  const attachment = isObject(f.attachment) ? f.attachment : isObject(f.layout?.attachment) ? f.layout.attachment : null;
  if (!attachment?.href) return;
  const url = cleanUrl(attachment.href);
  if (!url) {
    ctx.warn.add(title, "Removed an attachment whose link wasn't http or https.");
    return;
  }
  const type = attachment.type === "video" ? "video" : "image";
  const description = isObject(attachment.properties) ? attachment.properties.description : "";
  ctx.warn.add(title, `The ${type} attached to this question became a separate block above it.`);
  if (type === "image") ctx.hotlinked = true;
  ctx.fields.push({ id: `${ref}:media`, type, title: `${title || "Question"} ${type}`, label: "", config: { url, alt: description || "" } });
}

function pushGroupHeader(f, ctx, title, ref, asPage) {
  const description = translateText(props(f).description, ctx, title);
  if (asPage) {
    ctx.fields.push({ id: ref, type: "page", title: title || "Section" });
    if (description) ctx.fields.push({ id: `${ref}:intro`, type: "content", title: "Section intro", label: "", hint: description });
  } else {
    ctx.fields.push({ id: ref, type: "heading", title: title || "Section", label: title || "Section", hint: description });
  }
  ctx.hasContent = true;
}

function pushGroup(f, ctx, title, ref, depth, definition) {
  const start = ctx.fields.length;
  // Hidden fields collect nothing on screen, so a group with nothing visible before it opens the first page instead of an empty one.
  const asPage = f.type === "group" && ctx.hasContent && depth === 0;
  const button = props(f).button_text;
  if (button && button !== "Continue") ctx.warn.add(title, `The custom button text "${cleanText(button, 60)}" was dropped.`);
  pushGroupHeader(f, ctx, title, ref, asPage);
  pushAttachment(f, ctx, title, ref);
  ctx.afterGroup = false;
  flatten(props(f).fields, ctx, depth + 1, definition);
  ctx.byRef.set(ref, { start, end: ctx.fields.length - 1, composite: true, group: true });
  // Questions after a multi-question section need their own page, or they'd be skipped along with it.
  if (f.type === "group") ctx.afterGroup = true;
}

function flatten(list, ctx, depth, definition) {
  if (!Array.isArray(list)) return;
  if (depth > IMPORT_LIMITS.maxDepth) {
    ctx.warn.add(null, `Groups nested more than ${IMPORT_LIMITS.maxDepth} levels deep were dropped.`);
    return;
  }
  for (const [i, f] of list.entries()) {
    if (!isObject(f)) continue;
    if (ctx.fields.length >= IMPORT_LIMITS.maxFields) {
      ctx.warn.add(null, `Only the first ${IMPORT_LIMITS.maxFields} fields were imported.`);
      return;
    }
    let ref = refOf(f, i);
    if (ctx.byRef.has(ref)) {
      ctx.warn.add(cleanText(f.title), "This question reused another question's reference, so logic pointing at it may land on the first one.");
      ref = `${ref}:dup${ctx.fields.length}`;
    }
    const title = translateText(f.title, ctx, cleanText(f.title));
    const name = cleanText(title, IMPORT_LIMITS.maxTitleLength);
    const start = ctx.fields.length;
    const isGroup = ["group", "inline_group", "contact_info"].includes(f.type);
    if (ctx.afterGroup && depth === 0 && f.type !== "group") {
      ctx.fields.push({ id: `${ref}:page`, type: "page", title: "Continued" });
      ctx.afterGroup = false;
    }
    if (isGroup) {
      pushGroup(f, ctx, title, ref, depth, definition);
      continue;
    }
    pushAttachment(f, ctx, name, ref);
    const { kind, choices, required, hint, ...mapped } = mapType(f, ctx, name, definition);
    ctx.fields.push({
      id: ref,
      title,
      label: title,
      hint: hint ?? translateText(props(f).description, ctx, name),
      required: required ?? Boolean(rules(f).required),
      ...mapped,
    });
    ctx.hasContent = true;
    const end = ctx.fields.length - 1;
    ctx.byRef.set(ref, { start, end, kind, choices, multi: mapped.type === "multiselect" || mapped.type === "multipicture", composite: mapped.type === "matrix" || mapped.type === "address" });
  }
}

// Every field reference that can be recalled, gathered first because recall can point forward.
function collectRecallable(list, ctx, depth = 0) {
  if (!Array.isArray(list) || depth > IMPORT_LIMITS.maxDepth) return;
  for (const [i, f] of list.entries()) {
    if (!isObject(f)) continue;
    ctx.recallable.add(refOf(f, i));
    if (["group", "inline_group", "contact_info"].includes(f.type)) collectRecallable(props(f).fields, ctx, depth + 1);
  }
}

// --- Logic --------------------------------------------------------------------

function exprOf(field) {
  return field.expr || ALWAYS;
}

const hasMetric = (e) => Boolean(e.conds?.some((c) => c.fieldId === "__score"));

// Rules are disjoint when each tests a different value of one single-answer field, so first-match order can't matter.
function rulesAreDisjoint(conditional, ctx) {
  if (conditional.length < 2) return true;
  const leaves = conditional.map((r) => (r.expr.conds?.length === 1 ? r.expr.conds[0] : null));
  if (leaves.some((l) => !l || l.operator !== "equals")) return false;
  const info = ctx.byRef.get(leaves[0].fieldId);
  return !info?.multi && leaves.every((l) => l.fieldId === leaves[0].fieldId) && new Set(leaves.map((l) => l.value)).size === leaves.length;
}

// When a field shows, given the jump source was reached: which rules leave it on the respondent's path.
function shownGivenReached(rulesList, index) {
  const alwaysRule = rulesList.find((r) => r.always);
  if (alwaysRule && alwaysRule.target > index) {
    return rulesList.filter((r) => !r.always && r.target <= index).reduce((acc, r) => or(acc, r.expr), NEVER);
  }
  return rulesList.filter((r) => !r.always && r.target > index).reduce((acc, r) => and(acc, not(r.expr)), ALWAYS);
}

// Fully resolved show rule: unreached sources skip nothing, and a blank source answer already passes when `given` only tests that source.
function shownExpression(given, reach, sourceId) {
  if (given.cannot || isAlways(reach)) return given;
  const onlySource = given.conds?.length && given.conds.every((c) => c.fieldId === sourceId);
  if (onlySource && matchesConditions(given.conds, given.logic, {})) return given;
  return or(not(reach), given);
}

function applyJumps(ctx, sourceIndex, jumps, endings) {
  const fields = ctx.fields;
  const sourceName = sourceIndex >= 0 ? cleanText(fields[sourceIndex].title, IMPORT_LIMITS.maxTitleLength) : "Hidden field logic";
  const reach = sourceIndex >= 0 ? exprOf(fields[sourceIndex]) : ALWAYS;
  const parsed = [];
  for (const jump of jumps) {
    const to = jump.details?.to;
    const expr = toExpression(jump.condition, ctx);
    const always = !jump.condition || jump.condition.op === "always";
    if (expr.cannot) {
      ctx.warn.add(sourceName, `A logic jump was dropped because ${expr.why}, so respondents continue to the next question instead.`);
      continue;
    }
    let target;
    let ending = null;
    if (to?.type === "thankyou" || to?.type === "outro") {
      ending = endings.get(String(to.value));
      if (!ending) {
        ctx.warn.add(sourceName, "A logic jump was dropped because its thank-you screen wasn't found.");
        continue;
      }
      target = fields.length;
    } else {
      const info = ctx.byRef.get(String(to?.value));
      if (!info || info.start === undefined) {
        ctx.warn.add(sourceName, "A logic jump was dropped because its target question wasn't found.");
        continue;
      }
      target = info.start;
      if (target <= sourceIndex) {
        ctx.warn.add(sourceName, "A logic jump back to an earlier question was dropped, because Geiger forms only move forward.");
        continue;
      }
    }
    parsed.push({ expr, always, target, ending, title: to?.value });
    if (always) break;
  }
  if (!parsed.length) return;

  const conditional = parsed.filter((r) => !r.always);
  if (!rulesAreDisjoint(conditional, ctx)) {
    ctx.warn.add(sourceName, "Several jump rules here can match at once. Typeform follows the first match, while Geiger hides the questions of every matching rule.");
  }

  const unexpressed = new Set();
  const skipped = new Set();
  for (let i = sourceIndex + 1; i < fields.length; i += 1) {
    const field = fields[i];
    // Page breaks are decided after all jumps; a hidden field never takes a condition.
    if (field.type === "page" || field.type === "hidden") continue;
    if (!parsed.some((r) => r.target > i)) continue;
    const given = shownGivenReached(parsed, i);
    if (!given.never && !given.cannot && hasMetric(given)) {
      unexpressed.add(cleanText(field.title));
      continue;
    }
    const shown = given.never ? (isAlways(reach) ? NEVER : not(reach)) : shownExpression(given, reach, sourceIndex >= 0 ? fields[sourceIndex].id : null);
    const next = and(exprOf(field), shown);
    if (next.cannot) unexpressed.add(cleanText(field.title));
    else if (next.never) skipped.add(field);
    else field.expr = next;
  }
  for (const field of skipped) {
    field.included = false;
    ctx.warn.add(cleanText(field.title), "Logic jumps always skip this question, so it was imported switched off.");
  }
  if (unexpressed.size) {
    ctx.warn.add(sourceName, `A logic jump can't be fully expressed as show/hide rules, so these may still show when Typeform would skip them: ${[...unexpressed].join(", ")}.`);
  }

  // A jump to a thank-you screen also routes to that ending.
  const priorRules = [];
  for (const rule of parsed) {
    const fire = rule.always ? priorRules.reduce((acc, r) => and(acc, not(r)), ALWAYS) : rule.expr;
    if (!rule.always) priorRules.push(rule.expr);
    if (!rule.ending || rule.ending.isDefault) continue;
    const when = and(reach, fire);
    if (when.cannot || when.never) {
      ctx.warn.add(sourceName, `The jump to the "${cleanText(rule.ending.title)}" ending couldn't be expressed, so that ending won't be reached from here.`);
    } else if (isAlways(when)) {
      ctx.defaultEnding = rule.ending;
    } else {
      ctx.branches.push({ name: rule.ending.title || "Ending", outcome: rule.ending.title || "", conditionLogic: when.logic, conditions: when.conds, ending: rule.ending.ending });
    }
  }
}

// Fixed add/subtract on `score` per chosen option is what Geiger's option points express; other calculations are named and dropped.
function applyCalculation(ctx, sourceName, action) {
  const target = action.details?.target;
  const value = action.details?.value;
  const verb = String(action.action);
  if (target?.value !== "score") {
    ctx.warn.add(sourceName, `The calculation on the "${cleanText(target?.value, 60)}" variable was dropped, because Geiger only scores a total.`);
    return;
  }
  const points = Number(value?.value);
  const expr = toExpression(action.condition, ctx);
  const leaf = expr.conds?.length === 1 ? expr.conds[0] : null;
  const field = leaf ? ctx.fields.find((f) => f.id === leaf.fieldId) : null;
  const usable = ["add", "subtract"].includes(verb) && value?.type === "constant" && Number.isFinite(points) && leaf?.operator === "equals" && field?.options?.includes(leaf.value);
  if (!usable) {
    ctx.warn.add(sourceName, `A score calculation (${cleanText(verb, 20)}) was dropped, because Geiger scores only fixed points per chosen option.`);
    return;
  }
  field.optionPoints = field.optionPoints || {};
  field.optionPoints[leaf.value] = (field.optionPoints[leaf.value] || 0) + (verb === "add" ? points : -points);
  ctx.settings.scoringEnabled = true;
}

function translateLogic(definition, ctx, endings) {
  const logic = Array.isArray(definition.logic) ? definition.logic.filter(isObject) : [];
  let budget = 2000;
  const blocks = logic.map((block) => {
    const ref = block.type === "hidden" ? `hidden:${block.ref}` : String(block.ref);
    const info = ctx.byRef.get(ref);
    const isHidden = block.type === "hidden";
    return { block, ref, index: isHidden ? -1 : info?.end ?? null };
  });
  for (const { index, ref } of blocks) {
    if (index === null) ctx.warn.add(null, `Logic on a question that wasn't found was dropped (${cleanText(ref, 60)}).`);
  }
  blocks
    .filter((b) => b.index !== null)
    .sort((a, b) => a.index - b.index)
    .forEach(({ block, index, ref }) => {
      const actions = (Array.isArray(block.actions) ? block.actions : []).filter(isObject);
      budget -= actions.length;
      if (budget < 0) {
        ctx.warn.add(null, "This form has too much logic to translate, so the remainder was dropped.");
        return;
      }
      const sourceName = cleanText(ctx.fields[index]?.title ?? ref, IMPORT_LIMITS.maxTitleLength);
      const jumps = actions.filter((a) => a.action === "jump");
      applyJumps(ctx, index, jumps, endings);
      for (const action of actions.filter((a) => a.action !== "jump")) applyCalculation(ctx, sourceName, action);
    });
}

// A page's rule lives on its break when every question on it shares the rule (a page skip).
function liftPageSkips(fields) {
  let i = 0;
  while (i < fields.length) {
    if (fields[i].type !== "page") {
      i += 1;
      continue;
    }
    let end = i + 1;
    while (end < fields.length && fields[end].type !== "page") end += 1;
    const children = fields.slice(i + 1, end);
    const first = children[0]?.expr;
    const key = (e) => (e && e.conds?.length ? JSON.stringify([e.logic, e.conds]) : "");
    if (first && key(first) && children.every((c) => key(c.expr) === key(first))) {
      fields[i].expr = first;
      for (const child of children) delete child.expr;
    }
    i = end;
  }
}

// --- Screens, settings, theme -------------------------------------------------

function mapEnding(screen, ctx) {
  const p = props(screen);
  const title = translateText(screen.title, ctx, cleanText(screen.title));
  const name = cleanText(title) || "Thank-you screen";
  const ending = { enabled: true, title, text: translateText(p.description, ctx, name), buttonLabel: "", buttonUrl: "", redirectUrl: "" };
  if (screen.type === "url_redirect") {
    ending.redirectUrl = cleanUrl(translateText(p.redirect_url, ctx, name));
    if (p.redirect_url && !ending.redirectUrl) ctx.warn.add(name, "Removed a redirect that wasn't http or https.");
  } else if (p.show_button && p.button_mode === "redirect" && p.redirect_url) {
    ending.buttonUrl = cleanUrl(translateText(p.redirect_url, ctx, name));
    ending.buttonLabel = ending.buttonUrl ? p.button_text || "Continue" : "";
    if (!ending.buttonUrl) ctx.warn.add(name, "Removed a button link that wasn't http or https.");
  }
  if (screen.attachment?.href) ctx.warn.add(name, "The image on this screen was dropped.");
  return { title: name, ending, ref: String(screen.ref ?? screen.id ?? ""), isDefault: false };
}

function mapScreens(definition, ctx) {
  const welcome = Array.isArray(definition.welcome_screens) ? definition.welcome_screens.filter(isObject) : [];
  if (welcome.length) {
    const screen = welcome[0];
    const name = cleanText(screen.title) || "Welcome screen";
    const p = props(screen);
    ctx.settings.welcome = { enabled: true, title: translateText(screen.title, ctx, name), body: translateText(p.description, ctx, name), buttonLabel: p.button_text || "Start" };
    if (screen.attachment?.href) ctx.warn.add(name, "The image on this screen was dropped.");
    if (welcome.length > 1) ctx.warn.add(null, `Only the first of ${welcome.length} welcome screens was imported.`);
  }
  const all = (Array.isArray(definition.thankyou_screens) ? definition.thankyou_screens : []).filter(isObject).map((s) => mapEnding(s, ctx));
  const real = all.filter((e) => e.ref !== "default_tys");
  const endings = new Map();
  for (const e of all) if (e.ref) endings.set(e.ref, e);
  if (all.length && !real.length) {
    ctx.warn.add(null, "Typeform's default thank-you screen was replaced with Geiger's.");
    all[0].isDefault = true;
  }
  if (real.length) {
    real[0].isDefault = true;
    ctx.defaultEnding = real[0];
    for (const e of all) if (e.ref === "default_tys") e.isDefault = true;
  }
  return { endings, real };
}

function applyDefaultEnding(ctx) {
  const chosen = ctx.defaultEnding;
  if (!chosen) return;
  const { ending } = chosen;
  if (cleanText(ending.title)) ctx.settings.thankYouTitle = ending.title;
  if (cleanText(ending.title) || ending.text) ctx.settings.thankYouText = ending.text;
  if (ending.redirectUrl) {
    ctx.settings.thankYouType = "redirect";
    ctx.settings.thankYouUrl = ending.redirectUrl;
  }
  if (ending.buttonUrl) ctx.warn.add(chosen.title, "The default ending can't show a button, so its link was dropped.");
}

const HEX = /^#[0-9a-f]{6}$/i;

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// The theme basics Geiger can hold: accent, light or dark canvas, font, corners and a background image.
function mapTheme(theme, ctx) {
  if (!isObject(theme)) return;
  const colors = isObject(theme.colors) ? theme.colors : null;
  if (!colors && !theme.font) {
    ctx.warn.add(null, "The Typeform theme couldn't be read, so the form uses the default look. Give the token themes:read to bring it across.");
    return;
  }
  const out = {};
  if (colors) {
    if (HEX.test(colors.button || "")) out.accent = colors.button;
    if (HEX.test(colors.background || "")) out.mode = luminance(colors.background) > 0.5 ? "light" : "dark";
    if (colors.question || colors.answer) ctx.warn.add(null, "Theme text colours became the suite's light or dark palette.");
  }
  if (theme.font) {
    const id = slugify(theme.font);
    if (findFont(id)) out.font = id;
    else ctx.warn.add(null, `The "${cleanText(theme.font, 60)}" theme font isn't in Geiger's font library, so the default was used.`);
  }
  const radius = { none: "none", small: "sm", large: "lg" }[theme.rounded_corners];
  if (radius) out.radius = radius;
  const background = isObject(theme.background) ? cleanUrl(theme.background.href) : "";
  if (background) {
    out.background = "image";
    ctx.settings.coverUrl = background;
    ctx.hotlinked = true;
  }
  ctx.settings.theme = out;
}

const DROPPED_SETTINGS = [
  [(s) => s.google_analytics, "Google Analytics tracking"],
  [(s) => s.google_tag_manager, "Google Tag Manager"],
  [(s) => s.facebook_pixel, "the Facebook pixel"],
  [(s) => s.show_cookie_consent, "the cookie consent banner"],
  [(s) => s.free_form_navigation, "free-form question navigation"],
  [(s) => s.use_lead_qualification, "lead qualification"],
  [(s) => s.capabilities?.e2e_encryption?.enabled, "end-to-end encryption"],
];

function mapSettings(definition, ctx) {
  const s = isObject(definition.settings) ? definition.settings : {};
  if (s.show_progress_bar === false) ctx.settings.progressBar = false;
  const locale = String(s.language || definition.language || "").toLowerCase().split("-")[0];
  if (locale && LOCALES.some((l) => l.value === locale)) ctx.settings.locale = locale;
  else if (locale) ctx.warn.add(null, `The form language "${cleanText(locale, 20)}" has no built-in text in Geiger, so respondent buttons stay in English.`);
  const redirect = cleanUrl(s.redirect_after_submit_url);
  if (redirect) {
    ctx.settings.thankYouType = "redirect";
    ctx.settings.thankYouUrl = redirect;
  } else if (s.redirect_after_submit_url) {
    ctx.warn.add(null, "Removed a redirect after submit that wasn't http or https.");
  }
  const dropped = DROPPED_SETTINGS.filter(([test]) => test(s)).map(([, label]) => label);
  if (dropped.length) ctx.warn.add(null, `Not carried over: ${dropped.join(", ")}.`);
  const score = isObject(definition.variables) ? Number(definition.variables.score) : 0;
  if (score) ctx.warn.add(null, `The score started at ${score} in Typeform. Geiger scores start at 0.`);
}

// Parses a Typeform definition into a sanitised Geiger draft: { form, warnings, stats }.
export function mapTypeformForm(definition) {
  if (!isObject(definition) || (!Array.isArray(definition.fields) && !definition.title)) {
    throw new ImportError("That doesn't look like a Typeform form definition.");
  }
  const warn = createWarnings();
  const ctx = {
    warn,
    fields: [],
    byRef: new Map(),
    recallable: new Set(),
    hiddenNames: new Set(),
    settings: { layout: "conversational" },
    branches: [],
    defaultEnding: null,
    emphasis: 0,
    hotlinked: false,
    hasContent: false,
    afterGroup: false,
  };
  const hidden = (Array.isArray(definition.hidden) ? definition.hidden : []).filter((name) => typeof name === "string" && name).slice(0, 100);
  for (const name of hidden) {
    ctx.hiddenNames.add(name);
    const id = `hidden:${name}`;
    ctx.byRef.set(id, { start: ctx.fields.length, end: ctx.fields.length });
    ctx.fields.push({ id, type: "hidden", title: name, label: name, prefillKey: name });
  }
  collectRecallable(definition.fields, ctx);

  mapSettings(definition, ctx);
  const { endings, real } = mapScreens(definition, ctx);
  flatten(definition.fields, ctx, 0, definition);
  mapTheme(definition.theme, ctx);
  translateLogic(definition, ctx, endings);
  applyDefaultEnding(ctx);

  const logicBlocks = Array.isArray(definition.logic) ? definition.logic : [];
  const jumpedTo = new Set(logicBlocks.flatMap((b) => (Array.isArray(b?.actions) ? b.actions : []).map((a) => String(a?.details?.to?.value))));
  for (const ending of real.slice(1)) {
    if (!jumpedTo.has(ending.ref)) ctx.warn.add(ending.title, "No logic jump leads to this thank-you screen, so it was dropped.");
  }
  if (ctx.branches.length) {
    ctx.settings.branchingEnabled = true;
    ctx.settings.branches = ctx.branches;
  }
  if (ctx.emphasis) warn.add(null, `Bold and italic formatting was removed from ${ctx.emphasis} piece${ctx.emphasis === 1 ? "" : "s"} of text.`);
  if (ctx.hotlinked) warn.add(null, "Images still load from Typeform's servers and will break if they're removed there. Re-upload anything you need to keep.");

  liftPageSkips(ctx.fields);
  const fields = ctx.fields.map(({ expr, ...field }) => ({
    ...field,
    conditions: expr?.conds ?? [],
    conditionLogic: expr?.logic ?? "all",
  }));
  return finalizeImport({
    source: "typeform",
    sourceId: TYPEFORM_ID.test(String(definition.id ?? "")) ? definition.id : null,
    title: translateText(definition.title, ctx, null),
    description: isObject(definition.settings?.meta) ? definition.settings.meta.description : "",
    fields,
    settings: ctx.settings,
    warnings: warn,
  });
}
