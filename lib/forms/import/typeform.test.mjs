// Typeform mapping: every type, nested groups, logic jumps, warnings, id remapping and hostile input, on hand-written definitions.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { FIELD_TYPES } from "../field-types";
import { visibleFieldIds, resolveEnding, resolveOutcome, scoreResponse } from "../logic";
import { IMPORT_LIMITS } from "./core";
import { TYPEFORM_TYPE_MAP, isValidTypeformToken, mapTypeformForm, parseTypeformId } from "./typeform";

const q = (type, ref, title, extra = {}) => ({ id: `id${ref}`, ref, type, title, ...extra });
const choices = (...labels) => labels.map((label) => ({ id: `c-${label}`, ref: `ref-${label}`, label }));
const jump = (to, condition, toType = "field") => ({ action: "jump", details: { to: { type: toType, value: to } }, condition });
const is = (ref, value, type = "choice", op = "is") => ({ op, vars: [{ type: "field", value: ref }, { type, value }] });
const always = { op: "always", vars: [] };

const fieldsOf = (result) => result.form.schema.fields;
const byTitle = (result, title) => fieldsOf(result).find((f) => f.title === title);
const warned = (result, text, field) => result.warnings.some((w) => w.message.includes(text) && (field === undefined || w.field === field));

const KITCHEN_SINK = {
  id: "abc123XY",
  title: "Customer survey",
  settings: { language: "fr", show_progress_bar: false, meta: { description: "Tell us more" }, google_analytics: "UA-1" },
  theme: { colors: { button: "#ff5500", background: "#101010", question: "#fff", answer: "#eee" }, font: "Inter", rounded_corners: "large" },
  hidden: ["utm_source"],
  variables: { score: 0, price: 25 },
  welcome_screens: [{ ref: "w", title: "Welcome!", properties: { description: "Hello", button_text: "Begin", show_button: true } }],
  thankyou_screens: [
    { ref: "thanks", title: "All done", properties: { description: "Thanks a lot", show_button: false } },
    { ref: "default_tys", title: "Thanks for completing this typeform", type: "thankyou_screen", properties: {} },
  ],
  fields: [
    q("short_text", "s", "Short", { validations: { required: true, max_length: 20 } }),
    q("long_text", "l", "Long", { properties: { description: "Say more" } }),
    q("email", "e", "Email"),
    q("phone_number", "p", "Phone", { properties: { default_country_code: "us" } }),
    q("website", "w1", "Site"),
    q("number", "n", "Count", { validations: { min_value: 1, max_value: 9 } }),
    q("multiple_choice", "mc", "Pick", { properties: { choices: choices("A", "B"), allow_other_choice: true, randomize: true } }),
    q("multiple_choice", "mm", "Pick many", { properties: { choices: choices("X", "Y"), allow_multiple_selection: true }, validations: { min_selection: 1, max_selection: 2 } }),
    q("dropdown", "dd", "Drop", { properties: { choices: choices("Zed", "Ann"), alphabetical_order: true } }),
    q("picture_choice", "pc", "Picture", { properties: { choices: [{ ref: "p1", label: "Cat", attachment: { type: "image", href: "https://images.typeform.com/cat.png" } }, { ref: "p2", label: "Dog" }], show_labels: false, supersized: true } }),
    q("picture_choice", "pm", "Pictures", { properties: { allow_multiple_selection: true, choices: [{ ref: "p3", label: "Sun", attachment: { type: "image", href: "https://x.test/sun.png" } }] } }),
    q("yes_no", "yn", "Agree?"),
    q("legal", "lg", "Accept the terms", { validations: { required: true } }),
    q("rating", "r", "Stars", { properties: { steps: 7, shape: "heart" } }),
    q("opinion_scale", "os", "Scale", { properties: { steps: 11, start_at_one: false, labels: { left: "Low", center: "Mid", right: "High" } } }),
    q("nps", "np", "Recommend", { properties: { labels: { left: "No", right: "Yes" } } }),
    q("ranking", "rk", "Rank", { properties: { choices: choices("One", "Two") } }),
    q("date", "dt", "When"),
    q("file_upload", "fu", "Attach"),
    q("multi_format", "mf", "Record"),
    q("payment", "pay", "Pay", { properties: { currency: "EUR", price: { type: "variable", value: "price" } } }),
    q("matrix", "mx", "Grid", { properties: { fields: [q("multiple_choice", "mx1", "Row one", { properties: { choices: choices("Good", "Bad") }, validations: { required: true } }), q("multiple_choice", "mx2", "Row two", { properties: { choices: choices("Good", "Bad") } })] } }),
    q("address", "ad", "Where", { properties: { fields: [q("short_text", "ad1", "Street", { validations: { required: true } })] } }),
    q("contact_info", "ci", "Your details", { properties: { fields: [q("short_text", "ci1", "First name"), q("email", "ci2", "Work email")] } }),
    q("statement", "st", "A statement", { properties: { description: "Body", button_text: "Onward" } }),
    q("calendly", "cal", "Book a call", { properties: { calendly_url: "https://calendly.com/acme/intro" } }),
    q("hologram", "hg", "Mystery"),
  ],
};

