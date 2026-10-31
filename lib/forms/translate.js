// Respondent-facing translation of form content. Translations only change what's displayed: answers, logic, scoring and exports keep the source text.
//
// Stored as settings.translations[locale] = { "<key>": "text" }, with keys built by the helpers below; a blank or stale key falls back to the source.

import { hasOptions } from "./field-types";
import { LOCALES } from "./i18n";

const FORM_KEYS = [
  ["title", (f) => f.title, "Form title"],
  ["description", (f) => f.description, "Form description", true],
  ["welcome.title", (f) => f.settings?.welcome?.enabled && f.settings.welcome.title, "Welcome title"],
  ["welcome.body", (f) => f.settings?.welcome?.enabled && f.settings.welcome.body, "Welcome text", true],
  ["welcome.buttonLabel", (f) => f.settings?.welcome?.enabled && f.settings.welcome.buttonLabel, "Welcome button"],
  ["sideEyebrow", (f) => f.settings?.sideEyebrow, "Side panel eyebrow"],
  ["sideHeadline", (f) => f.settings?.sideHeadline, "Side panel headline"],
  ["sideTags", (f) => f.settings?.sideTags, "Side panel tags"],
  ["sideCredit", (f) => f.settings?.sideCredit, "Side panel credit"],
  ["thankYouTitle", (f) => f.settings?.thankYouTitle, "Ending title"],
  ["thankYouText", (f) => f.settings?.thankYouText, "Ending text", true],
  ["attestation.statement", (f) => f.settings?.attestation?.enabled && f.settings.attestation.statement, "Attestation", true],
  ["policy.title", (f) => f.settings?.policy?.enabled && f.settings.policy.title, "Policy title"],
  ["policy.body", (f) => f.settings?.policy?.enabled && f.settings.policy.body, "Policy text", true],
];
const FIELD_KEYS = [["hint", "Help text", true], ["placeholder", "Placeholder"], ["info", "More info", true]];
const CONFIG_KEYS = [["minLabel", "Low label"], ["maxLabel", "High label"], ["buttonLabel", "Button"]];
const ENDING_KEYS = [["title", "title"], ["text", "text", true], ["buttonLabel", "button"]];

const sourceLabel = (field) => field.label || field.title || "";

// Translated languages a respondent can pick, the form's own language first.
export function availableLocales(settings) {
  const base = settings?.locale || "en";
  const added = Object.keys(settings?.translations || {}).filter((code) => code !== base && LOCALES.some((l) => l.value === code));
  return [base, ...added];
}

// The best available language for a tag like "pt-BR", or null.
export function matchLocale(settings, requested) {
  const code = String(requested || "").toLowerCase().split(/[-_]/)[0];
  return code && availableLocales(settings).includes(code) ? code : null;
}

// The strings for a language, or null for the form's own language (and anything unknown).
export function translationStrings(settings, locale) {
  const all = settings?.translations;
  if (!locale || locale === settings?.locale || !all || !Object.hasOwn(all, locale)) return null;
  return all[locale] && typeof all[locale] === "object" ? all[locale] : null;
}

const read = (strings, key, source) => {
  const value = strings?.[key];
  return typeof value === "string" && value.trim() ? value : source;
};

// Source → display text for a list; a repeated translation stays in the source, so a display value always maps back to one answer.
function displayMap(field, list, kind, strings) {
  const out = new Map();
  const seen = new Set();
  for (const item of list) {
    const text = read(strings, `f.${field.id}.${kind}.${item}`, item);
    if (seen.has(text)) {
      out.set(item, item);
      continue;
    }
    seen.add(text);
    out.set(item, text);
  }
  return out;
}

const swap = (map, value) => (map.has(value) ? map.get(value) : value);
const reverse = (map) => new Map([...map].map(([source, text]) => [text, source]));

function convertValue(field, value, options, rows) {
  if (field.type === "matrix" && value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([row, col]) => [swap(rows, row), swap(options, col)]));
  }
  if (Array.isArray(value)) return value.map((v) => swap(options, v));
  return typeof value === "string" ? swap(options, value) : value;
}

function fieldMaps(field, strings) {
  return { options: displayMap(field, field.options || [], "opt", strings), rows: displayMap(field, field.config?.rows || [], "row", strings) };
}

// An answer in source terms → what the translated field displays.
export function displayValue(field, value, strings) {
  if (!strings || value === undefined || value === null) return value;
  const { options, rows } = fieldMaps(field, strings);
  return convertValue(field, value, options, rows);
}

// What the translated field emitted → the answer in source terms.
export function storedValue(field, value, strings) {
  if (!strings || value === undefined || value === null) return value;
  const { options, rows } = fieldMaps(field, strings);
  return convertValue(field, value, reverse(options), reverse(rows));
}

