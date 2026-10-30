// Typeform API client against a stubbed fetch: no network. Covers the host/id guards, token handling, timeouts and size caps.
import assert from "node:assert/strict";
import { test } from "node:test";

import { TYPEFORM_LIMITS, TypeformError, fetchTypeformDefinition, fetchTypeformForm, themeIdFromHref } from "./typeform";

const TOKEN = "tfp_supersecret_token123";
const respond = (body, init = {}) => new Response(typeof body === "string" ? body : JSON.stringify(body), { status: 200, ...init });

function stub(handler) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return handler(url, options);
  };
  return { calls, fetchImpl };
}

const assertSafe = (e) => {
  assert.ok(e instanceof TypeformError, String(e));
  assert.ok(!JSON.stringify({ message: e.message, code: e.code, stack: e.stack }).includes(TOKEN));
  return true;
};

test("only ever calls api.typeform.com, with the token as a bearer header and redirects refused", async () => {
  const { calls, fetchImpl } = stub(() => respond({ id: "abc123", fields: [] }));
  await fetchTypeformForm("abc123", TOKEN, { fetchImpl });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.typeform.com/forms/abc123");
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(calls[0].options.redirect, "error");
  assert.ok(!calls[0].url.includes(TOKEN));
  assert.ok(calls[0].options.signal);
});

test("ids that aren't strictly alphanumeric never reach fetch", async () => {
  const { calls, fetchImpl } = stub(() => respond({}));
  for (const id of ["../admin", "abc/def", "abc?x=1", "abc#x", "ab", "", null, "%2e%2e", "abc\r\nHost: evil"]) {
    await assert.rejects(fetchTypeformForm(id, TOKEN, { fetchImpl }), (e) => assertSafe(e) && e.code === "bad_id");
  }
  assert.equal(calls.length, 0);
});

test("upstream failures map to fixed messages that never echo the token or upstream body", async () => {
  const cases = [[401, "bad_token"], [403, "bad_token"], [404, "not_found"], [429, "rate_limited"], [500, "typeform"], [503, "typeform"]];
  for (const [status, code] of cases) {
    const { fetchImpl } = stub(() => respond(`{"description":"token ${TOKEN} is bad"}`, { status }));
    await assert.rejects(fetchTypeformForm("abc123", TOKEN, { fetchImpl }), (e) => assertSafe(e) && e.code === code && !e.message.includes("is bad"));
  }
});

test("network errors that quote the token don't leak it", async () => {
  const fetchImpl = async () => {
    throw new Error(`connect failed for Bearer ${TOKEN}`);
  };
  await assert.rejects(fetchTypeformForm("abc123", TOKEN, { fetchImpl }), (e) => assertSafe(e) && e.code === "unreachable" && e.cause === undefined);
});

test("slow responses time out", async () => {
  const fetchImpl = (url, { signal }) => new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason)));
  await assert.rejects(fetchTypeformForm("abc123", TOKEN, { fetchImpl, timeoutMs: 20 }), (e) => assertSafe(e) && e.code === "timeout");
  assert.equal(TYPEFORM_LIMITS.timeoutMs, 10_000);
});

test("oversized responses are cut off, by declared length and while streaming", async () => {
  const declared = stub(() => respond("{}", { headers: { "content-length": String(10 ** 9) } }));
  await assert.rejects(fetchTypeformForm("abc123", TOKEN, { fetchImpl: declared.fetchImpl }), (e) => e.code === "too_large");

  let cancelled = false;
  let sent = 0;
  const body = new ReadableStream({
    pull(controller) {
      sent += 1024;
      controller.enqueue(new Uint8Array(1024));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(fetchTypeformForm("abc123", TOKEN, { fetchImpl: async () => new Response(body), maxBytes: 4096 }), (e) => e.code === "too_large");
  assert.ok(cancelled);
  assert.ok(sent < 64 * 1024);
});

test("non-JSON bodies fail cleanly", async () => {
  const { fetchImpl } = stub(() => respond("<html>"));
  await assert.rejects(fetchTypeformForm("abc123", TOKEN, { fetchImpl }), assertSafe);
});

test("the theme is fetched only from a validated API href", async () => {
  assert.equal(themeIdFromHref("https://api.typeform.com/themes/qHWOQ7"), "qHWOQ7");
  for (const href of ["https://evil.test/themes/qHWOQ7", "http://api.typeform.com/themes/abc", "https://api.typeform.com.evil.test/themes/abc", "https://api.typeform.com/themes/../forms", "https://api.typeform.com/themes/a/b", "https://user:pw@evil.test/themes/abc", null, ""]) {
    assert.equal(themeIdFromHref(href), null, String(href));
  }

  const evil = stub(() => respond({ id: "abc123", theme: { href: "https://evil.test/themes/abc" } }));
  await fetchTypeformDefinition("abc123", TOKEN, { fetchImpl: evil.fetchImpl });
  assert.equal(evil.calls.length, 1);

  const good = stub((url) => respond(url.includes("/themes/") ? { colors: { button: "#111111" } } : { id: "abc123", theme: { href: "https://api.typeform.com/themes/qHWOQ7" } }));
  const merged = await fetchTypeformDefinition("abc123", TOKEN, { fetchImpl: good.fetchImpl });
  assert.equal(good.calls[1].url, "https://api.typeform.com/themes/qHWOQ7");
  assert.equal(merged.theme.colors.button, "#111111");
});

test("a theme the token can't read doesn't fail the import", async () => {
  const { fetchImpl } = stub((url) => (url.includes("/themes/") ? respond("", { status: 403 }) : respond({ id: "abc123", theme: { href: "https://api.typeform.com/themes/qHWOQ7" } })));
  const definition = await fetchTypeformDefinition("abc123", TOKEN, { fetchImpl });
  assert.equal(definition.theme.href, "https://api.typeform.com/themes/qHWOQ7");
});
