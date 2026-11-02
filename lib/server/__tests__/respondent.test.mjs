// Data-subject lookups and everything that reaches a respondent whose email is a sensitive answer, so the row holds no plaintext copy.
import test, { beforeEach, describe } from "node:test";
import assert from "node:assert/strict";

import { flushAfter, resetWorld } from "../../__tests__/support/harness.mjs";
import { FORM_ID, ORIGIN, field, formRow, makeForm, request } from "../../__tests__/support/forms.mjs";
import { emailIndex, encryptValue } from "../crypto.js";
import { respondentContact, respondentLabel } from "../forms.js";
import { findRespondentRows, indexPartialEmail } from "../respondent.js";
import { sendDecision } from "../side-effects.js";
import { submitResponse } from "../submit.js";
import { POST as partialPost } from "../../../app/api/public/forms/[slug]/partial/route.js";
import { partialAnswers } from "../../forms/logic.js";
import { POST as resumeEmail } from "../../../app/api/public/forms/[slug]/resume-email/route.js";

const KEY = Buffer.alloc(32, 7).toString("base64");
const TOKEN = "partial-token-0123456789";
const OWNER = { id: "owner", email: "owner@acme.test" };
const sensitiveEmail = [field("e", "email", { sensitive: true })];

let world;
let db;

beforeEach(() => {
  world = resetWorld();
  db = world.db;
  process.env.FORMS_ENCRYPTION_KEY = KEY;
});

const params = { params: Promise.resolve({ slug: "demo" }) };
const post = (handler, body) => handler(new Request(`${ORIGIN}/api/public/forms/demo/x`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), params);
const seedPublished = (fields, settings = {}) => db.seed("forms", formRow({ fields, settings }));

describe("respondentContact", () => {
  const form = (settings = {}) => makeForm({ fields: sensitiveEmail, settings });

  test("reads an encrypted email answer", () => {
    assert.equal(respondentContact({ answers: { e: encryptValue("a@b.co") } }, form()), "a@b.co");
  });

  test("reads a sensitive answer stored without a key", () => {
    assert.equal(respondentContact({ answers: { e: "a@b.co" } }, form()), "a@b.co");
  });

  test("prefers the sensitive answer to a session email in the column, as submission used to", () => {
    assert.equal(respondentContact({ respondent_email: "session@b.co", answers: { e: encryptValue("a@b.co") } }, form()), "a@b.co");
  });

  test("a delegated response goes to the delegate's client", () => {
    const row = { respondent_email: "client@b.co", metadata: { delegate: { forEmail: "client@b.co" } }, answers: { e: encryptValue("a@b.co") } };
    assert.equal(respondentContact(row, form()), "client@b.co");
  });

  test("falls back to the column, and to nothing", () => {
    assert.equal(respondentContact({ respondent_email: "c@b.co", answers: {} }, makeForm({ fields: [field("q")] })), "c@b.co");
    assert.equal(respondentContact({ answers: {} }, form()), null);
  });

  test("an anonymous form has no one to write to", () => {
    assert.equal(respondentContact({ answers: { e: encryptValue("a@b.co") } }, form({ anonymous: true })), null);
  });

  test("an undecryptable answer doesn't crash the send", () => {
    delete process.env.FORMS_ENCRYPTION_KEY;
    assert.equal(respondentContact({ answers: { e: { __enc: "v1:x:y:z" } } }, form()), null);
  });
});

test("respondentLabel masks a sensitive contact and keeps a plain one", () => {
  const row = { respondent_name: "Ada", respondent_email: "a@b.co" };
  assert.equal(respondentLabel(row, makeForm({ fields: [field("q")] }), "Someone"), "Ada");
  assert.equal(respondentLabel(row, makeForm({ fields: sensitiveEmail }), "Someone"), "Ada");
  assert.equal(respondentLabel(row, makeForm({ fields: [field("n", "name", { sensitive: true }), ...sensitiveEmail] }), "Someone"), "Someone");
});

test("the approval decision still reaches a sensitive address", async () => {
  process.env.RESEND_API_KEY = "re_test";
  world.fetch.reply = () => Response.json({ id: "x" });
  await sendDecision({ form: makeForm({ fields: sensitiveEmail }), row: { answers: { e: encryptValue("a@b.co") } }, decision: "approve" });
  const body = JSON.parse(world.fetch.calls[0].init.body);
  assert.deepEqual([body.to].flat(), ["a@b.co"]);
});

