import { schemaClient } from "@/supabase/components/forms-client";
import { getUser } from "@/lib/supabase/user";
import { relativeTime } from "@/lib/forms/schema";

// Workspace audit trail (forms.activity) and response access log (forms.access_log).
// Writes are fire-and-forget: a failed log line never blocks the action it records.

function normalizeActivity(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    formId: row.form_id,
    responseId: row.response_id,
    actorId: row.actor_id,
    actorName: row.actor_name || "System",
    action: row.action,
    detail: row.detail || {},
    formTitle: row.forms?.title || row.detail?.title || null,
    createdAt: row.created_at,
    when: relativeTime(row.created_at),
  };
}

export async function logActivity({ projectId = null, formId = null, responseId = null, action, detail = {} }) {
  try {
    const user = await getUser();
    await schemaClient().from("activity").insert({
      project_id: projectId,
      form_id: formId,
      response_id: responseId,
      actor_id: user?.id ?? null,
      actor_name: user?.name || "You",
      action,
      detail,
    });
  } catch (e) {
    console.error("[audit.logActivity]", e);
  }
}

export async function listActivity({ projectId, formId, limit = 200 } = {}) {
  let query = schemaClient()
    .from("activity")
    .select("*, forms(title)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (projectId) query = query.eq("project_id", projectId);
  if (formId) query = query.eq("form_id", formId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeActivity);
}

export async function logAccess({ formId = null, responseId = null, action, fieldId = null, metadata = {} }) {
  try {
    const user = await getUser();
    await schemaClient().from("access_log").insert({
      form_id: formId,
      response_id: responseId,
      actor_id: user?.id ?? null,
      actor_name: user?.name || "Unknown",
      action,
      field_id: fieldId,
      metadata,
    });
  } catch (e) {
    console.error("[audit.logAccess]", e);
  }
}

export async function listAccess({ responseId, formId, limit = 200 } = {}) {
  let query = schemaClient().from("access_log").select("*").order("created_at", { ascending: false }).limit(limit);
  if (responseId) query = query.eq("response_id", responseId);
  if (formId) query = query.eq("form_id", formId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    responseId: row.response_id,
    formId: row.form_id,
    actorName: row.actor_name,
    action: row.action,
    fieldId: row.field_id,
    createdAt: row.created_at,
    when: relativeTime(row.created_at),
  }));
}
