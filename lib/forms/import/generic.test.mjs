// Geiger JSON round trip, CSV import and the shared sanitising layer.
import assert from "node:assert/strict";
import { test } from "node:test";

import { defaultSettings, toCanonicalField } from "../schema";
import { visibleFieldIds } from "../logic";
import { getTemplate, TEMPLATES, templateToFormInput } from "../templates";
import { CSV_LIMITS, exportFormJson, importCsv, importGeigerJson, inferColumn, parseCsv } from "./generic";
import { IMPORT_LIMITS, cleanText, cleanUrl, finalizeImport } from "./core";
import { mapTypeformForm } from "./typeform";

const warned = (result, text, field) => result.warnings.some((w) => w.message.includes(text) && (field === undefined || w.field === field));
const fieldsOf = (r) => r.form.schema.fields;

const SOURCE = {
  id: "11111111-1111-1111-1111-111111111111",
  slug: "contact",
  title: "Contact",
  description: "Say hi",
  category: "Sales",
  tags: ["lead"],
  fieldDefs: [
    { id: "f-kind", type: "select", title: "Kind", options: ["A", "B"], optionPoints: { A: 2 }, required: true },
    { id: "f-more", type: "text", title: "More", conditions: [{ id: "c1", fieldId: "f-kind", operator: "equals", value: "A" }], conditionLogic: "all", hint: "About {f-kind}" },
    { id: "f-calc", type: "calculated", title: "Calc", formula: "{f-kind} * 2" },
    { id: "f-rep", type: "repeater", title: "Rows", config: { subFields: [{ id: "s1", type: "text", label: "Item" }], minRows: 1 } },
    { id: "f-img", type: "image", title: "Pic", config: { url: "https://x.test/a.png", alt: "A" } },
  ].map(toCanonicalField),
  settings: {
    ...defaultSettings(),
    thankYouText: "Thanks {f-kind}",
    branchingEnabled: true,
    branches: [{ id: "b1", name: "Hot", outcome: "Hot", conditionLogic: "all", conditions: [{ id: "x", fieldId: "f-kind", operator: "equals", value: "A" }], ending: { enabled: true, title: "Yay", redirectUrl: "https://x.test/next" } }, { id: "b2", name: "Top", conditions: [{ id: "y", fieldId: "__score", operator: "gt", value: "5" }] }],
    duplicates: { enabled: true, fieldIds: ["f-kind"], windowDays: 30, action: "flag" },
    theme: { ...defaultSettings().theme, accent: "#123456" },
    access: { mode: "password", orgDomain: "", passwordHash: "secret-hash", passwordSalt: "salt", onePerUser: false },
    webhooks: [{ url: "https://hooks.test/secret" }],
    slackWebhookUrl: "https://hooks.slack.com/secret",
    notifyEmails: ["boss@acme.test"],
    reportEmails: ["boss@acme.test"],
    sharing: [{ email: "x@acme.test" }],
    payments: { enabled: true, currency: "eur", mode: "payment", interval: "month", coupons: [{ code: "FREE100", type: "percent", value: 100 }] },
    automations: [{ id: "a", conditions: [] }],
    approval: { enabled: true, steps: [{ approver: "boss@acme.test" }] },
  },
};

test("export leaves secrets, recipients and integrations out", () => {
  const text = JSON.stringify(exportFormJson(SOURCE));
  for (const secret of ["secret-hash", "hooks.test", "hooks.slack.com", "boss@acme.test", "FREE100", "x@acme.test"]) assert.ok(!text.includes(secret), secret);
  assert.equal(JSON.parse(text).format, "geiger-form");
});

test("a JSON export round trips with fresh ids and consistent references", () => {
  const exported = JSON.stringify(exportFormJson(SOURCE));
  const result = importGeigerJson(exported);
  const fields = fieldsOf(result);
  const [kind, more, calc, rep, img] = fields;
  assert.deepEqual(fields.map((f) => f.type), ["select", "text", "calculated", "repeater", "image"]);
  assert.deepEqual(fields.map((f) => f.title), ["Kind", "More", "Calc", "Rows", "Pic"]);
  for (const f of fields) assert.ok(!f.id.startsWith("f-"), f.id);
  assert.equal(more.conditions[0].fieldId, kind.id);
  assert.equal(more.conditionLogic, "all");
  assert.equal(more.hint, `About {${kind.id}}`);
  assert.equal(calc.formula, `{${kind.id}} * 2`);
  assert.deepEqual(kind.optionPoints, { A: 2 });
  assert.notEqual(rep.config.subFields[0].id, "s1");
  assert.equal(img.config.url, "https://x.test/a.png");
  const { settings } = result.form;
  assert.equal(settings.thankYouText, `Thanks {${kind.id}}`);
  assert.deepEqual(settings.duplicates.fieldIds, [kind.id]);
  assert.equal(settings.branches[0].conditions[0].fieldId, kind.id);
  assert.notEqual(settings.branches[0].id, "b1");
  assert.equal(settings.branches[0].ending.redirectUrl, "https://x.test/next");
  assert.equal(settings.branches[1].conditions[0].fieldId, "__score");
  assert.equal(settings.theme.accent, "#123456");
  assert.equal(settings.payments.currency, "eur");
  assert.equal(result.form.status, "Draft");
  assert.equal(result.form.title, "Contact");
  assert.equal(result.form.category, "Sales");
  assert.equal(result.form.metadata.import.source, "json");
  // The filtered export has nothing left to warn about.
  assert.deepEqual(result.warnings, []);
  assert.ok(!visibleFieldIds(fields, { [kind.id]: "B" }).has(more.id));
});

