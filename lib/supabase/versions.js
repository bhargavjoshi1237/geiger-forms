import { createClient } from "./client";
import { relativeTime } from "@/lib/forms/schema";

const TABLE = "geiger_form_versions";

function normalizeVersion(row, latestVersion) {
  return {
    id: row.id,
    formId: row.form_id,
    version: row.version,
    label: row.label,
    author: row.author || "You",
    notes: row.notes || "",
    schema: row.schema || { fields: [] },
    settings: row.settings || {},
    createdAt: row.created_at,
    when: relativeTime(row.created_at),
    current: row.version === latestVersion,
  };
}

export async function listVersions(formId) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("form_id", formId)
    .order("version", { ascending: false });
  if (error) throw error;
  const latest = data?.[0]?.version ?? 0;
  return (data || []).map((row) => normalizeVersion(row, latest));
}

export async function createVersion({ formId, label, notes = "", author = "You", schema, settings }) {
  const supabase = createClient();
  const { data: last } = await supabase
    .from(TABLE)
    .select("version")
    .eq("form_id", formId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = (last?.version ?? 0) + 1;
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      form_id: formId,
      version: nextVersion,
      label: label || `v${nextVersion}.0`,
      notes,
      author,
      schema: schema || { fields: [] },
      settings: settings || {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return normalizeVersion(data, nextVersion);
}