describe("findRespondentRows", () => {
  const row = (extra) => db.seed("responses", { form_id: FORM_ID, answers: {}, ...extra })[0];

  beforeEach(() => {
    db.seed("forms", formRow({ project_id: null, created_by: OWNER.id }));
  });

  test("finds a sensitive email by its index and a plain one by its column, once each", async () => {
    const hidden = row({ metadata: { emailIndex: emailIndex("a@b.co") } });
    const plain = row({ respondent_email: "A@b.co" });
    const both = row({ respondent_email: "a@b.co", metadata: { emailIndex: emailIndex("a@b.co") } });
    row({ respondent_email: "other@b.co", metadata: { emailIndex: emailIndex("other@b.co") } });
    const found = await findRespondentRows(OWNER, "a@b.co", "forms.response.delete");
    assert.deepEqual(found.responses.map((r) => r.id).sort(), [hidden.id, plain.id, both.id].sort());
  });

  test("finds a partial saved with a sensitive email", async () => {
    const [partial] = db.seed("partials", { form_id: FORM_ID, token: TOKEN, metadata: { emailIndex: emailIndex("a@b.co") } });
    const found = await findRespondentRows(OWNER, "A@B.CO", "forms.response.delete");
    assert.deepEqual(found.partials.map((p) => p.id), [partial.id]);
  });

  test("a failed lookup is null, not a partial answer that would under-erase", async () => {
    row({ respondent_email: "a@b.co" });
    db.failOn("responses", "select");
    assert.equal(await findRespondentRows(OWNER, "a@b.co", "forms.response.delete"), null);
  });

  test("a submitted sensitive email can be found again", async () => {
    await submitResponse(makeForm({ fields: sensitiveEmail }), { answers: { e: "a@b.co" } }, { request: request(), origin: ORIGIN });
    const found = await findRespondentRows(OWNER, "a@b.co", "forms.response.delete");
    assert.equal(found.responses.length, 1);
    await flushAfter();
  });
});

describe("partial saves", () => {
  const save = (body) => post(partialPost, { answers: {}, ...body });

  test("keep a plain email in the column", async () => {
    seedPublished([field("e", "email")]);
    assert.equal((await save({ email: "a@b.co" })).status, 200);
    assert.equal(db.rows("partials")[0].respondent_email, "a@b.co");
  });

  test("keep only the index for a sensitive email, on insert and on update", async () => {
    seedPublished(sensitiveEmail);
    const created = await (await save({ email: "a@b.co", answers: { e: "a@b.co" } })).json();
    const saved = () => db.rows("partials")[0];
    assert.equal(saved().respondent_email ?? null, null);
    assert.equal(saved().metadata.emailIndex, emailIndex("a@b.co"));
    assert.equal(JSON.stringify(saved()).includes("a@b.co"), false);
    assert.equal((await save({ token: created.token, email: "new@b.co", answers: { e: "new@b.co" } })).status, 200);
    assert.equal(saved().respondent_email ?? null, null);
    assert.equal(saved().metadata.emailIndex, emailIndex("new@b.co"));
  });

  test("the index doesn't overwrite the opt-in record", async () => {
    const [partial] = db.seed("partials", { form_id: FORM_ID, token: TOKEN, metadata: { consentedAt: "2026-01-01" } });
    await indexPartialEmail(db.schema("forms"), FORM_ID, TOKEN, "a@b.co");
    const row = db.rows("partials").find((p) => p.id === partial.id);
    assert.deepEqual(row.metadata, { consentedAt: "2026-01-01", emailIndex: emailIndex("a@b.co") });
  });

  test("an anonymous form keeps neither", async () => {
    seedPublished(sensitiveEmail, { anonymous: true });
    await save({ email: "a@b.co" });
    assert.equal(db.rows("partials")[0].respondent_email ?? null, null);
    assert.equal(db.rows("partials")[0].metadata?.emailIndex, undefined);
  });

  const allergyForm = () => [
    field("diet", "dropdown", { options: ["None", "Allergy"] }),
    field("allergy", "textarea", { conditions: [{ fieldId: "diet", operator: "equals", value: "Allergy" }] }),
    field("campaign", "hidden"),
  ];

  test("drop answers to hidden questions, on insert and on update", async () => {
    seedPublished(allergyForm());
    const created = await (await save({ answers: { diet: "None", allergy: "Peanuts" } })).json();
    assert.deepEqual(db.rows("partials")[0].answers, { diet: "None" });
    await save({ token: created.token, answers: { diet: "Allergy", allergy: "Peanuts" } });
    assert.deepEqual(db.rows("partials")[0].answers, { diet: "Allergy", allergy: "Peanuts" });
    await save({ token: created.token, answers: { diet: "None", allergy: "Peanuts" } });
    assert.deepEqual(db.rows("partials")[0].answers, { diet: "None" });
  });

  test("keep hidden-type fields and the coupon, which aren't conditional answers", async () => {
    seedPublished(allergyForm());
    await save({ answers: { diet: "None", campaign: "spring", __coupon: "SAVE10", __other: "x" } });
    assert.deepEqual(db.rows("partials")[0].answers, { diet: "None", campaign: "spring", __coupon: "SAVE10" });
  });

  test("an unsaved signature still counts when deciding what is visible", async () => {
    const png = "data:image/png;base64,AAAA";
    seedPublished([field("sig", "signature"), field("why", "text", { conditions: [{ fieldId: "sig", operator: "is_not_empty" }] })]);
    await save({ answers: { sig: png, why: "Director" } });
    assert.deepEqual(db.rows("partials")[0].answers, { why: "Director" });
  });

  test("a pathologically nested answer is refused, not stored unfiltered", async () => {
    seedPublished(allergyForm());
    const body = `{"answers":{"diet":${'{"d":'.repeat(20_000)}"x"${"}".repeat(20_000)},"allergy":"Peanuts"}}`;
    const res = await partialPost(new Request(`${ORIGIN}/api/public/forms/demo/x`, { method: "POST", headers: { "content-type": "application/json" }, body }), params);
    assert.equal(res.ok, false);
    assert.equal(db.rows("partials").length, 0);
  });
});

