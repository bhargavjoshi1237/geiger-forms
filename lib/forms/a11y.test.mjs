import test from "node:test";
import assert from "node:assert/strict";

import { errorLanguage, errorSummaryItems, nextRovingIndex, optionForLetter } from "./a11y.js";

test("roving index moves and wraps with arrows, jumps with Home and End", () => {
  assert.equal(nextRovingIndex("ArrowRight", 0, 3), 1);
  assert.equal(nextRovingIndex("ArrowDown", 2, 3), 0);
  assert.equal(nextRovingIndex("ArrowLeft", 0, 3), 2);
  assert.equal(nextRovingIndex("ArrowUp", 1, 3), 0);
  assert.equal(nextRovingIndex("Home", 2, 3), 0);
  assert.equal(nextRovingIndex("End", 0, 3), 2);
  assert.equal(nextRovingIndex("a", 0, 3), null);
  assert.equal(nextRovingIndex("ArrowRight", 0, 0), null);
});

test("left and right swap in RTL but up and down don't", () => {
  assert.equal(nextRovingIndex("ArrowLeft", 0, 3, true), 1);
  assert.equal(nextRovingIndex("ArrowRight", 1, 3, true), 0);
  assert.equal(nextRovingIndex("ArrowDown", 0, 3, true), 1);
});

test("letter shortcuts map A to the first option, either case", () => {
  assert.equal(optionForLetter("a", ["x", "y"]), "x");
  assert.equal(optionForLetter("B", ["x", "y"]), "y");
  assert.equal(optionForLetter("c", ["x", "y"]), undefined);
});

test("only single letters count as shortcuts", () => {
  for (const key of ["Enter", "1", " ", "é", "", undefined]) assert.equal(optionForLetter(key, ["x"]), undefined);
});

test("built-in errors are tagged English on translated forms, owner messages aren't", () => {
  const field = { validation: { patternMessage: "Formato no válido" } };
  assert.equal(errorLanguage(field, "This field is required.", "es"), "en");
  assert.equal(errorLanguage(field, "Formato no válido", "es"), undefined);
  assert.equal(errorLanguage(field, "This field is required.", "en"), undefined);
  assert.equal(errorLanguage(field, "", "es"), undefined);
});

test("error summary keeps form order and appends extras with messages", () => {
  const fields = [
    { id: "a", title: "First" },
    { id: "b", title: "Second", label: "Second label" },
    { id: "c", title: "Third" },
  ];
  const items = errorSummaryItems({
    fields,
    errors: { c: "Bad", a: "Missing" },
    extras: [
      { key: "captcha", targetId: "gf-captcha", label: "Verification", message: "Complete it" },
      { key: "policy", targetId: "gf-policy", label: "Policy", message: undefined },
    ],
  });
  assert.deepEqual(items.map((i) => i.key), ["a", "c", "captcha"]);
  assert.equal(items[0].label, "First");
  assert.equal(items[0].fieldId, "a");
  assert.equal(items[2].targetId, "gf-captcha");
});

test("error summary ignores errors for fields not on the form", () => {
  assert.deepEqual(errorSummaryItems({ fields: [], errors: { gone: "Bad" } }), []);
});
