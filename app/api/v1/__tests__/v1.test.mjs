// REST v1: authentication, scope enforcement, project isolation and response shape, driven through the route handlers.
import test, { beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";

import { resetWorld } from "../../../../lib/__tests__/support/harness.mjs";
import { FORM_ID, ORIGIN, OTHER_PROJECT_ID, PROJECT_ID, field, formRow } from "../../../../lib/__tests__/support/forms.mjs";
import { GET as listForms } from "../forms/route.js";
import { GET as getForm } from "../forms/[id]/route.js";
import { GET as listResponses, POST as postResponse } from "../forms/[id]/responses/route.js";

const READ_KEY = `gf_${"r".repeat(32)}`;
const WRITE_KEY = `gf_${"w".repeat(32)}`;
const BASE = `${ORIGIN}/api/v1`;

let world;
let db;

const sha256 = (text) => createHash("sha256").update(text, "utf8").digest("hex");

function seedKey(key, row = {}) {
  return db.seed("api_keys", { key_hash: sha256(key), project_id: PROJECT_ID, scopes: ["read"], ...row })[0];
}

const seedForm = (options = {}) => db.seed("forms", formRow(options))[0];
const seedResponse = (row = {}) => db.seed("responses", { form_id: FORM_ID, status: "Complete", answers: {}, ...row })[0];

beforeEach(() => {
  world = resetWorld();
  db = world.db;
  seedKey(READ_KEY);
  seedKey(WRITE_KEY, { scopes: ["write"] });
});

const req = (path, { key = READ_KEY, method = "GET", body, headers = {} } = {}) =>
  new Request(`${BASE}${path}`, {
    method,
    headers: { ...(key ? { authorization: `Bearer ${key}` } : {}), ...headers },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });

const ctx = (id = FORM_ID) => ({ params: Promise.resolve({ id }) });

async function reply(promise) {
  const res = await promise;
  return { status: res.status, body: await res.json() };
}

// Every route, called with a given key, against a form that exists.
const ROUTES = [
  ["GET /forms", (options) => listForms(req("/forms", options))],
  ["GET /forms/:id", (options) => getForm(req(`/forms/${FORM_ID}`, options), ctx())],
  ["GET /forms/:id/responses", (options) => listResponses(req(`/forms/${FORM_ID}/responses`, options), ctx())],
  ["POST /forms/:id/responses", (options) => postResponse(req(`/forms/${FORM_ID}/responses`, { method: "POST", body: { answers: { q: "x" } }, ...options }), ctx())],
];

describe("authentication", () => {
  for (const [name, call] of ROUTES) {
    describe(name, () => {
      const refused = [
        ["no header", { key: null }],
        ["a key without the prefix", { key: "r".repeat(32) }],
        ["a too-short key", { key: "gf_short" }],
        ["a key with bad characters", { key: `gf_${"r".repeat(20)}'; drop table` }],
        ["a well-formed unknown key", { key: `gf_${"z".repeat(32)}` }],
      ];
      for (const [label, options] of refused) {
        test(`${label} is a 401`, async () => {
          seedForm();
          const { status, body } = await reply(call(options));
          assert.equal(status, 401);
          assert.equal(body.ok, false);
          assert.equal(body.code, "unauthorized");
          assert.equal(db.rows("responses").length, 0);
        });
      }

      test("a non-Bearer scheme is a 401", async () => {
        seedForm();
        const { status } = await reply(call({ key: null, headers: { authorization: `Basic ${READ_KEY}` } }));
        assert.equal(status, 401);
      });

      test("a revoked key is a 401", async () => {
        seedForm();
        const key = `gf_${"d".repeat(32)}`;
        seedKey(key, { scopes: ["write"], deleted_at: new Date().toISOString() });
        assert.equal((await reply(call({ key }))).status, 401);
      });

      test("a key with no project is a 403", async () => {
        seedForm();
        const key = `gf_${"n".repeat(32)}`;
        seedKey(key, { scopes: ["write"], project_id: null });
        const { status, body } = await reply(call({ key }));
        assert.equal(status, 403);
        assert.equal(body.code, "forbidden");
      });

      test("without a database it's a 503", async () => {
        resetWorld({ database: false });
        const { status, body } = await reply(call({}));
        assert.equal(status, 503);
        assert.equal(body.code, "unconfigured");
      });
    });
  }

  test("a key lookup failure doesn't let anyone in", async () => {
    seedForm();
    db.failOn("api_keys", "select");
    assert.equal((await reply(listForms(req("/forms")))).status, 401);
  });

  test("the raw key is never written or queried, only its hash", async () => {
    await reply(listForms(req("/forms")));
    assert.equal(JSON.stringify(db.calls).includes(READ_KEY), false);
    const lookup = db.callsTo("api_keys", "select")[0];
    assert.deepEqual(lookup.filters[0], { column: "key_hash", op: "eq", value: sha256(READ_KEY) });
  });

  test("using a key stamps last_used_at", async () => {
    await reply(listForms(req("/forms")));
    await new Promise((resolve) => setImmediate(resolve));
    const row = db.rows("api_keys").find((k) => k.key_hash === sha256(READ_KEY));
    assert.ok(row.last_used_at);
  });
});

describe("scope enforcement", () => {
  const scoped = (scopes) => {
    const key = `gf_${"s".repeat(32)}`;
    seedKey(key, { scopes });
    return key;
  };

  for (const [name, call] of ROUTES.slice(0, 3)) {
    test(`${name}: a read key and a write key both read`, async () => {
      seedForm();
      assert.equal((await reply(call({ key: READ_KEY }))).status, 200);
      assert.equal((await reply(call({ key: WRITE_KEY }))).status, 200);
    });

    test(`${name}: a key with neither scope is refused`, async () => {
      seedForm();
      const { status, body } = await reply(call({ key: scoped(["admin"]) }));
      assert.equal(status, 403);
      assert.match(body.error, /"read" scope/);
    });
  }

  test("a read key can't submit", async () => {
    seedForm();
    const { status, body } = await reply(ROUTES[3][1]({ key: READ_KEY }));
    assert.equal(status, 403);
    assert.equal(body.code, "forbidden");
    assert.match(body.error, /"write" scope/);
    assert.equal(db.rows("responses").length, 0);
  });

  test("the scope is checked before the body is read", async () => {
    seedForm();
    const { status } = await reply(postResponse(req(`/forms/${FORM_ID}/responses`, { method: "POST", body: "{not json" }), ctx()));
    assert.equal(status, 403);
  });

  test("a key whose scopes aren't a list falls back to read-only", async () => {
    seedForm();
    const key = scoped("write");
    assert.equal((await reply(listForms(req("/forms", { key })))).status, 200);
    assert.equal((await reply(ROUTES[3][1]({ key }))).status, 403);
  });

  test("an empty scope list can do nothing", async () => {
    seedForm();
    assert.equal((await reply(listForms(req("/forms", { key: scoped([]) })))).status, 403);
  });
});

describe("project isolation", () => {
  const OTHER_FORM = randomUUID();
  const seedOtherForm = (extra = {}) => seedForm({ id: OTHER_FORM, slug: "other", title: "Other", project_id: OTHER_PROJECT_ID, ...extra });

  test("the list holds only the key's project, live and not templates", async () => {
    seedForm();
    seedOtherForm();
    seedForm({ id: randomUUID(), slug: "tpl", is_template: true });
    seedForm({ id: randomUUID(), slug: "gone", deleted_at: new Date().toISOString() });
    const { body } = await reply(listForms(req("/forms")));
    assert.deepEqual(body.forms.map((f) => f.id), [FORM_ID]);
  });

  const hidden = [
    ["another project's form", OTHER_FORM],
    ["an unknown form", randomUUID()],
    ["a malformed id", "not-a-uuid"],
    ["a filter-shaped id", "*"],
  ];
  for (const [name, id] of hidden) {
    test(`${name} is a plain 404 on every route`, async () => {
      seedOtherForm();
      seedResponse({ form_id: OTHER_FORM, answers: { q: "secret" } });
      for (const res of [
        await reply(getForm(req(`/forms/${id}`), ctx(id))),
        await reply(listResponses(req(`/forms/${id}/responses`), ctx(id))),
        await reply(postResponse(req(`/forms/${id}/responses`, { key: WRITE_KEY, method: "POST", body: { answers: { q: "x" } } }), ctx(id))),
      ]) {
        assert.equal(res.status, 404);
        assert.equal(res.body.code, "not_found");
        assert.equal(JSON.stringify(res.body).includes("secret"), false);
      }
      assert.equal(db.rows("responses").length, 1, "nothing was written across projects");
    });
  }

  test("a template or deleted form is a 404", async () => {
    const template = randomUUID();
    const deleted = randomUUID();
    seedForm({ id: template, slug: "tpl", is_template: true });
    seedForm({ id: deleted, slug: "gone", deleted_at: new Date().toISOString() });
    assert.equal((await reply(getForm(req(`/forms/${template}`), ctx(template)))).status, 404);
    assert.equal((await reply(getForm(req(`/forms/${deleted}`), ctx(deleted)))).status, 404);
  });

  test("responses are read for that form only", async () => {
    seedForm();
    seedOtherForm();
    const mine = seedResponse();
    seedResponse({ form_id: OTHER_FORM });
    const { body } = await reply(listResponses(req(`/forms/${FORM_ID}/responses`), ctx()));
    assert.deepEqual(body.responses.map((r) => r.id), [mine.id]);
  });

  test("a key from the other project sees the mirror image", async () => {
    seedForm();
    const key = `gf_${"o".repeat(32)}`;
    seedKey(key, { project_id: OTHER_PROJECT_ID });
    assert.equal((await reply(getForm(req(`/forms/${FORM_ID}`, { key }), ctx()))).status, 404);
    assert.deepEqual((await reply(listForms(req("/forms", { key })))).body.forms, []);
  });
});

describe("GET /forms", () => {
  test("the summary shape carries no fields or settings", async () => {
    seedForm({ description: "D", category: "C", tags: ["t"], response_count: 3, published_at: "2026-01-01T00:00:00.000Z", settings: { webhooks: [{ url: "https://hook.test", secret: "whsec" }] } });
    const { status, body } = await reply(listForms(req("/forms")));
    assert.equal(status, 200);
    assert.equal(body.ok, true);
    const [form] = body.forms;
    assert.deepEqual(Object.keys(form).sort(), ["category", "createdAt", "description", "id", "publishedAt", "responses", "slug", "status", "tags", "title", "updatedAt"]);
    assert.equal(form.responses, 3);
    assert.equal(JSON.stringify(body).includes("whsec"), false);
  });

  test("a database error is a generic 500", async () => {
    db.failOn("forms", "select", "relation forms.forms is broken");
    const { status, body } = await reply(listForms(req("/forms")));
    assert.equal(status, 500);
    assert.equal(body.error, "Couldn't load forms.");
  });
});

describe("GET /forms/:id", () => {
  const secretSettings = {
    access: { mode: "password", passwordHash: "HASH", passwordSalt: "SALT" },
    webhooks: [{ url: "https://hook.test", secret: "whsec" }],
    notifyEmails: ["boss@acme.test"],
    slackWebhookUrl: "https://hooks.slack.com/secret",
    payments: { coupons: [{ code: "COUPON10" }] },
  };

  test("fields and public settings come back, secrets and answer keys don't", async () => {
    seedForm({ fields: [field("q", "text", { correctAnswer: "paris" })], settings: secretSettings });
    const { status, body } = await reply(getForm(req(`/forms/${FORM_ID}`), ctx()));
    assert.equal(status, 200);
    assert.equal(body.form.id, FORM_ID);
    assert.equal(body.form.fields[0].id, "q");
    assert.equal(body.form.settings.access.mode, "password");
    const text = JSON.stringify(body);
    for (const secret of ["HASH", "SALT", "whsec", "boss@acme.test", "hooks.slack.com", "COUPON10", "paris"]) assert.equal(text.includes(secret), false, secret);
  });

  test("legacy field aliases are canonicalised", async () => {
    seedForm({ fields: [{ id: "q", type: "text", title: "T", firstValue: "Label" }] });
    const { body } = await reply(getForm(req(`/forms/${FORM_ID}`), ctx()));
    assert.equal(body.form.fields[0].label, "Label");
  });
});

describe("GET /forms/:id/responses", () => {
  const at = (n) => `2026-01-0${n}T00:00:00.000Z`;
  const list = (query = "") => reply(listResponses(req(`/forms/${FORM_ID}/responses${query}`), ctx()));

  beforeEach(() => seedForm());

  test("the response shape", async () => {
    const row = seedResponse({ answers: { q: "x" }, respondent_name: "Ada", respondent_email: "a@b.co", priority: "High", score: 5, outcome: "Pass", tags: ["t"], payment_status: "paid", payment_amount: "9.50", payment_currency: "usd" });
    const { status, body } = await list();
    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.nextCursor, null);
    const [out] = body.responses;
    assert.equal(out.id, row.id);
    assert.equal(out.formId, FORM_ID);
    assert.deepEqual(out.respondent, { name: "Ada", email: "a@b.co" });
    assert.deepEqual(out.answers, { q: "x" });
    assert.deepEqual(out.payment, { status: "paid", amount: 9.5, currency: "usd" });
    assert.deepEqual(out.encryptedFields, []);
    assert.equal(out.score, 5);
  });

  test("internals stay out", async () => {
    seedResponse({ edit_token: "secret-edit", metadata: { ipHash: "secret-hash", userAgent: "secret-ua" }, user_agent: "secret-ua" });
    const text = JSON.stringify((await list()).body);
    for (const secret of ["secret-edit", "secret-hash", "secret-ua"]) assert.equal(text.includes(secret), false, secret);
  });

  test("encrypted answers come back as null and are named", async () => {
    seedResponse({ answers: { ssn: { __enc: "v1:a:b:c" }, q: "x" }, metadata: { encryptedFields: ["ssn"] } });
    const [out] = (await list()).body.responses;
    assert.equal(out.answers.ssn, null);
    assert.equal(out.answers.q, "x");
    assert.deepEqual(out.encryptedFields, ["ssn"]);
  });

  test("soft-deleted responses are excluded", async () => {
    seedResponse({ deleted_at: new Date().toISOString() });
    assert.deepEqual((await list()).body.responses, []);
  });

  test("oldest first, paged by cursor without gaps or repeats", async () => {
    const rows = [3, 1, 2, 4, 5].map((n) => seedResponse({ submitted_at: at(n) }));
    const ids = [];
    let cursor = null;
    let pages = 0;
    do {
      const { body } = await list(`?limit=2${cursor ? `&cursor=${cursor}` : ""}`);
      ids.push(...body.responses.map((r) => r.submittedAt));
      assert.ok(body.responses.length <= 2);
      cursor = body.nextCursor;
      pages += 1;
    } while (cursor);
    assert.equal(pages, 3);
    assert.equal(ids.length, rows.length);
    assert.deepEqual(ids, [1, 2, 3, 4, 5].map(at));
  });

  test("ties on the timestamp page by id", async () => {
    const same = at(1);
    const rows = [1, 2, 3].map(() => seedResponse({ submitted_at: same }));
    const first = await list("?limit=2");
    const second = await list(`?limit=2&cursor=${first.body.nextCursor}`);
    const seen = [...first.body.responses, ...second.body.responses].map((r) => r.id);
    assert.deepEqual(seen, rows.map((r) => r.id).sort());
    assert.equal(second.body.nextCursor, null);
  });

  test("a full last page has no next cursor", async () => {
    [1, 2].forEach((n) => seedResponse({ submitted_at: at(n) }));
    assert.equal((await list("?limit=2")).body.nextCursor, null);
  });

  test("since is an inclusive lower bound", async () => {
    [1, 2, 3].forEach((n) => seedResponse({ submitted_at: at(n) }));
    const { body } = await list(`?since=${at(2)}`);
    assert.deepEqual(body.responses.map((r) => r.submittedAt), [at(2), at(3)]);
  });

  const limits = [["", 51], ["?limit=abc", 51], ["?limit=0", 51], ["?limit=-5", 2], ["?limit=10", 11], ["?limit=200", 201], ["?limit=1000", 201]];
  for (const [query, expected] of limits) {
    test(`${query || "no limit"} asks the database for ${expected} rows`, async () => {
      await list(query);
      assert.equal(db.callsTo("responses", "select").at(-1).limit, expected);
    });
  }

  for (const cursor of ["!!!", Buffer.from("no-separator").toString("base64url"), Buffer.from(`not-a-date|${randomUUID()}`).toString("base64url"), Buffer.from(`${at(1)}|not-a-uuid`).toString("base64url")]) {
    test(`cursor ${cursor} is a 400`, async () => {
      const { status, body } = await list(`?cursor=${cursor}`);
      assert.equal(status, 400);
      assert.equal(body.error, "Invalid cursor.");
    });
  }

  test("a bad since is a 400", async () => {
    assert.equal((await list("?since=whenever")).status, 400);
  });

  test("a database error is a generic 500", async () => {
    db.failOn("responses", "select", "secret internals");
    const { status, body } = await list();
    assert.equal(status, 500);
    assert.equal(JSON.stringify(body).includes("secret internals"), false);
  });

  test("a cursor can't smuggle extra PostgREST terms past Date.parse", async () => {
    const forged = Buffer.from(`1 Jan 2020 (",id.not.is.null,id.eq."x)|${randomUUID()}`).toString("base64url");
    const { status } = await list(`?cursor=${forged}`);
    assert.equal(status, 400);
  });

  test("a fractional limit is rounded rather than sent to the database", async () => {
    await list("?limit=1.5");
    assert.equal(Number.isInteger(db.callsTo("responses", "select").at(-1).limit), true);
  });

  for (const [name, stamp] of [["three-part", `${at(1)}|${randomUUID()}|x`], ["date-only", `2026-01-01|${randomUUID()}`], ["unquoted term", `2026-01-01T00:00:00Z,id.eq.x|${randomUUID()}`]]) {
    test(`a ${name} cursor is a 400`, async () => {
      assert.equal((await list(`?cursor=${Buffer.from(stamp).toString("base64url")}`)).status, 400);
    });
  }

  test("a cursor in Postgres's own timestamp format still pages", async () => {
    const cursor = Buffer.from(`2026-01-01 10:00:00.123456+00|${randomUUID()}`).toString("base64url");
    assert.equal((await list(`?cursor=${cursor}`)).status, 200);
    const iso = Buffer.from(`2026-01-01T10:00:00.123456+00:00|${randomUUID()}`).toString("base64url");
    assert.equal((await list(`?cursor=${iso}`)).status, 200);
  });
});

