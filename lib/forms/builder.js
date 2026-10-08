import { getFieldIcon } from "./field-types";
import { toCanonicalField } from "./schema";

// Builder view-model: a canonical field plus the derived Icon and legacy editor aliases.
export function hydrateField(canonical) {
  const isFile = canonical.type === "file";
  return {
    ...canonical,
    title: canonical.title || "Field",
    Icon: getFieldIcon(canonical.type),
    included: canonical.included !== false,
    type: canonical.type || "text",
    firstValue: canonical.label ?? "",
    secondValue: isFile ? canonical.hint ?? "" : canonical.placeholder ?? "",
    select: canonical.type === "select",
    required: Boolean(canonical.required),
    options: Array.isArray(canonical.options) ? canonical.options : [],
    formula: canonical.formula ?? "",
    conditions: Array.isArray(canonical.conditions) ? canonical.conditions : [],
  };
}

export function hydrateFields(fieldDefs) {
  return (fieldDefs || []).map(hydrateField);
}

// Builder edits layered over the stored settings, so keys the builder doesn't own (sharing, template, …) survive autosave.
export function collectSettings(bag, base = {}) {
  return { ...(base || {}), ...(bag || {}) };
}

export function serializeBuilderDoc({ title, description, fields, settings, baseSettings }) {
  return {
    title: title?.trim() || "Untitled form",
    description: description ?? "",
    schema: { fields: fields.map(toCanonicalField) },
    settings: collectSettings(settings, baseSettings),
  };
}