test("the type map only names real Geiger types", () => {
  for (const type of Object.values(TYPEFORM_TYPE_MAP)) assert.ok(Object.hasOwn(FIELD_TYPES, type), type);
});

test("every Typeform type maps to its closest Geiger type", () => {
  const result = mapTypeformForm(KITCHEN_SINK);
  const expected = { Short: "text", Long: "textarea", Email: "email", Phone: "phone", Site: "url", Count: "number", Pick: "select", "Pick many": "multiselect", Drop: "dropdown", Picture: "picture", Pictures: "multipicture", "Agree?": "select", "Accept the terms": "consent", Stars: "rating", Scale: "scale", Recommend: "nps", Rank: "ranking", When: "date", Attach: "file", Record: "file", Pay: "product", Grid: "matrix", Where: "address", "Your details": "heading", "First name": "text", "Work email": "email", "A statement": "statement", "Book a call": "statement", Mystery: "text" };
  for (const [title, type] of Object.entries(expected)) assert.equal(byTitle(result, title)?.type, type, title);
  assert.equal(result.form.status, "Draft");
  assert.equal(result.form.title, "Customer survey");
  assert.equal(result.form.description, "Tell us more");
  assert.equal(result.form.metadata.import.source, "typeform");
  assert.equal(result.form.metadata.import.sourceId, "abc123XY");
  assert.equal(result.stats.fieldCount, fieldsOf(result).filter((f) => !FIELD_TYPES[f.type].layout).length);
});

test("type details carry over", () => {
  const result = mapTypeformForm(KITCHEN_SINK);
  assert.equal(byTitle(result, "Short").required, true);
  assert.equal(byTitle(result, "Short").validation.maxLength, 20);
  assert.equal(byTitle(result, "Long").hint, "Say more");
  assert.deepEqual(byTitle(result, "Count").validation, { min: 1, max: 9 });
  assert.deepEqual(byTitle(result, "Pick").options, ["A", "B", "Other"]);
  assert.deepEqual(byTitle(result, "Pick many").validation, { minSelect: 1, maxSelect: 2 });
  assert.deepEqual(byTitle(result, "Drop").options, ["Ann", "Zed"]);
  assert.deepEqual(byTitle(result, "Agree?").options, ["Yes", "No"]);
  assert.equal(byTitle(result, "Picture").config.images.Cat.url, "https://images.typeform.com/cat.png");
  assert.equal(byTitle(result, "Picture").config.hideLabels, true);
  assert.equal(byTitle(result, "Stars").config.max, 7);
  assert.deepEqual([byTitle(result, "Scale").config.min, byTitle(result, "Scale").config.max], [0, 10]);
  assert.equal(byTitle(result, "Recommend").config.minLabel, "No");
  assert.deepEqual(byTitle(result, "Grid").config.rows, ["Row one", "Row two"]);
  assert.deepEqual(byTitle(result, "Grid").options, ["Good", "Bad"]);
  assert.equal(byTitle(result, "Grid").required, true);
  assert.equal(byTitle(result, "Where").required, true);
  assert.equal(byTitle(result, "Pay").config.price, 25);
  assert.equal(byTitle(result, "Pay").config.currency, "eur");
  assert.equal(byTitle(result, "Book a call").hint, "https://calendly.com/acme/intro");
  assert.equal(byTitle(result, "utm_source").type, "hidden");
  assert.equal(byTitle(result, "utm_source").prefillKey, "utm_source");
});

