// Import route end to end on the fake Supabase with a stubbed fetch: permissions, project scope, token handling, Draft status and sanitising.
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { resetWorld } from "@/lib/__tests__/support/harness";
import { OTHER_PROJECT_ID, PROJECT_ID } from "@/lib/__tests__/support/forms";
import { exportFormJson } from "@/lib/forms/import/generic";
import { POST } from "./route.js";

const USER_ID = "99999999-9999-4999-8999-999999999999";
const TOKEN = "tfp_supersecret_token123";

const DEFINITION = {
  id: "abc123",
  title: "<b>Survey</b>",
  fields: [{ ref: "a", type: "short_text", title: "Name" }, { ref: "b", type: "website", title: "Site", attachment: { type: "image", href: "javascript:alert(1)" } }],
};

let world;

// @supabase/ssr is real here, so the session cookie, auth check and RBAC RPC all travel over the stubbed fetch.
let allowed;
let typeform;
const typeformCalls = () => world.fetch.calls.filter((c) => c.url.includes("typeform.com"));

function installNetwork() {
  allowed = () => true;
  typeform = null;
  world.fetch.reply = async (url, init) => {
    if (url.includes("/auth/v1/user")) return Response.json({ id: USER_ID, email: "me@acme.test", aud: "authenticated", user_metadata: {} });
    if (url.includes("/rpc/rbac_allows")) return Response.json(allowed(JSON.parse(init.body)));
    if (url.includes("typeform.com") && typeform) return typeform(url, init);
    throw new Error("Unexpected request");
  };
}

function signIn() {
  const session = { access_token: "header.payload.signature", refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: USER_ID } };
  world.cookies.set("sb-fake-auth-token", JSON.stringify(session));
}

const post = (body) => POST(new Request("https://app.test/api/forms/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
const read = async (res) => ({ status: res.status, body: await res.json(), cache: res.headers.get("cache-control") });
const typeformBody = (extra = {}) => ({ projectId: PROJECT_ID, source: "typeform", form: "https://acme.typeform.com/to/abc123", token: TOKEN, ...extra });

function allowTypeform(definition = DEFINITION) {
  typeform = async () => new Response(JSON.stringify(definition), { status: 200 });
}

const everywhere = (value) => JSON.stringify(value).includes(TOKEN);

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon";
  world = resetWorld();
  installNetwork();
  signIn();
});

test("requires a signed-in user", async () => {
  world.cookies.clear();
  allowTypeform();
  const { status } = await read(await post(typeformBody()));
  assert.equal(status, 401);
  assert.equal(typeformCalls().length, 0);
});

test("checks forms.form.edit in the requested project before touching Typeform", async () => {
  const asked = [];
  allowed = (args) => {
    asked.push(args);
    return args.p_project === PROJECT_ID;
  };
  allowTypeform();
  const { status } = await read(await post(typeformBody({ projectId: OTHER_PROJECT_ID })));
  assert.equal(status, 403);
  assert.equal(typeformCalls().length, 0);
  assert.equal(asked[0].p_permission, "forms.form.edit");
  assert.equal(asked[0].p_project, OTHER_PROJECT_ID);

  assert.equal((await read(await post(typeformBody()))).status, 200);
});

test("rejects a missing or malformed project id", async () => {
  for (const projectId of [undefined, "", "nope", "../x"]) {
    const { status } = await read(await post(typeformBody({ projectId })));
    assert.equal(status, 400);
  }
});

test("preview returns the mapped draft, creates nothing, and never echoes or logs the token", async () => {
  allowTypeform();
  const res = await read(await post(typeformBody()));
  assert.equal(res.status, 200);
  assert.equal(res.cache, "no-store");
  assert.equal(res.body.form.status, "Draft");
  assert.equal(res.body.form.title, "Survey");
  assert.equal(res.body.stats.fieldCount, 2);
  assert.ok(res.body.warnings.some((w) => /attachment/.test(w.message) && w.field === "Site"));
  assert.ok(!/javascript:/.test(JSON.stringify(res.body)));
  assert.equal(world.db.rows("forms").length, 0);
  assert.equal(typeformCalls()[0].url, "https://api.typeform.com/forms/abc123");
  assert.equal(typeformCalls()[0].init.headers.Authorization, `Bearer ${TOKEN}`);
  assert.ok(!everywhere(res.body));
  assert.ok(!everywhere(world.logs));
});