// A copy of the field with its text translated, for display only.
export function localizeField(field, strings) {
  if (!strings) return field;
  const key = (name) => `f.${field.id}.${name}`;
  const source = sourceLabel(field);
  const label = read(strings, key("label"), source);
  const out = { ...field, label, title: field.title === source ? label : read(strings, key("title"), field.title) };
  for (const [name] of FIELD_KEYS) if (field[name]) out[name] = read(strings, key(name), field[name]);

  const { options, rows } = fieldMaps(field, strings);
  if (field.options?.length) out.options = field.options.map((o) => options.get(o));
  const config = field.config;
  if (config) {
    out.config = { ...config };
    if (config.rows?.length) out.config.rows = config.rows.map((r) => rows.get(r));
    if (config.images) out.config.images = Object.fromEntries(Object.entries(config.images).map(([o, image]) => [swap(options, o), image]));
    if (Array.isArray(config.subFields)) out.config.subFields = config.subFields.map((sub) => ({ ...sub, label: read(strings, key(`sub.${sub.id}`), sub.label) }));
    for (const [name] of CONFIG_KEYS) if (config[name]) out.config[name] = read(strings, key(name), config[name]);
  }
  return out;
}

// The form with its form-level text translated; the fields stay in source terms for logic and validation.
export function localizeFormText(form, locale) {
  const strings = translationStrings(form?.settings, locale);
  if (!strings) return form;
  const s = form.settings;
  return {
    ...form,
    title: read(strings, "title", form.title),
    description: read(strings, "description", form.description),
    settings: {
      ...s,
      welcome: { ...s.welcome, title: read(strings, "welcome.title", s.welcome?.title), body: read(strings, "welcome.body", s.welcome?.body), buttonLabel: read(strings, "welcome.buttonLabel", s.welcome?.buttonLabel) },
      sideEyebrow: read(strings, "sideEyebrow", s.sideEyebrow),
      sideHeadline: read(strings, "sideHeadline", s.sideHeadline),
      sideTags: read(strings, "sideTags", s.sideTags),
      sideCredit: read(strings, "sideCredit", s.sideCredit),
      thankYouTitle: read(strings, "thankYouTitle", s.thankYouTitle),
      thankYouText: read(strings, "thankYouText", s.thankYouText),
      attestation: { ...s.attestation, statement: read(strings, "attestation.statement", s.attestation?.statement) },
      policy: { ...s.policy, title: read(strings, "policy.title", s.policy?.title), body: read(strings, "policy.body", s.policy?.body) },
      branches: (s.branches || []).map((b) => {
        if (!b?.ending?.enabled) return b;
        return { ...b, ending: { ...b.ending, ...Object.fromEntries(ENDING_KEYS.map(([name]) => [name, read(strings, `branch.${b.id}.${name}`, b.ending[name])])) } };
      }),
    },
  };
}

// A scored outcome pointing at its translated branch, so resolveEnding picks up the translated ending.
export function localizeOutcome(outcome, form, locale) {
  if (!outcome?.branch) return outcome;
  const branch = localizeFormText(form, locale).settings?.branches?.find((b) => b?.id === outcome.branch.id);
  return branch ? { ...outcome, branch } : outcome;
}

// Everything translatable, grouped for the editor: [{ id, label, items: [{ key, label, source, multiline }] }]; empty sources are skipped.
export function translatableStrings(form) {
  const groups = [];
  const formItems = FORM_KEYS.map(([key, get, label, multiline]) => ({ key, label, source: get(form) || "", multiline: Boolean(multiline) })).filter((i) => i.source);
  if (formItems.length) groups.push({ id: "form", label: "Form", items: formItems });

  for (const field of form?.fieldDefs || []) {
    if (field.included === false || field.type === "hidden") continue;
    const key = (name) => `f.${field.id}.${name}`;
    const items = [{ key: key("label"), label: "Question", source: sourceLabel(field), multiline: field.type === "content" }];
    if (field.title && field.title !== sourceLabel(field)) items.push({ key: key("title"), label: "Title", source: field.title });
    for (const [name, label, multiline] of FIELD_KEYS) items.push({ key: key(name), label, source: field[name] || "", multiline: Boolean(multiline) });
    if (hasOptions(field.type) || field.type === "matrix") for (const o of field.options || []) items.push({ key: key(`opt.${o}`), label: "Choice", source: o });
    for (const r of field.config?.rows || []) items.push({ key: key(`row.${r}`), label: "Row", source: r });
    for (const [name, label] of CONFIG_KEYS) items.push({ key: key(name), label, source: field.config?.[name] || "" });
    if (Array.isArray(field.config?.subFields)) for (const sub of field.config.subFields) items.push({ key: key(`sub.${sub.id}`), label: "Sub-field", source: sub.label || "" });
    const filled = items.filter((i) => i.source);
    if (filled.length) groups.push({ id: field.id, label: sourceLabel(field) || field.type, items: filled });
  }

  const branchItems = (form?.settings?.branches || []).filter((b) => b?.ending?.enabled).flatMap((b) => ENDING_KEYS.map(([name, label, multiline]) => ({ key: `branch.${b.id}.${name}`, label: `${b.name || "Outcome"} ${label}`, source: b.ending[name] || "", multiline: Boolean(multiline) })));
  const filledBranches = branchItems.filter((i) => i.source);
  if (filledBranches.length) groups.push({ id: "endings", label: "Outcome endings", items: filledBranches });
  return groups;
}
