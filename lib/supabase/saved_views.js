import { schemaClient } from "@/supabase/components/forms-client";
import { getUser } from "@/lib/supabase/user";

// Saved response views: a name, a table/kanban layout and a filters object.
function normalizeView(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    formId: row.form_id,
    name: row.name,
    layout: row.layout || "table",
    filters: row.filters || {},
    createdAt: row.created_at,
  };
}

export async function listSavedViews({ projectId, formId } = {}) {
  let query = schemaClient().from("saved_views").select("*").is("deleted_at", null).order("created_at");
  if (projectId) query = query.eq("project_id", projectId);
  else query = query.is("project_id", null);
  query = formId ? query.eq("form_id", formId) : query.is("form_id", null);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeView);
}

export async function createSavedView({ id, projectId = null, formId = null, name, layout = "table", filters = {} }) {
  const user = await getUser();
  const payload = { project_id: projectId, form_id: formId, name, layout, filters, created_by: user?.id ?? null };
  if (id) payload.id = id;
  const { data, error } = await schemaClient().from("saved_views").insert(payload).select("*").single();
  if (error) throw error;
  return normalizeView(data);
}

export async function deleteSavedView(id) {
  const { error } = await schemaClient().from("saved_views").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
