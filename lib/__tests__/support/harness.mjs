// Test world for server code: fake Supabase, recorded outbound HTTP/fetch, instant sleeps and a clean env, with no route to a real network.
import dns from "node:dns";
import { EventEmitter } from "node:events";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import { isIP } from "node:net";
import timersPromises from "node:timers/promises";
import { FakeSupabase } from "./fake_supabase.mjs";
import { testState } from "./stubs/state.mjs";

const MANAGED_ENV = [
  "CRON_SECRET",
  "FORMS_EMAIL_FROM",
  "FORMS_ENCRYPTION_KEY",
  "FORMS_LINK_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "TURNSTILE_SECRET_KEY",
];

let world = null;

// Fake for node:http(s).request: resolves through the caller's guarded lookup, then answers from outbound.reply.
function fakeRequest(url, options, onResponse) {
  const req = new EventEmitter();
  req.end = (body) => {
    const host = new URL(String(url)).hostname.replace(/^\[|\]$/g, "");
    const connect = (error) => {
      if (error) return req.emit("error", error);
      const record = { url: String(url), method: options.method, headers: options.headers, body };
      world.outbound.requests.push(record);
      const answer = world.outbound.reply(record, world.outbound.requests.length) ?? { status: 200 };
      if (answer.error) return req.emit("error", answer.error);
      onResponse({ statusCode: answer.status, headers: answer.headers ?? {}, destroy() {} });
    };
    if (isIP(host)) connect();
    else options.lookup(host, {}, (error) => connect(error));
  };
  return req;
}

function installBuiltinFakes() {
  http.request = fakeRequest;
  https.request = fakeRequest;
  dns.lookup = (host, options, callback) => {
    const addresses = world.dns[host] ?? ["93.184.216.34"];
    callback(null, addresses.map((address) => ({ address, family: isIP(address) })));
  };
  timersPromises.setTimeout = async (ms) => {
    world.sleeps.push(ms);
  };
  syncBuiltinESMExports();
}

// Installs a fresh world; call from beforeEach and use the returned handles.
export function resetWorld({ database = true } = {}) {
  for (const name of MANAGED_ENV) delete process.env[name];
  if (database) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://fake.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
  } else {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
  const db = new FakeSupabase();
  testState.supabase = db;
  testState.after.length = 0;
  testState.cookies.clear();
  world = {
    db,
    cookies: testState.cookies,
    dns: {},
    sleeps: [],
    logs: [],
    outbound: { requests: [], reply: () => ({ status: 200 }) },
    fetch: { calls: [], reply: null },
  };
  globalThis.fetch = async (url, init = {}) => {
    world.fetch.calls.push({ url: String(url), init });
    if (!world.fetch.reply) throw new Error(`Network is disabled in tests: ${url}`);
    return world.fetch.reply(String(url), init);
  };
  for (const level of ["error", "info", "warn"]) console[level] = (...args) => world.logs.push([level, ...args]);
  installBuiltinFakes();
  return world;
}

// Runs everything queued through next/server's after(), including work those callbacks queue.
export async function flushAfter() {
  while (testState.after.length) await testState.after.shift()();
}

export const pendingAfter = () => testState.after.length;