test("screens, settings and theme basics map to settings", () => {
  const { settings } = mapTypeformForm(KITCHEN_SINK).form;
  assert.deepEqual(settings.welcome, { enabled: true, title: "Welcome!", body: "Hello", buttonLabel: "Begin" });
  assert.equal(settings.thankYouTitle, "All done");
  assert.equal(settings.thankYouText, "Thanks a lot");
  assert.equal(settings.layout, "conversational");
  assert.equal(settings.progressBar, false);
  assert.equal(settings.locale, "fr");
  assert.equal(settings.theme.accent, "#ff5500");
  assert.equal(settings.theme.mode, "dark");
  assert.equal(settings.theme.radius, "lg");
  assert.equal(settings.theme.font, "inter");
  assert.equal(settings.payments.enabled, false);
  assert.equal(settings.payments.currency, "eur");
  // A settings block with no secret-bearing defaults changed.
  assert.deepEqual(settings.webhooks, []);
});

test("everything dropped or approximated is named in a warning", () => {
  const result = mapTypeformForm(KITCHEN_SINK);
  const cases = [
    ["Phone", "country code"],
    ["Pick", "Randomised"],
    ["Pick", '"Other"'],
    ["Picture", "no image"],
    ["Stars", "heart"],
    ["Scale", "Mid"],
    ["Record", "file upload"],
    ["Pay", "variable"],
    ["Pay", "Payments stay off"],
    ["A statement", "button text"],
    ["Book a call", "Calendly"],
    ["Mystery", "hologram"],
  ];
  for (const [field, text] of cases) assert.ok(warned(result, text, field), `${field}: ${text}`);
  assert.ok(warned(result, "Google Analytics"));
  assert.ok(warned(result, "Theme text colours"));
  assert.ok(warned(result, "Images still load from Typeform"));
  for (const w of result.warnings) assert.ok(typeof w.message === "string" && w.message && (w.field === null || typeof w.field === "string"));
});

test("a default-only ending keeps Geiger's thank-you and says so", () => {
  const result = mapTypeformForm({ title: "T", fields: [], thankyou_screens: [{ ref: "default_tys", title: "Thanks for completing this typeform" }] });
  assert.equal(result.form.settings.thankYouTitle, "Response submitted");
  assert.ok(warned(result, "default thank-you"));
});

test("nested groups flatten into page breaks and keep their children in order", () => {
  const result = mapTypeformForm({
    title: "Groups",
    fields: [
      q("short_text", "a", "Before"),
      q("group", "g", "Section", { properties: { description: "Intro", fields: [q("short_text", "b", "Inside"), q("group", "g2", "Nested", { properties: { fields: [q("email", "c", "Deep")] } })] } }),
      q("short_text", "d", "After"),
    ],
  });
  assert.deepEqual(fieldsOf(result).map((f) => f.type), ["text", "page", "content", "text", "heading", "email", "page", "text"]);
  assert.deepEqual(fieldsOf(result).map((f) => f.title), ["Before", "Section", "Section intro", "Inside", "Nested", "Deep", "Continued", "After"]);
  assert.equal(fieldsOf(result)[2].hint, "Intro");
});

test("a group that opens the form becomes a heading, so the first page isn't empty", () => {
  const result = mapTypeformForm({ title: "G", hidden: ["ref"], fields: [q("group", "g", "Start", { properties: { fields: [q("short_text", "a", "A")] } })] });
  assert.deepEqual(fieldsOf(result).map((f) => f.type), ["hidden", "heading", "text"]);
});

test("groups deeper than the limit are dropped with a warning instead of recursing forever", () => {
  let node = q("short_text", "leaf", "Leaf");
  for (let i = 0; i < 40; i += 1) node = q("group", `g${i}`, `G${i}`, { properties: { fields: [node] } });
  const result = mapTypeformForm({ title: "Deep", fields: [node] });
  assert.ok(warned(result, "nested more than"));
  assert.ok(!byTitle(result, "Leaf"));
});

test("a conditional jump hides the questions it skips, matching Typeform's path", () => {
  const result = mapTypeformForm({
    title: "Skip",
    fields: [q("yes_no", "a", "Member?"), q("short_text", "b", "Number"), q("short_text", "c", "Reason"), q("short_text", "d", "Name")],
    logic: [{ type: "field", ref: "a", actions: [jump("d", is("a", false, "constant"))] }],
  });
  const fields = fieldsOf(result);
  const [a, , , d] = fields;
  assert.deepEqual(byTitle(result, "Number").conditions.map((c) => [c.fieldId, c.operator, c.value]), [[a.id, "not_equals", "No"]]);
  assert.equal(d.conditions.length, 0);
  const shown = (answer) => [...visibleFieldIds(fields, { [a.id]: answer })].map((id) => fields.find((f) => f.id === id).title);
  assert.deepEqual(shown("No"), ["Member?", "Name"]);
  assert.deepEqual(shown("Yes"), ["Member?", "Number", "Reason", "Name"]);
  assert.deepEqual(shown(undefined), ["Member?", "Number", "Reason", "Name"]);
});

