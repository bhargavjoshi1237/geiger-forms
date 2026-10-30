import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { resetWorld } from "@/lib/__tests__/support/harness";
import { FORM_ID, OTHER_PROJECT_ID, PROJECT_ID, field, formRow } from "@/lib/__tests__/support/forms";
import { withoutAnswerKey } from "@/lib/server/forms-api";
import { GET as listForms, POST as createForm } from "./forms/route.js";
import { GET as getForm, PATCH as patchForm } from "./forms/[id]/route.js";
import { GET as listResponses } from "./forms/[id]/responses/route.js";
import { PATCH as patchResponse } from "./responses/[id]/route.js";
import { POST as postComment } from "./responses/[id]/comments/route.js";

const WRITE_KEY = `gf_${"w".repeat(32)}`;
const READ_KEY = `gf_${"r".repeat(32)}`;
const OTHER_FORM_ID = "55555555-5555-4555-8555-555555555555";
const RESPONSE_ID = "66666666-6666-4666-8666-666666666666";
const OTHER_RESPONSE_ID = "77777777-7777-4777-8777-777777777777";
const MEMBER_ID = "88888888-8888-4888-8888-888888888888";

const hash = (key) => createHash("sha256").update(key, "utf8").digest("hex");
let world;

function req(key, method, body, path = "/api/v1/x?limit=50") {
  return new Request(`https://app.test${path}`, {
    method,
    headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
}

const params = (id) => ({ params: Promise.resolve({ id }) });
const read = async (response) => ({ status: response.status, body: await response.json() });

beforeEach(() => {
  world = resetWorld();
  world.db.seed("api_keys", [
    { id: "k-write", project_id: PROJECT_ID, scopes: ["write"], key_hash: hash(WRITE_KEY) },
    { id: "k-read", project_id: PROJECT_ID, scopes: ["read"], key_hash: hash(READ_KEY) },
  ]);
  world.db.seed("forms", [
    formRow({
      published_at: "2026-01-01T00:00:00.000Z",
      fields: [field("q1", "select", { options: ["A", "B"], correctAnswer: "B" }), field("ssn", "text", { sensitive: true }), field("plain", "text", { sensitive: true })],
      settings: { webhooks: [{ id: "w1", url: "https://hooks.example/x", secret: "whsec_top_secret" }], slackWebhookUrl: "https://hooks.slack.example/SECRETSLACK", access: { mode: "password", passwordHash: "HASHVALUE", passwordSalt: "SALTVALUE" } },
    }),
    formRow({ id: OTHER_FORM_ID, slug: "other", project_id: OTHER_PROJECT_ID }),
  ]);
  world.db.seed("responses", [
    { id: RESPONSE_ID, form_id: FORM_ID, status: "Complete", priority: "Low", tags: [], respondent_name: "Pat", respondent_email: "pat@example.com", answers: { q1: "A", ssn: { __enc: "v1:i:t:CIPHERTEXT" }, plain: "PLAINTEXT-VALUE" }, metadata: { encryptedFields: ["ssn"] } },
    { id: OTHER_RESPONSE_ID, form_id: OTHER_FORM_ID, status: "Complete", answers: {} },
  ]);
});

test("reads stay on the existing shape", async () => {
  const list = await read(await listForms(req(READ_KEY, "GET")));
  assert.deepEqual(list.body.forms.map((f) => Object.keys(f)), [["id", "slug", "title", "description", "status", "category", "tags", "responses", "createdAt", "updatedAt", "publishedAt"]]);
  const one = await read(await getForm(req(READ_KEY, "GET"), params(FORM_ID)));
  assert.equal(one.body.form.id, FORM_ID);
  const responses = await read(await listResponses(req(READ_KEY, "GET"), params(FORM_ID)));
  assert.equal(responses.body.nextCursor, null);
  assert.equal(responses.body.responses[0].respondent.email, "pat@example.com");
  assert.match(responses.body.responses[0].pdfUrl, /\/pdf$/);
  assert.equal((await read(await listResponses(req(READ_KEY, "GET", undefined, "/x?cursor=bad"), params(FORM_ID)))).status, 400);
});

test("no token is refused on every write", async () => {
  for (const response of [
    await createForm(req(null, "POST", { title: "x" })),
    await patchForm(req(null, "PATCH", { title: "x" }), params(FORM_ID)),
    await patchResponse(req(null, "PATCH", { status: "Spam" }), params(RESPONSE_ID)),
    await postComment(req(null, "POST", { body: "x" }), params(RESPONSE_ID)),
  ]) assert.equal(response.status, 401);
});

test("a read key can't write", async () => {
  for (const response of [
    await createForm(req(READ_KEY, "POST", { title: "x" })),
    await patchForm(req(READ_KEY, "PATCH", { title: "x" }), params(FORM_ID)),
    await patchResponse(req(READ_KEY, "PATCH", { status: "Spam" }), params(RESPONSE_ID)),
    await postComment(req(READ_KEY, "POST", { body: "x" }), params(RESPONSE_ID)),
  ]) assert.equal(response.status, 403);
  assert.equal(world.db.rows("forms").length, 2);
});

test("a key can't reach another project's rows, and a body can't move a form there", async () => {
  assert.equal((await patchForm(req(WRITE_KEY, "PATCH", { title: "Hijacked" }), params(OTHER_FORM_ID))).status, 404);
  assert.equal((await patchResponse(req(WRITE_KEY, "PATCH", { status: "Spam" }), params(OTHER_RESPONSE_ID))).status, 404);
  assert.equal((await postComment(req(WRITE_KEY, "POST", { body: "x" }), params(OTHER_RESPONSE_ID))).status, 404);
  assert.equal(world.db.rows("forms").find((f) => f.id === OTHER_FORM_ID).title, "Demo");
  assert.equal(world.db.rows("responses").find((r) => r.id === OTHER_RESPONSE_ID).status, "Complete");
  assert.equal(world.db.rows("comments").length, 0);

  const created = await read(await createForm(req(WRITE_KEY, "POST", { title: "Mine", project_id: OTHER_PROJECT_ID, projectId: OTHER_PROJECT_ID, status: "Published" })));
  const row = world.db.rows("forms").find((f) => f.id === created.body.form.id);
  assert.equal(row.project_id, PROJECT_ID);
  assert.equal(row.status, "Draft");
  await patchForm(req(WRITE_KEY, "PATCH", { project_id: OTHER_PROJECT_ID, title: "Still mine" }), params(row.id));
  assert.equal(row.project_id, PROJECT_ID);
});

test("sensitive answers are masked, encrypted or not", async () => {
  const { body } = await read(await listResponses(req(READ_KEY, "GET"), params(FORM_ID)));
  const [response] = body.responses;
  assert.equal(response.answers.ssn, null);
  assert.equal(response.answers.plain, null);
  assert.equal(response.answers.q1, "A");
  const patched = await patchResponse(req(WRITE_KEY, "PATCH", { priority: "High" }), params(RESPONSE_ID));
  assert.doesNotMatch(await patched.text(), /CIPHERTEXT|PLAINTEXT-VALUE/);
});

test("answer keys and secrets are stripped from reads and write replies", async () => {
  const replies = [
    await getForm(req(READ_KEY, "GET"), params(FORM_ID)),
    await patchForm(req(WRITE_KEY, "PATCH", { title: "Renamed" }), params(FORM_ID)),
    await createForm(req(WRITE_KEY, "POST", { title: "Quiz", fields: [field("k", "select", { options: ["Y"], correctAnswer: "Y" })] })),
  ];
  for (const reply of replies) assert.doesNotMatch(await reply.text(), /correctAnswer|whsec_top_secret|SECRETSLACK|HASHVALUE|SALTVALUE/);
});

test("a read-modify-write keeps the answer key and the sensitive flag", async () => {
  const { body } = await read(await getForm(req(READ_KEY, "GET"), params(FORM_ID)));
  const fields = body.form.fields.map((f) => (f.id === "ssn" ? { ...f, sensitive: false } : f));
  assert.equal((await patchForm(req(WRITE_KEY, "PATCH", { fields }), params(FORM_ID))).status, 200);
  const stored = world.db.rows("forms")[0].schema.fields;
  assert.equal(stored.find((f) => f.id === "q1").correctAnswer, "B");
  assert.equal(stored.find((f) => f.id === "ssn").sensitive, true);
  const dropped = await read(await patchForm(req(WRITE_KEY, "PATCH", { fields: [field("q1", "select", { options: ["A"] })] }), params(FORM_ID)));
  assert.equal(dropped.status, 422);
  assert.deepEqual(dropped.body.fieldIds, ["ssn", "plain"]);
});

test("input is validated and capped", async () => {
  const bad = [
    { title: "" },
    { title: "x".repeat(201) },
    { tags: "nope" },
    { fields: "nope" },
    { fields: [{ type: "made-up" }] },
    { fields: [field("a"), field("a")] },
    { fields: [field("__a")] },
    { fields: [field("a", "text", { hint: "javascript:alert(1)" })] },
    { settings: { thankYouUrl: "javascript:alert(1)" } },
    { settings: "nope" },
    { settings: { thankYouText: { nested: true } } },
    { settings: { steps: "nope" } },
    { settings: { theme: "dark" } },
    { fields: [field("a", "text", { title: { nested: true } })] },
    { status: "Live" },
    {},
  ];
  for (const body of bad) {
    const response = await patchForm(req(WRITE_KEY, "PATCH", body), params(FORM_ID));
    assert.equal(response.status, 422, JSON.stringify(body));
  }
  const tooMany = await patchForm(req(WRITE_KEY, "PATCH", { fields: Array.from({ length: 501 }, (_, i) => field(`f${i}`)) }), params(FORM_ID));
  assert.equal(tooMany.status, 422);
  assert.equal((await patchForm(req(WRITE_KEY, "PATCH", JSON.stringify({ title: "x".repeat(300 * 1024) })), params(FORM_ID))).status, 413);
  assert.equal((await patchResponse(req(WRITE_KEY, "PATCH", JSON.stringify({ tags: ["x".repeat(40 * 1024)] })), params(RESPONSE_ID))).status, 413);
  assert.equal((await patchForm(req(WRITE_KEY, "PATCH", "{not json"), params(FORM_ID))).status, 400);
  assert.equal((await createForm(req(WRITE_KEY, "POST", { description: "no title" }))).status, 422);
});

test("settings merge through the shared RPC and locked ones are refused", async () => {
  const locked = await read(await patchForm(req(WRITE_KEY, "PATCH", { settings: { webhooks: [], thankYouText: "Bye" } }), params(FORM_ID)));
  assert.equal(locked.status, 422);
  assert.deepEqual(locked.body.lockedSettings, ["webhooks"]);
  assert.equal(world.db.rpcCalls.filter((c) => c.name === "merge_settings").length, 0);

  assert.equal((await patchForm(req(WRITE_KEY, "PATCH", { settings: { thankYouText: "Bye", theme: { accent: "#123456" } } }), params(FORM_ID))).status, 200);
  const merge = world.db.rpcCalls.find((c) => c.name === "merge_settings");
  assert.equal(merge.args.p_id, FORM_ID);
  assert.equal(merge.args.p_patch.thankYouText, "Bye");
  assert.equal(merge.args.p_patch.theme.accent, "#123456");
  assert.equal(merge.args.p_patch.theme.mode, "dark", "a nested group keeps its other values");
});

test("publishing runs the builder's checks, then records the time and the activity", async () => {
  const row = world.db.rows("forms")[0];
  row.status = "Draft";
  row.schema.fields = [field("c", "select")];
  const refused = await read(await patchForm(req(WRITE_KEY, "PATCH", { status: "Published" }), params(FORM_ID)));
  assert.equal(refused.status, 409);
  assert.equal(refused.body.code, "publish_warnings");
  assert.ok(refused.body.warnings.length > 0);
  assert.equal(row.status, "Draft");

  const done = await read(await patchForm(req(WRITE_KEY, "PATCH", { status: "Published", acknowledgeWarnings: true }), params(FORM_ID)));
  assert.equal(done.status, 200);
  assert.equal(done.body.form.status, "Published");
  assert.ok(row.published_at);
  assert.equal(world.db.rows("activity").at(-1).action, "form.published");

  assert.equal((await patchForm(req(WRITE_KEY, "PATCH", { status: "Draft" }), params(FORM_ID))).status, 200);
  assert.equal(row.status, "Draft");
});

test("a response's status, priority, tags and assignee can change, and nothing else", async () => {
  world.db.seed("role_grants", [{ project_id: PROJECT_ID, user_id: MEMBER_ID, status: "active" }]);
  world.db.users[MEMBER_ID] = { id: MEMBER_ID, email: "sam@example.com", user_metadata: { full_name: "Sam" } };
  const { status, body } = await read(await patchResponse(req(WRITE_KEY, "PATCH", { status: "Needs review", priority: "High", tags: ["vip"], assignee: "sam@example.com", score: 99, answers: { q1: "B" } }), params(RESPONSE_ID)));
  assert.equal(status, 200);
  assert.equal(body.response.status, "Needs review");
  assert.equal(body.response.assignee, "Sam");
  const row = world.db.rows("responses")[0];
  assert.equal(row.assignee_id, MEMBER_ID);
  assert.equal(row.answers.q1, "A");
  assert.equal(row.score, undefined);

  assert.equal((await read(await patchResponse(req(WRITE_KEY, "PATCH", { assignee: "nobody@example.com" }), params(RESPONSE_ID)))).body.code, "not_member");
  assert.equal(row.assignee_id, MEMBER_ID);
  await patchResponse(req(WRITE_KEY, "PATCH", { assignee: null }), params(RESPONSE_ID));
  assert.equal(row.assignee_id, null);

  assert.equal((await patchResponse(req(WRITE_KEY, "PATCH", { status: "Nope" }), params(RESPONSE_ID))).status, 422);
  assert.equal((await patchResponse(req(WRITE_KEY, "PATCH", { priority: "Urgent" }), params(RESPONSE_ID))).status, 422);
  assert.equal((await patchResponse(req(WRITE_KEY, "PATCH", { tags: Array(31).fill("x") }), params(RESPONSE_ID))).status, 422);
  assert.equal((await patchResponse(req(WRITE_KEY, "PATCH", {}), params(RESPONSE_ID))).status, 422);
});

test("approval and payment states can't be overridden", async () => {
  const row = world.db.rows("responses")[0];
  row.approval = { state: "pending" };
  assert.equal((await patchResponse(req(WRITE_KEY, "PATCH", { status: "Approved" }), params(RESPONSE_ID))).status, 409);
  row.approval = {};
  row.status = "Awaiting payment";
  assert.equal((await patchResponse(req(WRITE_KEY, "PATCH", { status: "Complete" }), params(RESPONSE_ID))).status, 409);
  assert.equal(row.status, "Awaiting payment");
});

test("comments are stored as internal notes by the API key", async () => {
  const { status, body } = await read(await postComment(req(WRITE_KEY, "POST", { body: "  Called them  ", mentions: [MEMBER_ID] }), params(RESPONSE_ID)));
  assert.equal(status, 201);
  assert.equal(body.comment.body, "Called them");
  assert.equal(body.comment.author, "API key");
  assert.deepEqual(body.comment.mentions, [], "a non-member mention is dropped");
  assert.equal((await postComment(req(WRITE_KEY, "POST", { body: "   " }), params(RESPONSE_ID))).status, 422);
  assert.equal((await postComment(req(WRITE_KEY, "POST", { body: "x".repeat(5001) }), params(RESPONSE_ID))).status, 422);
});

test("a submit reply drops the answer key even when the form shows answers", () => {
  const result = withoutAnswerKey({ ok: true, quiz: { percent: 50, results: { q1: false }, correct: { q1: "B" } } });
  assert.deepEqual(result.quiz, { percent: 50, results: { q1: false } });
});

test("writes are rate limited per key", async () => {
  world.db.rpcs.hit_rate_limit = (args) => {
    assert.equal(args.p_key, "v1-write:k-write");
    return { data: false, error: null };
  };
  assert.equal((await patchForm(req(WRITE_KEY, "PATCH", { title: "x" }), params(FORM_ID))).status, 429);
  assert.equal(world.db.rows("forms")[0].title, "Demo");
});

test("a database failure stays generic", async () => {
  world.db.failOn("responses", "update", "secret db detail");
  const { status, body } = await read(await patchResponse(req(WRITE_KEY, "PATCH", { status: "Spam" }), params(RESPONSE_ID)));
  assert.equal(status, 500);
  assert.doesNotMatch(JSON.stringify(body), /secret db detail/);
});
