import { schemaClient } from "@/supabase/components/forms-client";
import { relativeTime } from "@/lib/forms/schema";

// Workspace-wide feed of response comments (forms.comments joined to responses + forms), newest first.
export async function listRecentComments({ projectId, formId, limit = 300 } = {}) {
  let query = schemaClient()
    .from("comments")
    .select("id, response_id, author, body, created_at, responses!inner(id, form_id, respondent_name, respondent_email, deleted_at, forms!inner(title, project_id))")
    .is("responses.deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (projectId) query = query.eq("responses.forms.project_id", projectId);
  if (formId) query = query.eq("responses.form_id", formId);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    responseId: row.response_id,
    formId: row.responses?.form_id ?? null,
    formTitle: row.responses?.forms?.title || "Form",
    respondent: row.responses?.respondent_name || row.responses?.respondent_email || "Anonymous",
    author: row.author || "You",
    body: row.body || "",
    createdAt: row.created_at,
    when: relativeTime(row.created_at),
  }));
}
