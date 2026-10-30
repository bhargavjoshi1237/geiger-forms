import "server-only";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { sha256Hex } from "@/lib/server/crypto";
import { MAX_BODY_BYTES, fail, rateLimit, rateLimited, readJson, unavailable } from "@/lib/server/http";
import { loadForm } from "@/lib/server/forms";

export { apiForm, apiResponse } from "@/lib/server/forms-api";

// Writes allowed per key in a rolling minute, matching MCP's per-client limit.
const WRITE_LIMIT_PER_MINUTE = 120;

// REST v1 auth: `Authorization: Bearer gf_…` → sha256 → forms.api_keys (live) → project scope + scopes.

export async function authenticateApiKey(request, scope) {
  const db = formsAdmin();
  if (!db) return { error: unavailable() };
  const header = request.headers.get("authorization") || "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!/^gf_[A-Za-z0-9]{16,128}$/.test(key)) return { error: fail("Missing or malformed API key.", 401, { code: "unauthorized" }) };
  const { data, error } = await db.from("api_keys").select("id, project_id, scopes").eq("key_hash", sha256Hex(key)).is("deleted_at", null).maybeSingle();
  if (error) console.error("[api-keys.auth]", error.message);
  if (!data) return { error: fail("Invalid API key.", 401, { code: "unauthorized" }) };
  if (!data.project_id) return { error: fail("This key isn't scoped to a project; create one in a project's settings.", 403, { code: "forbidden" }) };
  const scopes = Array.isArray(data.scopes) ? data.scopes : ["read"];
  if (!scopes.includes(scope) && !(scope === "read" && scopes.includes("write"))) {
    return { error: fail(`This key lacks the "${scope}" scope.`, 403, { code: "forbidden" }) };
  }
  db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(({ error: e }) => e && console.error("[api-keys.touch]", e.message));
  return { key: { id: data.id, projectId: data.project_id, scopes } };
}

// A write request: the key must hold the write scope and be under its rate limit, and the body is size-capped. Returns { key, body } or { error }.
export async function authorizeWrite(request, limit = MAX_BODY_BYTES) {
  const { key, error } = await authenticateApiKey(request, "write");
  if (error) return { error };
  if (!(await rateLimit(`v1-write:${key.id}`, WRITE_LIMIT_PER_MINUTE, 60))) return { error: rateLimited() };
  const { body, error: bodyError } = await readJson(request, limit);
  if (bodyError) return { error: bodyError };
  return { key, body };
}

export async function loadKeyForm(key, id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) return null;
  const form = await loadForm({ id });
  if (!form || form.isTemplate || form.projectId !== key.projectId) return null;
  return form;
}
