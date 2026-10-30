// Response exports: CSV escaping and formula-injection handling, column flattening, JSON shape.
import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { buildExportJson, buildExportTable, escapeCsv, responseCsv, tableToCsv } from "../export.js";

const f = (id, type = "text", extra = {}) => ({ id, type, title: id, ...extra });
const FORM = "form-1";
const response = (answers, extra = {}) => ({ id: "r1", formId: FORM, form: "Demo", name: "Ada", email: "a@b.co", status: "Complete", priority: "Low", answers, submittedAt: "2026-01-01T00:00:00.000Z", ...extra });
const formOf = (fields) => ({ id: FORM, fieldDefs: fields });
const cell = (fields, answers, key, extra) => buildExportTable([response(answers, extra)], { form: formOf(fields) }).rows[0][key];

describe("escapeCsv", () => {
  test("blank values are empty cells", () => {
    assert.equal(escapeCsv(null), "");
    assert.equal(escapeCsv(undefined), "");
    assert.equal(escapeCsv(""), "");
  });

  test("plain values pass through", () => {
    assert.equal(escapeCsv("hello"), "hello");
    assert.equal(escapeCsv(42), "42");
    assert.equal(escapeCsv(true), "true");
  });

  test("delimiters force quoting and quotes double", () => {
    assert.equal(escapeCsv("a,b"), '"a,b"');
    assert.equal(escapeCsv('say "hi"'), '"say ""hi"""');
    assert.equal(escapeCsv("line\nbreak"), '"line\nbreak"');
    assert.equal(escapeCsv("line\r\nbreak"), '"line\r\nbreak"');
  });

  for (const lead of ["=", "+", "-", "@", "\t", "\r"]) {
    test(`text starting with ${JSON.stringify(lead)} is neutralised`, () => {
      const out = escapeCsv(`${lead}1+1`);
      const unquoted = out.startsWith('"') ? out.slice(1) : out;
      assert.equal(unquoted[0], "'");
    });
  }

  test("a realistic payload stays inert and correctly quoted", () => {
    assert.equal(escapeCsv('=HYPERLINK("http://evil.test","click")'), `"'=HYPERLINK(""http://evil.test"",""click"")"`);
    assert.equal(escapeCsv("=1,2"), `"'=1,2"`);
  });

  test("real numbers aren't mangled, negative ones included", () => {
    assert.equal(escapeCsv(-5), "-5");
    assert.equal(escapeCsv(0), "0");
    assert.equal(escapeCsv(1.5), "1.5");
  });

  test("a non-string value that stringifies to a formula is neutralised too", () => {
    assert.equal(escapeCsv(["=1+1"]), "'=1+1");
    assert.equal(escapeCsv({ toString: () => "=1+1" }), "'=1+1");
  });

  test("booleans and plain arrays are unchanged when they're not formulas", () => {
    assert.equal(escapeCsv(false), "false");
    assert.equal(escapeCsv(["a", "b"]), '"a,b"');
    assert.equal(escapeCsv({ first: "x" }), "[object Object]");
  });

  test("a forged composite answer can't inject a formula into the export", () => {
    const form = formOf([f("n", "name"), f("a", "address")]);
    const table = buildExportTable([response({ n: { first: ["=cmd()"] }, a: { city: ["@SUM(1)"] } })], { form });
    const csv = tableToCsv(table);
    assert.equal(/(^|,)=cmd/m.test(csv), false);
    assert.equal(/(^|,)@SUM/m.test(csv), false);
  });
});

