import test, { afterEach, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";

import { capturePayPalOrder, captureMatches, createPayPalOrder, isPayPalConfigured, paypalAmount, verifyPayPalWebhook } from "../paypal.js";

const realFetch = globalThis.fetch;
const ENV = ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_ENV", "PAYPAL_WEBHOOK_ID"];
let calls;
let replies;

const reply = (status, body) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  calls = [];
  replies = [];
  process.env.PAYPAL_CLIENT_ID = "id";
  process.env.PAYPAL_CLIENT_SECRET = "secret";
  delete process.env.PAYPAL_ENV;
  process.env.PAYPAL_WEBHOOK_ID = "wh";
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith("/v1/oauth2/token")) return reply(200, { access_token: "tok" });
    calls.push({ url: String(url), init, body: init.body ? JSON.parse(init.body) : undefined });
    return replies.shift() || reply(500, {});
  };
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const key of ENV) delete process.env[key];
});

const order = { total: 12.5, currency: "usd" };
const args = { order, form: { title: "T" }, responseId: "r1", returnUrl: "https://x/return", cancelUrl: "https://x/cancel" };
const row = { id: "r1", payment_amount: 12.5, payment_currency: "usd" };
const capture = { status: "COMPLETED", customId: "r1", amount: "12.50", currency: "USD" };

describe("PayPal", () => {
  test("needs both credentials", () => {
    assert.equal(isPayPalConfigured(), true);
    delete process.env.PAYPAL_CLIENT_SECRET;
    assert.equal(isPayPalConfigured(), false);
  });

  test("defaults to the sandbox unless live is asked for", async () => {
    replies.push(reply(201, { id: "o", links: [{ rel: "payer-action", href: "https://pp/o" }] }));
    await createPayPalOrder(args);
    assert.ok(calls[0].url.startsWith("https://api-m.sandbox.paypal.com/"));
    process.env.PAYPAL_ENV = "live";
    replies.push(reply(201, { id: "o", links: [{ rel: "payer-action", href: "https://pp/o" }] }));
    await createPayPalOrder(args);
    assert.ok(calls[1].url.startsWith("https://api-m.paypal.com/"));
  });

  test("an order carries the response id, the server's total and the return URLs", async () => {
    replies.push(reply(201, { id: "o1", links: [{ rel: "self", href: "x" }, { rel: "payer-action", href: "https://pp/o1" }] }));
    assert.deepEqual(await createPayPalOrder(args), { id: "o1", url: "https://pp/o1" });
    const unit = calls[0].body.purchase_units[0];
    assert.equal(unit.custom_id, "r1");
    assert.deepEqual(unit.amount, { currency_code: "USD", value: "12.50" });
    assert.equal(calls[0].body.payment_source.paypal.experience_context.return_url, "https://x/return");
    assert.equal(calls[0].init.headers["PayPal-Request-Id"], "order-r1");
  });

  test("a failed order or a missing approval link returns null", async () => {
    replies.push(reply(422, { name: "UNPROCESSABLE_ENTITY" }));
    assert.equal(await createPayPalOrder(args), null);
    replies.push(reply(201, { id: "o", links: [] }));
    assert.equal(await createPayPalOrder(args), null);
  });

  test("zero-decimal currencies send whole amounts", () => {
    assert.equal(paypalAmount(1000, "jpy"), "1000");
    assert.equal(paypalAmount(10, "usd"), "10.00");
  });

  test("a capture reports its status and amounts", async () => {
    replies.push(reply(201, { status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "c", status: "COMPLETED", custom_id: "r1", amount: { value: "12.50", currency_code: "USD" } }] } }] }));
    assert.deepEqual(await capturePayPalOrder("o1"), { status: "COMPLETED", customId: "r1", amount: "12.50", currency: "USD", captureId: "c" });
  });

  test("an order captured earlier is read back rather than failing", async () => {
    replies.push(reply(422, { details: [{ issue: "ORDER_ALREADY_CAPTURED" }] }));
    replies.push(reply(200, { status: "COMPLETED", purchase_units: [{ custom_id: "r1", amount: { value: "12.50", currency_code: "USD" } }] }));
    const out = await capturePayPalOrder("o1");
    assert.equal(out.status, "COMPLETED");
    assert.equal(calls[1].init.method, "GET");
  });

  test("other capture failures return null", async () => {
    replies.push(reply(422, { details: [{ issue: "INSTRUMENT_DECLINED" }] }));
    assert.equal(await capturePayPalOrder("o1"), null);
  });

  test("a capture must match the response, its amount and its currency", () => {
    assert.equal(captureMatches(capture, row), true);
    assert.equal(captureMatches({ ...capture, status: "PENDING" }, row), false);
    assert.equal(captureMatches({ ...capture, customId: "other" }, row), false);
    assert.equal(captureMatches({ ...capture, amount: "0.01" }, row), false);
    assert.equal(captureMatches({ ...capture, currency: "EUR" }, row), false);
    assert.equal(captureMatches(null, row), false);
  });

  test("a webhook counts only when PayPal confirms the signature", async () => {
    const headers = new Headers({ "paypal-transmission-id": "t" });
    replies.push(reply(200, { verification_status: "SUCCESS" }));
    assert.equal(await verifyPayPalWebhook(headers, { id: "e" }), true);
    assert.equal(calls[0].body.webhook_id, "wh");
    replies.push(reply(200, { verification_status: "FAILURE" }));
    assert.equal(await verifyPayPalWebhook(headers, { id: "e" }), false);
    delete process.env.PAYPAL_WEBHOOK_ID;
    assert.equal(await verifyPayPalWebhook(headers, { id: "e" }), false);
  });
});
