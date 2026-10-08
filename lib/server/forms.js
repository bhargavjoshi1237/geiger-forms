import "server-only";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { normalizeForm, toCanonicalField } from "@/lib/forms/schema";
import { displayValue, includedFields } from "@/lib/forms/logic";
import { isInputField } from "@/lib/forms/field-types";
import { isEncrypted } from "@/lib/server/crypto";

// Service-role form/response loaders and server-side view helpers shared by every route.

const FORM_COLUMNS = "id, slug, title, description, status, category, tags, project_id, created_by, is_template, schema, settings, metadata, response_count, created_at, updated_at, published_at, deleted_at";

// normalizeForm + canonical field defs (the stored schema may still carry legacy builder aliases).
export function toServerForm(row) {
  const form = normalizeForm(row);
  if (!form) return null;
  form.fieldDefs = (form.fieldDefs || []).filter((f) => f && f.id).map(toCanonicalField);
  return form;
}

export async function loadFormRow({ slug, id }) {
  const db = formsAdmin();
  if (!db || (!slug && !id)) return null;
  let query = db.from("forms").select(FORM_COLUMNS).is("deleted_at", null);
  query = id ? query.eq("id", id) : query.eq("slug", slug);
  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("[forms.loadFormRow]", error.message);
    return null;
  }
  return data;
}

export async function loadForm(by) {
  return toServerForm(await loadFormRow(by));
}

// Published, live, non-template form by slug (what respondents may reach).
export async function loadPublishedForm(slug) {
  if (typeof slug !== "string" || !slug || slug.length > 200) return null;
  const form = await loadForm({ slug });
  if (!form || form.status !== "Published" || form.isTemplate) return null;
  return form;
}

export async function loadResponseRow(id) {
  const db = formsAdmin();
  if (!db || !id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db.from("responses").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) {
    console.error("[forms.loadResponseRow]", error.message);
    return null;
  }
  return data;
}

export async function countLiveResponses(formId) {
  const db = formsAdmin();
  if (!db) return 0;
  const { count, error } = await db
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("form_id", formId)
    .is("deleted_at", null)
    .neq("status", "Spam");
  if (error) {
    console.error("[forms.countLiveResponses]", error.message);
    return 0;
  }
  return count ?? 0;
}

// Answers keyed by question label for emails, Slack, Flow and webhooks; sensitive answers are masked.
export function labelledAnswers(form, answers) {
  const out = [];
  for (const field of includedFields(form.fieldDefs)) {
    if (!isInputField(field.type) && field.type !== "calculated") continue;
    const value = answers?.[field.id];
    if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    const label = field.label || field.title || field.id;
    out.push({ fieldId: field.id, label, value: field.sensitive || isEncrypted(value) ? "[protected]" : displayValue(field, value) });
  }
  return out;
}

export function answersText(rows) {
  return rows.map((r) => `${r.label}: ${r.value}`).join("\n");
}

// Every storage path a response references (file answers, signatures, countersign).
export function responseFilePaths(row) {
  const paths = new Set();
  const add = (p) => typeof p === "string" && p.startsWith("forms/") && paths.add(p);
  for (const value of Object.values(row?.answers || {})) {
    if (Array.isArray(value)) value.forEach((v) => add(v?.path));
    else if (value && typeof value === "object") add(value.path);
  }
  for (const f of row?.metadata?.files || []) add(f?.path);
  add(row?.metadata?.countersign?.signature);
  return [...paths];
}

// Re-reads and shallow-merges a metadata patch so concurrent side effects don't clobber each other.
export async function mergeResponseMeta(id, patch, extraColumns = {}) {
  const db = formsAdmin();
  if (!db) return null;
  const { data: current } = await db.from("responses").select("metadata").eq("id", id).maybeSingle();
  const metadata = { ...(current?.metadata || {}), ...patch };
  const { data, error } = await db.from("responses").update({ ...extraColumns, metadata }).eq("id", id).select("*").maybeSingle();
  if (error) console.error("[forms.mergeResponseMeta]", error.message);
  return data ?? null;
}

// Activity + access log writers (service role; never block the caller).
export async function logActivity({ projectId = null, formId = null, responseId = null, actor = null, action, detail = {} }) {
  try {
    const db = formsAdmin();
    if (!db) return;
    const { error } = await db.from("activity").insert({
      project_id: projectId,
      form_id: formId,
      response_id: responseId,
      actor_id: actor?.id ?? null,
      actor_name: actor?.name || "System",
      action,
      detail,
    });
    if (error) console.error("[forms.logActivity]", error.message);
  } catch (e) {
    console.error("[forms.logActivity]", e);
  }
}

export async function logAccess({ formId, responseId, user, action, fieldId = null, metadata = {} }) {
  try {
    const db = formsAdmin();
    if (!db) return;
    const { error } = await db.from("access_log").insert({
      form_id: formId,
      response_id: responseId,
      actor_id: user?.id ?? null,
      actor_name: user?.name || user?.email || "Unknown",
      action,
      field_id: fieldId,
      metadata,
    });
    if (error) console.error("[forms.logAccess]", error.message);
  } catch (e) {
    console.error("[forms.logAccess]", e);
  }
}