test("hand-edited JSON still can't carry secrets or a Published status", () => {
  const result = importGeigerJson({ ...SOURCE, status: "Published", schema: { fields: SOURCE.fieldDefs }, fieldDefs: undefined });
  assert.equal(result.form.status, "Draft");
  const text = JSON.stringify(result.form);
  for (const secret of ["secret-hash", "hooks.test", "hooks.slack.com", "boss@acme.test", "FREE100"]) assert.ok(!text.includes(secret), secret);
  assert.equal(result.form.settings.access.mode, "public");
  assert.ok(warned(result, "Not imported"));
  assert.ok(warned(result, "webhooks"));
  assert.ok(warned(result, "coupons"));
});

test("every built-in template survives a round trip", () => {
  for (const template of TEMPLATES) {
    const input = templateToFormInput(getTemplate(template.id));
    const result = importGeigerJson(JSON.stringify(exportFormJson({ ...input, fieldDefs: input.schema.fields })));
    assert.equal(fieldsOf(result).length, input.schema.fields.length, template.id);
    assert.deepEqual(fieldsOf(result).map((f) => [f.type, f.title]), input.schema.fields.map((f) => [f.type, f.title]), template.id);
    const ids = new Set(fieldsOf(result).map((f) => f.id));
    for (const f of fieldsOf(result)) for (const c of f.conditions) assert.ok(ids.has(c.fieldId), `${template.id}: ${f.title}`);
    assert.equal(result.warnings.filter((w) => /condition/.test(w.message)).length, 0, template.id);
  }
});

test("re-importing a previewed draft is stable (the confirm step)", () => {
  const first = mapTypeformForm({
    id: "abc123",
    title: "T",
    hidden: ["utm"],
    thankyou_screens: [{ ref: "a", title: "A {{field:q}}" }, { ref: "b", title: "B", type: "url_redirect", properties: { redirect_url: "https://x.test/?a={{field:q}}" } }],
    fields: [{ ref: "q", type: "yes_no", title: "Q" }, { ref: "r", type: "short_text", title: "R {{field:q}}" }, { ref: "s", type: "short_text", title: "S" }],
    logic: [{ type: "field", ref: "q", actions: [{ action: "jump", details: { to: { type: "field", value: "s" } }, condition: { op: "is", vars: [{ type: "field", value: "q" }, { type: "constant", value: false }] } }, { action: "jump", details: { to: { type: "thankyou", value: "b" } }, condition: { op: "is", vars: [{ type: "field", value: "q" }, { type: "constant", value: true }] } }] }],
  });
  const second = importGeigerJson(JSON.parse(JSON.stringify(first.form)));
  const [hidden1, q1, r1] = fieldsOf(first);
  const [hidden2, q2, r2, s2] = fieldsOf(second);
  assert.equal(fieldsOf(second).length, fieldsOf(first).length);
  assert.notEqual(q1.id, q2.id);
  assert.equal(hidden2.prefillKey, hidden1.prefillKey);
  assert.equal(r2.title, r1.title.replace(q1.id, q2.id));
  assert.equal(s2.conditions.length, 1);
  assert.equal(s2.conditions[0].fieldId, q2.id);
  assert.equal(second.form.metadata.import.source, "typeform");
  assert.equal(second.form.metadata.import.sourceId, "abc123");
  assert.equal(second.form.settings.layout, "conversational");
  assert.equal(second.form.settings.branches[0].ending.redirectUrl, `https://x.test/?a={${q2.id}}`);
  assert.equal(second.form.settings.thankYouTitle, `A {${q2.id}}`);
});

