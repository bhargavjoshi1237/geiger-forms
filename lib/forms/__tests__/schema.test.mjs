// Form model normalisation: canonical fields, settings defaults and merging, row mapping and the public projection.
import test, { describe } from "node:test";
import assert from "node:assert/strict";

import {
  blankFormDoc,
  defaultSettings,
  editWindowMs,
  makeFieldId,
  normalizeEnding,
  normalizeForm,
  normalizeSettings,
  publicSettings,
  relativeTime,
  slugify,
  titleFromSlug,
  toCanonicalField,
} from "../schema.js";

describe("slugs", () => {
  test("slugify lowercases and collapses everything else to single dashes", () => {
    assert.equal(slugify("  Hello, World!  "), "hello-world");
    assert.equal(slugify("a---b__c"), "a-b-c");
    assert.equal(slugify(""), "");
    assert.equal(slugify(null), "");
  });

  test("titleFromSlug capitalises words", () => {
    assert.equal(titleFromSlug("my-first--form"), "My First Form");
    assert.equal(titleFromSlug(undefined), "");
  });

  test("makeFieldId honours the prefix and doesn't repeat", () => {
    assert.match(makeFieldId("q"), /^q-[a-z0-9]+$/);
    assert.notEqual(makeFieldId(), makeFieldId());
  });
});

describe("toCanonicalField", () => {
  test("fills every default", () => {
    const out = toCanonicalField({ id: "a" });
    assert.equal(out.type, "text");
    assert.equal(out.title, "Field");
    assert.equal(out.label, "");
    assert.equal(out.required, false);
    assert.equal(out.included, true);
    assert.equal(out.width, "full");
    assert.equal(out.conditionLogic, "any");
    assert.deepEqual(out.options, []);
    assert.deepEqual(out.conditions, []);
    assert.equal(out.formula, "");
    assert.equal(out.sensitive, false);
    assert.equal(out.readOnly, false);
  });

  test("legacy builder aliases win over the canonical keys", () => {
    const out = toCanonicalField({ id: "a", title: "T", label: "L", placeholder: "P", firstValue: "First", secondValue: "Second" });
    assert.equal(out.label, "First");
    assert.equal(out.placeholder, "Second");
  });

  test("a file field's second value is its hint, never a placeholder", () => {
    const out = toCanonicalField({ id: "a", type: "file", secondValue: "PDF only", placeholder: "ignored" });
    assert.equal(out.placeholder, "");
    assert.equal(out.hint, "PDF only");
  });

  test("label falls back to the title, and an explicit empty alias stays empty", () => {
    assert.equal(toCanonicalField({ id: "a", title: "T" }).label, "T");
    assert.equal(toCanonicalField({ id: "a", title: "T", firstValue: "" }).label, "");
  });

  test("blank options are dropped but falsy real options survive", () => {
    assert.deepEqual(toCanonicalField({ id: "a", options: ["x", "", null, undefined, 0] }).options, ["x", 0]);
    assert.deepEqual(toCanonicalField({ id: "a", options: "x" }).options, []);
  });

  test("unknown enum-like values fall back", () => {
    assert.equal(toCanonicalField({ id: "a", conditionLogic: "none" }).conditionLogic, "any");
    assert.equal(toCanonicalField({ id: "a", conditionLogic: "all" }).conditionLogic, "all");
    assert.equal(toCanonicalField({ id: "a", width: "quarter" }).width, "full");
    assert.equal(toCanonicalField({ id: "a", width: "half" }).width, "half");
  });

  test("info is a string, and a legacy boolean reads the hint", () => {
    assert.equal(toCanonicalField({ id: "a", info: "Note" }).info, "Note");
    assert.equal(toCanonicalField({ id: "a", info: true, hint: "H" }).info, "H");
    assert.equal(toCanonicalField({ id: "a", info: false, hint: "H" }).info, "");
  });

  test("non-object bags are dropped and flags coerced", () => {
    const out = toCanonicalField({ id: "a", validation: "x", config: 3, optionPoints: "y", conditions: "z", required: 1, sensitive: "yes", readOnly: 1, included: false });
    assert.equal(out.validation, undefined);
    assert.equal(out.config, undefined);
    assert.equal(out.optionPoints, undefined);
    assert.deepEqual(out.conditions, []);
    assert.equal(out.required, true);
    assert.equal(out.sensitive, true);
    assert.equal(out.readOnly, true);
    assert.equal(out.included, false);
  });

  test("falsy but meaningful values survive", () => {
    const out = toCanonicalField({ id: "a", defaultValue: 0, correctAnswer: 0 });
    assert.equal(out.defaultValue, 0);
    assert.equal(out.correctAnswer, 0);
  });
});

