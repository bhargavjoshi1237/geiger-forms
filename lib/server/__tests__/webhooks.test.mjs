// Outbound webhooks: signing, retry policy and backoff, attempt cap, transient vs permanent failures, replay, sweeps and owner alerts.
import test, { afterEach, beforeEach, describe, mock } from "node:test";
import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";

import { flushAfter, pendingAfter, resetWorld } from "../../__tests__/support/harness.mjs";
import { FORM_ID, OWNER_ID, field, formRow, makeForm } from "../../__tests__/support/forms.mjs";
import { isSafeOutboundUrl } from "../http.js";
import {
  dispatchEvent,
  listDeliveries,
  postSlack,
  queueWebhook,
  replayDelivery,
  responsePayload,
  sendTestWebhook,
  sweepWebhooks,
} from "../webhooks.js";

const URL_A = "https://hook.test/in";
const URL_B = "https://other.test/in";
const HOOK = { id: "h1", url: URL_A, secret: "whsec_1" };
const MINUTE = 60_000;
const DAY = 1440 * MINUTE;
const PAST = new Date(Date.now() - DAY).toISOString();

let world;
let db;

beforeEach(() => {
  world = resetWorld();
  db = world.db;
});

const formWith = (settings = {}, columns = {}) => makeForm({ settings: { webhooks: [HOOK], ...settings }, ...columns });
const deliveries = () => db.rows("webhook_deliveries");
const onlyDelivery = () => {
  assert.equal(deliveries().length, 1);
  return deliveries()[0];
};
const statuses = (...list) => {
  world.outbound.reply = (_, n) => list[Math.min(n, list.length) - 1];
};
const hmac = (secret, body) => `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
const delayOf = (row) => Date.parse(row.next_retry_at) - Date.now();
const assertAbout = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 30_000, `${label ?? "delay"}: ${actual} is not about ${expected}`);

async function queue(form = formWith(), overrides = {}) {
  await queueWebhook({ form, hook: HOOK, event: "response.created", payload: { form: { id: form.id }, n: 1 }, responseId: "r1", ...overrides });
  await flushAfter();
}

// A stored delivery as a past attempt would leave it, due for another try.
function seedDelivery({ attemptCount = 3, ...row } = {}) {
  const attempts = Array.from({ length: attemptCount }, (_, i) => ({ n: i + 1, at: PAST, status: 500, error: "HTTP 500", ms: 1 }));
  return db.seed("webhook_deliveries", {
    id: randomUUID(),
    form_id: FORM_ID,
    response_id: "r1",
    webhook_id: HOOK.id,
    url: URL_A,
    event: "response.created",
    payload: { form: { id: FORM_ID }, n: 1 },
    state: "retrying",
    attempt_count: attemptCount,
    attempts,
    next_retry_at: PAST,
    ...row,
  })[0];
}

const seedForm = (settings = {}, columns = {}) => db.seed("forms", formRow({ settings: { webhooks: [HOOK], ...settings }, ...columns }))[0];
const sweep = (options) => sweepWebhooks({ budgetMs: 0, prune: false, ...options });

describe("signing", () => {
  test("the signature is an HMAC-SHA256 of the exact body with the hook's secret", async () => {
    await queue();
    const [{ headers, body }] = world.outbound.requests;
    assert.equal(headers["X-Geiger-Signature"], hmac("whsec_1", body));
    assert.notEqual(headers["X-Geiger-Signature"], hmac("wrong", body));
  });

  test("the body and headers describe the event", async () => {
    await queue();
    const [{ headers, body, method }] = world.outbound.requests;
    assert.equal(method, "POST");
    assert.equal(headers["Content-Type"], "application/json");
    assert.equal(headers["X-Geiger-Event"], "response.created");
    assert.equal(headers["X-Geiger-Delivery"], onlyDelivery().id);
    assert.equal(headers["Content-Length"], Buffer.byteLength(body));
    const parsed = JSON.parse(body);
    assert.equal(parsed.event, "response.created");
    assert.deepEqual(parsed.data, { form: { id: FORM_ID }, n: 1 });
    assert.ok(Date.parse(parsed.createdAt));
  });

  test("no secret means no signature header", async () => {
    await queue(formWith(), { hook: { id: "h1", url: URL_A } });
    assert.equal("X-Geiger-Signature" in world.outbound.requests[0].headers, false);
  });

  test("every retry signs its own body and keeps the delivery id", async () => {
    statuses({ status: 500 }, { status: 500 }, { status: 200 });
    await queue();
    const { requests } = world.outbound;
    assert.equal(requests.length, 3);
    assert.equal(new Set(requests.map((r) => r.headers["X-Geiger-Delivery"])).size, 1);
    for (const { headers, body } of requests) assert.equal(headers["X-Geiger-Signature"], hmac("whsec_1", body));
  });

  test("the secret is never stored in the delivery log", async () => {
    await queue();
    assert.equal(JSON.stringify(onlyDelivery()).includes("whsec_1"), false);
  });
});

describe("first delivery and quick retries", () => {
  test("success on the first try records one delivered attempt and no sleep", async () => {
    await queue();
    const row = onlyDelivery();
    assert.equal(row.state, "delivered");
    assert.equal(row.ok, true);
    assert.equal(row.status_code, 200);
    assert.equal(row.error, null);
    assert.equal(row.next_retry_at, null);
    assert.equal(row.response_id, "r1");
    assert.equal(row.webhook_id, "h1");
    assert.deepEqual(row.attempts.map((a) => a.n), [1]);
    assert.deepEqual(world.sleeps, []);
  });

  test("any 2xx counts as delivered", async () => {
    statuses({ status: 204 });
    await queue();
    assert.equal(onlyDelivery().state, "delivered");
  });

  test("transient failures retry in process after 2s and 8s", async () => {
    statuses({ status: 500 }, { status: 503 }, { status: 200 });
    await queue();
    const row = onlyDelivery();
    assert.equal(row.state, "delivered");
    assert.equal(row.attempt_count, 3);
    assert.deepEqual(row.attempts.map((a) => [a.n, a.status]), [[1, 500], [2, 503], [3, 200]]);
    assert.deepEqual(world.sleeps, [2000, 8000]);
  });

  test("three transient failures leave it for the sweep in 5 minutes", async () => {
    statuses({ status: 500 });
    await queue();
    const row = onlyDelivery();
    assert.equal(world.outbound.requests.length, 3);
    assert.equal(row.state, "retrying");
    assert.equal(row.attempt_count, 3);
    assertAbout(delayOf(row), 5 * MINUTE);
  });

  test("a permanent failure stops at once", async () => {
    statuses({ status: 404 });
    await queue();
    const row = onlyDelivery();
    assert.equal(world.outbound.requests.length, 1);
    assert.deepEqual(world.sleeps, []);
    assert.equal(row.state, "failed");
    assert.equal(row.ok, false);
    assert.equal(row.status_code, 404);
    assert.equal(row.error, "HTTP 404");
    assert.equal(row.next_retry_at, null);
  });

  test("a socket error is transient and its details stay private", async () => {
    statuses({ error: new Error("connect ECONNREFUSED 10.0.0.5:5432") });
    await queue();
    const row = onlyDelivery();
    assert.equal(row.state, "retrying");
    assert.equal(row.status_code, null);
    assert.equal(row.error, "Couldn't reach the endpoint");
    assert.equal(JSON.stringify(row).includes("10.0.0.5"), false);
  });

  test("a timeout is transient and says so", async () => {
    statuses({ error: Object.assign(new Error("aborted"), { name: "AbortError" }) });
    await queue();
    assert.equal(onlyDelivery().state, "retrying");
    assert.equal(onlyDelivery().error, "Timed out after 8s");
  });

  test("a failure to log the delivery still sends it once", async () => {
    db.failOn("webhook_deliveries", "insert");
    await queue();
    assert.equal(world.outbound.requests.length, 1);
    assert.equal(deliveries().length, 0);
  });

  test("a very long URL is sent whole but logged cut to 2000 characters", async () => {
    const url = `https://hook.test/${"a".repeat(3000)}`;
    await queue(formWith(), { hook: { id: "h1", url }, url });
    assert.equal(world.outbound.requests[0].url, url);
    assert.equal(onlyDelivery().url.length, 2000);
  });

  test("with no database it still sends once", async () => {
    world = resetWorld({ database: false });
    await queue();
    assert.equal(world.outbound.requests.length, 1);
  });

  test("a hook removed between quick retries fails the delivery", async () => {
    statuses({ status: 500 });
    const form = formWith();
    const pending = queue(form);
    form.settings.webhooks = [];
    await pending;
    assert.equal(world.outbound.requests.length, 1);
    assert.equal(onlyDelivery().state, "failed");
    assert.equal(onlyDelivery().error, "Webhook removed from the form");
  });
});

