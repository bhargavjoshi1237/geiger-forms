import test from "node:test";
import assert from "node:assert/strict";

import { availableLocales, displayValue, localizeField, localizeFormText, localizeOutcome, matchLocale, storedValue, translatableStrings, translationStrings } from "./translate.js";

const field = { id: "f1", type: "select", title: "Colour", label: "Colour", hint: "Pick one", options: ["Red", "Blue"], config: { images: { Red: { url: "r.png" } } } };
const strings = { "f.f1.label": "Color", "f.f1.hint": "Elige uno", "f.f1.opt.Red": "Rojo", "f.f1.opt.Blue": "  " };
const settings = { locale: "en", translations: { es: strings, xx: {} }, thankYouTitle: "Thanks", welcome: { title: "Hi" }, branches: [] };

test("the form's own language comes first and unknown codes are dropped", () => {
  assert.deepEqual(availableLocales(settings), ["en", "es"]);
  assert.equal(matchLocale(settings, "es-MX"), "es");
  assert.equal(matchLocale(settings, "fr"), null);
  assert.equal(matchLocale(settings, ""), null);
});

test("the source language and inherited keys have no strings", () => {
  assert.equal(translationStrings(settings, "en"), null);
  assert.equal(translationStrings(settings, "__proto__"), null);
  assert.equal(translationStrings(settings, "es"), strings);
});

test("text is translated and blanks fall back to the source", () => {
  const out = localizeField(field, strings);
  assert.equal(out.label, "Color");
  assert.equal(out.hint, "Elige uno");
  assert.deepEqual(out.options, ["Rojo", "Blue"]);
  assert.deepEqual(out.config.images, { Rojo: { url: "r.png" } });
  assert.equal(field.label, "Colour", "the source field isn't mutated");
  assert.equal(localizeField(field, null), field);
});

test("answers round-trip to the source text", () => {
  assert.equal(displayValue(field, "Red", strings), "Rojo");
  assert.equal(storedValue(field, "Rojo", strings), "Red");
  assert.deepEqual(storedValue({ ...field, type: "multiselect" }, ["Rojo", "Blue"], strings), ["Red", "Blue"]);
  assert.equal(storedValue(field, "typed other", strings), "typed other");
});

test("two choices translated alike stay distinct", () => {
  const same = { "f.f1.opt.Red": "Igual", "f.f1.opt.Blue": "Igual" };
  assert.deepEqual(localizeField(field, same).options, ["Igual", "Blue"]);
  assert.equal(storedValue(field, "Igual", same), "Red");
  assert.equal(storedValue(field, "Blue", same), "Blue");
});

test("matrix rows and columns both map back", () => {
  const matrix = { id: "m", type: "matrix", options: ["Good"], config: { rows: ["Food"] } };
  const s = { "f.m.opt.Good": "Bien", "f.m.row.Food": "Comida" };
  assert.deepEqual(localizeField(matrix, s).config.rows, ["Comida"]);
  assert.deepEqual(displayValue(matrix, { Food: "Good" }, s), { Comida: "Bien" });
  assert.deepEqual(storedValue(matrix, { Comida: "Bien" }, s), { Food: "Good" });
});

test("form text and outcome endings translate; fields stay in source terms", () => {
  const form = { title: "T", description: "", fieldDefs: [field], settings: { ...settings, translations: { es: { title: "Título", thankYouTitle: "Gracias", "branch.b1.title": "Ganaste" } }, branches: [{ id: "b1", ending: { enabled: true, title: "You won" } }] } };
  const out = localizeFormText(form, "es");
  assert.equal(out.title, "Título");
  assert.equal(out.settings.thankYouTitle, "Gracias");
  assert.equal(out.settings.branches[0].ending.title, "Ganaste");
  assert.equal(out.fieldDefs, form.fieldDefs);
  assert.equal(localizeFormText(form, "en"), form);
  assert.equal(localizeFormText(form, "__proto__"), form);
});

test("a scored outcome carries its translated ending", () => {
  const branch = { id: "b1", ending: { enabled: true, title: "You won" } };
  const form = { title: "T", settings: { locale: "en", translations: { es: { "branch.b1.title": "Ganaste" } }, branches: [branch] } };
  assert.equal(localizeOutcome({ branch }, form, "es").branch.ending.title, "Ganaste");
  assert.equal(localizeOutcome({ branch }, form, "en").branch.ending.title, "You won");
  assert.equal(localizeOutcome(null, form, "es"), null);
});

test("the editor lists every non-empty string", () => {
  const form = { title: "T", description: "", fieldDefs: [field], settings };
  const keys = translatableStrings(form).flatMap((g) => g.items.map((i) => i.key));
  assert.ok(keys.includes("title"));
  assert.ok(keys.includes("f.f1.opt.Blue"));
  assert.ok(!keys.includes("description"));
});