describe("normalizeSettings", () => {
  test("garbage in gives the defaults", () => {
    for (const stored of [null, undefined, "x", 3]) assert.deepEqual(normalizeSettings(stored), defaultSettings());
  });

  test("defaults are fresh objects every call", () => {
    const first = defaultSettings();
    first.access.mode = "password";
    first.webhooks.push({});
    assert.equal(defaultSettings().access.mode, "public");
    assert.deepEqual(defaultSettings().webhooks, []);
  });

  test("nested groups merge one level deep", () => {
    const out = normalizeSettings({ spam: { captcha: true }, access: { mode: "login" }, quiz: { passMark: 50 } });
    assert.deepEqual(out.spam, { honeypot: true, captcha: true, rateLimit: 20 });
    assert.equal(out.access.mode, "login");
    assert.equal(out.access.onePerUser, false);
    assert.deepEqual(out.quiz, { enabled: false, passMark: 50, showAnswers: false });
  });

  test("a non-object nested group falls back to its defaults", () => {
    assert.deepEqual(normalizeSettings({ spam: "off" }).spam, defaultSettings().spam);
    assert.deepEqual(normalizeSettings({ access: null }).access, defaultSettings().access);
  });

  test("unknown and flat keys pass through", () => {
    const out = normalizeSettings({ custom: 1, responseLimit: 5 });
    assert.equal(out.custom, 1);
    assert.equal(out.responseLimit, 5);
    assert.equal(out.thankYouTitle, "Response submitted");
  });

  test("branches must be an array and their endings are normalised", () => {
    assert.deepEqual(normalizeSettings({ branches: "x" }).branches, []);
    const [withEnding, without] = normalizeSettings({
      branches: [{ id: "a", ending: { enabled: 1, title: 3, text: "T", buttonUrl: "u" } }, { id: "b" }],
    }).branches;
    assert.deepEqual(withEnding.ending, { enabled: false, title: "", text: "T", buttonLabel: "", buttonUrl: "u", redirectUrl: "" });
    assert.deepEqual(without, { id: "b" });
  });

  test("normalizeEnding needs a literal true to enable", () => {
    assert.equal(normalizeEnding({ enabled: true }).enabled, true);
    assert.equal(normalizeEnding({ enabled: "true" }).enabled, false);
    assert.deepEqual(normalizeEnding(null), { enabled: false, title: "", text: "", buttonLabel: "", buttonUrl: "", redirectUrl: "" });
  });

  test("legacy org restriction lifts into access only when access wasn't saved", () => {
    assert.deepEqual(
      (({ mode, orgDomain }) => ({ mode, orgDomain }))(normalizeSettings({ accessRestricted: true, orgDomain: "acme.test" }).access),
      { mode: "domain", orgDomain: "acme.test" },
    );
    assert.equal(normalizeSettings({ accessRestricted: true, orgDomain: "acme.test", access: { mode: "public" } }).access.mode, "public");
    assert.equal(normalizeSettings({ accessRestricted: true }).access.mode, "public");
  });

  test("legacy prefillEnabled lifts into prefill only when prefill wasn't saved", () => {
    assert.equal(normalizeSettings({ prefillEnabled: true }).prefill.url, true);
    assert.equal(normalizeSettings({ prefillEnabled: true, prefill: { url: false } }).prefill.url, false);
  });
});

describe("normalizeForm", () => {
  const row = {
    id: "f1",
    slug: "s",
    title: "T",
    project_id: "p",
    created_by: "u",
    is_template: 1,
    response_count: 4,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
    published_at: "2026-01-03T00:00:00Z",
    deleted_at: null,
  };

  test("a missing row stays null", () => {
    assert.equal(normalizeForm(null), null);
  });

  test("snake_case columns map to camelCase with defaults", () => {
    const form = normalizeForm(row);
    assert.equal(form.name, "T");
    assert.equal(form.title, "T");
    assert.equal(form.description, "");
    assert.equal(form.status, "Draft");
    assert.equal(form.projectId, "p");
    assert.equal(form.createdBy, "u");
    assert.equal(form.isTemplate, true);
    assert.equal(form.responses, 4);
    assert.equal(form.publishedAt, "2026-01-03T00:00:00Z");
    assert.deepEqual(form.tags, []);
    assert.deepEqual(form.metadata, {});
    assert.deepEqual(form.fieldDefs, []);
    assert.deepEqual(form.settings, defaultSettings());
  });

  test("the field count skips layout blocks and excluded fields", () => {
    const fields = [{ id: "a", type: "text" }, { id: "b", type: "heading" }, { id: "c", type: "page" }, { id: "d", type: "email", included: false }];
    const form = normalizeForm({ ...row, schema: { fields } });
    assert.equal(form.fields, 1);
    assert.equal(form.fieldDefs.length, 4);
  });

  test("malformed columns don't throw", () => {
    const form = normalizeForm({ ...row, schema: { fields: "x" }, tags: "x", metadata: "x", settings: "x", response_count: null });
    assert.deepEqual(form.fieldDefs, []);
    assert.deepEqual(form.tags, []);
    assert.deepEqual(form.metadata, {});
    assert.equal(form.responses, 0);
  });
});