test("a bad id or token never reaches the network", async () => {
  allowTypeform();
  for (const form of ["https://evil.test/to/abc123", "../../secrets", "http://169.254.169.254/latest", ""]) {
    assert.equal((await read(await post(typeformBody({ form })))).status, 400, form);
  }
  for (const token of ["", "short", "bad token\r\nX: 1", 7]) {
    const res = await read(await post(typeformBody({ token })));
    assert.equal(res.status, 400);
    assert.ok(!JSON.stringify(res.body).includes("bad token"));
  }
  assert.equal(typeformCalls().length, 0);
});

test("Typeform failures come back as fixed messages without the token or upstream text", async () => {
  for (const [upstream, status] of [[401, 400], [403, 400], [404, 404], [429, 429], [500, 502]]) {
    typeform = async () => new Response(`leak ${TOKEN}`, { status: upstream });
    const res = await read(await post(typeformBody()));
    assert.equal(res.status, status);
    assert.ok(!everywhere(res.body) && !res.body.error.includes("leak"));
  }
  typeform = async () => {
    throw new Error(`boom ${TOKEN}`);
  };
  const res = await read(await post(typeformBody()));
  assert.equal(res.status, 502);
  assert.ok(!everywhere(res.body));
  assert.ok(!everywhere(world.logs));
});

test("commit creates a Draft in the caller's project, and re-sanitises a tampered preview", async () => {
  const draft = {
    title: "<script>x</script>Tampered",
    status: "Published",
    published_at: "2026-01-01",
    project_id: OTHER_PROJECT_ID,
    is_template: true,
    created_by: "someone-else",
    schema: { fields: [{ id: "a", type: "image", title: "Pic", config: { url: "javascript:alert(1)" } }] },
    settings: { webhooks: [{ url: "https://hooks.test/x" }], thankYouType: "redirect", thankYouUrl: "javascript:alert(2)" },
    metadata: { import: { source: "typeform", sourceId: "abc123" }, extra: "nope" },
  };
  const res = await read(await post({ projectId: PROJECT_ID, source: "draft", draft, commit: true }));
  assert.equal(res.status, 200);
  const [row] = world.db.rows("forms");
  assert.equal(row.status, "Draft");
  assert.equal(row.project_id, PROJECT_ID);
  assert.equal(row.is_template, false);
  assert.equal(row.created_by, USER_ID);
  assert.equal(row.title, "Tampered");
  assert.equal(row.published_at, undefined);
  assert.deepEqual(row.metadata, { import: { source: "typeform", sourceId: "abc123" } });
  assert.ok(!/javascript:|hooks\.test/.test(JSON.stringify(row)));
  assert.deepEqual(row.settings.webhooks, []);
  assert.equal(res.body.form.slug, "tampered");
  assert.equal(res.body.form.id, row.id);
  assert.ok(world.db.rows("activity").some((a) => a.action === "form.imported"));
});

test("slugs stay unique and a Typeform commit also lands as a Draft", async () => {
  world.db.seed("forms", [{ slug: "survey", title: "Old", status: "Published", project_id: PROJECT_ID }]);
  allowTypeform();
  const res = await read(await post(typeformBody({ commit: true })));
  assert.equal(res.body.form.slug, "survey-2");
  const created = world.db.rows("forms").find((f) => f.slug === "survey-2");
  assert.equal(created.status, "Draft");
  assert.ok(!everywhere(created));
});

test("JSON and CSV preview through the same route", async () => {
  const exported = exportFormJson({ title: "Round", fieldDefs: [{ id: "x", type: "email", title: "Mail" }], settings: {} });
  const json = await read(await post({ projectId: PROJECT_ID, source: "json", text: JSON.stringify(exported) }));
  assert.equal(json.body.form.schema.fields[0].type, "email");
  assert.notEqual(json.body.form.schema.fields[0].id, "x");

  const csv = await read(await post({ projectId: PROJECT_ID, source: "csv", text: "Email\na@b.co\n", title: "Leads" }));
  assert.equal(csv.body.form.title, "Leads");
  assert.equal(csv.body.form.schema.fields[0].type, "email");

  assert.equal((await read(await post({ projectId: PROJECT_ID, source: "json", text: "nope" }))).status, 400);
  assert.equal((await read(await post({ projectId: PROJECT_ID, source: "ftp" }))).status, 400);
});

test("oversized requests are refused", async () => {
  const res = await read(await post({ projectId: PROJECT_ID, source: "json", text: "x".repeat(5 * 1024 * 1024) }));
  assert.equal(res.status, 413);
});

test("rate limits stop repeat imports", async () => {
  world.db.rpcs.hit_rate_limit = () => ({ data: false, error: null });
  allowTypeform();
  assert.equal((await read(await post(typeformBody()))).status, 429);
  assert.equal(typeformCalls().length, 0);
});