test("a diamond (branch, then both paths converge) keeps each path intact", () => {
  const result = mapTypeformForm({
    title: "Diamond",
    fields: [q("multiple_choice", "a", "Path", { properties: { choices: choices("Left", "Right") } }), q("short_text", "l1", "L1"), q("short_text", "l2", "L2"), q("short_text", "r1", "R1"), q("short_text", "r2", "R2"), q("short_text", "end", "End")],
    logic: [
      { type: "field", ref: "a", actions: [jump("l1", is("a", "ref-Left")), jump("r1", always)] },
      { type: "field", ref: "l2", actions: [jump("end", always)] },
    ],
  });
  const fields = fieldsOf(result);
  const a = fields[0];
  const shown = (answer) => [...visibleFieldIds(fields, { [a.id]: answer })].map((id) => fields.find((f) => f.id === id).title);
  assert.deepEqual(shown("Left"), ["Path", "L1", "L2", "End"]);
  assert.deepEqual(shown("Right"), ["Path", "R1", "R2", "End"]);
});

test("a whole skipped section becomes a page skip on its page break", () => {
  const result = mapTypeformForm({
    title: "Pages",
    fields: [q("yes_no", "a", "Extra?"), q("group", "g", "Extras", { properties: { fields: [q("short_text", "b", "B"), q("short_text", "c", "C")] } }), q("short_text", "d", "D")],
    logic: [{ type: "field", ref: "a", actions: [jump("d", is("a", false, "constant"))] }],
  });
  const page = byTitle(result, "Extras");
  assert.equal(page.type, "page");
  assert.equal(page.conditions.length, 1);
  assert.equal(byTitle(result, "B").conditions.length, 0);
  const fields = fieldsOf(result);
  const a = fields[0];
  assert.ok(!visibleFieldIds(fields, { [a.id]: "No" }).has(byTitle(result, "B").id));
  assert.ok(visibleFieldIds(fields, { [a.id]: "Yes" }).has(byTitle(result, "B").id));
  assert.ok(visibleFieldIds(fields, { [a.id]: "No" }).has(byTitle(result, "D").id));
});

test("numeric jumps keep blank answers on the default path", () => {
  const result = mapTypeformForm({
    title: "Num",
    fields: [q("number", "a", "Age"), q("short_text", "b", "Guardian"), q("short_text", "c", "C")],
    logic: [{ type: "field", ref: "a", actions: [jump("c", { op: "greater_equal_than", vars: [{ type: "field", value: "a" }, { type: "constant", value: 18 }] })] }],
  });
  const fields = fieldsOf(result);
  const show = (v) => visibleFieldIds(fields, { [fields[0].id]: v }).has(fields[1].id);
  assert.equal(show(20), false);
  assert.equal(show(10), true);
  assert.equal(show(undefined), true);
});

test("a jump to a thank-you screen hides what follows and routes to that ending", () => {
  const result = mapTypeformForm({
    title: "Endings",
    thankyou_screens: [
      { ref: "ok", title: "Great" },
      { ref: "no", title: "Sorry", properties: { description: "Not eligible", show_button: true, button_mode: "redirect", button_text: "Read more", redirect_url: "https://example.com/more" } },
      { ref: "away", title: "Off you go", type: "url_redirect", properties: { redirect_url: "https://example.com/next" } },
      { ref: "lonely", title: "Unused" },
    ],
    fields: [q("multiple_choice", "a", "Eligible?", { properties: { choices: choices("Yes", "No", "Other") } }), q("short_text", "b", "Details")],
    logic: [{ type: "field", ref: "a", actions: [jump("no", is("a", "ref-No"), "thankyou"), jump("away", is("a", "ref-Other"), "thankyou")] }],
  });
  const { settings } = result.form;
  const fields = fieldsOf(result);
  const a = fields[0];
  assert.equal(settings.branchingEnabled, true);
  assert.equal(settings.thankYouTitle, "Great");
  assert.deepEqual(settings.branches.map((b) => b.name), ["Sorry", "Off you go"]);
  assert.equal(settings.branches[0].conditions[0].fieldId, a.id);
  assert.equal(settings.branches[0].ending.buttonUrl, "https://example.com/more");
  assert.equal(settings.branches[1].ending.redirectUrl, "https://example.com/next");
  assert.ok(!visibleFieldIds(fields, { [a.id]: "No" }).has(fields[1].id));
  const form = { fieldDefs: fields, settings };
  const outcome = resolveOutcome(form, { [a.id]: "No" });
  assert.equal(resolveEnding(form, { [a.id]: "No" }, {}, outcome).text, "Not eligible");
  assert.ok(warned(result, "No logic jump leads", "Unused"));
});

