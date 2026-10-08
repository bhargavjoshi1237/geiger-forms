import { hasOptions, isInputField } from "@/lib/forms/field-types";
import { checkFormula } from "@/lib/forms/formula";

// Pre-publish checks, version diffs and the doc signature hash used by co-editing.

function refKeys(fields) {
  const keys = new Set();
  for (const f of fields) {
    keys.add(String(f.id).toLowerCase());
    if (f.title) keys.add(f.title.toLowerCase().trim());
    if (f.label) keys.add(String(f.label).toLowerCase().trim());
  }
  return keys;
}

export function formulaRefs(formula) {
  return [...String(formula || "").matchAll(/\{([^}]+)\}/g)].map((m) => m[1].trim());
}

// Returns [{ id, fieldId?, message }] — problems a respondent would hit on the live form.
export function collectWarnings({ fields, settings }) {
  const warnings = [];
  const ids = new Set(fields.map((f) => f.id));
  const keys = refKeys(fields);
  const included = fields.filter((f) => f.included !== false);
  const name = (f) => `“${f.title || "Untitled"}”`;

  if (!included.some((f) => isInputField(f.type))) {
    warnings.push({ id: "empty", message: "The form has no questions yet." });
  }

  for (const f of included) {
    if (hasOptions(f.type) && (f.options || []).filter(Boolean).length === 0) {
      warnings.push({ id: `opts-${f.id}`, fieldId: f.id, message: `${name(f)} has no choices.` });
    }
    if (f.type === "matrix" && !(f.config?.rows || []).length) {
      warnings.push({ id: `rows-${f.id}`, fieldId: f.id, message: `${name(f)} has no rows.` });
    }
    if (f.type === "repeater" && !(f.config?.subFields || []).length) {
      warnings.push({ id: `subs-${f.id}`, fieldId: f.id, message: `${name(f)} has no sub-fields.` });
    }
    if (f.type === "calculated") {
      const err = !f.formula?.trim() ? "is missing a formula" : checkFormula(f.formula);
      if (err) warnings.push({ id: `formula-${f.id}`, fieldId: f.id, message: `${name(f)} ${err.startsWith("is ") ? err : `has a formula error: ${err}`}.` });
      const unknown = formulaRefs(f.formula).filter((r) => !keys.has(r.toLowerCase()));
      if (unknown.length) {
        warnings.push({ id: `refs-${f.id}`, fieldId: f.id, message: `${name(f)} references unknown field${unknown.length > 1 ? "s" : ""} ${unknown.map((u) => `{${u}}`).join(", ")}.` });
      }
    }
    if (f.type === "product" && !(Number(f.config?.price) > 0)) {
      warnings.push({ id: `price-${f.id}`, fieldId: f.id, message: `${name(f)} has no price.` });
    }
    const broken = (f.conditions || []).filter((c) => c.fieldId && !ids.has(c.fieldId));
    if (broken.length) {
      warnings.push({ id: `cond-${f.id}`, fieldId: f.id, message: `${name(f)} has ${broken.length} condition${broken.length > 1 ? "s" : ""} on a deleted field.` });
    }
    const incomplete = (f.conditions || []).filter((c) => !c.fieldId);
    if (incomplete.length) {
      warnings.push({ id: `cond-empty-${f.id}`, fieldId: f.id, message: `${name(f)} has a condition with no field selected (ignored).` });
    }
  }

  if (settings?.branchingEnabled) {
    for (const b of settings.branches || []) {
      const conds = b.conditions || [];
      if (conds.length === 0) warnings.push({ id: `branch-${b.id}`, message: `Branch “${b.name || "Untitled"}” has no conditions, so it never matches.` });
      else if (conds.some((c) => c.fieldId && !ids.has(c.fieldId))) {
        warnings.push({ id: `branch-ref-${b.id}`, message: `Branch “${b.name || "Untitled"}” references a deleted field.` });
      }
    }
  }
  return warnings;
}

// What restoring `target` would do to `current`: fields added / removed / changed, settings keys changed.
export function diffDocs(current, target) {
  const cur = new Map(current.fields.map((f) => [f.id, f]));
  const next = new Map(target.fields.map((f) => [f.id, f]));
  const added = [...next.values()].filter((f) => !cur.has(f.id));
  const removed = [...cur.values()].filter((f) => !next.has(f.id));
  const changed = [...next.values()].filter((f) => cur.has(f.id) && JSON.stringify(cur.get(f.id)) !== JSON.stringify(f));
  const settingKeys = new Set([...Object.keys(current.settings || {}), ...Object.keys(target.settings || {})]);
  const settingsChanged = [...settingKeys].filter(
    (k) => k in (target.settings || {}) && JSON.stringify(current.settings?.[k]) !== JSON.stringify(target.settings?.[k]),
  );
  const reordered =
    added.length === 0 &&
    removed.length === 0 &&
    current.fields.map((f) => f.id).join() !== target.fields.map((f) => f.id).join();
  return { added, removed, changed, settingsChanged, reordered };
}

// Cheap stable hash of the serialized doc, broadcast to co-editors after each save.
export function hashString(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
