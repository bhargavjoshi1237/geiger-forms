import test from "node:test";
import assert from "node:assert/strict";

import { MIN_SHARED_RESPONSES, crosstab, csatScore, crosstabFields, fieldTrend, sharedReport } from "./survey-analytics.js";
import { aggregateField } from "./response-utils.js";

const rating = { id: "r", type: "rating", title: "Rating", label: "Rating", included: true };
const nps = { id: "n", type: "nps", title: "NPS", label: "NPS", included: true };
const plan = { id: "p", type: "select", title: "Plan", label: "Plan", options: ["Free", "Paid"], included: true };
const happy = { id: "h", type: "select", title: "Happy", label: "Happy", options: ["Yes", "No"], included: true };
const reply = (answers, submittedAt = "2026-10-05T10:00:00Z") => ({ answers, submittedAt });

test("CSAT is the share in the top two points of a short scale", () => {
  const answers = [5, 4, 3, 1].map((v) => reply({ r: v }));
  assert.equal(csatScore(aggregateField(rating, answers, [rating])), 50);
  assert.equal(csatScore(aggregateField(rating, [], [rating])), null);
});

test("long scales and other kinds have no CSAT", () => {
  const scale = { id: "s", type: "scale", title: "S", label: "S", config: { min: 1, max: 10 }, included: true };
  assert.equal(csatScore(aggregateField(scale, [reply({ s: 9 })], [scale])), null);
  assert.equal(csatScore(aggregateField(plan, [reply({ p: "Free" })], [plan])), null);
});

test("trends bucket by week, oldest first", () => {
  const rows = [reply({ n: 10 }, "2026-10-13T00:00:00Z"), reply({ n: 0 }, "2026-10-05T00:00:00Z"), reply({ n: 10 }, "2026-10-06T00:00:00Z")];
  assert.deepEqual(fieldTrend(nps, rows, [nps]), [
    { key: "2026-10-05", value: 0, n: 2 },
    { key: "2026-10-12", value: 100, n: 1 },
  ]);
});

test("a long span buckets by month", () => {
  const rows = [reply({ n: 10 }, "2026-01-15T00:00:00Z"), reply({ n: 10 }, "2026-10-15T00:00:00Z")];
  assert.deepEqual(fieldTrend(nps, rows, [nps]).map((p) => p.key), ["2026-01", "2026-10"]);
});

test("fields without a score have no trend", () => {
  assert.equal(fieldTrend(plan, [reply({ p: "Free" })], [plan]), null);
  assert.deepEqual(fieldTrend(nps, [], [nps]), []);
});

test("crosstabs count pairs and leave out unknown answers", () => {
  const table = crosstab(plan, happy, [reply({ p: "Free", h: "Yes" }), reply({ p: "Free", h: "No" }), reply({ p: "Paid", h: "Yes" }), reply({ p: "Gone", h: "Yes" }), reply({ p: "Paid" })]);
  assert.deepEqual(table.grid, { Free: { Yes: 1, No: 1 }, Paid: { Yes: 1, No: 0 } });
  assert.deepEqual(table.rowTotals, { Free: 2, Paid: 1 });
  assert.equal(table.total, 3);
});

test("multi-choice answers count once per pick", () => {
  const multi = { ...happy, type: "multiselect" };
  assert.equal(crosstab(plan, multi, [reply({ p: "Free", h: ["Yes", "No"] })]).total, 2);
});

test("a clear difference is significant, and small samples say they aren't reliable", () => {
  const rows = [];
  for (let i = 0; i < 30; i += 1) rows.push(reply({ p: "Free", h: "Yes" }), reply({ p: "Paid", h: "No" }));
  const strong = crosstab(plan, happy, rows).test;
  assert.equal(strong.significant, true);
  assert.equal(strong.reliable, true);
  assert.equal(crosstab(plan, happy, rows.slice(0, 4)).test.reliable, false);
});

test("an even split isn't significant", () => {
  const rows = [];
  for (let i = 0; i < 20; i += 1) rows.push(reply({ p: "Free", h: "Yes" }), reply({ p: "Free", h: "No" }), reply({ p: "Paid", h: "Yes" }), reply({ p: "Paid", h: "No" }));
  assert.equal(crosstab(plan, happy, rows).test.significant, false);
});

test("sensitive questions can't be crossed", () => {
  assert.deepEqual(crosstabFields([plan, { ...happy, sensitive: true }, rating]).map((f) => f.id), ["p"]);
});

const text = { id: "t", type: "textarea", title: "Comments", label: "Comments", included: true };
const secret = { id: "s", type: "select", title: "Income", label: "Income", options: ["High"], sensitive: true, included: true };

function sharedForm() {
  return { title: "Survey", fieldDefs: [plan, text, secret, rating], settings: {} };
}
const many = (answers) => Array.from({ length: MIN_SHARED_RESPONSES }, () => reply(answers));

test("a shared report holds nothing until there are enough responses", () => {
  const report = sharedReport(sharedForm(), many({ p: "Free" }).slice(1));
  assert.equal(report.tooFew, true);
  assert.deepEqual(report.aggregates, []);
});

test("a shared report never carries free text or sensitive answers", () => {
  const report = sharedReport(sharedForm(), many({ p: "Free", t: "my phone is 555-1234", s: "High", r: 5 }));
  const body = JSON.stringify(report);
  assert.ok(!body.includes("555-1234"));
  assert.ok(!body.includes("Income"));
  assert.ok(!body.includes("Comments"));
  assert.deepEqual(report.aggregates.map((a) => a.field.id), ["p", "r"]);
  assert.deepEqual(Object.keys(report.aggregates[0].field).sort(), ["config", "id", "label", "title", "type"]);
});

test("typed-in Other answers are pooled in a shared report", () => {
  const body = sharedReport(sharedForm(), many({ p: "Call me on 555-9876" }));
  assert.deepEqual(body.aggregates[0].counts, { Free: 0, Paid: 0, Other: MIN_SHARED_RESPONSES });
  assert.ok(!JSON.stringify(body).includes("555-9876"));
});
