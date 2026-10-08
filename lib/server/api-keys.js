import "server-only";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { sha256Hex, maskEncrypted } from "@/lib/server/crypto";
import { fail, unavailable } from "@/lib/server/http";
import { loadForm } from "@/lib/server/forms";
import { publicFieldDefs } from "@/lib/server/public-form";
import { publicSettings } from "@/lib/forms/schema";

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
  const scopes = Array.isArray(data.scopes) ? data.scopes : ["read"];
  if (!scopes.includes(scope) && !(scope === "read" && scopes.includes("write"))) {
    return { error: fail(`This key lacks the "${scope}" scope.`, 403, { code: "forbidden" }) };
  }
  db.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(({ error: e }) => e && console.error("[api-keys.touch]", e.message));
  return { key: { id: data.id, projectId: data.project_id ?? null, scopes } };
}

// Forms query restricted to the key's project (unscoped keys see unscoped forms).
export function scopeToProject(query, key) {
  return key.projectId ? query.eq("project_id", key.projectId) : query.is("project_id", null);
}

export async function loadKeyForm(key, id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) return null;
  const form = await loadForm({ id });
  if (!form || form.isTemplate || (form.projectId ?? null) !== key.projectId) return null;
  return form;
}

export function apiForm(form, { detail = false } = {}) {
  return {
    id: form.id,
    slug: form.slug,
    title: form.title,
    description: form.description,
    status: form.status,
    category: form.category,
    tags: form.tags,
    responses: form.responses,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
    publishedAt: form.publishedAt,
    ...(detail ? { fields: publicFieldDefs(form.fieldDefs), settings: publicSettings(form.settings) } : {}),
  };
}

// Response view for API consumers; encrypted answers stay masked.
export function apiResponse(row) {
  return {
    id: row.id,
    formId: row.form_id,
    status: row.status,
    priority: row.priority,
    score: row.score,
    outcome: row.outcome,
    tags: row.tags || [],
    assignee: row.assignee || null,
    respondent: { name: row.respondent_name, email: row.respondent_email },
    answers: maskEncrypted(row.answers, null),
    encryptedFields: row.metadata?.encryptedFields || [],
    approval: row.approval || {},
    payment: row.payment_status ? { status: row.payment_status, amount: Number(row.payment_amount ?? 0), currency: row.payment_currency } : null,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
    editedAt: row.edited_at,
  };
}