describe("publicSettings", () => {
  const secrets = {
    access: { mode: "password", passwordHash: "HASH", passwordSalt: "SALT", onePerUser: true, orgDomain: "acme.test" },
    payments: { enabled: true, coupons: [{ code: "SECRET10", active: true }] },
    notifyEmails: ["boss@acme.test"],
    followUps: [{ to: "x" }],
    reportEmails: ["r@acme.test"],
    webhooks: [{ url: "https://hook.test", secret: "whsec" }],
    slackWebhookUrl: "https://hooks.slack.com/secret",
    automations: [{ id: "a", actions: [{ type: "webhook", value: "https://hook.test" }] }],
    approval: { enabled: true, steps: [{ approvers: "boss@acme.test" }] },
    flow: { escalate: true, outcome: "x" },
    documentTemplate: { enabled: true, body: "Internal" },
    sharing: [{ user: "x" }],
    duplicates: { enabled: true, fieldIds: ["a"], action: "block" },
  };

  test("nothing secret survives the projection", () => {
    const text = JSON.stringify(publicSettings(secrets));
    for (const secret of ["HASH", "SALT", "SECRET10", "boss@acme.test", "whsec", "hook.test", "hooks.slack.com", "Internal", "r@acme.test"]) {
      assert.equal(text.includes(secret), false, `${secret} leaked`);
    }
  });

  test("what the filler needs stays", () => {
    const out = publicSettings(secrets);
    assert.deepEqual(out.access, { mode: "password", orgDomain: "", onePerUser: true });
    assert.equal(out.payments.enabled, true);
    assert.deepEqual(out.payments.coupons, []);
    assert.equal(out.payments.hasCoupons, true);
    assert.deepEqual(out.approval, { enabled: true, steps: [] });
    assert.deepEqual(out.duplicates, { enabled: true });
  });

  test("the org domain is exposed only in domain mode", () => {
    assert.equal(publicSettings({ access: { mode: "domain", orgDomain: "acme.test" } }).access.orgDomain, "acme.test");
  });

  test("inactive coupons don't advertise a coupon box", () => {
    assert.equal(publicSettings({ payments: { coupons: [{ code: "X", active: false }] } }).payments.hasCoupons, false);
  });
});

describe("misc", () => {
  test("blankFormDoc derives a title and starts empty", () => {
    const doc = blankFormDoc("my-form");
    assert.equal(doc.title, "My Form");
    assert.equal(doc.status, "Draft");
    assert.deepEqual(doc.fieldDefs, []);
    assert.equal(blankFormDoc("", "").title, "Untitled form");
    assert.equal(blankFormDoc("x", "Given").title, "Given");
  });

  test("editWindowMs maps each choice, unknowns disable", () => {
    assert.equal(editWindowMs("disabled"), 0);
    assert.equal(editWindowMs("1h"), 3_600_000);
    assert.equal(editWindowMs("24h"), 86_400_000);
    assert.equal(editWindowMs("7d"), 604_800_000);
    assert.equal(editWindowMs("30d"), 2_592_000_000);
    assert.equal(editWindowMs("always"), null);
    assert.equal(editWindowMs("forever"), 0);
    assert.equal(editWindowMs(undefined), 0);
  });

  test("relativeTime buckets by age", () => {
    const ago = (ms) => new Date(Date.now() - ms).toISOString();
    assert.equal(relativeTime(null), "—");
    assert.equal(relativeTime("nonsense"), "—");
    assert.equal(relativeTime(ago(10_000)), "Just now");
    assert.equal(relativeTime(ago(5 * 60_000)), "5 min ago");
    assert.equal(relativeTime(ago(60 * 60_000)), "1 hour ago");
    assert.equal(relativeTime(ago(3 * 3_600_000)), "3 hours ago");
    assert.equal(relativeTime(ago(26 * 3_600_000)), "Yesterday");
    assert.equal(relativeTime(ago(3 * 86_400_000)), "3 days ago");
  });
});
