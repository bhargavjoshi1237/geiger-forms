// Submission pipeline: gates, spam checks, answer sanitising, revalidation, duplicates, anonymity, encryption, edits and payments.
import test, { beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { flushAfter, resetWorld } from "../../__tests__/support/harness.mjs";
import { FORM_ID, ORIGIN, field, makeForm, request } from "../../__tests__/support/forms.mjs";
import { knownBug } from "../../__tests__/support/known_bug.mjs";
import { decryptValue, emailIndex, isEncrypted, signLinkToken } from "../crypto.js";
import { passwordCookieName, passwordCookieValue } from "../public-form.js";
import { editExpiresAt, loadEditableResponse, submitResponse } from "../submit.js";
import { responsePayload } from "../webhooks.js";

const OK_PNG = `data:image/png;base64,${Buffer.from("\x89PNG\r\n\x1a\nbody", "latin1").toString("base64")}`;
const when = (fieldId, operator, value) => ({ fieldId, operator, value });
const day = 86_400_000;
const iso = (ms) => new Date(Date.now() + ms).toISOString();

let world;
let db;

beforeEach(() => {
  world = resetWorld();
  db = world.db;
});

const submit = (form, body = {}, ctx = {}) => submitResponse(form, { answers: { q: "hello" }, ...body }, { request: request(ctx.headers), origin: ORIGIN, ...ctx });
const responses = () => db.rows("responses");
const onlyRow = () => {
  assert.equal(responses().length, 1, "expected exactly one stored response");
  return responses()[0];
};
const assertNothingStored = () => assert.equal(responses().length, 0, "nothing should be stored");
const seedResponses = (count, extra = {}) => db.seed("responses", Array.from({ length: count }, () => ({ form_id: FORM_ID, status: "Complete", answers: {}, ...extra })));

describe("request shape", () => {
  test("no database means 503, never a crash", async () => {
    resetWorld({ database: false });
    const out = await submit(makeForm());
    assert.equal(out.status, 503);
    assert.equal(out.body.code, "unconfigured");
  });

  for (const answers of [undefined, null, "text", 5, ["a"]]) {
    test(`answers of ${JSON.stringify(answers)} are refused`, async () => {
      const out = await submitResponse(makeForm(), { answers }, { request: request(), origin: ORIGIN });
      assert.equal(out.status, 400);
      assertNothingStored();
    });
  }

  test("oversized answers are refused", async () => {
    const out = await submit(makeForm(), { answers: { q: "x".repeat(300 * 1024) } });
    assert.equal(out.status, 413);
    assertNothingStored();
  });

  test("a clean submission is stored and answered", async () => {
    const out = await submit(makeForm());
    assert.equal(out.status, 200);
    assert.equal(out.body.ok, true);
    const row = onlyRow();
    assert.equal(out.body.responseId, row.id);
    assert.equal(row.form_id, FORM_ID);
    assert.deepEqual(row.answers, { q: "hello" });
    assert.equal(row.status, "Complete");
    assert.equal(row.priority, "Low");
    assert.equal(row.edit_token, null);
    assert.equal(out.body.editUrl, null);
    assert.equal(out.body.thankYou.title, "Response submitted");
  });

  test("a failed insert is reported and runs no side effects", async () => {
    db.failOn("responses", "insert");
    const out = await submit(makeForm());
    assert.equal(out.status, 500);
    assert.equal(out.body.code, "server");
    assert.equal(db.callsTo("form_events").length, 0);
  });

  test("request details are cleaned before storage", async () => {
    const out = await submit(makeForm(), {
      referrer: " https://ref.test ",
      utm: { source: "news", medium: 5, evil: "x" },
      variant: "b",
      sessionId: "s1",
      completionMs: 1234.6,
    }, { headers: { "user-agent": "Agent/1.0", "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    assert.equal(out.status, 200);
    const row = onlyRow();
    assert.equal(row.user_agent, "Agent/1.0");
    assert.equal(row.completion_ms, 1235);
    assert.equal(row.metadata.referrer, "https://ref.test");
    assert.deepEqual(row.metadata.utm, { source: "news", medium: "" });
    assert.equal(row.metadata.variant, "b");
    assert.equal(row.metadata.sessionId, "s1");
    assert.match(row.metadata.ipHash, /^[0-9a-f]{32}$/);
    assert.equal(JSON.stringify(row).includes("1.2.3.4"), false, "the raw IP is never stored");
  });
});

describe("gates", () => {
  test("past the close date", async () => {
    const out = await submit(makeForm({ settings: { closeDate: iso(-day * 2), closedMessage: "Shut" } }));
    assert.equal(out.status, 403);
    assert.equal(out.body.code, "closed");
    assert.equal(out.body.gate, "closed");
    assert.equal(out.body.error, "Shut");
    assertNothingStored();
  });

  test("a date-only close date stays open through that day", async () => {
    const today = new Date().toISOString().slice(0, 10);
    assert.equal((await submit(makeForm({ settings: { closeDate: today } }))).status, 200);
  });

  test("before the open date", async () => {
    const out = await submit(makeForm({ settings: { openDate: iso(day) } }));
    assert.equal(out.status, 403);
    assert.equal(out.body.code, "closed");
    assert.equal(out.body.gate, "scheduled");
    assertNothingStored();
  });

  test("inside the schedule", async () => {
    assert.equal((await submit(makeForm({ settings: { openDate: iso(-day), closeDate: iso(day) } }))).status, 200);
  });

  test("the response cap closes at the limit", async () => {
    const form = makeForm({ settings: { responseLimit: 2 } });
    seedResponses(1);
    assert.equal((await submit(form)).status, 200);
    const out = await submit(form);
    assert.equal(out.status, 403);
    assert.equal(out.body.code, "closed");
    assert.equal(out.body.gate, "limit");
    assert.equal(responses().length, 2);
  });

  test("spam and deleted responses don't count toward the cap", async () => {
    seedResponses(1, { status: "Spam" });
    seedResponses(1, { deleted_at: iso(-1000) });
    assert.equal((await submit(makeForm({ settings: { responseLimit: 1 } }))).status, 200);
  });

  describe("password", () => {
    const salt = "pepper";
    const passwordForm = () => makeForm({
      settings: { access: { mode: "password", passwordSalt: salt, passwordHash: createHash("sha256").update(`${salt}open sesame`).digest("hex") } },
    });

    test("missing or wrong password is refused", async () => {
      for (const password of [undefined, "", "wrong"]) {
        const out = await submit(passwordForm(), { password });
        assert.equal(out.status, 403);
        assert.equal(out.body.code, "gate");
        assert.equal(out.body.gate, "password");
      }
      assertNothingStored();
    });

    test("the right password passes", async () => {
      assert.equal((await submit(passwordForm(), { password: "open sesame" })).status, 200);
    });

    test("a valid unlock cookie passes, a forged one doesn't", async () => {
      process.env.FORMS_LINK_SECRET = "test-link-secret";
      const form = passwordForm();
      world.cookies.set(passwordCookieName(form.id), "forged");
      assert.equal((await submit(form)).status, 403);
      world.cookies.set(passwordCookieName(form.id), passwordCookieValue(form));
      assert.equal((await submit(form)).status, 200);
    });
  });

  describe("access", () => {
    const user = { id: "u1", name: "Ada", email: "ada@acme.test" };

    test("login mode needs a user", async () => {
      const form = makeForm({ settings: { access: { mode: "login" } } });
      const out = await submit(form);
      assert.equal(out.status, 403);
      assert.equal(out.body.code, "gate");
      assert.equal(out.body.gate, "login");
      assert.equal((await submit(form, {}, { user })).status, 200);
    });

    test("domain mode needs the org's address, ignoring case and a leading @", async () => {
      const form = makeForm({ settings: { access: { mode: "domain", orgDomain: "@ACME.test" } } });
      assert.equal((await submit(form)).body.gate, "login");
      assert.equal((await submit(form, {}, { user: { ...user, email: "x@other.test" } })).body.gate, "domain");
      assert.equal((await submit(form, {}, { user: { ...user, email: "x@acme.test.evil.test" } })).body.gate, "domain");
      assert.equal((await submit(form, {}, { user })).status, 200);
    });

    test("signed mode needs a valid link for this form, and takes its email", async () => {
      process.env.FORMS_LINK_SECRET = "test-link-secret";
      const form = makeForm({ settings: { access: { mode: "signed" } } });
      const good = signLinkToken({ formId: form.id, email: "invitee@acme.test", expiresAt: Date.now() + day });
      const expired = signLinkToken({ formId: form.id, expiresAt: Date.now() - 1000 });
      const otherForm = signLinkToken({ formId: "another", expiresAt: Date.now() + day });
      for (const signedToken of [undefined, "garbage", `${good}x`, expired, otherForm]) {
        assert.equal((await submit(form, { signedToken })).body.gate, "signed");
      }
      assertNothingStored();
      assert.equal((await submit(form, { signedToken: good })).status, 200);
      assert.equal(onlyRow().respondent_email, "invitee@acme.test");
      assert.equal(onlyRow().metadata.signedEmail, "invitee@acme.test");
    });

    test("one per user needs a login and refuses a repeat", async () => {
      const form = makeForm({ settings: { access: { onePerUser: true } } });
      assert.equal((await submit(form)).body.gate, "login");
      assert.equal((await submit(form, {}, { user })).status, 200);
      const again = await submit(form, {}, { user });
      assert.equal(again.status, 403);
      assert.equal(again.body.code, "closed");
      assert.equal(responses().length, 1);
    });

    // lib/server/submit.js:406 stores no respondent_user_id when anonymous, and hasResponded in public-form.js counts by that column.
    knownBug("one-per-user still holds on an anonymous form", async () => {
      const form = makeForm({ settings: { anonymous: true, access: { onePerUser: true } } });
      assert.equal((await submit(form, {}, { user })).status, 200);
      assert.equal((await submit(form, {}, { user })).status, 403);
    });
  });

  test("trusted (REST) submissions skip respondent gates but keep the cap", async () => {
    const form = makeForm({ settings: { closeDate: iso(-day * 2), access: { mode: "login" }, responseLimit: 1 } });
    assert.equal((await submit(form, {}, { trusted: true })).status, 200);
    assert.equal(onlyRow().metadata.source, "api");
    const out = await submit(form, {}, { trusted: true });
    assert.equal(out.status, 403);
    assert.equal(out.body.code, "closed");
    assert.equal(responses().length, 1);
  });
});

describe("spam checks", () => {
  describe("honeypot", () => {
    test("a filled trap looks like success but stores and sends nothing", async () => {
      const form = makeForm({ settings: { webhooks: [{ id: "h", url: "https://hook.test/" }] } });
      const out = await submit(form, { hp: "bot" });
      assert.equal(out.status, 200);
      assert.equal(out.body.ok, true);
      assert.match(out.body.responseId, /^[0-9a-f-]{36}$/);
      assertNothingStored();
      await flushAfter();
      assert.equal(world.outbound.requests.length, 0);
      assert.equal(db.callsTo("activity").length, 0);
    });

    test("the trap beats gates, so a bot learns nothing about them", async () => {
      const out = await submit(makeForm({ settings: { closeDate: iso(-day * 2) } }), { hp: "bot" });
      assert.equal(out.status, 200);
      assertNothingStored();
    });

    test("whitespace or a non-string doesn't trigger it", async () => {
      assert.equal((await submit(makeForm(), { hp: "   " })).status, 200);
      assert.equal((await submit(makeForm(), { hp: 5 })).status, 200);
      assert.equal(responses().length, 2);
    });

    test("it can be switched off, and doesn't apply to trusted calls", async () => {
      await submit(makeForm({ settings: { spam: { honeypot: false } } }), { hp: "autofill" });
      assert.equal(responses().length, 1);
      await submit(makeForm(), { hp: "x" }, { trusted: true });
      assert.equal(responses().length, 2);
    });
  });

  describe("minimum review time", () => {
    const form = () => makeForm({ settings: { minReviewSeconds: 30 } });

    for (const completionMs of [undefined, "fast", 29_999, -1]) {
      test(`completionMs of ${JSON.stringify(completionMs)} is too fast`, async () => {
        const out = await submit(form(), { completionMs });
        assert.equal(out.status, 422);
        assert.equal(out.body.code, "validation");
        assert.match(out.body.error, /at least 30 seconds/);
        assertNothingStored();
      });
    }

    test("exactly the minimum passes", async () => {
      assert.equal((await submit(form(), { completionMs: 30_000 })).status, 200);
    });

    test("trusted calls are exempt", async () => {
      assert.equal((await submit(form(), {}, { trusted: true })).status, 200);
    });
  });

  describe("captcha", () => {
    const form = () => makeForm({ settings: { spam: { captcha: true } } });

    test("isn't checked without a server key", async () => {
      assert.equal((await submit(form())).status, 200);
      assert.equal(world.fetch.calls.length, 0);
    });

    test("a missing token is refused without calling out", async () => {
      process.env.TURNSTILE_SECRET_KEY = "ts";
      const out = await submit(form());
      assert.equal(out.status, 400);
      assert.equal(out.body.code, "captcha");
      assert.equal(world.fetch.calls.length, 0);
    });

    test("the verifier's verdict decides", async () => {
      process.env.TURNSTILE_SECRET_KEY = "ts";
      world.fetch.reply = () => Response.json({ success: false });
      assert.equal((await submit(form(), { captchaToken: "t" })).body.code, "captcha");
      world.fetch.reply = () => Response.json({ success: true });
      assert.equal((await submit(form(), { captchaToken: "t" })).status, 200);
      assert.match(world.fetch.calls[0].url, /turnstile/);
      assert.match(world.fetch.calls[0].init.body, /response=t/);
    });

    test("an unreachable verifier fails closed", async () => {
      process.env.TURNSTILE_SECRET_KEY = "ts";
      assert.equal((await submit(form(), { captchaToken: "t" })).body.code, "captcha");
      assertNothingStored();
    });
  });

  describe("rate limit", () => {
    test("over the limit is refused, keyed by form and client", async () => {
      db.rpcs.hit_rate_limit = () => ({ data: false, error: null });
      const out = await submit(makeForm({ settings: { spam: { rateLimit: 3 } } }));
      assert.equal(out.status, 429);
      assert.equal(out.body.code, "rate_limited");
      assertNothingStored();
      const { args } = db.rpcCalls[0];
      assert.equal(args.p_max, 3);
      assert.equal(args.p_window_seconds, 3600);
      assert.match(args.p_key, new RegExp(`^submit:${FORM_ID}:[0-9a-f]{32}$`));
    });

    test("a limiter outage fails open", async () => {
      db.rpcs.hit_rate_limit = () => ({ data: null, error: { message: "down" } });
      assert.equal((await submit(makeForm())).status, 200);
    });

    test("a limit of zero never calls the limiter", async () => {
      await submit(makeForm({ settings: { spam: { rateLimit: 0 } } }));
      assert.equal(db.rpcCalls.length, 0);
    });
  });

  describe("acknowledgements", () => {
    test("an attestation must be literally true", async () => {
      const form = makeForm({ settings: { attestation: { enabled: true, statement: "I swear" } } });
      const out = await submit(form, { attestation: "true" });
      assert.equal(out.status, 422);
      assert.ok(out.body.fieldErrors.__attestation);
      assertNothingStored();
      await submit(form, { attestation: true });
      assert.equal(onlyRow().metadata.attestation.statement, "I swear");
    });

    test("a policy needs the typed name, then the scroll", async () => {
      const form = makeForm({ settings: { policy: { enabled: true, requireName: true, requireScroll: true } } });
      assert.ok((await submit(form, { policy: { typedName: "  " } })).body.fieldErrors.__policy);
      assert.ok((await submit(form, { policy: { typedName: "Ada" } })).body.fieldErrors.__policy);
      assertNothingStored();
      await submit(form, { policy: { typedName: "Ada", scrolled: true } });
      assert.equal(onlyRow().metadata.policy.typedName, "Ada");
      assert.equal(onlyRow().metadata.policy.scrolled, true);
    });
  });
});

describe("answer sanitising", () => {
  test("unknown keys are dropped, excluded fields too, and only __coupon may be internal", async () => {
    const form = makeForm({ fields: [field("q"), field("off", "text", { included: false })] });
    await submit(form, { answers: { q: "x", off: "y", stranger: "z", __coupon: "SAVE", __score: 999, __proto__: { polluted: true } } });
    assert.deepEqual(onlyRow().answers, { q: "x", __coupon: "SAVE" });
  });

  test("a long coupon is cut, a non-string one dropped", async () => {
    await submit(makeForm(), { answers: { q: "x", __coupon: "c".repeat(100) } });
    assert.equal(onlyRow().answers.__coupon.length, 60);
    db.rows("responses").length = 0;
    await submit(makeForm(), { answers: { q: "x", __coupon: { a: 1 } } });
    assert.equal("__coupon" in onlyRow().answers, false);
  });

  test("answers to conditionally hidden fields are stripped", async () => {
    const form = makeForm({ fields: [field("a"), field("b", "text", { conditions: [when("a", "equals", "yes")] })] });
    await submit(form, { answers: { a: "no", b: "smuggled" } });
    assert.deepEqual(onlyRow().answers, { a: "no" });
  });

  test("the strip cascades through a chain, and page-skipped answers go too", async () => {
    const form = makeForm({
      fields: [
        field("a"),
        field("b", "text", { conditions: [when("a", "equals", "yes")] }),
        field("c", "text", { conditions: [when("b", "is_not_empty")] }),
        field("p", "page", { conditions: [when("a", "equals", "yes")] }),
        field("d"),
      ],
    });
    await submit(form, { answers: { a: "no", b: "x", c: "y", d: "z" } });
    assert.deepEqual(onlyRow().answers, { a: "no" });
  });

  test("a required field hidden by logic isn't required", async () => {
    const form = makeForm({ fields: [field("a"), field("b", "text", { required: true, conditions: [when("a", "equals", "yes")] })] });
    assert.equal((await submit(form, { answers: { a: "no" } })).status, 200);
  });

  test("calculated fields are computed by the server, not taken from the client", async () => {
    const form = makeForm({ fields: [field("n", "number"), field("c", "calculated", { formula: "{n} * 2" })] });
    await submit(form, { answers: { n: 3, c: 9999 } });
    assert.equal(onlyRow().answers.c, 6);
  });

  test("a hidden calculated field isn't stored", async () => {
    const form = makeForm({ fields: [field("a"), field("c", "calculated", { formula: "1", conditions: [when("a", "equals", "yes")] })] });
    await submit(form, { answers: { a: "no", c: 5 } });
    assert.equal("c" in onlyRow().answers, false);
  });

  test("hidden-type fields fall back to their default, or keep a prefilled value", async () => {
    const form = makeForm({ fields: [field("src", "hidden", { defaultValue: 7 }), field("q")] });
    await submit(form, { answers: { q: "x" } });
    assert.equal(onlyRow().answers.src, "7");
    db.rows("responses").length = 0;
    await submit(form, { answers: { q: "x", src: "campaign" } });
    assert.equal(onlyRow().answers.src, "campaign");
  });

  test("read-only defaults can't be overridden unless they're prefill-keyed", async () => {
    const form = makeForm({
      fields: [field("locked", "text", { readOnly: true, defaultValue: "fixed" }), field("keyed", "text", { readOnly: true, defaultValue: "d", prefillKey: "k" })],
    });
    await submit(form, { answers: { locked: "tampered", keyed: "from-url" } });
    assert.deepEqual(onlyRow().answers, { locked: "fixed", keyed: "from-url" });
  });
});

describe("server-side revalidation", () => {
  const assert422 = (out, id, pattern) => {
    assert.equal(out.status, 422);
    assert.equal(out.body.code, "validation");
    assert.match(out.body.fieldErrors[id] ?? "", pattern);
    assertNothingStored();
  };

  test("required fields, with no client validation to lean on", async () => {
    assert422(await submit(makeForm({ fields: [field("a", "text", { required: true })] }), { answers: {} }), "a", /required/);
  });

  test("type rules", async () => {
    assert422(await submit(makeForm({ fields: [field("a", "email")] }), { answers: { a: "nope" } }), "a", /valid email/);
    assert422(await submit(makeForm({ fields: [field("a", "number", { validation: { max: 5 } })] }), { answers: { a: 6 } }), "a", /at most 5/);
    assert422(await submit(makeForm({ fields: [field("a", "picture", { options: ["x"] })] }), { answers: { a: "y" } }), "a", /options/);
  });

  test("all errors come back together", async () => {
    const out = await submit(makeForm({ fields: [field("a", "text", { required: true }), field("b", "email")] }), { answers: { b: "nope" } });
    assert.deepEqual(Object.keys(out.body.fieldErrors).sort(), ["a", "b"]);
  });

  test("trusted calls are validated the same", async () => {
    assert422(await submit(makeForm({ fields: [field("a", "text", { required: true })] }), { answers: {} }, { trusted: true }), "a", /required/);
  });

  test("a forged name answer gets a 422, not an unhandled TypeError", async () => {
    const out = await submit(makeForm({ fields: [field("a", "name", { required: true })] }), { answers: { a: { first: 1, last: 2 } } });
    assert.equal(out.status, 422);
  });

  test("the score comes from the option's points, and a choice that isn't offered never reaches them", async () => {
    const form = makeForm({ fields: [field("s", "select", { options: ["Low", "High"], optionPoints: { Low: 1, High: 90 } })], settings: { scoringEnabled: true } });
    assert.equal((await submit(form, { answers: { s: "constructor" } })).status, 422);
    assertNothingStored();
    assert.equal((await submit(form, { answers: { s: "High" } })).status, 200);
    assert.equal(onlyRow().score, 90);
  });

  test("a pathologically nested answer is a validation error, not a 500", async () => {
    let deep = "x";
    for (let i = 0; i < 4000; i += 1) deep = { a: deep };
    const form = makeForm({ fields: [field("a"), field("b", "text", { conditions: [when("a", "contains", "x")] })] });
    const out = await submit(form, { answers: { a: deep } });
    assert.equal(out.status, 422);
    assertNothingStored();
  });

  test("a forged hidden-field structure is refused", async () => {
    const out = await submit(makeForm({ fields: [field("h", "hidden")] }), { answers: { h: { a: 1 } } });
    assert.equal(out.status, 422);
    assertNothingStored();
  });

  test("a read-only default is stored in the field's own shape, so an imported or legacy default stays valid", async () => {
    const form = makeForm({
      fields: [
        field("plan", "select", { readOnly: true, defaultValue: "pro", options: ["Pro", "Free"] }),
        field("tags", "multiselect", { readOnly: true, defaultValue: "a,b", options: ["A", "B"] }),
        field("code", "text", { readOnly: true, defaultValue: 42 }),
        field("gone", "select", { readOnly: true, defaultValue: "removed", options: ["Pro"] }),
        field("agree", "consent", { readOnly: true, defaultValue: true }),
      ],
    });
    const out = await submit(form, { answers: { gone: "Pro", agree: true } });
    assert.equal(out.status, 200);
    assert.deepEqual(onlyRow().answers, { plan: "Pro", tags: ["A", "B"], code: "42" });
    assert.equal(onlyRow().metadata.consents, undefined);
  });

  test("a prefilled read-only choice is still checked against the options", async () => {
    const form = makeForm({ fields: [field("plan", "select", { readOnly: true, prefillKey: "plan", options: ["Pro"] })] });
    assert.equal((await submit(form, { answers: { plan: "Hacked" } })).status, 422);
    assert.equal((await submit(form, { answers: { plan: "Pro" } })).status, 200);
  });

  test("a matrix answer keeps only the rows the form has", async () => {
    const form = makeForm({ fields: [field("m", "matrix", { options: ["Good"], config: { rows: ["Speed"] } })] });
    assert.equal((await submit(form, { answers: { m: { Speed: "Good", injected: "=cmd()" } } })).status, 200);
    assert.deepEqual(onlyRow().answers.m, { Speed: "Good" });
  });

  test("a forged choice answer is rejected instead of setting the score", async () => {
    const fields = [field("s", "select", { options: ["Low", "High"], optionPoints: { Low: 1, High: 2 } })];
    const form = makeForm({ fields, settings: { scoringEnabled: true } });
    const out = await submit(form, { answers: { s: "100000" } });
    assert.equal(out.status, 422);
    assertNothingStored();
  });

  describe("files", () => {
    const form = (extra = {}) => makeForm({ fields: [field("f", "file", extra)] });
    const good = { name: "a.pdf", path: `forms/${FORM_ID}/a.pdf`, size: 10, type: "application/pdf" };

    test("paths must sit under this form's prefix", async () => {
      for (const path of ["forms/other-form/a.pdf", `forms/${FORM_ID}/../../secret`, `forms/${FORM_ID}//a`, "/etc/passwd", 5, undefined]) {
        assert422(await submit(form(), { answers: { f: [{ ...good, path }] } }), "f", /couldn't be verified/);
      }
    });

    test("the file count is capped", async () => {
      assert422(await submit(form(), { answers: { f: [good, good] } }), "f", /at most 1 file\./);
      assert422(await submit(form({ config: { maxFiles: 2 } }), { answers: { f: [good, good, good] } }), "f", /at most 2 files/);
    });

    test("valid files are normalised and listed in metadata", async () => {
      await submit(form(), { answers: { f: { ...good, name: "n".repeat(300), extra: "dropped" } } });
      const row = onlyRow();
      assert.equal(row.answers.f.length, 1);
      assert.equal(row.answers.f[0].name.length, 200);
      assert.equal("extra" in row.answers.f[0], false);
      assert.deepEqual(row.metadata.files, [{ fieldId: "f", path: good.path, name: "n".repeat(200) }]);
    });
  });

  describe("signatures", () => {
    const form = () => makeForm({ fields: [field("s", "signature")] });

    test("a non-PNG data URL or foreign path is refused", async () => {
      assert422(await submit(form(), { answers: { s: "data:text/html,evil" } }), "s", /sign again/);
      assert422(await submit(form(), { answers: { s: { path: "forms/other/sig.png" } } }), "s", /couldn't be verified/);
    });

    test("an inline signature is uploaded and swapped for its path", async () => {
      await submit(form(), { answers: { s: OK_PNG } });
      const { s } = onlyRow().answers;
      assert.match(s.path, new RegExp(`^forms/${FORM_ID}/signatures/`));
      assert.ok(s.signedAt);
      assert.equal(db.uploads.length, 1);
      assert.equal(db.uploads[0].bucket, "forms-uploads");
      assert.equal(db.uploads[0].path, s.path);
    });

    test("a failed upload fails the submission", async () => {
      db.uploadError = "full";
      const out = await submit(form(), { answers: { s: OK_PNG } });
      assert.equal(out.status, 500);
      assert.equal(out.body.code, "upload");
      assertNothingStored();
    });
  });

  describe("booking", () => {
    // A Monday-to-Sunday open field far enough ahead to clear the lead time.
    const slot = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 0, 15, 10, 0)).toISOString();
    const form = () => makeForm({
      fields: [field("b", "booking", { config: { days: [0, 1, 2, 3, 4, 5, 6], start: "09:00", end: "17:00", slotMinutes: 30, capacity: 1, horizonDays: 800, leadHours: 0, timezone: "UTC" } })],
    });

    test("a free slot is booked, and then it's taken", async () => {
      assert.equal((await submit(form(), { answers: { b: slot } })).status, 200);
      const row = onlyRow();
      assert.equal(row.answers.b, slot);
      assert.equal(db.rows("bookings").length, 1);
      assert.equal(db.rows("bookings")[0].response_id, row.id);
      assert422Booked(await submit(form(), { answers: { b: slot } }));
    });

    const assert422Booked = (out) => {
      assert.equal(out.status, 422);
      assert.match(out.body.fieldErrors.b, /no longer available/);
    };

    test("a time that isn't a slot is refused", async () => {
      assert422Booked(await submit(form(), { answers: { b: "not a date" } }));
      assert422Booked(await submit(form(), { answers: { b: slot.replace("10:00", "10:07") } }));
    });
  });

  test("consent records keep the time and a hash of the wording", async () => {
    await submit(makeForm({ fields: [field("c", "consent", { label: "I agree" })] }), { answers: { c: true } });
    const record = onlyRow().metadata.consents.c;
    assert.ok(Date.parse(record.acceptedAt));
    assert.match(record.textHash, /^[0-9a-f]{64}$/);
  });
});

describe("duplicates", () => {
  const settings = (extra = {}) => ({ duplicates: { enabled: true, fieldIds: ["email"], windowDays: 30, action: "block", ...extra } });
  const fields = [field("email", "email"), field("note")];
  const answers = { email: "a@b.co", note: "x" };
  const earlier = (extra = {}) => seedResponses(1, { answers: { email: "a@b.co" }, ...extra })[0];

  test("block refuses a repeat", async () => {
    earlier();
    const out = await submit(makeForm({ fields, settings: settings() }), { answers });
    assert.equal(out.status, 409);
    assert.equal(out.body.code, "duplicate");
    assert.equal(responses().length, 1);
  });

  test("flag stores it for review and links the original", async () => {
    const first = earlier();
    await submit(makeForm({ fields, settings: settings({ action: "flag" }) }), { answers });
    const row = responses().at(-1);
    assert.equal(row.status, "Needs review");
    assert.equal(row.metadata.duplicateOf, first.id);
  });

  test("flag doesn't override a more specific status", async () => {
    earlier();
    const form = makeForm({ fields, settings: { ...settings({ action: "flag" }), approval: { enabled: true, steps: [{ name: "x" }] } } });
    await submit(form, { answers });
    assert.equal(responses().at(-1).status, "Pending");
  });

  test("different answers aren't duplicates", async () => {
    earlier();
    assert.equal((await submit(makeForm({ fields, settings: settings() }), { answers: { email: "c@d.co" } })).status, 200);
  });

  test("the match window, soft deletes and other forms don't count", async () => {
    earlier({ submitted_at: iso(-31 * day) });
    earlier({ deleted_at: iso(-1000) });
    earlier({ form_id: "another-form" });
    assert.equal((await submit(makeForm({ fields, settings: settings() }), { answers })).status, 200);
  });

  test("the window is configurable", async () => {
    earlier({ submitted_at: iso(-10 * day) });
    assert.equal((await submit(makeForm({ fields, settings: settings({ windowDays: 5 }) }), { answers })).status, 200);
    assert.equal((await submit(makeForm({ fields, settings: settings({ windowDays: 20 }) }), { answers })).status, 409);
  });

  test("blank answers and disabled settings skip the check", async () => {
    earlier({ answers: { note: "x" } });
    assert.equal((await submit(makeForm({ fields, settings: settings() }), { answers: { note: "x" } })).status, 200);
    earlier();
    assert.equal((await submit(makeForm({ fields, settings: settings({ enabled: false }) }), { answers })).status, 200);
    assert.equal((await submit(makeForm({ fields, settings: settings({ fieldIds: [] }) }), { answers })).status, 200);
  });

  test("sensitive fields never take part, since they're stored encrypted", async () => {
    earlier();
    const list = [field("email", "email", { sensitive: true })];
    assert.equal((await submit(makeForm({ fields: list, settings: settings() }), { answers: { email: "a@b.co" } })).status, 200);
  });

  test("a failing lookup doesn't lose the response", async () => {
    earlier();
    db.failOn("responses", "select", "boom");
    assert.equal((await submit(makeForm({ fields, settings: settings() }), { answers })).status, 200);
  });
});

describe("anonymous mode", () => {
  const user = { id: "u1", name: "Ada", email: "ada@acme.test" };
  const fields = [field("n", "name"), field("e", "email"), field("q")];
  const answers = { n: { first: "Ada", last: "L" }, e: "typed@acme.test", q: "x" };
  const form = (extra = {}) => makeForm({ fields, settings: { anonymous: true, ...extra } });
  const headers = { "user-agent": "Secret/1.0", "x-forwarded-for": "9.9.9.9" };

  test("no identity is kept on the row or in its metadata", async () => {
    await submit(form(), { answers }, { user, headers });
    const row = onlyRow();
    assert.equal(row.respondent_name, null);
    assert.equal(row.respondent_email, null);
    assert.equal(row.respondent_user_id, null);
    assert.equal(row.user_agent, null);
    assert.equal(row.metadata.anonymous, true);
    assert.equal("ipHash" in row.metadata, false);
    assert.equal("userAgent" in row.metadata, false);
    const text = JSON.stringify(row.metadata);
    for (const leak of ["Secret/1.0", "9.9.9.9", user.email, user.id]) assert.equal(text.includes(leak), false, leak);
  });

  test("delegation is ignored", async () => {
    await submit(form({ allowDelegate: true }), { answers: { q: "x" }, delegate: { forName: "Bob", forEmail: "bob@acme.test" } }, { user });
    const row = onlyRow();
    assert.equal(row.respondent_email, null);
    assert.equal(row.metadata.delegate, undefined);
  });

  test("the stored identity stays blank on edit", async () => {
    await submit(form({ editWindow: "always" }), { answers }, { user });
    const { edit_token: editToken, id } = onlyRow();
    await submit(form({ editWindow: "always" }), { answers: { ...answers, q: "changed" }, editToken }, { user });
    const row = onlyRow();
    assert.equal(row.id, id);
    assert.equal(row.respondent_email, null);
    assert.equal(row.respondent_name, null);
  });

  test("no confirmation goes out and the webhook carries no identity", async () => {
    process.env.RESEND_API_KEY = "re_test";
    world.fetch.reply = () => Response.json({ id: "x" });
    const hooked = form({ confirmEmail: true, webhooks: [{ id: "h", url: "https://hook.test/" }] });
    await submit(hooked, { answers }, { user });
    assert.equal(world.fetch.calls.filter((c) => c.url.includes("resend")).length, 0);
    await flushAfter();
    const payload = JSON.parse(world.outbound.requests[0].body);
    assert.deepEqual(payload.data.response.respondent, { name: null, email: null });
  });

  test("a signed link's email isn't kept on an anonymous response", async () => {
    process.env.FORMS_LINK_SECRET = "test-link-secret";
    const signedForm = form({ access: { mode: "signed" } });
    const signedToken = signLinkToken({ formId: FORM_ID, email: "invitee@acme.test", expiresAt: Date.now() + day });
    assert.equal((await submit(signedForm, { signedToken, answers: { q: "x" } })).status, 200);
    assert.equal(onlyRow().metadata.signedEmail, undefined);
    assert.equal(JSON.stringify(onlyRow()).includes("invitee@acme.test"), false);
  });

  test("an anonymous form still requires the typed name it doesn't keep", async () => {
    const policyForm = form({ policy: { enabled: true, requireName: true, requireScroll: false } });
    const out = await submit(policyForm, { answers: { q: "x" }, policy: { typedName: "  " } });
    assert.equal(out.status, 422);
    assert.ok(out.body.fieldErrors.__policy);
    assertNothingStored();
    assert.equal((await submit(policyForm, { answers: { q: "x" }, policy: { typedName: "Ada Lovelace", scrolled: true } })).status, 200);
    assert.ok(onlyRow().metadata.policy.acknowledgedAt);
    assert.equal(onlyRow().metadata.policy.scrolled, true);
    assert.equal("typedName" in onlyRow().metadata.policy, false);
  });

  test("a sensitive email on an anonymous form leaves no lookup key behind", async () => {
    process.env.FORMS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
    await submit(makeForm({ fields: [field("e", "email", { sensitive: true })], settings: { anonymous: true } }), { answers: { e: "a@b.co" } });
    assert.equal(onlyRow().metadata.emailIndex, undefined);
  });

  test("a policy acknowledgement's typed name isn't kept on an anonymous response", async () => {
    const policyForm = form({ policy: { enabled: true, requireName: true, requireScroll: false } });
    assert.equal((await submit(policyForm, { answers: { q: "x" }, policy: { typedName: "Ada Lovelace" } })).status, 200);
    assert.equal(JSON.stringify(onlyRow()).includes("Ada Lovelace"), false);
  });
});

describe("sensitive fields", () => {
  const KEY = Buffer.alloc(32, 7).toString("base64");
  const fields = [field("ssn", "text", { sensitive: true }), field("q"), field("blank", "text", { sensitive: true })];
  const form = (settings = {}) => makeForm({ fields, settings });

  test("stored encrypted and round-trippable; other answers stay plain", async () => {
    process.env.FORMS_ENCRYPTION_KEY = KEY;
    await submit(form(), { answers: { ssn: "123-45-6789", q: "plain", blank: "" } });
    const row = onlyRow();
    assert.equal(isEncrypted(row.answers.ssn), true);
    assert.equal(JSON.stringify(row).includes("123-45-6789"), false);
    assert.equal(decryptValue(row.answers.ssn), "123-45-6789");
    assert.equal(row.answers.q, "plain");
    assert.equal(row.answers.blank, "");
    assert.deepEqual(row.metadata.encryptedFields, ["ssn"]);
  });

  test("each encryption uses a fresh IV", async () => {
    process.env.FORMS_ENCRYPTION_KEY = KEY;
    await submit(form(), { answers: { ssn: "same" } });
    await submit(form(), { answers: { ssn: "same" } });
    assert.notEqual(responses()[0].answers.ssn.__enc, responses()[1].answers.ssn.__enc);
  });

  test("structured answers round-trip", async () => {
    process.env.FORMS_ENCRYPTION_KEY = KEY;
    await submit(makeForm({ fields: [field("n", "name", { sensitive: true })] }), { answers: { n: { first: "A", last: "B" } } });
    assert.deepEqual(decryptValue(onlyRow().answers.n), { first: "A", last: "B" });
  });

  test("webhooks and the response body don't carry the plaintext", async () => {
    process.env.FORMS_ENCRYPTION_KEY = KEY;
    const out = await submit(form({ webhooks: [{ id: "h", url: "https://hook.test/" }] }), { answers: { ssn: "123-45-6789" } });
    assert.equal(JSON.stringify(out.body).includes("123-45-6789"), false);
    await flushAfter();
    const body = world.outbound.requests[0].body;
    assert.equal(body.includes("123-45-6789"), false);
    assert.equal(JSON.parse(body).data.response.answers.ssn, "[protected]");
  });

  test("notification emails mask it", async () => {
    process.env.FORMS_ENCRYPTION_KEY = KEY;
    process.env.RESEND_API_KEY = "re_test";
    world.fetch.reply = () => Response.json({ id: "x" });
    await submit(form({ notifyEmails: ["boss@acme.test"] }), { answers: { ssn: "123-45-6789" } });
    const emails = world.fetch.calls.filter((c) => c.url.includes("resend"));
    assert.equal(emails.length, 1);
    assert.equal(emails[0].init.body.includes("123-45-6789"), false);
    assert.ok(emails[0].init.body.includes("[protected]"));
  });

  test("without a key the answer is stored as is and not listed as encrypted", async () => {
    await submit(form(), { answers: { ssn: "123-45-6789" } });
    const row = onlyRow();
    assert.equal(row.answers.ssn, "123-45-6789");
    assert.equal(row.metadata.encryptedFields, undefined);
  });

  test("a sensitive email or name isn't copied in plaintext to the respondent columns", async () => {
    process.env.FORMS_ENCRYPTION_KEY = KEY;
    const list = [field("e", "email", { sensitive: true }), field("n", "name", { sensitive: true })];
    await submit(makeForm({ fields: list }), { answers: { e: "private@acme.test", n: { first: "Ada", last: "Lovelace" } } });
    const row = onlyRow();
    assert.equal(isEncrypted(row.answers.e), true);
    assert.equal(JSON.stringify(row).includes("private@acme.test"), false);
    assert.equal(JSON.stringify(row).includes("Lovelace"), false);
  });

  describe("a sensitive contact field", () => {
    const fields = [field("e", "email", { sensitive: true }), field("n", "name", { sensitive: true }), field("q")];
    const answers = { e: "private@acme.test", n: { first: "Ada", last: "Lovelace" }, q: "x" };
    const user = { id: "u1", name: "Ada Lovelace", email: "private@acme.test" };
    const sentEmails = () => world.fetch.calls.filter((c) => c.url.includes("resend")).map((c) => JSON.parse(c.init.body));
    const mailOn = () => {
      process.env.RESEND_API_KEY = "re_test";
      world.fetch.reply = () => Response.json({ id: "x" });
    };

    beforeEach(() => {
      process.env.FORMS_ENCRYPTION_KEY = KEY;
    });

    test("stays out of the columns without a key too", async () => {
      delete process.env.FORMS_ENCRYPTION_KEY;
      await submit(makeForm({ fields }), { answers });
      assert.equal(onlyRow().respondent_email, null);
      assert.equal(onlyRow().respondent_name, null);
    });

    test("a session or signed identity equal to the answer isn't stored either", async () => {
      process.env.FORMS_LINK_SECRET = "test-link-secret";
      const form = makeForm({ fields, settings: { access: { mode: "signed" } } });
      const signedToken = signLinkToken({ formId: FORM_ID, email: "PRIVATE@acme.test", expiresAt: Date.now() + day });
      await submit(form, { answers, signedToken }, { user });
      const row = onlyRow();
      assert.equal(row.respondent_email, null);
      assert.equal(row.respondent_name, null);
      assert.equal(row.metadata.signedEmail, undefined);
      assert.equal(JSON.stringify(row).toLowerCase().includes("private@acme.test"), false);
      assert.equal(row.respondent_user_id, "u1");
    });

    test("a different session identity is still recorded", async () => {
      await submit(makeForm({ fields }), { answers }, { user: { id: "u1", name: "Staff", email: "staff@acme.test" } });
      assert.equal(onlyRow().respondent_email, "staff@acme.test");
      assert.equal(onlyRow().respondent_name, "Staff");
    });

    test("a plain email field beside it still fills the column", async () => {
      const list = [field("e", "email", { sensitive: true }), field("w", "text", { title: "Work email" })];
      await submit(makeForm({ fields: list }), { answers: { e: "private@acme.test", w: "work@acme.test" } });
      assert.equal(onlyRow().respondent_email, "work@acme.test");
    });

    test("the confirmation still reaches the respondent, with no plaintext on the row", async () => {
      mailOn();
      await submit(makeForm({ fields, settings: { confirmEmail: true } }), { answers });
      const [message] = sentEmails();
      assert.deepEqual([message.to].flat(), ["private@acme.test"]);
      assert.equal(JSON.stringify(onlyRow()).includes("private@acme.test"), false);
    });

    test("the row keeps a keyed index for data-subject requests, not the address", async () => {
      await submit(makeForm({ fields }), { answers });
      const { emailIndex: key } = onlyRow().metadata;
      assert.match(key, /^[0-9a-f]{64}$/);
      assert.equal(key, emailIndex(" Private@ACME.test "));
    });

    test("an edit keeps the columns clean and the index current", async () => {
      const form = makeForm({ fields, settings: { editWindow: "24h" } });
      await submit(form, { answers });
      const { edit_token: editToken } = onlyRow();
      await submit(form, { answers: { ...answers, e: "new@acme.test" }, editToken });
      const row = onlyRow();
      assert.equal(row.respondent_email, null);
      assert.equal(row.metadata.emailIndex, emailIndex("new@acme.test"));
      assert.equal(JSON.stringify(row).includes("new@acme.test"), false);
    });

    test("Stripe isn't handed the sensitive address", async () => {
      process.env.STRIPE_SECRET_KEY = "sk_test";
      world.fetch.reply = (url) => Response.json(url.includes("coupons") ? { id: "cp_1" } : { id: "cs_1", url: "https://checkout.test/cs_1" });
      const list = [field("e", "email", { sensitive: true }), field("p", "product", { label: "Mug", config: { price: 10 } })];
      await submit(makeForm({ fields: list, settings: { payments: { enabled: true } } }), { answers: { e: "private@acme.test", p: 1 } });
      const checkout = world.fetch.calls.find((c) => c.url.includes("checkout/sessions"));
      assert.equal(decodeURIComponent(checkout.init.body).includes("private@acme.test"), false);
    });

    test("a booking row holds no copy of it", async () => {
      const slot = new Date(Date.UTC(new Date().getUTCFullYear() + 1, 0, 15, 10, 0)).toISOString();
      const list = [field("e", "email", { sensitive: true }), field("b", "booking", { config: { days: [0, 1, 2, 3, 4, 5, 6], start: "09:00", end: "17:00", slotMinutes: 30, horizonDays: 800, leadHours: 0, timezone: "UTC" } })];
      await submit(makeForm({ fields: list }), { answers: { e: "private@acme.test", b: slot } });
      assert.equal(db.rows("bookings")[0].email, null);
    });

    test("the admin email, Slack and webhooks don't name the respondent", async () => {
      mailOn();
      const settings = { notifyEmails: ["boss@acme.test"], slackWebhookUrl: "https://hooks.slack.com/services/x", webhooks: [{ id: "h", url: "https://hook.test/" }] };
      await submit(makeForm({ fields, settings }), { answers }, { user: { id: "u1", name: "Staff", email: "staff@acme.test" } });
      const [admin] = sentEmails();
      assert.equal(admin.reply_to, undefined);
      const slack = world.fetch.calls.find((c) => c.url.includes("slack"));
      await flushAfter();
      const body = JSON.parse(world.outbound.requests[0].body);
      assert.deepEqual(body.data.response.respondent, { name: null, email: null });
      for (const text of [JSON.stringify(admin), slack.init.body, world.outbound.requests[0].body]) {
        for (const leak of ["private@acme.test", "Lovelace", "staff@acme.test"]) assert.equal(text.includes(leak), false, leak);
      }
    });

    test("an older row with a plaintext copy is masked in webhooks too", () => {
      const form = makeForm({ fields });
      const payload = responsePayload(form, { id: "r", respondent_name: "Ada Lovelace", respondent_email: "private@acme.test" }, {});
      assert.deepEqual(payload.response.respondent, { name: null, email: null });
    });
  });

  test("a value calculated from a sensitive answer stays out of webhooks and emails", async () => {
    process.env.RESEND_API_KEY = "re_test";
    world.fetch.reply = () => Response.json({ id: "x" });
    const list = [field("pay", "number", { sensitive: true }), field("year", "calculated", { formula: "{pay} * 12" })];
    const settings = { notifyEmails: ["boss@acme.test"], webhooks: [{ id: "h", url: "https://hook.test/" }] };
    await submit(makeForm({ fields: list, settings }), { answers: { pay: 1000 } });
    const email = world.fetch.calls.find((c) => c.url.includes("resend")).init.body;
    assert.equal(email.includes("12000"), false);
    await flushAfter();
    const body = world.outbound.requests[0].body;
    assert.equal(body.includes("12000"), false);
    assert.equal(JSON.parse(body).data.response.answers.year, "[protected]");
  });

  test("without an encryption key a sensitive answer is still masked in webhooks", async () => {
    await submit(form({ webhooks: [{ id: "h", url: "https://hook.test/" }] }), { answers: { ssn: "123-45-6789" } });
    await flushAfter();
    assert.equal(world.outbound.requests[0].body.includes("123-45-6789"), false);
  });
});

describe("status, score and result", () => {
  const scoring = { scoringEnabled: true };
  const hi = field("s", "select", { options: ["Hi"], optionPoints: { Hi: 90 } });
  const product = field("p", "product", { label: "Mug", config: { price: 10 } });
  const branch = (extra) => ({ id: "b", name: "VIP", conditions: [when("q", "equals", "vip")], ...extra });

  test("High priority scores go to review", async () => {
    await submit(makeForm({ fields: [hi], settings: scoring }), { answers: { s: "Hi" } });
    assert.equal(onlyRow().status, "Needs review");
    assert.equal(onlyRow().priority, "High");
    assert.equal(onlyRow().score, 90);
  });

  test("a branch can set the status and names the outcome", async () => {
    await submit(makeForm({ settings: { branchingEnabled: true, branches: [branch({ status: "Approved" })] } }), { answers: { q: "vip" } });
    assert.equal(onlyRow().status, "Approved");
    assert.equal(onlyRow().outcome, "VIP");
  });

  test("approval wins over score and branch, payment over all", async () => {
    const settings = {
      ...scoring,
      approval: { enabled: true, steps: [{ name: "Boss" }] },
      branchingEnabled: true,
      branches: [{ id: "b", name: "x", status: "Approved", conditions: [when("s", "equals", "Hi")] }],
    };
    await submit(makeForm({ fields: [hi], settings }), { answers: { s: "Hi" } });
    assert.equal(onlyRow().status, "Pending");
    assert.deepEqual(onlyRow().approval, { stepIndex: 0, state: "pending", history: [] });
    db.rows("responses").length = 0;
    await submit(makeForm({ fields: [hi, product], settings: { ...settings, payments: { enabled: true } } }), { answers: { s: "Hi", p: 1 } });
    assert.equal(onlyRow().status, "Awaiting payment");
  });

  test("score and priority are shown only when the form says so", async () => {
    const quiet = await submit(makeForm({ fields: [hi], settings: scoring }), { answers: { s: "Hi" } });
    assert.equal(quiet.body.score, null);
    assert.equal(quiet.body.priority, null);
    const shown = await submit(makeForm({ fields: [hi], settings: { ...scoring, showScore: true } }), { answers: { s: "Hi" } });
    assert.equal(shown.body.score, 90);
    assert.equal(shown.body.priority, "High");
  });

  test("quiz answer keys come back only when allowed", async () => {
    const fields = [field("q", "text", { correctAnswer: "paris" })];
    const quiet = await submit(makeForm({ fields, settings: { quiz: { enabled: true } } }), { answers: { q: "Rome" } });
    assert.deepEqual(quiet.body.quiz, { earned: 0, possible: 1, percent: 0, passed: false });
    assert.equal(JSON.stringify(quiet.body).includes("paris"), false);
    const open = await submit(makeForm({ fields, settings: { quiz: { enabled: true, showAnswers: true } } }), { answers: { q: "paris" } });
    assert.deepEqual(open.body.quiz.correct, { q: "paris" });
    assert.deepEqual(open.body.quiz.results, { q: true });
    assert.equal(open.body.quiz.passed, true);
  });

  test("the matched outcome's ending reaches the respondent, with recall", async () => {
    const settings = { branchingEnabled: true, branches: [branch({ ending: { enabled: true, title: "Welcome {q}", redirectUrl: "https://x.test/?o={outcome}" } })] };
    const out = await submit(makeForm({ settings }), { answers: { q: "vip" } });
    assert.equal(out.body.outcome, "VIP");
    assert.equal(out.body.thankYou.custom, true);
    assert.equal(out.body.thankYou.title, "Welcome vip");
    assert.equal(out.body.thankYou.redirectUrl, "https://x.test/?o=VIP");
  });

  test("an edit window issues a token and an edit link", async () => {
    const out = await submit(makeForm({ settings: { editWindow: "24h" } }));
    const row = onlyRow();
    assert.ok(row.edit_token.length >= 16);
    assert.equal(out.body.editUrl, `${ORIGIN}/form/demo?edit=${row.edit_token}`);
  });

  test("a submitted partial no longer holds its answers", async () => {
    db.seed("partials", { form_id: FORM_ID, token: "tok", completed_at: null, answers: { q: "hello", gone: "stale" }, last_field_id: "q", progress: 80 });
    await submit(makeForm(), { partialToken: "tok" });
    const [partial] = db.rows("partials");
    assert.ok(partial.completed_at);
    assert.deepEqual(partial.answers, {});
    assert.equal(partial.last_field_id, "q");
    assert.equal(partial.progress, 80);
  });

  test("a partial is marked complete and a submit event recorded", async () => {
    db.seed("partials", { form_id: FORM_ID, token: "tok", completed_at: null });
    await submit(makeForm(), { partialToken: "tok", sessionId: "s1", variant: "b" });
    assert.ok(db.rows("partials")[0].completed_at);
    const [event] = db.rows("form_events");
    assert.equal(event.type, "submit");
    assert.equal(event.session_id, "s1");
    assert.equal(event.variant, "b");
    assert.equal(event.metadata.responseId, onlyRow().id);
    assert.equal(db.rows("activity")[0].action, "response.submitted");
  });

  test("identity comes from the answers first, then the session", async () => {
    const user = { id: "u1", name: "Session", email: "session@acme.test" };
    await submit(makeForm({ fields: [field("e", "email"), field("q")] }), { answers: { e: "typed@acme.test", q: "x" } }, { user });
    assert.equal(onlyRow().respondent_email, "typed@acme.test");
    assert.equal(onlyRow().respondent_name, "Session");
    assert.equal(onlyRow().respondent_user_id, "u1");
  });

  test("a delegate submits on someone's behalf only when the form allows it", async () => {
    const user = { id: "u1", name: "Staff", email: "staff@acme.test" };
    const delegate = { forName: "Client", forEmail: "client@acme.test" };
    await submit(makeForm(), { delegate }, { user });
    assert.equal(onlyRow().respondent_email, "staff@acme.test");
    assert.equal(onlyRow().metadata.delegate, undefined);
    db.rows("responses").length = 0;
    await submit(makeForm({ settings: { allowDelegate: true } }), { delegate }, { user });
    assert.equal(onlyRow().respondent_email, "client@acme.test");
    assert.equal(onlyRow().metadata.delegate.byEmail, "staff@acme.test");
    db.rows("responses").length = 0;
    await submit(makeForm({ settings: { allowDelegate: true } }), { delegate });
    assert.equal(onlyRow().respondent_email, null, "delegation needs a signed-in user");
  });

  test("a failing side effect doesn't fail the submission", async () => {
    db.failOn("activity", "insert");
    db.failOn("form_events", "insert");
    const out = await submit(makeForm({ settings: { webhooks: [{ id: "h", url: "https://hook.test/" }] } }));
    assert.equal(out.status, 200);
    assert.equal(responses().length, 1);
  });
});

describe("payments", () => {
  const fields = [field("p", "product", { label: "Mug", config: { price: 10 } })];
  const form = (payments = {}) => makeForm({ fields, settings: { payments: { enabled: true, ...payments } } });
  const stripeOk = () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    world.fetch.reply = (url) => Response.json(url.includes("coupons") ? { id: "cp_1" } : { id: "cs_1", url: "https://checkout.test/cs_1" });
  };
  const checkoutCall = () => world.fetch.calls.find((c) => c.url.includes("checkout/sessions"));

  test("the server prices the order; a client total is ignored", async () => {
    stripeOk();
    const out = await submit(form(), { answers: { p: 2, total: 0.01 }, total: 0.01, order: { total: 0.01 } });
    assert.equal(out.status, 200);
    assert.equal(out.body.checkoutUrl, "https://checkout.test/cs_1");
    assert.equal(out.body.order.total, 20);
    const row = onlyRow();
    assert.equal(row.status, "Awaiting payment");
    assert.equal(row.payment_status, "pending");
    assert.equal(row.payment_amount, 20);
    assert.equal(row.payment_currency, "usd");
    assert.equal(row.payment_ref, "cs_1");
    assert.match(decodeURIComponent(checkoutCall().init.body), /line_items\[0\]\[price_data\]\[unit_amount\]=1000/);
    assert.match(decodeURIComponent(checkoutCall().init.body), /line_items\[0\]\[quantity\]=2/);
  });

  test("a coupon only discounts when the form defines it", async () => {
    stripeOk();
    const payments = { coupons: [{ code: "SAVE", type: "percent", value: 50 }] };
    await submit(form(payments), { answers: { p: 2, __coupon: "save" } });
    assert.equal(onlyRow().payment_amount, 10);
    db.rows("responses").length = 0;
    await submit(form(payments), { answers: { p: 2, __coupon: "FAKE100" } });
    assert.equal(onlyRow().payment_amount, 20);
  });

  test("a Stripe failure stores nothing and tells the respondent", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test";
    world.fetch.reply = () => Response.json({ error: { message: "declined" } }, { status: 402 });
    const out = await submit(form(), { answers: { p: 1 } });
    assert.equal(out.status, 502);
    assert.equal(out.body.code, "payment");
    assertNothingStored();
  });

  test("without Stripe the response is kept and marked unconfigured", async () => {
    const out = await submit(form(), { answers: { p: 1 } });
    assert.equal(out.body.checkoutUrl, null);
    assert.equal(onlyRow().payment_status, "unconfigured");
    assert.equal(onlyRow().status, "Awaiting payment");
    assert.equal(world.fetch.calls.length, 0);
  });

  test("nothing to pay means no payment columns", async () => {
    stripeOk();
    await submit(form(), { answers: {} });
    assert.equal(onlyRow().status, "Complete");
    assert.equal("payment_status" in onlyRow(), false);
    assert.equal(world.fetch.calls.length, 0);
  });

  test("an anonymous checkout sends no email to Stripe", async () => {
    stripeOk();
    const list = [...fields, field("e", "email")];
    await submit(makeForm({ fields: list, settings: { anonymous: true, payments: { enabled: true } } }), { answers: { p: 1, e: "a@b.co" } });
    assert.equal(decodeURIComponent(checkoutCall().init.body).includes("a@b.co"), false);
  });
});

describe("editing", () => {
  const TOKEN = "edit-token-0123456789";
  const form = (settings = {}) => makeForm({ settings: { editWindow: "24h", ...settings } });
  const existing = (extra = {}) => seedResponses(1, { edit_token: TOKEN, answers: { q: "before" }, ...extra })[0];

  test("updates in place and gates stay out of the way", async () => {
    const { id } = existing();
    const out = await submit(form({ closeDate: iso(-day * 2), minReviewSeconds: 60, access: { mode: "login" } }), { answers: { q: "after" }, editToken: TOKEN });
    assert.equal(out.status, 200);
    const row = onlyRow();
    assert.equal(row.id, id);
    assert.deepEqual(row.answers, { q: "after" });
    assert.ok(row.edited_at);
    assert.equal(out.body.editUrl, `${ORIGIN}/form/demo?edit=${TOKEN}`);
    assert.equal(db.rows("activity")[0].action, "response.edited");
  });

  test("still fully revalidated", async () => {
    existing();
    const strict = makeForm({ fields: [field("q", "email")], settings: { editWindow: "24h" } });
    const out = await submit(strict, { answers: { q: "not an email" }, editToken: TOKEN });
    assert.equal(out.status, 422);
    assert.deepEqual(onlyRow().answers, { q: "before" });
  });

  const refused = [
    ["an unknown token", {}, { editToken: "unknown-token-0123456789" }],
    ["a short token", {}, { editToken: "short" }],
    ["a non-string token", {}, { editToken: { $ne: 1 } }],
    ["an approved response", { status: "Approved" }, {}],
    ["a rejected response", { status: "Rejected" }, {}],
    ["a spam response", { status: "Spam" }, {}],
    ["a deleted response", { deleted_at: new Date(0).toISOString() }, {}],
    ["an expired window", { submitted_at: new Date(Date.now() - 2 * day).toISOString() }, {}],
    ["another form's response", { form_id: "another-form" }, {}],
  ];
  for (const [name, row, body] of refused) {
    test(`refuses ${name}`, async () => {
      existing(row);
      const out = await submit(form(), { answers: { q: "after" }, editToken: TOKEN, ...body });
      assert.equal(out.status, 403);
      assert.equal(out.body.code, "gate");
      assert.equal(onlyRow().answers.q, "before");
    });
  }

  test("a duplicate check skips the response being edited", async () => {
    const settings = { duplicates: { enabled: true, fieldIds: ["q"], action: "block" } };
    existing({ answers: { q: "same" } });
    assert.equal((await submit(form(settings), { answers: { q: "same" }, editToken: TOKEN })).status, 200);
  });

  test("a failed update is reported and fires nothing", async () => {
    existing();
    db.failOn("responses", "update");
    const out = await submit(form(), { answers: { q: "after" }, editToken: TOKEN });
    assert.equal(out.status, 500);
    assert.equal(db.rows("activity").length, 0);
  });

  test("editExpiresAt reads the window, its override and the disabled/always cases", () => {
    const submittedAt = "2026-01-01T00:00:00.000Z";
    const base = Date.parse(submittedAt);
    const row = { submitted_at: submittedAt };
    const settings = (editWindow) => ({ settings: { editWindow } });
    assert.equal(editExpiresAt(row, settings("1h")), base + 3_600_000);
    assert.equal(editExpiresAt(row, settings("always")), Infinity);
    assert.equal(editExpiresAt(row, settings("disabled")), 0);
    assert.equal(editExpiresAt({ ...row, metadata: { editExpiresAt: "2030-01-01T00:00:00.000Z" } }, settings("disabled")), Date.parse("2030-01-01T00:00:00.000Z"));
    assert.equal(editExpiresAt({ ...row, metadata: { editExpiresAt: "garbage" } }, settings("always")), 0);
  });

  test("an override extends the window for loadEditableResponse", async () => {
    existing({ submitted_at: new Date(Date.now() - 10 * day).toISOString(), metadata: { editExpiresAt: iso(day) } });
    assert.ok(await loadEditableResponse(form(), TOKEN));
  });
});