test("fixed points per option become scoring; other calculations are named and dropped", () => {
  const add = (ref, label, n) => ({ action: "add", details: { target: { type: "variable", value: "score" }, value: { type: "constant", value: n } }, condition: is(ref, `ref-${label}`) });
  const result = mapTypeformForm({
    title: "Quiz",
    variables: { score: 5, price: 0 },
    fields: [q("multiple_choice", "a", "Q1", { properties: { choices: choices("Right", "Wrong") } }), q("number", "n", "Q2")],
    logic: [
      { type: "field", ref: "a", actions: [add("a", "Right", 3), { action: "multiply", details: { target: { type: "variable", value: "score" }, value: { type: "constant", value: 2 } }, condition: always }] },
      { type: "field", ref: "n", actions: [{ action: "add", details: { target: { type: "variable", value: "price" }, value: { type: "constant", value: 1 } }, condition: always }] },
    ],
  });
  const { settings } = result.form;
  const q1 = byTitle(result, "Q1");
  assert.deepEqual(q1.optionPoints, { Right: 3 });
  assert.equal(settings.scoringEnabled, true);
  assert.equal(scoreResponse({ fieldDefs: fieldsOf(result), settings }, { [q1.id]: "Right" }).score, 3);
  assert.ok(warned(result, "multiply", "Q1"));
  assert.ok(warned(result, '"price" variable', "Q2"));
  assert.ok(warned(result, "started at 5"));
});

test("a score-based jump only routes the ending, because field conditions can't read the score", () => {
  const scoreCond = { op: "greater_than", vars: [{ type: "variable", value: "score" }, { type: "constant", value: 5 }] };
  const result = mapTypeformForm({
    title: "S",
    thankyou_screens: [{ ref: "base", title: "Base" }, { ref: "win", title: "Win" }],
    fields: [q("short_text", "a", "A"), q("short_text", "b", "B")],
    logic: [{ type: "field", ref: "a", actions: [jump("win", scoreCond, "thankyou")] }],
  });
  assert.equal(result.form.settings.branches[0].conditions[0].fieldId, "__score");
  assert.equal(byTitle(result, "B").conditions.length, 0);
  assert.ok(warned(result, "may still show", "A"));
});

test("logic Geiger can't express is warned about, not faked", () => {
  const cases = [
    ["ends_with", { op: "ends_with", vars: [{ type: "field", value: "a" }, { type: "constant", value: "x" }] }, "ends with"],
    ["dates", { op: "earlier_than", vars: [{ type: "field", value: "a" }, { type: "constant", value: "2024-01-01" }] }, "earlier than"],
    ["two answers", { op: "is", vars: [{ type: "field", value: "a" }, { type: "field", value: "c" }] }, "two answers"],
    ["other variable", { op: "is", vars: [{ type: "variable", value: "price" }, { type: "constant", value: 1 }] }, '"price" variable'],
  ];
  for (const [name, condition, text] of cases) {
    const result = mapTypeformForm({
      title: name,
      fields: [q("short_text", "a", "A"), q("short_text", "b", "B"), q("short_text", "c", "C")],
      logic: [{ type: "field", ref: "a", actions: [jump("c", condition)] }],
    });
    assert.ok(warned(result, text, "A"), name);
    assert.equal(byTitle(result, "B").conditions.length, 0, name);
  }
});

test("backward jumps, dangling targets and matrix-row conditions are dropped with warnings", () => {
  const result = mapTypeformForm({
    title: "Loops",
    fields: [
      q("short_text", "a", "A"),
      q("matrix", "m", "M", { properties: { fields: [q("multiple_choice", "m1", "Row", { properties: { choices: choices("X") } })] } }),
      q("short_text", "b", "B"),
      q("short_text", "c", "C"),
    ],
    logic: [
      { type: "field", ref: "b", actions: [jump("a", always)] },
      { type: "field", ref: "a", actions: [jump("nowhere", always)] },
      { type: "field", ref: "m", actions: [jump("c", is("m1", "ref-X"))] },
      { type: "field", ref: "ghost", actions: [jump("c", always)] },
    ],
  });
  assert.ok(warned(result, "earlier question", "B"));
  assert.ok(warned(result, "target question wasn't found", "A"));
  assert.ok(warned(result, "part of a matrix", "M"));
  assert.ok(warned(result, "wasn't found was dropped (ghost)"));
  assert.equal(byTitle(result, "B").conditions.length, 0);
});