describe("Retry-After", () => {
  test("a short value stretches the quick wait", async () => {
    statuses({ status: 429, headers: { "retry-after": "10" } }, { status: 200 });
    await queue();
    assert.deepEqual(world.sleeps, [10_000]);
    assert.equal(onlyDelivery().state, "delivered");
  });

  test("a value shorter than the quick delay doesn't shorten it", async () => {
    statuses({ status: 429, headers: { "retry-after": "1" } }, { status: 200 });
    await queue();
    assert.deepEqual(world.sleeps, [2000]);
  });

  test("past the quick-wait limit it goes to the sweep without sleeping", async () => {
    statuses({ status: 503, headers: { "retry-after": "31" } });
    await queue();
    assert.deepEqual(world.sleeps, []);
    assert.equal(world.outbound.requests.length, 1);
    assert.equal(onlyDelivery().state, "retrying");
    assertAbout(delayOf(onlyDelivery()), 5 * MINUTE);
  });

  test("a value above the backoff sets the next attempt", async () => {
    statuses({ status: 503, headers: { "retry-after": "7200" } });
    await queue();
    assertAbout(delayOf(onlyDelivery()), 2 * 60 * MINUTE);
  });

  test("it's capped at a day", async () => {
    statuses({ status: 503, headers: { "retry-after": "99999999" } });
    await queue();
    assertAbout(delayOf(onlyDelivery()), DAY);
  });

  test("HTTP dates work", async () => {
    statuses({ status: 503, headers: { "retry-after": new Date(Date.now() + 3 * 3_600_000).toUTCString() } });
    await queue();
    assertAbout(delayOf(onlyDelivery()), 3 * 3_600_000);
  });

  for (const header of ["0", "soon", new Date(Date.now() - DAY).toUTCString()]) {
    test(`${JSON.stringify(header)} is ignored`, async () => {
      statuses({ status: 503, headers: { "retry-after": header } }, { status: 200 });
      await queue();
      assert.deepEqual(world.sleeps, [2000]);
    });
  }

  test("it's ignored on a permanent failure", async () => {
    statuses({ status: 400, headers: { "retry-after": "10" } });
    await queue();
    assert.equal(onlyDelivery().state, "failed");
    assert.deepEqual(world.sleeps, []);
  });
});

