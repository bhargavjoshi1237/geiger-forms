import { schemaClient } from "@/supabase/components/forms-client";
import { getUser } from "@/lib/supabase/user";
import { relativeTime } from "@/lib/forms/schema";

// REST API keys. The plaintext key is shown once at creation; only its sha256 is stored.
async function sha256Hex(text) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `gf_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function normalizeKey(row) {
  return {
    id: row.id,
    name: row.name,
    prefix: row.key_prefix,
    scopes: row.scopes || ["read"],
    lastUsed: row.last_used_at ? relativeTime(row.last_used_at) : "Never",
    createdAt: row.created_at,
    created: relativeTime(row.created_at),
  };
}

export async function listApiKeys(projectId = null) {
  let query = schemaClient().from("api_keys").select("*").is("deleted_at", null).order("created_at", { ascending: false });
  query = projectId ? query.eq("project_id", projectId) : query.is("project_id", null);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normalizeKey);
}

// Returns { key, secret } — show `secret` to the user once.
export async function createApiKey({ projectId = null, name, scopes = ["read"] }) {
  const secret = randomKey();
  const user = await getUser();
  const { data, error } = await schemaClient()
    .from("api_keys")
    .insert({ project_id: projectId, name, scopes, key_prefix: secret.slice(0, 10), key_hash: await sha256Hex(secret), created_by: user?.id ?? null })
    .select("*")
    .single();
  if (error) throw error;
  return { key: normalizeKey(data), secret };
}

export async function revokeApiKey(id) {
  const { error } = await schemaClient().from("api_keys").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
