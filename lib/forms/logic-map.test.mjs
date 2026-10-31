import test from "node:test";
import assert from "node:assert/strict";

import { buildLogicMap } from "./logic-map.js";
import { JUMP_TO_END, splitPages, validateAnswers, visibleFieldIds, visiblePages } from "./logic.js";

const cond = (fieldId, value) => ({ id: `c-${fieldId}`, fieldId, operator: "equals", value });
const f = (id, type = "text", extra = {}) => ({ id, type, title: id, label: id, included: true, conditions: [], ...extra });
const jump = (to, on = "go", from = "a") => ({ id: `j-${to}`, conditions: [cond(from, on)], conditionLogic: "any", to });

test("a matching jump hides everything up to its target", () => {
  const fields = [f("a", "text", { jumps: [jump("d")] }), f("b"), f("c"), f("d"), f("e")];
  assert.deepEqual([...visibleFieldIds(fields, { a: "go" })], ["a", "d", "e"]);
  assert.deepEqual([...visibleFieldIds(fields, { a: "stay" })], ["a", "b", "c", "d", "e"]);
});

test("jumping to the end hides the rest, but not hidden data fields", () => {
  const fields = [f("a", "text", { jumps: [jump(JUMP_TO_END)] }), f("b"), f("h", "hidden")];
  assert.deepEqual([...visibleFieldIds(fields, { a: "go" })], ["a", "h"]);
});

test("backward and deleted targets are ignored, so a jump can't loop or strand the form", () => {
  const fields = [f("a"), f("b", "text", { jumps: [jump("a", "go", "b"), jump("gone", "go", "b")] }), f("c")];
  assert.deepEqual([...visibleFieldIds(fields, { b: "go" })], ["a", "b", "c"]);
});

test("a rule without conditions never fires", () => {
  const fields = [f("a", "text", { jumps: [{ id: "j", conditions: [], to: JUMP_TO_END }] }), f("b")];
  assert.ok(visibleFieldIds(fields, {}).has("b"));
});

test("the first matching rule wins", () => {
  const fields = [f("a", "text", { jumps: [jump("c"), jump("d")] }), f("b"), f("c"), f("d")];
  assert.deepEqual([...visibleFieldIds(fields, { a: "go" })], ["a", "c", "d"]);
});

test("jumping over a whole page drops that page", () => {
  const fields = [f("a", "text", { jumps: [jump("p3")] }), f("p2", "page"), f("b"), f("p3", "page"), f("c")];
  assert.deepEqual(visiblePages(fields, { a: "go" }, "").map((p) => p.id), ["page-0", "p3"]);
});

test("landing mid-page keeps that page and only the fields from the target on", () => {
  const fields = [f("a", "text", { jumps: [jump("c")] }), f("p2", "page"), f("b"), f("c"), f("d")];
  const pages = visiblePages(fields, { a: "go" }, "");
  assert.deepEqual(pages.map((p) => p.id), ["page-0", "p2"]);
  assert.deepEqual(pages[1].fields.map((x) => x.id), ["c", "d"]);
  assert.equal(splitPages(fields, "").length, 2);
});

test("skipped required questions don't block submitting, and their answers don't count", () => {
  const fields = [f("a", "text", { jumps: [jump("c")] }), f("b", "text", { required: true }), f("c")];
  assert.deepEqual(validateAnswers(fields, { a: "go" }), {});
  assert.ok(validateAnswers(fields, { a: "stay" }).b);
});

test("a condition on a skipped field sees no answer", () => {
  const fields = [f("a", "text", { jumps: [jump("c")] }), f("b"), f("c", "text", { conditions: [cond("b", "x")] })];
  assert.equal(visibleFieldIds(fields, { a: "go", b: "x" }).has("c"), false);
});

test("the map draws rule arcs and flags broken jumps", () => {
  const fields = [f("a", "text", { jumps: [jump("c"), jump("gone"), jump(JUMP_TO_END)] }), f("b", "text", { conditions: [cond("a", "x")] }), f("c")];
  const { rows, arcs } = buildLogicMap(fields, {});
  assert.deepEqual(rows.map((r) => r.id), ["a", "b", "c", "__end"]);
  assert.deepEqual(arcs, [
    { from: "a", to: "c", kind: "jump" },
    { from: "a", to: "__end", kind: "jump" },
    { from: "a", to: "b", kind: "condition" },
  ]);
  assert.ok(rows[0].notes.some((n) => n.kind === "broken"));
});

test("outcome branches appear only while branching is on", () => {
  const fields = [f("a")];
  const branches = [{ id: "b1", name: "Hot lead", conditions: [cond("a", "x")] }];
  assert.ok(buildLogicMap(fields, { branchingEnabled: true, branches }).rows.some((r) => r.id === "branch:b1"));
  assert.ok(!buildLogicMap(fields, { branchingEnabled: false, branches }).rows.some((r) => r.kind === "outcome"));
});