describe("partialAnswers", () => {
  const fields = [
    field("diet", "dropdown", { options: ["None", "Allergy"] }),
    field("allergy", "textarea", { conditions: [{ fieldId: "diet", operator: "equals", value: "Allergy" }] }),
    field("sig", "signature"),
  ];

  test("leaves hidden answers out of what the browser sends", () => {
    assert.deepEqual(partialAnswers(fields, { diet: "None", allergy: "Peanuts" }), { diet: "None" });
  });

  test("still drops inline signature images", () => {
    assert.deepEqual(partialAnswers(fields, { diet: "Allergy", allergy: "Peanuts", sig: "data:image/png;base64,AAAA" }), { diet: "Allergy", allergy: "Peanuts" });
  });
});

describe("resume emails", () => {
  const send = () => post(resumeEmail, { email: "a@b.co", token: TOKEN });
  const seedPartial = () => db.seed("partials", { form_id: FORM_ID, token: TOKEN, completed_at: null });

  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test";
    world.fetch.reply = () => Response.json({ id: "x" });
    seedPartial();
  });

  const delivered = () => world.fetch.calls.filter((c) => c.url.includes("resend")).length;

  test("a plain form stores the address and sends", async () => {
    seedPublished([field("q")]);
    assert.equal((await send()).status, 200);
    assert.equal(db.rows("partials")[0].respondent_email, "a@b.co");
    assert.equal(delivered(), 1);
  });

  test("a sensitive email is sent to but only indexed", async () => {
    seedPublished(sensitiveEmail);
    assert.equal((await send()).status, 200);
    assert.equal(db.rows("partials")[0].respondent_email ?? null, null);
    assert.equal(db.rows("partials")[0].metadata.emailIndex, emailIndex("a@b.co"));
    assert.equal(delivered(), 1);
  });

  test("an anonymous form sends without keeping anything", async () => {
    seedPublished([field("q")], { anonymous: true });
    assert.equal((await send()).status, 200);
    assert.equal(db.rows("partials")[0].respondent_email ?? null, null);
    assert.equal(db.rows("partials")[0].metadata?.emailIndex, undefined);
    assert.equal(delivered(), 1);
  });
});