describe("buildExportTable", () => {
  test("base columns come first, then questions in form order", () => {
    const { columns } = buildExportTable([response({})], { form: formOf([f("b"), f("a")]) });
    const labels = columns.map((c) => c.label);
    assert.deepEqual(labels.slice(0, 3), ["Response ID", "Form", "Respondent"]);
    assert.deepEqual(labels.slice(-2), ["b", "a"]);
  });

  test("base values read the response, payment and tags", () => {
    const row = buildExportTable(
      [response({}, { score: 0, outcome: { outcome: "Pass" }, tags: ["x", "y"], assignee: "Sam", payment: { status: "paid", amount: 12.5, currency: "usd", ref: "pi_1" } })],
      { form: formOf([]) },
    ).rows[0];
    assert.equal(row.score, 0);
    assert.equal(row.outcome, "Pass");
    assert.equal(row.tags, "x; y");
    assert.equal(row.assignee, "Sam");
    assert.equal(row.payment_status, "paid");
    assert.equal(row.payment_amount, 12.5);
    assert.equal(row.payment_currency, "USD");
    assert.equal(row.payment_ref, "pi_1");
    assert.equal(buildExportTable([response({})], { form: formOf([]) }).rows[0].payment_amount, "");
  });

  test("composite answers flatten into their own columns", () => {
    const fields = [f("n", "name", { label: "Who" }), f("a", "address", { label: "Where" }), f("m", "matrix", { label: "Grid", config: { rows: ["r1", "r2"] } })];
    const { columns, rows } = buildExportTable([response({ n: { first: "A", last: "B" }, a: { city: "Town" }, m: { r1: "x" } })], { form: formOf(fields) });
    const labels = columns.map((c) => c.label);
    for (const label of ["Who (First)", "Who (Last)", "Where (Line 1)", "Where (City)", "Where (Country)", "Grid [r1]", "Grid [r2]"]) assert.ok(labels.includes(label), label);
    assert.equal(rows[0]["q:Who:first"], "A");
    assert.equal(rows[0]["q:Where:city"], "Town");
    assert.equal(rows[0]["q:Where:line1"], "");
    assert.equal(rows[0]["q:Grid:r1"], "x");
    assert.equal(rows[0]["q:Grid:r2"], "");
  });

  test("numeric questions stay numbers so spreadsheets can sum them", () => {
    const fields = [f("n", "number")];
    assert.equal(cell(fields, { n: "-5" }, "q:n"), -5);
    assert.equal(cell(fields, { n: "" }, "q:n"), "");
    assert.equal(cell(fields, {}, "q:n"), "");
  });

  test("multi answers join with semicolons", () => {
    assert.equal(cell([f("m", "multiselect")], { m: ["a", "b"] }, "q:m"), "a; b");
  });

  test("consent exports its audit columns only when given", () => {
    const fields = [f("c", "consent")];
    const metadata = { consents: { c: { acceptedAt: "2026-01-01", textHash: "abc" } } };
    assert.equal(cell(fields, { c: true }, "q:c", { metadata }), "Agreed");
    assert.equal(cell(fields, { c: true }, "q:c:at", { metadata }), "2026-01-01");
    assert.equal(cell(fields, { c: true }, "q:c:hash", { metadata }), "abc");
    assert.equal(cell(fields, { c: false }, "q:c:at", { metadata }), "");
  });

  test("calculated fields export their computed value", () => {
    const fields = [f("n", "number"), f("c", "calculated", { formula: "{n} * 2" })];
    assert.equal(cell(fields, { n: 4 }, "q:c"), "8");
  });

  test("sensitive answers export as a placeholder, in every column they'd flatten to", () => {
    const fields = [f("s", "text", { sensitive: true }), f("n", "name", { sensitive: true })];
    const answers = { s: { __enc: "v1:x" }, n: { __enc: "v1:y" } };
    assert.equal(cell(fields, answers, "q:s"), "[encrypted]");
    assert.equal(cell(fields, answers, "q:n:first"), "[encrypted]");
    assert.equal(cell(fields, answers, "q:n:last"), "[encrypted]");
    assert.equal(cell(fields, {}, "q:s"), "");
  });

  test("metadata.encryptedFields guards fields no longer marked sensitive", () => {
    const fields = [f("s")];
    assert.equal(cell(fields, { s: { __enc: "v1:x" } }, "q:s", { metadata: { encryptedFields: ["s"] } }), "[encrypted]");
  });

  test("excluded and layout fields get no column", () => {
    const { columns } = buildExportTable([response({})], { form: formOf([f("h", "heading"), f("gone", "text", { included: false }), f("keep")]) });
    const keys = columns.map((c) => c.key);
    assert.equal(keys.includes("q:h"), false);
    assert.equal(keys.includes("q:gone"), false);
    assert.equal(keys.includes("q:keep"), true);
  });

  test("responses from several forms share same-labelled columns and leave others blank", () => {
    const formsById = { a: { id: "a", fieldDefs: [f("x", "text", { label: "Shared" }), f("only-a", "text", { label: "A only" })] }, b: { id: "b", fieldDefs: [f("y", "text", { label: "Shared" })] } };
    const { columns, rows } = buildExportTable(
      [response({ x: "1", "only-a": "2" }, { formId: "a" }), response({ y: "3" }, { formId: "b" })],
      { formsById },
    );
    assert.equal(columns.filter((c) => c.label === "Shared").length, 1);
    assert.equal(rows[0]["q:Shared"], "1");
    assert.equal(rows[1]["q:Shared"], "3");
    assert.equal(rows[1]["q:A only"], undefined);
  });
});

describe("tableToCsv", () => {
  test("CRLF rows with every cell and header escaped", () => {
    const csv = tableToCsv({
      columns: [{ key: "a", label: "=Header" }, { key: "b", label: "B,2" }],
      rows: [{ a: "=evil", b: "x,y" }, { a: null }],
    });
    assert.equal(csv, `'=Header,"B,2"\r\n'=evil,"x,y"\r\n,`);
  });

  test("an answer with a newline stays in one quoted cell", () => {
    const csv = tableToCsv(buildExportTable([response({ q: "a\nb" })], { form: formOf([f("q")]) }));
    assert.ok(csv.includes('"a\nb"'));
    assert.equal(csv.split("\r\n").length, 2);
  });

  test("answers are neutralised end to end", () => {
    const csv = responseCsv(response({ q: "=SUM(A1)" }, { name: "@admin" }), formOf([f("q")]));
    assert.ok(csv.includes(",'=SUM(A1)"));
    assert.ok(csv.includes(",'@admin,"));
  });
});

describe("buildExportJson", () => {
  test("keeps raw answers beside labelled values", () => {
    const form = formOf([f("q", "multiselect", { label: "Picks" })]);
    const [row] = buildExportJson([response({ q: ["a", "b"] }, { tags: ["t"], metadata: { consents: { c: {} } } })], { form });
    assert.deepEqual(row.answers, { q: ["a", "b"] });
    assert.deepEqual(row.labelled, { Picks: "a, b" });
    assert.deepEqual(row.tags, ["t"]);
    assert.deepEqual(row.consents, { c: {} });
    assert.equal(row.formId, FORM);
    assert.equal(row.payment, null);
  });

  test("an unknown form still exports, with nothing labelled", () => {
    const [row] = buildExportJson([response({ q: "a" })], {});
    assert.deepEqual(row.labelled, {});
    assert.deepEqual(row.answers, { q: "a" });
  });
});