test("hostile JSON is neutralised", () => {
  const result = importGeigerJson({
    title: "<script>x</script>Form",
    status: "Published",
    schema: {
      fields: [
        { id: "a", type: "image", title: "<b>Img</b>", config: { url: "javascript:alert(1)", alt: "<img onerror=x>", __proto__: { bad: 1 } } },
        { id: "b", type: "picture", title: "P", options: ["X"], config: { images: { X: { url: "data:text/html,<script>" } } } },
        { id: "c", type: "text", title: "Redos", validation: { pattern: "(a+)+$", maxLength: "10", evil: "x" } },
        { id: "d", type: "exec", title: "Unknown" },
        { id: "e", type: "text", title: "Dangling", conditions: [{ fieldId: "ghost", operator: "drop table", value: "x" }, { fieldId: "a", operator: "drop table", value: "x" }] },
        { id: "f", type: "consent", title: "Consent", config: { policyUrl: "javascript:alert(2)" } },
      ],
    },
    settings: { thankYouType: "redirect", thankYouUrl: "javascript:alert(3)", coverUrl: "javascript:alert(4)", layout: "<evil>", locale: "xx", theme: { accent: "red;background:url(x)", font: "../../evil", mode: "hack" }, policy: { url: "vbscript:x" } },
  });
  const text = JSON.stringify(result.form);
  assert.ok(!/javascript:|vbscript:|data:text|<script|<img|<b>/i.test(text), text);
  assert.equal(result.form.status, "Draft");
  assert.equal(result.form.title, "Form");
  const [img, , redos, unknown, dangling] = fieldsOf(result);
  assert.equal(img.config.url, "");
  assert.equal(redos.validation.pattern, undefined);
  assert.equal(redos.validation.maxLength, 10);
  assert.equal(redos.validation.evil, undefined);
  assert.equal(unknown.type, "text");
  assert.equal(dangling.conditions.length, 1);
  assert.equal(dangling.conditions[0].operator, "equals");
  const { settings } = result.form;
  assert.equal(settings.thankYouUrl, "");
  assert.equal(settings.coverUrl, "");
  assert.equal(settings.layout, "classic");
  assert.equal(settings.locale, "en");
  assert.equal(settings.theme.accent, "");
  assert.equal(settings.theme.font, "sans");
  assert.equal(settings.theme.mode, "dark");
  assert.ok(warned(result, "validation pattern", "Redos"));
  assert.ok(warned(result, "Unknown field type", "Unknown"));
  assert.ok(warned(result, "missing from the import", "Dangling"));
  assert.ok(warned(result, "wasn't http or https"));
});

test("JSON rejects what isn't a form", () => {
  for (const bad of ["not json", "[]", "null", '{"title":"no fields"}', '{"format":"other","form":{"fields":[]}}', '{"format":"geiger-form","version":99,"form":{"fields":[]}}', '{"format":"geiger-form","version":1}']) {
    assert.throws(() => importGeigerJson(bad), { name: "ImportError" }, bad);
  }
  assert.throws(() => importGeigerJson("x".repeat(IMPORT_LIMITS.maxInputBytes + 1)), (e) => e.name === "ImportError" && e.code === "too_large");
});

test("oversized forms are refused rather than truncated silently", () => {
  const fields = Array.from({ length: 400 }, (_, i) => ({ id: `f${i}`, type: "textarea", title: "t", hint: "x".repeat(IMPORT_LIMITS.maxTextLength) }));
  assert.throws(() => finalizeImport({ source: "json", title: "Big", fields }), (e) => e.name === "ImportError" && e.code === "too_large");
});

test("the CSV parser handles quotes, CRLF, BOM-free data and blank lines", () => {
  const { rows } = parseCsv('a,"b, with comma","c ""q"""\r\n1,"multi\nline",3\n\n,,\n4,5,6', {});
  assert.deepEqual(rows, [["a", "b, with comma", 'c "q"'], ["1", "multi\nline", "3"], ["4", "5", "6"]]);
  assert.deepEqual(parseCsv("x;y\n1;2").rows, [["x", "y"], ["1", "2"]]);
  assert.deepEqual(parseCsv("x\ty\n1\t2").rows, [["x", "y"], ["1", "2"]]);
  assert.equal(parseCsv('a,"open').unterminated, true);
  assert.equal(parseCsv("a\n1\n2\n3", { maxRows: 2 }).rows.length, 2);
});