describe("POST /forms/:id/responses", () => {
  const post = (body, id = FORM_ID) => reply(postResponse(req(`/forms/${id}/responses`, { key: WRITE_KEY, method: "POST", body }), ctx(id)));

  test("creates through the pipeline and answers 201 with the stored response", async () => {
    seedForm();
    const { status, body } = await post({ answers: { q: "hello" } });
    assert.equal(status, 201);
    assert.equal(body.ok, true);
    assert.equal(body.response.id, body.responseId);
    assert.equal(body.response.formId, FORM_ID);
    assert.deepEqual(body.response.answers, { q: "hello" });
    assert.equal(body.response.status, "Complete");
    assert.equal(db.rows("responses")[0].metadata.source, "api");
  });

  test("respondent gates and spam checks are skipped, the honeypot included", async () => {
    seedForm({ settings: { closeDate: "2000-01-01", access: { mode: "login" }, minReviewSeconds: 60, attestation: { enabled: true } } });
    const { status } = await post({ answers: { q: "x" }, hp: "bot" });
    assert.equal(status, 201);
    assert.equal(db.rows("responses").length, 1);
    assert.equal(db.rpcCalls.some((c) => c.args.p_key.startsWith("submit:")), false, "no respondent rate limiting either");
  });

  test("validation errors keep the pipeline's status and fields", async () => {
    seedForm({ fields: [field("q", "email", { required: true })] });
    const { status, body } = await post({ answers: { q: "nope" } });
    assert.equal(status, 422);
    assert.equal(body.code, "validation");
    assert.match(body.fieldErrors.q, /valid email/);
    assert.equal(db.rows("responses").length, 0);
  });

  test("the response cap still applies", async () => {
    seedForm({ settings: { responseLimit: 1 } });
    seedResponse();
    const { status, body } = await post({ answers: { q: "x" } });
    assert.equal(status, 403);
    assert.equal(body.code, "closed");
  });

  test("missing answers are a 400", async () => {
    seedForm();
    assert.equal((await post({})).status, 400);
  });

  test("broken JSON is a 400", async () => {
    seedForm();
    assert.equal((await post("{not json")).status, 400);
  });

  test("an oversized body is a 413", async () => {
    seedForm();
    const res = await reply(postResponse(req(`/forms/${FORM_ID}/responses`, { key: WRITE_KEY, method: "POST", body: { answers: { q: "x" } }, headers: { "content-length": String(10 * 1024 * 1024) } }), ctx()));
    assert.equal(res.status, 413);
    assert.equal(res.body.code, "too_large");
  });

  test("an archived form is a 404", async () => {
    seedForm({ status: "Archived" });
    assert.equal((await post({ answers: { q: "x" } })).status, 404);
    assert.equal(db.rows("responses").length, 0);
  });

  test("sensitive answers come back masked", async () => {
    process.env.FORMS_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
    seedForm({ fields: [field("ssn", "text", { sensitive: true })] });
    const { status, body } = await post({ answers: { ssn: "123-45-6789" } });
    assert.equal(status, 201);
    assert.equal(body.response.answers.ssn, null);
    assert.deepEqual(body.response.encryptedFields, ["ssn"]);
    assert.equal(JSON.stringify(body).includes("123-45-6789"), false);
  });

  test("a failed insert is a 500 with no response", async () => {
    seedForm();
    db.failOn("responses", "insert");
    const { status, body } = await post({ answers: { q: "x" } });
    assert.equal(status, 500);
    assert.equal(body.ok, false);
  });
});
