import test from "node:test";
import assert from "node:assert/strict";
import { ToolError, runTool } from "./run_tool.js";
import { verifyMcpToken } from "./auth.js";

const projectA = "11111111-1111-4111-8111-111111111111";
const projectB = "22222222-2222-4222-8222-222222222222";
const formId = "33333333-3333-4333-8333-333333333333";
const authInfo = { token: "t", clientId: "client-1", scopes: [], extra: { userId: "user-1", name: "Ada" } };

function makeDeps(overrides = {}) {
  const audit = [];
  return {
    audit,
    isRateLimited: async () => false,
    loadConnection: async () => ({ id: "conn-1", projectIds: [projectA], access: "write" }),
    userClient: () => ({}),
    writeAudit: async (entry) => {
      audit.push(entry);
    },
    ensureMembership: async () => {},
    can: async () => true,
    loadFormTarget: async () => ({ formId, projectId: projectA }),
    loadResponseTarget: async () => ({ formId, projectId: projectA }),
    ...overrides,
  };
}

const tool = (extra) => ({ name: "t", access: "read", scope: "project", permissions: ["forms.forms.view"], input: {}, run: async () => ({ ok: true }), ...extra });

test("a token without a user is refused and nothing runs", async () => {
  let ran = false;
  const deps = makeDeps();
  const result = await runTool(tool({ run: async () => { ran = true; } }), { projectId: projectA }, {}, deps);
  assert.equal(result.isError, true);
  assert.equal(ran, false);
  assert.equal(deps.audit.length, 0);
});

test("a client with no active connection is refused and audited", async () => {
  const deps = makeDeps({ loadConnection: async () => null });
  const result = await runTool(tool(), { projectId: projectA }, authInfo, deps);
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /no active connection/);
  assert.equal(deps.audit[0].outcome, "denied");
  assert.equal(deps.audit[0].error_code, "not_connected");
  assert.equal(deps.audit[0].product, "forms");
});

test("a read-only connection cannot run a write tool", async () => {
  let ran = false;
  const deps = makeDeps({ loadConnection: async () => ({ id: "c", projectIds: [projectA], access: "read" }) });
  const result = await runTool(tool({ access: "write", run: async () => { ran = true; } }), { projectId: projectA }, authInfo, deps);
  assert.equal(result.isError, true);
  assert.equal(ran, false);
  assert.equal(deps.audit[0].error_code, "read_only");
});

test("a project outside the connection is refused before any role check", async () => {
  let roleChecked = false;
  const deps = makeDeps({ can: async () => { roleChecked = true; return true; } });
  const result = await runTool(tool(), { projectId: projectB }, authInfo, deps);
  assert.equal(result.isError, true);
  assert.equal(roleChecked, false);
});

test("a form in a project outside the connection reads the same as a missing one", async () => {
  let ran = false;
  const run = async () => { ran = true; };
  const outside = await runTool(tool({ scope: "form", run }), { formId }, authInfo, makeDeps({ loadFormTarget: async () => ({ formId, projectId: projectB }) }));
  const missing = await runTool(tool({ scope: "form", run }), { formId }, authInfo, makeDeps({ loadFormTarget: async () => null }));
  assert.equal(outside.isError, true);
  assert.equal(ran, false);
  assert.deepEqual(outside, missing);
});

test("every listed permission must hold, checked against the form's scope", async () => {
  const checks = [];
  const deps = makeDeps({
    can: async (_db, permission, projectId, scopeId) => {
      checks.push([permission, projectId, scopeId]);
      return permission === "forms.form.edit";
    },
  });
  const result = await runTool(tool({ scope: "form", permissions: ["forms.form.edit", "forms.form.publish"] }), { formId }, authInfo, deps);
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /role/);
  assert.deepEqual(checks[1], ["forms.form.publish", projectA, formId]);
  assert.equal(deps.audit[0].outcome, "denied");
});

test("a role that lacks the permission is refused after retrying membership once", async () => {
  let ensured = 0;
  const deps = makeDeps({ ensureMembership: async () => { ensured += 1; }, can: async () => false });
  const result = await runTool(tool(), { projectId: projectA }, authInfo, deps);
  assert.equal(result.isError, true);
  assert.equal(ensured, 1);
});

test("a first-time user gets their role issued, then the tool runs", async () => {
  let calls = 0;
  const deps = makeDeps({ can: async () => { calls += 1; return calls > 1; } });
  const result = await runTool(tool(), { projectId: projectA }, authInfo, deps);
  assert.equal(result.isError, undefined);
  assert.equal(deps.audit[0].outcome, "ok");
});

test("rate limited calls never reach the tool", async () => {
  let ran = false;
  const deps = makeDeps({ isRateLimited: async () => true });
  const result = await runTool(tool({ run: async () => { ran = true; } }), { projectId: projectA }, authInfo, deps);
  assert.equal(result.isError, true);
  assert.equal(ran, false);
  assert.equal(deps.audit[0].outcome, "rate_limited");
});

test("internal errors don't leak to the model", async () => {
  const deps = makeDeps();
  const original = console.error;
  console.error = () => {};
  const result = await runTool(tool({ run: async () => { throw new Error("secret db detail"); } }), { projectId: projectA }, authInfo, deps);
  console.error = original;
  assert.equal(result.isError, true);
  assert.doesNotMatch(result.content[0].text, /secret/);
  assert.equal(deps.audit[0].outcome, "error");
});

test("errors meant for the caller keep their message", async () => {
  const deps = makeDeps();
  const result = await runTool(tool({ run: async () => { throw new ToolError("invalid_state", "Not now."); } }), { projectId: projectA }, authInfo, deps);
  assert.equal(result.content[0].text, "Not now.");
  assert.equal(deps.audit[0].error_code, "invalid_state");
});

test("the audit log records argument names, not values", async () => {
  const deps = makeDeps();
  await runTool(tool(), { projectId: projectA, summary: "private text" }, authInfo, deps);
  assert.deepEqual(deps.audit[0].metadata, { argument_keys: ["projectId", "summary"] });
  assert.doesNotMatch(JSON.stringify(deps.audit[0]), /private text/);
});

test("a write that can't be audited says so", async () => {
  const original = console.error;
  console.error = () => {};
  const deps = makeDeps({ writeAudit: async () => { throw new Error("down"); } });
  const result = await runTool(tool({ access: "write" }), { projectId: projectA }, authInfo, deps);
  console.error = original;
  assert.match(result.content[0].text, /auditWarning/);
});

test("token checks require issuer, role, subject and client_id", async () => {
  const issuer = "https://x.supabase.co/auth/v1";
  const good = { iss: issuer, role: "authenticated", sub: "u", client_id: "c", exp: 9999999999, email: "ada@example.com" };
  const check = (claims, error = null) => verifyMcpToken(null, "tok", { issuer, getClaims: async () => ({ data: claims ? { claims } : null, error }) });

  assert.equal((await check(good)).clientId, "c");
  assert.equal((await check(good)).extra.userId, "u");
  assert.equal((await check(good)).extra.name, "ada");
  assert.equal(await verifyMcpToken(null, undefined, { issuer, getClaims: async () => assert.fail() }), undefined);
  assert.equal(await check(null, new Error("bad signature")), undefined);
  assert.equal(await check({ ...good, iss: "https://evil/auth/v1" }), undefined);
  assert.equal(await check({ ...good, role: "anon" }), undefined);
  assert.equal(await check({ ...good, client_id: undefined }), undefined, "browser session token");
});