test("overlapping jump rules and mixed AND/OR are called out", () => {
  const eq = (v) => ({ op: "contains", vars: [{ type: "field", value: "a" }, { type: "constant", value: v }] });
  const overlap = mapTypeformForm({
    title: "O",
    fields: [q("short_text", "a", "A"), q("short_text", "b", "B"), q("short_text", "c", "C"), q("short_text", "d", "D")],
    logic: [{ type: "field", ref: "a", actions: [jump("c", eq("x")), jump("d", eq("y"))] }],
  });
  assert.ok(warned(overlap, "can match at once", "A"));

  const mixed = mapTypeformForm({
    title: "M",
    fields: [q("short_text", "a", "A"), q("short_text", "a2", "A2"), q("short_text", "b", "B"), q("short_text", "c", "C")],
    logic: [{ type: "field", ref: "a2", actions: [jump("c", { op: "or", vars: [{ op: "and", vars: [eq("x"), eq("y")] }, eq("z")] })] }],
  });
  assert.ok(warned(mixed, "combines AND and OR", "A2"));
});

test("a question always skipped is switched off, not left dangling", () => {
  const result = mapTypeformForm({
    title: "Off",
    fields: [q("short_text", "a", "A"), q("short_text", "b", "Never"), q("short_text", "c", "C")],
    logic: [{ type: "field", ref: "a", actions: [jump("c", always)] }],
  });
  assert.equal(byTitle(result, "Never").included, false);
  assert.ok(warned(result, "switched off", "Never"));
});

test("field ids are fresh, unique and every reference follows them", () => {
  const result = mapTypeformForm({
    title: "Hi {{hidden:utm}}",
    hidden: ["utm"],
    welcome_screens: [{ ref: "w", title: "Hello {{field:a}}" }],
    thankyou_screens: [{ ref: "t", title: "Done {{field:a}}", properties: { description: "Score {{var:score}}" } }, { ref: "t2", title: "Other {{hidden:utm}}", type: "url_redirect", properties: { redirect_url: "https://x.test/?who={{field:a}}" } }],
    fields: [q("short_text", "a", "Name"), q("short_text", "b", "Hi {{field:a}} from {{hidden:utm}}"), q("short_text", "c", "Unknown {{field:ghost}} {{account:plan}}")],
    logic: [{ type: "field", ref: "b", actions: [jump("t2", is("a", "bob", "constant"), "thankyou")] }],
  });
  const fields = fieldsOf(result);
  const ids = fields.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length);
  const original = new Set(["a", "b", "c", "hidden:utm", "ida", "idb", "idc"]);
  for (const id of ids) assert.ok(!original.has(id));
  const [hidden, name, second, third] = fields;
  assert.equal(second.title, `Hi {${name.id}} from {${hidden.id}}`);
  assert.equal(third.title, "Unknown");
  assert.ok(warned(result, "ghost"));
  assert.ok(warned(result, "plan"));
  const { settings } = result.form;
  assert.equal(settings.welcome.title, `Hello {${name.id}}`);
  assert.equal(settings.thankYouTitle, `Done {${name.id}}`);
  assert.equal(settings.thankYouText, "Score {score}");
  assert.equal(settings.branches[0].conditions[0].fieldId, name.id);
  assert.equal(settings.branches[0].ending.redirectUrl, `https://x.test/?who={${name.id}}`);
  assert.equal(settings.branches[0].name, `Other {${hidden.id}}`);
  // No two imports share ids.
  const again = fieldsOf(mapTypeformForm({ title: "x", fields: [q("short_text", "a", "Name")] }));
  assert.ok(!ids.includes(again[0].id));
});

test("duplicate references don't collapse fields", () => {
  const result = mapTypeformForm({ title: "D", fields: [q("short_text", "same", "First"), q("short_text", "same", "Second")] });
  assert.equal(new Set(fieldsOf(result).map((f) => f.id)).size, 2);
  assert.ok(warned(result, "reused another question", "Second"));
});