test("column types are inferred from sample rows", () => {
  const cases = [
    ["Contact", ["a@b.co", "c@d.org", ""], "email"],
    ["Site", ["https://a.test", "http://b.test/x"], "url"],
    ["Age", ["3", "41", "7.5", "-1"], "number"],
    ["Zip", ["01234", "90210", "33101"], "text"],
    ["Mobile", ["5551234567", "5559876543"], "phone"],
    ["Contact no", ["+1 555 123 4567", "(555) 987-6543"], "phone"],
    ["Joined", ["2026-01-02", "2025-12-31"], "date"],
    ["Joined US", ["1/2/2026", "12/31/2025"], "date"],
    ["Seen", ["2026-01-02T10:00:00Z", "2026-01-03 09:30"], "datetime"],
    ["Slot", ["10:30", "9:15 am"], "time"],
    ["Notes", ["x".repeat(200), "short"], "textarea"],
    ["Name", ["Ann", "Bob", "Cy", "Di"], "text"],
    ["Mixed", ["a@b.co", "not an email"], "text"],
    ["Email", [], "email"],
    ["Blank", ["", " "], "text"],
  ];
  for (const [header, samples, type] of cases) assert.equal(inferColumn(header, samples).type, type, header);
  assert.deepEqual(inferColumn("Plan", ["Free", "Pro", "Free", "Pro", "Free"]).options, ["Free", "Pro"]);
  assert.equal(inferColumn("Plan", ["Free", "Pro", "Free", "Pro"]).type, "select");
  assert.equal(inferColumn("City", ["A", "B", "C", "D", "E", "F", "A", "B", "C", "D", "E", "F"]).type, "dropdown");
});

test("a CSV becomes one field per column, with warnings for guesses", () => {
  const csv = "﻿Name,Email,Plan,,Email,Blank\nAnn,a@b.co,Free,x,c@d.co,\nBob,b@b.co,Pro,y,e@f.co,\nCy,c@b.co,Free,z,g@h.co,\nDi,d@b.co,Pro,w,i@j.co,\n";
  const result = importCsv(csv, { title: "Leads" });
  const fields = fieldsOf(result);
  assert.deepEqual(fields.map((f) => f.title), ["Name", "Email", "Plan", "Column 4", "Email (2)", "Blank"]);
  assert.deepEqual(fields.map((f) => f.type), ["text", "email", "select", "text", "email", "text"]);
  assert.deepEqual(fields[2].options, ["Free", "Pro"]);
  assert.equal(new Set(fields.map((f) => f.id)).size, 6);
  for (const f of fields) assert.ok(!f.id.startsWith("col-"));
  assert.equal(result.form.title, "Leads");
  assert.equal(result.form.status, "Draft");
  assert.equal(result.form.metadata.import.source, "csv");
  assert.ok(warned(result, "may be incomplete", "Plan"));
  assert.ok(warned(result, "no header", "Column 4"));
  assert.ok(warned(result, "Duplicate column", "Email"));
  assert.ok(warned(result, "blank", "Blank"));
});

test("a header-only CSV works and says so", () => {
  const result = importCsv("Email,Website\n");
  assert.deepEqual(fieldsOf(result).map((f) => f.type), ["email", "url"]);
  assert.ok(warned(result, "No data rows"));
});

test("hostile or oversized CSVs are handled", () => {
  const html = importCsv('<script>alert(1)</script>Name,"<img src=x onerror=y>Mail"\nx,y\n');
  assert.deepEqual(fieldsOf(html).map((f) => f.title), ["Name", "Mail"]);
  assert.ok(warned(html, "Removed HTML"));

  const wide = importCsv(`${Array.from({ length: CSV_LIMITS.maxColumns + 50 }, (_, i) => `c${i}`).join(",")}\n`);
  assert.equal(fieldsOf(wide).length, CSV_LIMITS.maxColumns);
  assert.ok(warned(wide, `first ${CSV_LIMITS.maxColumns}`));

  assert.throws(() => importCsv(""), { name: "ImportError" });
  assert.throws(() => importCsv("   \n  "), { name: "ImportError" });
  assert.throws(() => importCsv("a,b\u0000\n"), { name: "ImportError" });
  assert.throws(() => importCsv("x,y\n".repeat(IMPORT_LIMITS.maxInputBytes)), (e) => e.code === "too_large");
});

test("only the sample rows are read, so row data never becomes form data", () => {
  const rows = Array.from({ length: 5000 }, (_, i) => `person${i}@secret.test`).join("\n");
  const result = importCsv(`Email\n${rows}`);
  assert.ok(!JSON.stringify(result.form).includes("secret.test"));
});

test("text and URL cleaners", () => {
  assert.equal(cleanText("<p>Hi</p> <b>there</b>"), "Hi there");
  assert.equal(cleanText("a\u0000b\u0007c"), "abc");
  assert.equal(cleanText("line\nbreak"), "line\nbreak");
  assert.equal(cleanText({ toString: () => "<x>" }), "");
  assert.equal(cleanText("abcdef", 3), "abc");
  assert.equal(cleanUrl("https://a.test/x y"), "https://a.test/x%20y");
  assert.equal(cleanUrl("https://a.test/?q={abc}"), "https://a.test/?q={abc}");
  assert.equal(cleanUrl("{evil}:alert(1)"), "");
  assert.equal(cleanUrl(`https://a.test/${"x".repeat(3000)}`), "");
});
