import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { resetWorld } from "@/lib/__tests__/support/harness";
import { FORM_ID, ORIGIN, PROJECT_ID, OTHER_PROJECT_ID, field, formRow } from "@/lib/__tests__/support/forms";
import { signPdfToken, sha256Hex } from "@/lib/server/crypto";
import { GET as sessionOrLink } from "@/app/api/responses/[id]/pdf/route";
import { GET as withApiKey } from "@/app/api/v1/forms/[id]/responses/[responseId]/pdf/route";

const RESPONSE_ID = "55555555-5555-4555-8555-555555555555";
const API_KEY = "gf_abcdefghijklmnop1234";
const HOUR = 3_600_000;

let world;

function seed(world) {
  world.db.seed("forms.forms", [formRow({ fields: [field("q"), field("ssn", "text", { sensitive: true })] })]);
  world.db.seed("forms.responses", [{ id: RESPONSE_ID, form_id: FORM_ID, status: "Complete", submitted_at: "2026-10-01T10:00:00Z", answers: { q: "Hello", ssn: "SSN-1234" }, metadata: { ipHash: "IPHASH" }, deleted_at: null }]);
}

const accessLog = () => world.db.rows("forms.access_log");
const getPdf = (token) => {
  const qs = token ? `?token=${encodeURIComponent(token)}` : "";
  return sessionOrLink(new Request(`${ORIGIN}/api/responses/${RESPONSE_ID}/pdf${qs}`), { params: Promise.resolve({ id: RESPONSE_ID }) });
};
const getApi = (key, formId = FORM_ID, responseId = RESPONSE_ID) =>
  withApiKey(new Request(`${ORIGIN}/api/v1/forms/${formId}/responses/${responseId}/pdf`, { headers: key ? { authorization: `Bearer ${key}` } : {} }), { params: Promise.resolve({ id: formId, responseId }) });

beforeEach(() => {
  world = resetWorld();
  process.env.FORMS_LINK_SECRET = "test-secret";
  seed(world);
});

describe("GET /api/responses/:id/pdf", () => {
  it("refuses anyone without a session or token, logging nothing", async () => {
    const res = await getPdf();
    assert.equal(res.status, 401);
    assert.equal(accessLog().length, 0);
  });

  it("refuses expired, forged and wrong-response tokens", async () => {
    const expired = signPdfToken(RESPONSE_ID, Date.now() - 1);
    const other = signPdfToken("66666666-6666-4666-8666-666666666666", Date.now() + HOUR);
    for (const token of [expired, other, "nonsense", `${signPdfToken(RESPONSE_ID, Date.now() + HOUR)}x`]) {
      assert.equal((await getPdf(token)).status, 401);
    }
    assert.equal(accessLog().length, 0);
  });

  it("serves a signed link as a PDF and logs the access as an export", async () => {
    const res = await getPdf(signPdfToken(RESPONSE_ID, Date.now() + HOUR));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/pdf");
    assert.equal(res.headers.get("cache-control"), "private, no-store");
    assert.equal(res.headers.get("content-disposition"), 'attachment; filename="response-55555555.pdf"');
    assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
    const [entry] = accessLog();
    assert.equal(entry.action, "export");
    assert.equal(entry.response_id, RESPONSE_ID);
    assert.equal(entry.actor_id, null);
    assert.deepEqual(entry.metadata, { format: "pdf", via: "signed_link" });
  });

  it("stops serving once the response is deleted", async () => {
    const token = signPdfToken(RESPONSE_ID, Date.now() + HOUR);
    world.db.rows("forms.responses")[0].deleted_at = new Date().toISOString();
    assert.equal((await getPdf(token)).status, 404);
  });

  describe("with a session", () => {
    const USER_ID = "99999999-9999-4999-8999-999999999999";
    let granted;
    let asked;

    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon";
      granted = true;
      asked = [];
      world.fetch.reply = async (url, init) => {
        if (url.includes("/auth/v1/user")) return Response.json({ id: USER_ID, email: "me@acme.test", aud: "authenticated", user_metadata: {} });
        if (url.includes("/rpc/rbac_allows")) {
          asked.push(JSON.parse(init.body).p_permission);
          return Response.json(granted);
        }
        throw new Error("Unexpected request");
      };
      const session = { access_token: "header.payload.signature", refresh_token: "r", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: USER_ID } };
      world.cookies.set("sb-fake-auth-token", JSON.stringify(session));
    });

    afterEach(() => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    });

    it("needs the export permission, the one Copy as CSV checks in the panel", async () => {
      granted = false;
      const res = await getPdf();
      assert.equal(res.status, 403);
      assert.deepEqual(asked, ["forms.response.export"]);
      assert.equal(accessLog().length, 0);
    });

    it("serves an exporter and logs the access", async () => {
      const res = await getPdf();
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "application/pdf");
      assert.deepEqual(asked, ["forms.response.export"]);
      assert.deepEqual(accessLog()[0].metadata, { format: "pdf", via: "session" });
    });

    it("a signed link doesn't consult the session's permissions", async () => {
      granted = false;
      assert.equal((await getPdf(signPdfToken(RESPONSE_ID, Date.now() + HOUR))).status, 200);
      assert.deepEqual(asked, []);
    });
  });

  it("reports an unconfigured server instead of crashing", async () => {
    const token = signPdfToken(RESPONSE_ID, Date.now() + HOUR);
    world = resetWorld({ database: false });
    assert.equal((await getPdf(token)).status, 503);
    assert.equal((await getPdf()).status, 503);
  });
});

describe("GET /api/v1/forms/:id/responses/:responseId/pdf", () => {
  const seedKey = (projectId, scopes = ["read"]) => world.db.seed("forms.api_keys", [{ id: "key-1", key_hash: sha256Hex(API_KEY), project_id: projectId, scopes, deleted_at: null }]);

  it("needs a valid key", async () => {
    assert.equal((await getApi()).status, 401);
    assert.equal((await getApi(API_KEY)).status, 401);
  });

  it("hides another project's form and a response outside the form", async () => {
    seedKey(OTHER_PROJECT_ID);
    assert.equal((await getApi(API_KEY)).status, 404);
    world.db.rows("forms.api_keys")[0].project_id = PROJECT_ID;
    assert.equal((await getApi(API_KEY, FORM_ID, "66666666-6666-4666-8666-666666666666")).status, 404);
    assert.equal(accessLog().length, 0);
  });

  it("serves the PDF to a read-scoped key and logs which key", async () => {
    seedKey(PROJECT_ID);
    const res = await getApi(API_KEY);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "application/pdf");
    const [entry] = accessLog();
    assert.equal(entry.action, "export");
    assert.deepEqual(entry.metadata, { format: "pdf", via: "api_key", keyId: "key-1" });
  });
});
