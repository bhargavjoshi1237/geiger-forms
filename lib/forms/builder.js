import { getFieldIcon } from "./field-types";
import { toCanonicalField, defaultSettings } from "./schema";

const SETTING_KEYS = Object.keys(defaultSettings());

export function hydrateField(canonical) {
  const isFile = canonical.type === "file";
  return {
    id: canonical.id,
    title: canonical.title || "Field",
    Icon: getFieldIcon(canonical.type),
    included: canonical.included !== false,
    type: canonical.type || "text",
    firstLabel: "Field label",
    firstValue: canonical.label ?? "",
    secondLabel: isFile ? "Hint" : "Placeholder",
    secondValue: isFile ? canonical.hint ?? "" : canonical.placeholder ?? "",
    select: canonical.type === "select",
    info: Boolean(canonical.info),
    required: Boolean(canonical.required),
    options: Array.isArray(canonical.options) ? canonical.options : [],
    formula: canonical.formula ?? "",
    conditions: Array.isArray(canonical.conditions) ? canonical.conditions : [],
  };
}

export function hydrateFields(fieldDefs) {
  return (fieldDefs || []).map(hydrateField);
}

export function collectSettings(bag) {
  const out = {};
  for (const key of SETTING_KEYS) {
    if (key in bag) out[key] = bag[key];
  }
  return out;
}

export function serializeBuilderDoc({ title, description, fields, settings }) {
  return {
    title: title?.trim() || "Untitled form",
    description: description ?? "",
    schema: { fields: fields.map(toCanonicalField) },
    settings: collectSettings(settings),
  };
}