describe("failure classification", () => {
  for (const status of [408, 425, 429, 500, 502, 503, 504, 599]) {
    test(`HTTP ${status} is transient`, async () => {
      seedForm();
      seedDelivery();
      statuses({ status });
      await sweep();
      assert.equal(onlyDelivery().state, "retrying");
      assert.equal(onlyDelivery().error, `HTTP ${status}`);
    });
  }

  for (const status of [301, 302, 400, 401, 403, 404, 410, 422]) {
    test(`HTTP ${status} is permanent`, async () => {
      seedForm();
      seedDelivery();
      statuses({ status });
      await sweep();
      assert.equal(onlyDelivery().state, "failed");
      assert.equal(onlyDelivery().next_retry_at, null);
    });
  }
});

describe("backoff and the attempt cap", () => {
  const schedule = [[3, 5], [4, 20], [5, 80], [6, 320], [7, 1280]];
  for (const [attempt, minutes] of schedule) {
    test(`after attempt ${attempt} the next is ${minutes} minutes away`, async () => {
      seedForm();
      seedDelivery({ attemptCount: attempt - 1 });
      statuses({ status: 500 });
      await sweep();
      const row = onlyDelivery();
      assert.equal(row.attempt_count, attempt);
      assert.equal(row.state, "retrying");
      assertAbout(delayOf(row), minutes * MINUTE);
    });
  }

  test("the eighth attempt is the last", async () => {
    seedForm();
    seedDelivery({ attemptCount: 7 });
    statuses({ status: 500 });
    await sweep();
    const row = onlyDelivery();
    assert.equal(row.attempt_count, 8);
    assert.equal(row.state, "failed");
    assert.equal(row.next_retry_at, null);
    await sweep();
    assert.equal(world.outbound.requests.length, 1, "nothing retries it again");
  });

  test("the eighth attempt can still succeed", async () => {
    seedForm();
    seedDelivery({ attemptCount: 7 });
    await sweep();
    assert.equal(onlyDelivery().state, "delivered");
  });

  test("a whole lifetime is exactly 8 sends", async () => {
    seedForm();
    statuses({ status: 500 });
    await queue(formWith());
    for (let i = 0; i < 10; i += 1) {
      for (const row of deliveries()) if (row.next_retry_at) row.next_retry_at = PAST;
      await sweep();
    }
    assert.equal(world.outbound.requests.length, 8);
    assert.equal(onlyDelivery().state, "failed");
    assert.deepEqual(onlyDelivery().attempts.map((a) => a.n), [1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe("sweepWebhooks", () => {
  test("no database returns null", async () => {
    world = resetWorld({ database: false });
    assert.equal(await sweep(), null);
  });

  test("only due deliveries in the retrying state run, and the count is returned", async () => {
    seedForm();
    seedDelivery();
    seedDelivery({ next_retry_at: new Date(Date.now() + DAY).toISOString() });
    seedDelivery({ state: "failed", next_retry_at: null });
    seedDelivery({ state: "delivered", next_retry_at: null });
    statuses({ status: 200 }, { status: 500 });
    assert.deepEqual(await sweep(), { attempted: 1, delivered: 1 });
    assert.equal(world.outbound.requests.length, 1);
  });

  test("it reports attempts that failed", async () => {
    seedForm();
    seedDelivery();
    statuses({ status: 500 });
    assert.deepEqual(await sweep(), { attempted: 1, delivered: 0 });
  });

  test("a zero budget does one batch, a budget works through more", async () => {
    seedForm();
    for (let i = 0; i < 12; i += 1) seedDelivery();
    assert.equal((await sweep()).attempted, 10);
    assert.equal((await sweep({ budgetMs: 60_000 })).attempted, 2);
  });

  test("concurrent sweeps never double-send", async () => {
    seedForm();
    seedDelivery();
    await Promise.all([sweep(), sweep()]);
    assert.equal(world.outbound.requests.length, 1);
    assert.equal(onlyDelivery().attempt_count, 4);
  });

  test("a claimed delivery holds a lease until its attempt is recorded", async () => {
    seedForm();
    seedDelivery();
    let leased = null;
    world.outbound.reply = () => {
      leased = { ...onlyDelivery() };
      return { status: 200 };
    };
    await sweep();
    assert.equal(leased.attempt_count, 4);
    assertAbout(delayOf(leased), 5 * MINUTE, "lease");
  });

  test("a deleted form fails its deliveries without sending", async () => {
    seedDelivery();
    await sweep();
    assert.equal(world.outbound.requests.length, 0);
    assert.equal(onlyDelivery().state, "failed");
    assert.equal(onlyDelivery().error, "Form deleted");
  });

  test("an unreadable form is left for the next sweep", async () => {
    seedForm();
    seedDelivery();
    db.failOn("forms", "select", "boom", 2);
    assert.deepEqual(await sweep(), { attempted: 0, delivered: 0 });
    assert.equal(world.outbound.requests.length, 0);
    assert.equal(onlyDelivery().state, "retrying");
  });

  test("a failed read of the queue ends quietly", async () => {
    db.failOn("webhook_deliveries", "select");
    assert.deepEqual(await sweep(), { attempted: 0, delivered: 0 });
  });

  test("pruning drops old payloads of finished deliveries only", async () => {
    const old = new Date(Date.now() - 31 * DAY).toISOString();
    const finished = seedDelivery({ state: "delivered", next_retry_at: null, created_at: old });
    const stillTrying = seedDelivery({ created_at: old, next_retry_at: new Date(Date.now() + DAY).toISOString() });
    const recent = seedDelivery({ state: "failed", next_retry_at: null });
    await sweep({ prune: true });
    const byId = (id) => deliveries().find((d) => d.id === id);
    assert.equal(byId(finished.id).payload, null);
    assert.ok(byId(stillTrying.id).payload);
    assert.ok(byId(recent.id).payload);
  });

  test("pruning can be skipped", async () => {
    const row = seedDelivery({ state: "delivered", next_retry_at: null, created_at: new Date(Date.now() - 31 * DAY).toISOString() });
    await sweep({ prune: false });
    assert.equal(deliveries().find((d) => d.id === row.id).payload.n, 1);
  });
});

describe("where a stored delivery goes", () => {
  const swept = async (settings, row) => {
    seedForm(settings);
    seedDelivery(row);
    await sweep();
    return onlyDelivery();
  };

  test("a paused hook stops the delivery", async () => {
    const row = await swept({ webhooks: [{ ...HOOK, enabled: false }] });
    assert.equal(world.outbound.requests.length, 0);
    assert.equal(row.state, "failed");
    assert.equal(row.error, "Webhook paused");
  });

  test("a removed hook stops the delivery", async () => {
    const row = await swept({ webhooks: [] });
    assert.equal(world.outbound.requests.length, 0);
    assert.equal(row.error, "Webhook removed from the form");
  });

  test("an edited hook gets its current URL and secret", async () => {
    const row = await swept({ webhooks: [{ id: "h1", url: URL_B, secret: "rotated" }] });
    const [{ url, headers, body }] = world.outbound.requests;
    assert.equal(url, URL_B);
    assert.equal(headers["X-Geiger-Signature"], hmac("rotated", body));
    assert.equal(row.url, URL_B);
  });

  test("an id-less hook matches by URL", async () => {
    const row = await swept({ webhooks: [{ url: URL_A, secret: "legacy" }] }, { webhook_id: null });
    assert.equal(row.state, "delivered");
    assert.equal(world.outbound.requests[0].headers["X-Geiger-Signature"], hmac("legacy", world.outbound.requests[0].body));
  });

  test("an id-less delivery doesn't match a hook that has an id", async () => {
    const row = await swept({ webhooks: [{ id: "h9", url: URL_A }] }, { webhook_id: null });
    assert.equal(row.error, "Webhook removed from the form");
  });

  describe("automations", () => {
    const automation = (extra = {}) => ({ id: "a1", enabled: true, actions: [{ type: "webhook", value: URL_A }], ...extra });
    const row = { webhook_id: "auto:a1" };

    test("an automation's webhook is sent unsigned", async () => {
      const out = await swept({ automations: [automation()] }, row);
      assert.equal(out.state, "delivered");
      assert.equal("X-Geiger-Signature" in world.outbound.requests[0].headers, false);
    });

    const blocked = [
      ["removed", [], "Automation removed from the form"],
      ["paused", [automation({ enabled: false })], "Automation paused"],
      ["pointed elsewhere", [automation({ actions: [{ type: "webhook", value: URL_B }] })], "Automation webhook changed"],
    ];
    for (const [name, automations, error] of blocked) {
      test(`${name} stops the delivery`, async () => {
        const out = await swept({ automations }, row);
        assert.equal(world.outbound.requests.length, 0);
        assert.equal(out.state, "failed");
        assert.equal(out.error, error);
      });
    }

    test("the first send is logged with the automation's ref", async () => {
      await queue(formWith({ automations: [automation()] }), { hook: null, automation: automation(), url: URL_A });
      assert.equal(onlyDelivery().webhook_id, "auto:a1");
      assert.equal("X-Geiger-Signature" in world.outbound.requests[0].headers, false);
    });
  });
});

describe("draining an endpoint", () => {
  test("a success retries that endpoint's other waiting deliveries right away", async () => {
    const waiting = seedDelivery({ next_retry_at: new Date(Date.now() + DAY).toISOString(), attempts: [{ n: 3 }] });
    const other = seedDelivery({ webhook_id: "h2", url: URL_B, next_retry_at: new Date(Date.now() + DAY).toISOString(), attempts: [{ n: 3 }] });
    await queue();
    assert.equal(deliveries().find((d) => d.id === waiting.id).state, "delivered");
    assert.equal(deliveries().find((d) => d.id === other.id).state, "retrying");
    assert.equal(world.outbound.requests.length, 2);
  });

  test("it stops at the first failure", async () => {
    for (let i = 0; i < 3; i += 1) seedDelivery({ next_retry_at: new Date(Date.now() + DAY).toISOString(), attempts: [{ n: 3 }] });
    statuses({ status: 200 }, { status: 500 });
    await queue();
    assert.equal(world.outbound.requests.length, 2);
  });

  test("it leaves deliveries another worker holds", async () => {
    seedDelivery({ next_retry_at: new Date(Date.now() + 60_000).toISOString(), attempts: [{ n: 1 }], attempt_count: 2 });
    await queue();
    assert.equal(world.outbound.requests.length, 1);
  });
});

describe("owner alerts", () => {
  const ownerEmail = "owner@acme.test";
  const notifications = () => db.rows("public.flow_notifications");
  const emails = () => world.fetch.calls.filter((c) => c.url.includes("resend"));

  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test";
    world.fetch.reply = () => Response.json({ id: "email" });
    db.users[OWNER_ID] = { email: ownerEmail };
  });

  test("a final failure pings the owner by bell and email", async () => {
    statuses({ status: 410 });
    await queue();
    assert.equal(notifications().length, 1);
    assert.equal(notifications()[0].user_id, OWNER_ID);
    assert.equal(notifications()[0].type, "webhook_failed");
    assert.equal(emails().length, 1);
    assert.match(emails()[0].init.body, /owner@acme\.test/);
    assert.ok(onlyDelivery().alerted_at);
  });

  test("retrying deliveries don't alert", async () => {
    statuses({ status: 500 });
    await queue();
    assert.equal(notifications().length, 0);
    assert.equal(emails().length, 0);
  });

  test("the same endpoint alerts at most once a day", async () => {
    statuses({ status: 410 });
    await queue();
    await queue();
    assert.equal(deliveries().length, 2);
    assert.equal(notifications().length, 1);
    assert.equal(emails().length, 1);
  });

  test("a different endpoint alerts separately", async () => {
    statuses({ status: 410 });
    await queue();
    await queue(formWith(), { hook: { id: "h2", url: URL_B } });
    assert.equal(notifications().length, 2);
  });

  test("an alert older than a day doesn't silence a new one", async () => {
    seedDelivery({ state: "failed", next_retry_at: null, alerted_at: new Date(Date.now() - 2 * DAY).toISOString() });
    statuses({ status: 410 });
    await queue();
    assert.equal(notifications().length, 1);
  });

  test("a form with no owner alerts nobody", async () => {
    statuses({ status: 410 });
    await queue(formWith({}, { created_by: null }));
    assert.equal(notifications().length, 0);
    assert.equal(emails().length, 0);
  });

  test("an owner with no email still gets the bell", async () => {
    db.users[OWNER_ID] = {};
    statuses({ status: 410 });
    await queue();
    assert.equal(notifications().length, 1);
    assert.equal(emails().length, 0);
  });

  test("a failed replay doesn't alert", async () => {
    const row = seedDelivery({ state: "failed", next_retry_at: null });
    statuses({ status: 410 });
    await replayDelivery(formWith(), row.id);
    assert.equal(notifications().length, 0);
  });
});

describe("replayDelivery", () => {
  const form = () => formWith();
  const failed = (extra = {}) => seedDelivery({ state: "failed", next_retry_at: null, ...extra });

  for (const id of [undefined, "", "not-a-uuid", "x".repeat(36)]) {
    test(`id ${JSON.stringify(id)} is not found`, async () => {
      assert.deepEqual(await replayDelivery(form(), id), { error: "Delivery not found.", status: 404 });
      assert.equal(db.calls.length, 0);
    });
  }

  test("an unknown delivery is not found", async () => {
    assert.equal((await replayDelivery(form(), randomUUID())).status, 404);
  });

  test("another form's delivery is not found", async () => {
    const row = failed({ form_id: "another-form" });
    assert.equal((await replayDelivery(form(), row.id)).status, 404);
    assert.equal(world.outbound.requests.length, 0);
  });

  test("a read error is a 500", async () => {
    const row = failed();
    db.failOn("webhook_deliveries", "select");
    assert.equal((await replayDelivery(form(), row.id)).status, 500);
  });

  test("test deliveries can't be replayed", async () => {
    const out = await replayDelivery(form(), failed({ event: "test" }).id);
    assert.equal(out.status, 400);
    assert.match(out.error, /Test deliveries/);
  });

  test("a pruned payload can't be replayed", async () => {
    const out = await replayDelivery(form(), failed({ payload: null }).id);
    assert.equal(out.status, 409);
    assert.match(out.error, /no longer stored/);
    assert.equal(world.outbound.requests.length, 0);
  });

  test("a delivery in flight can't be replayed", async () => {
    const row = seedDelivery({ attemptCount: 3, attempts: [{ n: 2 }], next_retry_at: new Date(Date.now() + MINUTE).toISOString() });
    const out = await replayDelivery(form(), row.id);
    assert.equal(out.status, 409);
    assert.match(out.error, /being retried/);
    assert.equal(world.outbound.requests.length, 0);
  });

  test("an expired lease means the worker died, so it can be replayed", async () => {
    const row = seedDelivery({ attemptCount: 3, attempts: [{ n: 2 }], next_retry_at: PAST });
    assert.ok((await replayDelivery(form(), row.id)).delivery);
  });

  test("losing the claim to another worker is a 409 and sends nothing", async () => {
    const row = failed();
    db.beforeExecute = (call) => {
      if (call.op === "update" && call.payload?.attempt_count) deliveries()[0].attempt_count += 1;
    };
    const out = await replayDelivery(form(), row.id);
    assert.equal(out.status, 409);
    assert.equal(world.outbound.requests.length, 0);
  });

  const unreachable = [
    ["paused", { webhooks: [{ ...HOOK, enabled: false }] }, "Can't replay: webhook paused."],
    ["removed", { webhooks: [] }, "Can't replay: webhook removed from the form."],
  ];
  for (const [name, settings, message] of unreachable) {
    test(`a ${name} hook explains itself and leaves the row untouched`, async () => {
      const row = failed({ error: "HTTP 500" });
      assert.deepEqual(await replayDelivery(formWith(settings), row.id), { error: message, status: 409 });
      assert.equal(onlyDelivery().error, "HTTP 500");
      assert.equal(onlyDelivery().attempt_count, row.attempt_count);
    });
  }

  test("a success keeps the delivery id, re-signs and marks the attempt", async () => {
    const row = failed();
    const out = await replayDelivery(form(), row.id);
    assert.equal(out.delivery.id, row.id);
    assert.equal(out.delivery.state, "delivered");
    assert.equal(out.delivery.ok, true);
    assert.equal(out.delivery.attemptCount, row.attempt_count + 1);
    assert.equal(out.delivery.attempts.at(-1).replay, true);
    const [{ headers, body }] = world.outbound.requests;
    assert.equal(headers["X-Geiger-Delivery"], row.id);
    assert.equal(headers["X-Geiger-Signature"], hmac("whsec_1", body));
    assert.deepEqual(JSON.parse(body).data, row.payload);
    assert.equal("payload" in out.delivery, false, "the payload stays server-side");
  });

  test("a delivered one can be sent again", async () => {
    const row = failed({ state: "delivered" });
    assert.equal((await replayDelivery(form(), row.id)).delivery.state, "delivered");
    assert.equal(world.outbound.requests.length, 1);
  });

  test("a transient failure goes back to retrying", async () => {
    const row = failed();
    statuses({ status: 503 });
    const out = await replayDelivery(form(), row.id);
    assert.equal(out.delivery.state, "retrying");
    assert.ok(out.delivery.nextRetryAt);
  });

  test("a permanent failure stays failed", async () => {
    const row = failed();
    statuses({ status: 404 });
    assert.equal((await replayDelivery(form(), row.id)).delivery.state, "failed");
  });

  test("an exhausted delivery that fails again stays failed", async () => {
    const row = failed({ attemptCount: 8 });
    statuses({ status: 503 });
    const out = await replayDelivery(form(), row.id);
    assert.equal(out.delivery.attemptCount, 9);
    assert.equal(out.delivery.state, "failed");
    assert.equal(out.delivery.nextRetryAt, null);
  });

  test("the attempt log keeps only the newest 25", async () => {
    const row = failed({ attemptCount: 25 });
    const out = await replayDelivery(form(), row.id);
    assert.equal(out.delivery.attempts.length, 25);
    assert.equal(out.delivery.attempts.at(-1).n, 26);
    assert.equal(out.delivery.attempts[0].n, 2);
  });

});

describe("outbound safety", () => {
  const unsafe = [
    "http://localhost/",
    "http://LOCALHOST/",
    "http://foo.localhost/",
    "http://foo.local/",
    "http://foo.internal/",
    "http://foo.internal./",
    "http://127.0.0.1/",
    "http://127.1/",
    "http://2130706433/",
    "http://0x7f.0.0.1/",
    "http://0.0.0.0/",
    "http://10.1.2.3/",
    "http://172.16.0.1/",
    "http://172.31.255.255/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://100.64.0.1/",
    "http://[::1]/",
    "http://[::]/",
    "http://[::ffff:127.0.0.1]/",
    "http://[::ffff:10.0.0.1]/",
    "http://[fe80::1]/",
    "http://[fc00::1]/",
    "ftp://example.com/",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "not a url",
    "",
  ];
  for (const url of unsafe) {
    test(`${JSON.stringify(url)} is refused without a request`, async () => {
      assert.equal(isSafeOutboundUrl(url), false);
      const out = await sendTestWebhook({ form: formWith(), url, secret: "s", payload: {} });
      assert.equal(out.ok, false);
      assert.equal(out.status, 0);
      assert.equal(out.transient, false);
      assert.equal(out.error, "Blocked or invalid URL");
      assert.equal(world.outbound.requests.length, 0);
    });
  }

  for (const url of ["https://example.com/hook", "http://example.com:8080/a?b=c", "https://8.8.8.8/", "http://172.32.0.1/", "http://[2606:4700:4700::1111]/"]) {
    test(`${url} is allowed`, () => {
      assert.equal(isSafeOutboundUrl(url), true);
    });
  }

  test("a blocked target is a permanent failure, not a retry", async () => {
    await queue(formWith(), { hook: { id: "h1", url: "http://127.0.0.1/" }, url: "http://127.0.0.1/" });
    assert.equal(onlyDelivery().state, "failed");
    assert.equal(onlyDelivery().error, "Blocked or invalid URL");
    assert.deepEqual(world.sleeps, []);
  });

  for (const addresses of [["10.0.0.1"], ["93.184.216.34", "169.254.169.254"], ["::1"], []]) {
    test(`a name resolving to ${JSON.stringify(addresses)} is blocked at connect time`, async () => {
      world.dns["rebind.test"] = addresses;
      const url = "https://rebind.test/";
      await queue(formWith(), { hook: { id: "h1", url }, url });
      assert.equal(world.outbound.requests.length, 0);
      assert.equal(onlyDelivery().state, "failed");
      assert.equal(onlyDelivery().error, "Blocked or invalid URL");
    });
  }

  test("a name resolving to public addresses connects", async () => {
    world.dns["public.test"] = ["93.184.216.34", "2606:4700:4700::1111"];
    const url = "https://public.test/";
    await queue(formWith(), { hook: { id: "h1", url }, url });
    assert.equal(world.outbound.requests.length, 1);
    assert.equal(onlyDelivery().state, "delivered");
  });
});

describe("dispatch and queueing", () => {
  const event = "response.created";

  test("fans out to enabled, subscribed hooks only", async () => {
    const hooks = [
      { id: "all", url: "https://a.test/" },
      { id: "empty", url: "https://b.test/", events: [] },
      { id: "match", url: "https://c.test/", events: [event] },
      { id: "other", url: "https://d.test/", events: ["response.updated"] },
      { id: "off", url: "https://e.test/", enabled: false },
      { id: "nourl" },
      null,
    ];
    await dispatchEvent(makeForm({ settings: { webhooks: hooks } }), event, { x: 1 }, "r1");
    await flushAfter();
    assert.deepEqual(world.outbound.requests.map((r) => r.url).sort(), ["https://a.test/", "https://b.test/", "https://c.test/"]);
  });

  test("no hooks, no work", async () => {
    await dispatchEvent(makeForm(), event, {}, "r1");
    await flushAfter();
    assert.equal(world.outbound.requests.length, 0);
    assert.equal(deliveries().length, 0);
  });

  test("queueing defers everything until after the response", async () => {
    await queueWebhook({ form: formWith(), hook: HOOK, event, payload: {}, responseId: "r1" });
    assert.equal(world.outbound.requests.length, 0);
    assert.ok(pendingAfter() >= 1);
    await flushAfter();
    assert.equal(world.outbound.requests.length, 1);
  });

  test("a crashing delivery is contained and logged", async () => {
    db.beforeExecute = () => {
      throw new Error("db exploded");
    };
    await queue();
    assert.ok(world.logs.some(([level, tag]) => level === "error" && tag === "[webhooks.deliver]"));
  });

  describe("traffic-triggered sweeps", () => {
    afterEach(() => mock.timers.reset());

    test("webhook traffic sweeps due retries at most every five minutes", async () => {
      mock.timers.enable({ apis: ["Date"], now: Date.now() + 60 * MINUTE });
      const form = formWith();
      const send = () => queueWebhook({ form, hook: HOOK, event, payload: {}, responseId: "r1" });
      await send();
      assert.equal(pendingAfter(), 2, "the delivery plus one sweep");
      await send();
      assert.equal(pendingAfter(), 3, "only the delivery");
      mock.timers.tick(5 * MINUTE);
      await send();
      assert.equal(pendingAfter(), 5, "the window passed, so another sweep");
    });
  });
});

describe("sendTestWebhook", () => {
  test("a success is signed, logged and final", async () => {
    const out = await sendTestWebhook({ form: formWith(), url: URL_A, secret: "s", payload: { hello: 1 } });
    assert.equal(out.ok, true);
    const [{ headers, body }] = world.outbound.requests;
    assert.equal(headers["X-Geiger-Event"], "test");
    assert.equal(headers["X-Geiger-Signature"], hmac("s", body));
    const row = onlyDelivery();
    assert.equal(row.event, "test");
    assert.equal(row.state, "delivered");
    assert.equal(row.attempt_count, 1);
  });

  test("a transient failure is never retried", async () => {
    statuses({ status: 503 });
    const out = await sendTestWebhook({ form: formWith(), url: URL_A, payload: {} });
    assert.equal(out.ok, false);
    assert.equal(out.status, 503);
    const row = onlyDelivery();
    assert.equal(row.state, "failed");
    assert.equal(row.next_retry_at, null);
    assert.deepEqual(world.sleeps, []);
    await sweep();
    assert.equal(world.outbound.requests.length, 1);
  });

  test("a failed log line doesn't hide the result", async () => {
    db.failOn("webhook_deliveries", "insert");
    assert.equal((await sendTestWebhook({ form: formWith(), url: URL_A, payload: {} })).ok, true);
  });

  test("it isn't replayable", async () => {
    await sendTestWebhook({ form: formWith(), url: URL_A, payload: {} });
    assert.equal((await replayDelivery(formWith(), onlyDelivery().id)).status, 400);
    const [listed] = await listDeliveries(FORM_ID);
    assert.equal(listed.replayable, false);
  });
});

describe("listDeliveries", () => {
  test("newest first, this form only, in view-model shape", async () => {
    const older = seedDelivery({ created_at: "2026-01-01T00:00:00.000Z" });
    const newer = seedDelivery({ created_at: "2026-02-01T00:00:00.000Z" });
    seedDelivery({ form_id: "another-form" });
    const list = await listDeliveries(FORM_ID);
    assert.deepEqual(list.map((d) => d.id), [newer.id, older.id]);
    const [first] = list;
    assert.equal(first.responseId, "r1");
    assert.equal(first.attemptCount, 3);
    assert.equal(first.replayable, true);
    assert.equal("payload" in first, false);
    assert.equal("webhook_id" in first, false);
  });

  test("a pruned payload isn't replayable", async () => {
    seedDelivery({ payload: null });
    assert.equal((await listDeliveries(FORM_ID))[0].replayable, false);
  });

  test("the limit applies and an error is null", async () => {
    seedDelivery();
    seedDelivery();
    assert.equal((await listDeliveries(FORM_ID, 1)).length, 1);
    db.failOn("webhook_deliveries", "select");
    assert.equal(await listDeliveries(FORM_ID), null);
  });
});

describe("postSlack", () => {
  test("only Slack's own webhook host is allowed", async () => {
    for (const url of [undefined, "", "https://evil.test/hooks.slack.com/", "http://hooks.slack.com/x", "https://hooks.slack.com.evil.test/x"]) {
      assert.deepEqual(await postSlack(url, "hi"), { ok: false });
    }
    assert.equal(world.fetch.calls.length, 0);
  });

  test("it posts the text and reports the result", async () => {
    world.fetch.reply = () => new Response("ok");
    assert.deepEqual(await postSlack("https://hooks.slack.com/services/x", "hi"), { ok: true });
    assert.deepEqual(JSON.parse(world.fetch.calls[0].init.body), { text: "hi" });
    world.fetch.reply = () => new Response("no", { status: 500 });
    assert.deepEqual(await postSlack("https://hooks.slack.com/services/x", "hi"), { ok: false });
  });

  test("a network failure is contained", async () => {
    assert.deepEqual(await postSlack("https://hooks.slack.com/services/x", "hi"), { ok: false });
  });
});

describe("responsePayload", () => {
  const form = makeForm({ fields: [field("q")] });
  const row = {
    id: "r1",
    status: "Complete",
    priority: "Low",
    score: 5,
    outcome: "Pass",
    respondent_name: "Ada",
    respondent_email: "a@b.co",
    submitted_at: "2026-01-01T00:00:00.000Z",
    metadata: { ipHash: "secret-hash", userAgent: "UA" },
    edit_token: "secret-edit-token",
  };

  test("it carries the public shape, with the answers the caller passes", () => {
    assert.deepEqual(responsePayload(form, row, { q: "masked" }), {
      form: { id: FORM_ID, slug: "demo", title: "Demo" },
      response: {
        id: "r1",
        status: "Complete",
        priority: "Low",
        score: 5,
        outcome: "Pass",
        tags: [],
        respondent: { name: "Ada", email: "a@b.co" },
        answers: { q: "masked" },
        approval: {},
        payment: null,
        submittedAt: "2026-01-01T00:00:00.000Z",
        editedAt: null,
      },
    });
  });

  test("internals never reach the payload", () => {
    const text = JSON.stringify(responsePayload(form, row, {}));
    assert.equal(text.includes("secret-hash"), false);
    assert.equal(text.includes("secret-edit-token"), false);
  });

  test("payment is summarised with a numeric amount", () => {
    const { response } = responsePayload(form, { ...row, payment_status: "paid", payment_amount: "12.50", payment_currency: "usd", payment_ref: "pi_1" }, {});
    assert.deepEqual(response.payment, { status: "paid", amount: 12.5, currency: "usd" });
  });
});
