import { getFieldType, hasOptions } from "@/lib/forms/field-types";
import { makeFieldId, toCanonicalField } from "@/lib/forms/schema";

// Builder-side field factories: per-type defaults, type switching, duplication and legacy step conversion.

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const CHOICES = ["Option 1", "Option 2", "Option 3"];

function typeDefaults(type) {
  switch (type) {
    case "select":
    case "dropdown":
    case "multiselect":
      return { options: [...CHOICES] };
    case "ranking":
      return { options: ["First choice", "Second choice", "Third choice"] };
    case "matrix":
      return { options: ["Poor", "Fair", "Good", "Excellent"], config: { rows: ["Quality", "Speed", "Support"] } };
    case "checkbox":
      return { label: "I agree to the terms and conditions" };
    case "rating":
      return { config: { max: 5 } };
    case "scale":
      return { config: { min: 1, max: 10, minLabel: "Not likely", maxLabel: "Very likely" } };
    case "booking":
      return {
        config: { days: [1, 2, 3, 4, 5], start: "09:00", end: "17:00", slotMinutes: 30, capacity: 1, horizonDays: 30, leadHours: 2, timezone: browserTimezone() },
      };
    case "file":
      return { config: { maxFiles: 1, maxSizeMb: 10, accept: "" } };
    case "product":
      return { config: { price: 10, quantityMode: "input", maxQuantity: 10, description: "" } };
    case "repeater":
      return {
        config: {
          subFields: [{ id: makeFieldId("sub"), type: "text", label: "Name", required: false, options: [] }],
          minRows: 0,
          maxRows: 10,
          addLabel: "Add another",
        },
      };
    case "calculated":
      return { formula: "", config: { format: "number", countInScore: true } };
    case "heading":
      return { label: "Section heading", hint: "" };
    case "content":
      return { label: "", hint: "Add some context for respondents here." };
    case "page":
      return {};
    default:
      return {};
  }
}

function nextTitle(type, fields) {
  if (type === "page") return `Page ${fields.filter((f) => f.type === "page").length + 2}`;
  const base = getFieldType(type).label;
  const taken = new Set(fields.map((f) => f.title));
  let n = fields.filter((f) => f.type === type).length + 1;
  let title = n === 1 ? base : `${base} ${n}`;
  while (taken.has(title)) {
    n += 1;
    title = `${base} ${n}`;
  }
  return title;
}

// Fresh canonical field of `type`, titled uniquely against `fields`.
export function createField(type, fields = []) {
  const title = nextTitle(type, fields);
  const defaults = typeDefaults(type);
  return toCanonicalField({
    id: makeFieldId(type === "page" ? "page" : type === "calculated" ? "calc" : "field"),
    type,
    title,
    label: defaults.label ?? (type === "page" ? "" : title),
    placeholder: "",
    hint: defaults.hint ?? "",
    options: defaults.options ?? [],
    formula: defaults.formula ?? "",
    config: defaults.config,
    conditions: [],
    included: true,
  });
}

// Switches a field's type, keeping shared props and seeding what the new type needs.
export function changeFieldType(field, type) {
  if (field.type === type) return field;
  const defaults = typeDefaults(type);
  const keepOptions = hasOptions(type) && field.options?.length > 0;
  return {
    ...field,
    type,
    options: hasOptions(type) ? (keepOptions ? field.options : defaults.options ?? [...CHOICES]) : [],
    optionPoints: hasOptions(type) ? field.optionPoints : undefined,
    correctAnswer: undefined,
    config: defaults.config,
    validation: undefined,
    defaultValue: undefined,
    formula: type === "calculated" ? field.formula || "" : "",
  };
}

export function duplicateField(field, fields = []) {
  const taken = new Set(fields.map((f) => f.title));
  let title = `${field.title} (copy)`;
  for (let i = 2; taken.has(title); i += 1) title = `${field.title} (copy ${i})`;
  return {
    ...structuredClone(field),
    id: makeFieldId(field.type === "page" ? "page" : field.type === "calculated" ? "calc" : "field"),
    title,
    label: field.label === field.title ? title : field.label,
    conditions: (field.conditions || []).map((c) => ({ ...c, id: makeFieldId("cond") })),
  };
}

export function canonicalizeFields(fieldDefs) {
  return (fieldDefs || []).map((f) => toCanonicalField(f));
}

// Legacy settings.steps were spread evenly across included fields; turn them into real page breaks once.
export function convertLegacySteps(fields, steps) {
  if (!Array.isArray(steps) || steps.length === 0) return null;
  if (fields.some((f) => f.type === "page")) return null;
  const included = fields.filter((f) => f.included !== false);
  if (included.length === 0) return null;
  const per = Math.ceil(included.length / (steps.length + 1));
  const breakBefore = new Map();
  included.forEach((f, idx) => {
    if (idx > 0 && idx % per === 0) {
      const step = steps[Math.floor(idx / per) - 1] ?? steps[steps.length - 1];
      breakBefore.set(f.id, step);
    }
  });
  const out = [];
  for (const field of fields) {
    const step = breakBefore.get(field.id);
    if (step) {
      out.push(toCanonicalField({ id: makeFieldId("page"), type: "page", title: step.title || "Next page", label: "", conditions: [], included: true }));
    }
    out.push(field);
  }
  return out;
}
