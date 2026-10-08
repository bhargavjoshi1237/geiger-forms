import { schemaClient } from "@/supabase/components/forms-client";

// One settings row per workspace (project_id null = the unscoped /forms workspace).
export const DEFAULT_WORKSPACE_SETTINGS = {
  workspaceName: "Geiger Forms",
  defaultStatus: "Draft",
  timezone: "UTC",
  locale: "en",
  folders: [],
  notifyOnSubmit: true,
  digestEmails: [],
  brandAccent: "",
  brandLogoUrl: "",
  hideBranding: false,
  defaultRetentionDays: "",
  requireCaptcha: false,
  anonymiseByDefault: false,
  allowedEmbedDomains: [],
};

export async function getWorkspaceSettings(projectId = null) {
  let query = schemaClient().from("workspace_settings").select("*").is("deleted_at", null).limit(1);
  query = projectId ? query.eq("project_id", projectId) : query.is("project_id", null);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return { id: data?.id ?? null, ...DEFAULT_WORKSPACE_SETTINGS, ...(data?.settings || {}) };
}

export async function saveWorkspaceSettings(projectId = null, settings) {
  const { id, ...rest } = settings || {};
  const sb = schemaClient();
  const existing = id
    ? { id }
    : (await (projectId
        ? sb.from("workspace_settings").select("id").eq("project_id", projectId)
        : sb.from("workspace_settings").select("id").is("project_id", null)
      ).maybeSingle()).data;
  const query = existing?.id
    ? sb.from("workspace_settings").update({ settings: rest }).eq("id", existing.id)
    : sb.from("workspace_settings").insert({ project_id: projectId, settings: rest });
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return { id: data.id, ...DEFAULT_WORKSPACE_SETTINGS, ...(data.settings || {}) };
}
