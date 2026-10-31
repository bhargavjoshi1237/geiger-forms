// Turns a form's visibility rules, jump rules and outcome branches into rows and arcs for the logic map.

import { JUMP_TO_END, includedFields } from "./logic";

const END_ROW = "__end";

const titleOf = (field) => field?.title || field?.label || "Untitled";

// { rows: [{ id, title, type, kind, notes }], arcs: [{ from, to, kind }] }; kinds are "field" | "page" | "end" | "outcome" for rows and "jump" | "condition" | "outcome" for arcs.
export function buildLogicMap(fields, settings) {
  const included = includedFields(fields).filter((f) => f.type !== "hidden");
  const byId = new Map(included.map((f) => [f.id, f]));
  const rows = [];
  const arcs = [];

  for (const field of included) {
    const notes = [];
    const sources = [...new Set((field.conditions || []).map((c) => c.fieldId).filter((id) => byId.has(id)))];
    if (sources.length) notes.push({ kind: "condition", text: `${field.type === "page" ? "Skipped unless" : "Shown when"} ${sources.map((id) => titleOf(byId.get(id))).join(", ")}` });
    for (const id of sources) arcs.push({ from: id, to: field.id, kind: "condition" });

    for (const rule of Array.isArray(field.jumps) ? field.jumps : []) {
      if (!rule?.conditions?.length) continue;
      const toEnd = rule.to === JUMP_TO_END;
      const target = byId.get(rule.to);
      if (!toEnd && !target) {
        notes.push({ kind: "broken", text: "Jump to a deleted field" });
        continue;
      }
      notes.push({ kind: "jump", text: `Jumps to ${toEnd ? "the end" : titleOf(target)}` });
      arcs.push({ from: field.id, to: toEnd ? END_ROW : rule.to, kind: "jump" });
    }
    rows.push({ id: field.id, title: titleOf(field), type: field.type, kind: field.type === "page" ? "page" : "field", notes });
  }

  if (included.length) rows.push({ id: END_ROW, title: "End of form", type: null, kind: "end", notes: [] });

  if (settings?.branchingEnabled) {
    for (const branch of settings.branches || []) {
      const sources = [...new Set((branch.conditions || []).map((c) => c.fieldId).filter((id) => byId.has(id)))];
      if (!sources.length) continue;
      const id = `branch:${branch.id}`;
      rows.push({ id, title: branch.name || branch.outcome || "Outcome", type: null, kind: "outcome", notes: [{ kind: "outcome", text: `Outcome from ${sources.map((s) => titleOf(byId.get(s))).join(", ")}` }] });
      for (const from of sources) arcs.push({ from, to: id, kind: "outcome" });
    }
  }
  return { rows, arcs };
}
