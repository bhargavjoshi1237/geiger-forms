import { schemaClient } from "@/supabase/components/forms-client";
import { relativeTime } from "@/lib/forms/schema";
import { logActivity } from "@/lib/supabase/audit";

const TABLE = "responses";

function initials(name, email) {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

export function normalizeResponse(row) {
  const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    formId: row.form_id,
    form: row.forms?.title || "Form",
    formSlug: row.forms?.slug || null,
    projectId: row.forms?.project_id ?? null,
    name: row.respondent_name || "Anonymous",
    email: row.respondent_email || "",
    answers: row.answers || {},
    status: row.status || "Complete",
    priority: row.priority || "Low",
    score: row.score ?? null,
    tags: Array.isArray(row.tags) ? row.tags : [],
    assignee: row.assignee || "",
    outcome: row.outcome || null,
    approval: row.approval || {},
    metadata: meta,
    respondentUserId: row.respondent_user_id ?? null,
    payment: row.payment_status
      ? { status: row.payment_status, amount: Number(row.payment_amount ?? 0), currency: row.payment_currency || "usd", ref: row.payment_ref }
      : null,
    editedAt: row.edited_at ?? null,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at ?? row.submitted_at,
    received: relativeTime(row.submitted_at),
    userAgent: row.user_agent || null,
    completionMs: row.completion_ms ?? null,
    initials: initials(row.respondent_name, row.respondent_email),
  };
}

const SELECT = "*, forms(title, slug, project_id)";

// Live responses, optionally for one form or one project (via the parent form).
export async function listResponses({ formId, projectId } = {}) {
  const supabase = schemaClient();
  let query = supabase
    .from(TABLE)
    .select(projectId ? "*, forms!inner(title, slug, project_id)" : SELECT)
    .is("deleted_at", null)
    .order("submitted_at", { ascending: false });
  if (formId) query = query.eq("form_id", formId);
  if (projectId) query = query.eq("forms.project_id", projectId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeResponse);
}

export async function getResponse(id) {
  const { data, error } = await schemaClient().from(TABLE).select(SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? normalizeResponse(data) : null;
}

const PATCHABLE = { status: "status", priority: "priority", tags: "tags", assignee: "assignee", outcome: "outcome", metadata: "metadata", approval: "approval" };

function toRow(patch) {
  const row = {};
  for (const [key, col] of Object.entries(PATCHABLE)) if (key in patch) row[col] = patch[key];
  return row;
}

// Inline edit of one response (status, priority, tags, assignee, outcome, metadata).
export async function updateResponse(id, patch) {
  const { data, error } = await schemaClient().from(TABLE).update(toRow(patch)).eq("id", id).select(SELECT).single();
  if (error) throw error;
  const response = normalizeResponse(data);
  logActivity({ projectId: response.projectId, formId: response.formId, responseId: id, action: "response.updated", detail: toRow(patch) });
  return response;
}

export async function updateResponseStatus(id, status) {
  return updateResponse(id, { status });
}

// Bulk patch; returns the updated rows.
export async function updateResponses(ids, patch) {
  if (!ids?.length) return [];
  const { data, error } = await schemaClient().from(TABLE).update(toRow(patch)).in("id", ids).select(SELECT);
  if (error) throw error;
  const rows = (data || []).map(normalizeResponse);
  logActivity({ projectId: rows[0]?.projectId ?? null, action: "responses.bulk_updated", detail: { count: rows.length, ...toRow(patch) } });
  return rows;
}

// Bulk tag add/remove without clobbering other tags.
export async function retagResponses(responses, { add = [], remove = [] }) {
  const results = [];
  for (const r of responses) {
    const next = [...new Set([...(r.tags || []).filter((t) => !remove.includes(t)), ...add])];
    const { data, error } = await schemaClient().from(TABLE).update({ tags: next }).eq("id", r.id).select(SELECT).single();
    if (error) throw error;
    results.push(normalizeResponse(data));
  }
  return results;
}

export async function deleteResponses(ids) {
  if (!ids?.length) return;
  const { error } = await schemaClient().from(TABLE).update({ deleted_at: new Date().toISOString() }).in("id", ids);
  if (error) throw error;
  logActivity({ action: "responses.deleted", detail: { count: ids.length } });
}

// Erases every response that carries this respondent email (GDPR right to erasure).
export async function eraseRespondent(email) {
  const target = String(email || "").trim().toLowerCase();
  if (!target) return 0;
  const { data, error } = await schemaClient().from(TABLE).delete().ilike("respondent_email", target).select("id");
  if (error) throw error;
  logActivity({ action: "respondent.erased", detail: { count: data?.length ?? 0 } });
  return data?.length ?? 0;
}

export function summarizeResponses(responses) {
  const byStatus = { Complete: 0, "Needs review": 0, Pending: 0 };
  const byPriority = { High: 0, Medium: 0, Low: 0 };
  const respondents = new Set();
  for (const r of responses) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    byPriority[r.priority] = (byPriority[r.priority] || 0) + 1;
    if (r.email) respondents.add(r.email.toLowerCase());
  }
  const total = responses.length;
  const completePct = total ? Math.round(((byStatus.Complete + (byStatus.Approved || 0)) / total) * 100) : 0;
  return { total, byStatus, byPriority, respondents: respondents.size, completePct };
}

// Funnel inputs for analytics: view/start/submit events and partial (abandoned) sessions.
export async function listFormEvents({ formIds, since } = {}) {
  let query = schemaClient().from("form_events").select("form_id, type, session_id, variant, metadata, created_at").order("created_at", { ascending: false }).limit(20000);
  if (formIds?.length) query = query.in("form_id", formIds);
  if (since) query = query.gte("created_at", since);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((e) => ({ formId: e.form_id, type: e.type, sessionId: e.session_id, variant: e.variant, metadata: e.metadata || {}, createdAt: e.created_at }));
}

export async function listPartials({ formIds } = {}) {
  let query = schemaClient()
    .from("partials")
    .select("id, form_id, answers, last_field_id, page_index, progress, respondent_email, completed_at, created_at, updated_at")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(5000);
  if (formIds?.length) query = query.in("form_id", formIds);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((p) => ({
    id: p.id,
    formId: p.form_id,
    answers: p.answers || {},
    lastFieldId: p.last_field_id,
    pageIndex: p.page_index,
    progress: Number(p.progress || 0),
    email: p.respondent_email,
    completedAt: p.completed_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    when: relativeTime(p.updated_at),
  }));
}