test("javascript: and other non-http URLs never survive", () => {
  const bad = ["javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "java\nscript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:x", "file:///etc/passwd", "//evil.test/x"];
  for (const url of bad) {
    const result = mapTypeformForm({
      title: "Urls",
      settings: { redirect_after_submit_url: url },
      thankyou_screens: [{ ref: "base", title: "Base", type: "url_redirect", properties: { redirect_url: url } }, { ref: "n", title: "N", properties: { show_button: true, button_mode: "redirect", redirect_url: url } }],
      fields: [
        q("short_text", "a", "A", { attachment: { type: "image", href: url } }),
        q("picture_choice", "p", "P", { properties: { choices: [{ ref: "x", label: "X", attachment: { type: "image", href: url } }] } }),
        q("calendly", "cal", "Call", { properties: { calendly_url: url } }),
      ],
      logic: [{ type: "field", ref: "a", actions: [jump("n", is("a", "z", "constant"), "thankyou")] }],
      theme: { colors: { button: "url(javascript:alert(1))" }, background: { href: url } },
    });
    const text = JSON.stringify(result.form);
    assert.ok(!/javascript:|vbscript:|data:text|file:\/\//i.test(text), url);
    assert.equal(result.form.settings.thankYouUrl, "", url);
    assert.ok(result.warnings.length > 0);
    assert.equal(byTitle(result, "P").config.images.X.url, "");
    assert.equal(result.form.settings.branches[0].ending.buttonUrl, "");
    assert.equal(result.form.settings.theme.accent, "");
  }
});

test("HTML in titles, options and descriptions is stripped and reported", () => {
  const result = mapTypeformForm({
    title: "<img src=x onerror=alert(1)>Survey",
    welcome_screens: [{ ref: "w", title: "<b>Hello</b>", properties: { description: "<script>steal()</script>Body" } }],
    fields: [
      q("short_text", "a", "<script>alert(1)</script>Name<scr<script>ipt>", { properties: { description: '<a href="javascript:x">click</a>' } }),
      q("multiple_choice", "b", "Pick", { properties: { choices: [{ ref: "1", label: "<svg onload=alert(1)>Yes" }, { ref: "2", label: "Fine" }] } }),
      q("short_text", "c", "Unclosed <img src=x onerror=alert(1)"),
    ],
  });
  const text = JSON.stringify(result.form);
  assert.ok(!/<script|<img|<svg|<a |onerror=alert\(1\)>|steal\(\)/i.test(text), text);
  assert.equal(result.form.title, "Survey");
  assert.equal(fieldsOf(result)[0].title, "Name");
  assert.equal(fieldsOf(result)[0].hint, "click");
  assert.deepEqual(fieldsOf(result)[1].options, ["Yes", "Fine"]);
  assert.ok(warned(result, "Removed HTML", "Name"));
  assert.ok(warned(result, "Removed HTML from the form title"));
});

test("plain angle brackets in ordinary text are left alone", () => {
  const result = mapTypeformForm({ title: "A < B and 5 > 3", fields: [q("short_text", "a", "Is x < 5?")] });
  assert.equal(result.form.title, "A < B and 5 > 3");
  assert.equal(fieldsOf(result)[0].title, "Is x < 5?");
});

test("emphasis markers are removed and counted, and ordinary symbols survive", () => {
  const result = mapTypeformForm({ title: "*Bold* form", fields: [q("short_text", "a", "_Your_ snake_case_name 2 * 3 * 4")] });
  assert.equal(result.form.title, "Bold form");
  assert.equal(fieldsOf(result)[0].title, "Your snake_case_name 2 * 3 * 4");
  assert.ok(warned(result, "Bold and italic"));
});

test("reserved keys can't pollute prototypes", () => {
  const raw = JSON.parse(`{"title":"P","fields":[{"ref":"__proto__","type":"multiple_choice","title":"Q","properties":{"choices":[{"ref":"constructor","label":"__proto__"},{"ref":"b","label":"Fine"}]}}],"__proto__":{"polluted":true}}`);
  const result = mapTypeformForm(raw);
  assert.equal({}.polluted, undefined);
  assert.deepEqual(fieldsOf(result)[0].options, ["Fine"]);
});

test("huge definitions are capped, stay fast and report what was cut", () => {
  const manyFields = Array.from({ length: 5000 }, (_, i) => q("short_text", `f${i}`, `Q${i}`));
  const manyChoices = Array.from({ length: 5000 }, (_, i) => ({ ref: `c${i}`, label: `Choice ${i}` }));
  const started = Date.now();
  const result = mapTypeformForm({
    title: "x".repeat(100_000),
    fields: [q("long_text", "long", "y".repeat(100_000), { properties: { description: "z".repeat(100_000) } }), q("multiple_choice", "big", "Big", { properties: { choices: manyChoices } }), ...manyFields],
    logic: manyFields.slice(0, 3000).map((f, i) => ({ type: "field", ref: f.ref, actions: [jump(manyFields[i + 2].ref, { op: "contains", vars: [{ type: "field", value: f.ref }, { type: "constant", value: "x" }] })] })),
  });
  assert.ok(Date.now() - started < 10_000, "took too long");
  const fields = fieldsOf(result);
  assert.equal(fields.length, IMPORT_LIMITS.maxFields);
  assert.equal(result.form.title.length, IMPORT_LIMITS.maxTitleLength);
  assert.equal(fields[0].title.length, IMPORT_LIMITS.maxTitleLength);
  assert.equal(fields[0].hint.length, IMPORT_LIMITS.maxTextLength);
  assert.equal(fields[1].options.length, IMPORT_LIMITS.maxOptions);
  assert.ok(warned(result, "first 500 fields"));
  assert.ok(warned(result, "first 500 choices", "Big"));
  assert.ok(result.warnings.length <= IMPORT_LIMITS.maxWarnings + 1);
});

test("garbage input fails cleanly or degrades, never throws a raw TypeError", () => {
  for (const bad of [null, undefined, 42, "form", [], {}]) assert.throws(() => mapTypeformForm(bad), { name: "ImportError" });
  const odd = mapTypeformForm({ title: 5, fields: [null, 7, "x", { type: 9 }, { type: "multiple_choice", properties: { choices: "nope" } }, { type: "group", properties: { fields: "nope" } }], logic: [null, 3, { ref: null, actions: "x" }, { type: "field", ref: "zzz" }], hidden: [1, null], thankyou_screens: "x", welcome_screens: [null], theme: 3, settings: 9 });
  assert.equal(odd.form.status, "Draft");
});

test("form ids parse strictly, so only typeform.com links ever reach the API", () => {
  const good = { abc123: "abc123", "https://acme.typeform.com/to/abc123": "abc123", "https://acme.typeform.com/to/abc123?utm=1#x": "abc123", "acme.typeform.com/to/abc123": "abc123", "https://admin.typeform.com/form/abc123/create": "abc123", "https://form.typeform.com/to/AbC12345": "AbC12345", "https://api.typeform.com/forms/abc123": "abc123" };
  for (const [input, id] of Object.entries(good)) assert.equal(parseTypeformId(input), id, input);
  const bad = ["", null, "ab", "http://acme.typeform.com/to/abc123", "https://typeform.com.evil.test/to/abc123", "https://evil.test/to/abc123", "https://evil.test/?u=typeform.com/to/abc123", "https://acme.typeform.com@evil.test/to/abc123", "../../admin", "abc123/../../secret", "abc123?x=1", "abc%2F123", "https://acme.typeform.com/to/..%2Fadmin", "https://acme.typeform.com/to/abc-123", "https://acme.typeform.com/other/abc123", "169.254.169.254", "a".repeat(40)];
  for (const input of bad) assert.equal(parseTypeformId(input), null, String(input));
});

test("tokens with header-breaking characters are refused", () => {
  assert.ok(isValidTypeformToken("tfp_abcDEF123_456.xyz"));
  for (const bad of ["", "short", "tok en with spaces", "tfp_abc\r\nX-Evil: 1", null, 123, "a".repeat(600)]) assert.equal(isValidTypeformToken(bad), false, String(bad));
});

test("the mapped form passes the shared validators when filled in", () => {
  const result = mapTypeformForm(KITCHEN_SINK);
  const fields = fieldsOf(result);
  assert.ok(visibleFieldIds(fields, {}).size > 0);
  for (const f of fields) {
    assert.ok(f.id && f.type && typeof f.title === "string", f.title);
    assert.ok(Array.isArray(f.conditions) && Array.isArray(f.options));
  }
});

// Guards the "imported text is never rendered as HTML" rule: every renderer goes through React's escaping.
test("no form renderer uses dangerouslySetInnerHTML", () => {
  const hits = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const file = path.join(dir, name);
      if (statSync(file).isDirectory()) walk(file);
      else if (/\.jsx?$/.test(name) && readFileSync(file, "utf8").includes("dangerouslySetInnerHTML")) hits.push(file);
    }
  };
  for (const dir of ["components/forms", "components/internal/screens/forms", "app/form"]) walk(path.join(process.cwd(), dir));
  assert.deepEqual(hits, []);
});
