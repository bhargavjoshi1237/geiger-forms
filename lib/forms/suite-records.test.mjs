import test from "node:test";
import assert from "node:assert/strict";

import { contactFromAnswers, contactUpdate, prefillFromContact } from "./suite-records.js";

const fields = [
  { id: "n", type: "text", title: "Name" },
  { id: "e", type: "email", title: "Email" },
  { id: "s", type: "text", title: "Phone", sensitive: true },
  { id: "c", type: "consent", title: "Consent" },
  { id: "full", type: "name", title: "Full name" },
];
const form = (sync) => ({ fieldDefs: fields, settings: { contactSync: { enabled: true, map: { name: "n", email: "e", phone: "s" }, tags: ["webinar", ""], ...sync } } });

test("sync off means no contact", () => {
  assert.equal(contactFromAnswers({ fieldDefs: fields, settings: {} }, {}), null);
  assert.equal(contactFromAnswers(form({ enabled: false }), {}), null);
});

test("answers map to columns, email lower-cased and blanks left out", () => {
  const out = contactFromAnswers(form(), { n: " Ana ", e: "ANA@X.CO" });
  assert.deepEqual(out.patch, { name: "Ana", email: "ana@x.co" });
  assert.equal(out.email, "ana@x.co");
  assert.deepEqual(out.tags, ["webinar"]);
});

test("a sensitive answer is never copied out", () => {
  assert.equal(contactFromAnswers(form(), { s: "555-1234" }).patch.phone, undefined);
});

test("consent needs a ticked, non-sensitive consent question", () => {
  assert.equal(contactFromAnswers(form({ consentFieldId: "c" }), { c: true }).consent, true);
  assert.equal(contactFromAnswers(form({ consentFieldId: "c" }), { c: false }).consent, false);
  assert.equal(contactFromAnswers(form(), { c: true }).consent, false);
  assert.equal(contactFromAnswers(form({ consentFieldId: "s" }), { s: true }).consent, false);
});

test("a match by email can't overwrite details or grant consent", () => {
  const existing = { name: "Ana Real", phone: "", tags: ["vip"] };
  const mapped = { patch: { name: "Impostor", phone: "555", email: "ana@x.co" }, tags: ["webinar"], consent: true };
  assert.deepEqual(contactUpdate(existing, mapped), { phone: "555", email: "ana@x.co", tags: ["vip", "webinar"] });
});

test("a signed record link can update details and grant consent", () => {
  const existing = { name: "Ana", tags: [] };
  const mapped = { patch: { name: "Ana Maria" }, tags: [], consent: true };
  assert.deepEqual(contactUpdate(existing, mapped, { verified: true, now: "T" }), { name: "Ana Maria", tags: [], consent_email: true, consent_updated_at: "T" });
  assert.equal(contactUpdate(existing, { ...mapped, consent: false }, { verified: true }).consent_email, undefined);
});

test("prefill fills plain-text questions only, and never sensitive ones", () => {
  const f = form({ map: { name: "full", email: "e", phone: "s" } });
  assert.deepEqual(prefillFromContact(f, { name: "Ana", email: "a@x.co", phone: "555" }), { e: "a@x.co" });
  assert.deepEqual(prefillFromContact(f, null), {});
  assert.deepEqual(prefillFromContact({ fieldDefs: fields, settings: {} }, { email: "a@x.co" }), {});
});
