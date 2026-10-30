import { createClient } from "@supabase/supabase-js";
import { adminClient, formsAdmin } from "@/lib/server/supabase-admin";
import { MCP_RATE_LIMIT_PER_MINUTE } from "./config";

// A client acting as the user, so database rules apply to everything a tool reads or writes.
export function userClient(token, schema = "forms") {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    db: { schema },
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function requireAdmin() {
  const admin = adminClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return admin.schema("public");
}

async function loadConnection(token, userId, clientId) {
  const { data, error } = await userClient(token, "public")
    .from("mcp_connections")
    .select("id,project_ids,access")
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`loadConnection: ${error.message}`);
  if (!data) return null;
  return { id: data.id, projectIds: data.project_ids || [], access: data.access };
}

async function isRateLimited(userId, clientId) {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count, error } = await requireAdmin()
    .from("mcp_audit_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("client_id", clientId)
    .gte("created_at", since);
  if (error) throw new Error(`isRateLimited: ${error.message}`);
  return (count || 0) >= MCP_RATE_LIMIT_PER_MINUTE;
}

async function writeAudit(entry) {
  const { error } = await requireAdmin().from("mcp_audit_log").insert(entry);
  if (error) throw new Error(`writeAudit: ${error.message}`);
}

// Issues the user's saved role the way a first visit to Forms does.
async function ensureMembership(db, projectId) {
  const { error } = await db.rpc("rbac_ensure_membership", { p_project_id: projectId, p_default_role: null });
  if (error) console.error("[mcp.ensureMembership]", error.message);
}

// The same check userCan makes, under the MCP token instead of the session cookie. No form id means project-level.
async function can(db, permission, projectId, formId) {
  const args = { p_permission: permission, p_project: projectId, ...(formId ? { p_scope_type: "form", p_scope_id: formId } : {}) };
  const { data, error } = await db.rpc("rbac_allows", args);
  if (error) throw new Error(`can: ${error.message}`);
  return Boolean(data);
}

// Service-role lookups that return only ids, so a user with no role yet can be issued one before RLS would hide the row.
async function loadFormTarget(formId) {
  const db = formsAdmin();
  if (!db) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  const { data, error } = await db.from("forms").select("id,project_id").eq("id", formId).eq("is_template", false).is("deleted_at", null).maybeSingle();
  if (error) throw new Error(`loadFormTarget: ${error.message}`);
  return data ? { formId: data.id, projectId: data.project_id } : null;
}

async function loadResponseTarget(responseId) {
  const db = formsAdmin();
  if (!db) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  const { data, error } = await db.from("responses").select("form_id").eq("id", responseId).is("deleted_at", null).maybeSingle();
  if (error) throw new Error(`loadResponseTarget: ${error.message}`);
  return data ? loadFormTarget(data.form_id) : null;
}

export const defaultDeps = {
  userClient,
  loadConnection,
  isRateLimited,
  writeAudit,
  ensureMembership,
  can,
  loadFormTarget,
  loadResponseTarget,
};
