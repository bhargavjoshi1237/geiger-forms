// Phone country picker, date range fields and the wider repeater sub-types.
import test from "node:test";
import assert from "node:assert/strict";

import { REPEATER_SUBTYPES } from "./field-types.js";
import { displayValue, validateField } from "./logic.js";
import { joinPhone, splitPhone } from "./phone.js";

test("a number splits into its country and the rest", () => {
  assert.deepEqual(splitPhone("+91 98765 43210"), { country: "IN", national: "98765 43210" });
  assert.deepEqual(splitPhone("+35312345"), { country: "IE", national: "12345" });
});

test("the longest dial code wins", () => {
  assert.equal(splitPhone("+971 501234").country, "AE");
  assert.equal(splitPhone("+7 9001234").country, "RU");
});

test("countries sharing a dial code keep the respondent's pick or the default", () => {
  assert.equal(splitPhone("+1 5551234", "US", "CA").country, "CA");
  assert.equal(splitPhone("+1 5551234", "CA").country, "CA");
  assert.equal(splitPhone("+1 5551234", "IN").country, "US");
});

test("no country code falls back to the default and keeps the text", () => {
  assert.deepEqual(splitPhone("5551234", "IN"), { country: "IN", national: "5551234" });
  assert.deepEqual(splitPhone("", "IN"), { country: "IN", national: "" });
  assert.equal(splitPhone("", "XX").country, "US");
});

test("a dial code alone isn't an answer", () => {
  assert.equal(joinPhone("IN", "  "), "");
  assert.equal(joinPhone("IN", "98765"), "+91 98765");
  assert.deepEqual(splitPhone(joinPhone("IE", "87 1234567")), { country: "IE", national: "87 1234567" });
});

test("a stored phone answer still passes the phone rule", () => {
  assert.equal(validateField({ type: "phone" }, "+91 9876543210"), null);
  assert.ok(validateField({ type: "phone" }, "+91 12"));
});

const range = { id: "d", type: "daterange", title: "Stay" };

test("a date range needs both ends in order", () => {
  assert.equal(validateField(range, { start: "2026-01-01", end: "2026-01-05" }), null);
  assert.equal(validateField(range, { start: "2026-01-05", end: "2026-01-05" }), null);
  assert.match(validateField(range, { start: "2026-01-06", end: "2026-01-05" }), /after/i);
  assert.ok(validateField(range, { start: "2026-01-01" }));
  assert.ok(validateField(range, { end: "2026-01-01" }));
});

test("an optional range may be empty, a required one may not", () => {
  assert.equal(validateField(range, undefined), null);
  assert.equal(validateField(range, { start: "", end: "" }), null);
  assert.ok(validateField({ ...range, required: true }, { start: "", end: "" }));
});

test("forged range answers get an error, not a crash", () => {
  for (const bad of ["2026-01-01", 5, ["a"], { start: 1, end: 2 }, { start: "nope", end: "nope" }, { start: "2026-13-40", end: "2026-13-41" }]) {
    assert.ok(validateField(range, bad), JSON.stringify(bad));
  }
});

test("a range reads as text everywhere", () => {
  assert.equal(displayValue(range, { start: "2026-01-01", end: "2026-01-05" }), "2026-01-01 – 2026-01-05");
});

test("repeaters take URL and time sub-fields, with the same validation", () => {
  assert.ok(REPEATER_SUBTYPES.includes("url"));
  assert.ok(REPEATER_SUBTYPES.includes("time"));
  const field = { type: "repeater", config: { subFields: [{ id: "u", type: "url", label: "Site" }] } };
  assert.match(validateField(field, [{ u: "not a url" }]), /Site/);
  assert.equal(validateField(field, [{ u: "https://x.co" }]), null);
});
