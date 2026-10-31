import test from "node:test";
import assert from "node:assert/strict";

import { finalizeImport } from "./core.js";
import { JUMP_TO_END } from "../logic.js";

const cond = (fieldId) => ({ fieldId, operator: "equals", value: "x" });

function imported(fields, settings = {}) {
  return finalizeImport({ source: "json", title: "T", fields, settings });
}

test("jump rules survive an import with fresh ids", () => {
  const { form } = imported([
    { id: "a", type: "text", title: "A", jumps: [{ to: "c", conditions: [cond("a")] }, { to: JUMP_TO_END, conditions: [cond("a")] }] },
    { id: "b", type: "text", title: "B" },
    { id: "c", type: "text", title: "C" },
  ]);
  const [a, , c] = form.schema.fields;
  assert.equal(a.jumps[0].to, c.id);
  assert.equal(a.jumps[0].conditions[0].fieldId, a.id);
  assert.equal(a.jumps[1].to, JUMP_TO_END);
});

test("a jump to a missing field is dropped with a warning", () => {
  const { form, warnings } = imported([{ id: "a", type: "text", title: "A", jumps: [{ to: "gone", conditions: [cond("a")] }] }]);
  assert.equal(form.schema.fields[0].jumps, undefined);
  assert.ok(warnings.length > 0);
});

test("translation keys follow the fresh field, sub-field and branch ids", () => {
  const { form, warnings } = imported(
    [
      { id: "a", type: "text", title: "A" },
      { id: "r", type: "repeater", title: "R", config: { subFields: [{ id: "s1", type: "text", label: "Sub" }] } },
    ],
    { translations: { es: { title: "Título", "f.a.label": "Á", "f.r.sub.s1": "Sub es", "branch.b1.title": "Rama", "f.gone.label": "x" }, xx: { title: "no" } }, branches: [{ id: "b1", name: "B", conditions: [cond("a")] }] },
  );
  const [a, r] = form.schema.fields;
  const es = form.settings.translations.es;
  assert.equal(es.title, "Título");
  assert.equal(es[`f.${a.id}.label`], "Á");
  assert.equal(es[`f.${r.id}.sub.${r.config.subFields[0].id}`], "Sub es");
  assert.equal(es[`branch.${form.settings.branches[0].id}.title`], "Rama");
  assert.equal(Object.keys(es).length, 4);
  assert.equal(form.settings.translations.xx, undefined);
  assert.equal(form.settings.branches[0].sourceId, undefined);
  assert.ok(warnings.some((w) => /translations/i.test(JSON.stringify(w))));
});

test("custom CSS keeps its text unless it fails the check", () => {
  assert.equal(imported([], { customCss: "a{color:red}" }).form.settings.customCss, "a{color:red}");
  const bad = imported([], { customCss: "a{background:url(x)}" });
  assert.equal(bad.form.settings.customCss, "");
  assert.ok(bad.warnings.length > 0);
});

test("element choices and page layout travel with the design", () => {
  const { form } = imported([], { theme: { elements: { buttonStyle: "outline", nested: { a: 1 } } }, pageLayout: "split", sideImageUrl: "javascript:alert(1)" });
  assert.deepEqual(form.settings.theme.elements, { buttonStyle: "outline" });
  assert.equal(form.settings.pageLayout, "split");
  assert.equal(form.settings.sideImageUrl, "");
});
