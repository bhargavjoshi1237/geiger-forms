import { createClient, isSupabaseConfigured } from "./client";
import { schemaClient } from "@/supabase/components/forms-client";
import rbacConfig from "@/geiger-rbac.config";

// Data-access layer for authorization. Mirrors geiger-events/lib/supabase/rbac.js.
// Roles are SHARED suite-wide (public.roles); grants are per-product
// (forms.role_grants) so adopting Forms never changes access in another app.
// Pure: validate, console.error on failure, return null/false/[] — never throw.

const ROLES_TABLE = "roles";
const GRANTS_TABLE = "role_grants";

function publicClient() {
  return createClient().schema("public");
}

function grantsClient() {
  return schemaClient();
}

export function normalizeRole(row) {
  if (!row) return null;
  const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    key: row.key ?? meta.key ?? null,
    name: row.name ?? "",
    description: row.description ?? "",
    color: row.color ?? "slate",
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    isSystem: row.is_system ?? false,
    sort: row.sort ?? 0,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    ...meta,
  };
}

export function normalizeGrant(row) {
  if (!row) return null;
  const meta = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  return {
    id: row.id,
    projectId: row.project_id ?? null,
    userId: row.user_id ?? null,
    roleId: row.role_id ?? null,
    scope: row.scope && typeof row.scope === "object" ? row.scope : {},
    status: row.status ?? "active",
    grantedBy: row.granted_by ?? null,
    createdAt: row.created_at ?? null,
    deletedAt: row.deleted_at ?? null,
    ...meta,
  };
}

function roleToRow(input) {
  const row = {};
  const map = {
    projectId: "project_id",
    key: "key",
    name: "name",
    description: "description",
    color: "color",
    isSystem: "is_system",
    sort: "sort",
    createdBy: "created_by",
  };
  for (const [key, col] of Object.entries(map)) {
    if (key in input) row[col] = input[key];
  }
  if ("permissions" in input) {
    row.permissions = Array.isArray(input.permissions) ? input.permissions : [];
  }
  return row;
}

export async function listRoles(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await publicClient()
      .from(ROLES_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("is_system", { ascending: false })
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      console.error("[rbac.listRoles]", error.message);
      return null;
    }
    return (data || []).map(normalizeRole);
  } catch (e) {
    console.error("[rbac.listRoles]", e);
    return null;
  }
}

export async function createRole(input) {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = roleToRow(input);
    if (input.id) payload.id = input.id;
    const { data, error } = await publicClient()
      .from(ROLES_TABLE)
      .insert(payload)
      .select("*")
      .single();
    if (error) {
      console.error("[rbac.createRole]", error.message);
      return null;
    }
    return normalizeRole(data);
  } catch (e) {
    console.error("[rbac.createRole]", e);
    return null;
  }
}

export async function updateRole(id, patch) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await publicClient()
      .from(ROLES_TABLE)
      .update(roleToRow(patch))
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[rbac.updateRole]", error.message);
      return null;
    }
    return normalizeRole(data);
  } catch (e) {
    console.error("[rbac.updateRole]", e);
    return null;
  }
}

export async function softDeleteRole(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const { error } = await publicClient()
      .from(ROLES_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[rbac.softDeleteRole]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[rbac.softDeleteRole]", e);
    return false;
  }
}

export async function ensureSystemRoles(projectId, createdBy = null) {
  if (!projectId || !isSupabaseConfigured()) return [];
  try {
    const existing = await listRoles(projectId);
    if (existing === null) return [];
    const have = new Set(existing.map((r) => r.key).filter(Boolean));
    const missing = rbacConfig.systemRoles.filter((r) => !have.has(r.key));
    if (missing.length === 0) return existing;
    const payload = missing.map((role) => ({
      project_id: projectId,
      key: role.key,
      name: role.name,
      description: role.description,
      color: role.color,
      permissions: [...role.permissions],
      is_system: true,
      sort: role.sort,
      created_by: createdBy,
      metadata: { key: role.key },
    }));
    const { error } = await publicClient().from(ROLES_TABLE).insert(payload);
    if (error) {
      console.error("[rbac.ensureSystemRoles]", error.message);
      return existing;
    }
    return (await listRoles(projectId)) ?? existing;
  } catch (e) {
    console.error("[rbac.ensureSystemRoles]", e);
    return [];
  }
}

export async function listGrants(projectId) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await grantsClient()
      .from(GRANTS_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null);
    if (error) {
      console.error("[rbac.listGrants]", error.message);
      return null;
    }
    return (data || []).map(normalizeGrant);
  } catch (e) {
    console.error("[rbac.listGrants]", e);
    return null;
  }
}

export async function listUserGrants(projectId, userId) {
  if (!projectId || !userId || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await grantsClient()
      .from(GRANTS_TABLE)
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .is("deleted_at", null);
    if (error) {
      console.error("[rbac.listUserGrants]", error.message);
      return null;
    }
    return (data || []).map(normalizeGrant);
  } catch (e) {
    console.error("[rbac.listUserGrants]", e);
    return null;
  }
}

export async function ensureMembership(projectId, defaultRoleId = null) {
  if (!projectId || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await grantsClient().rpc("rbac_ensure_membership", {
      p_project_id: projectId,
      p_default_role: defaultRoleId ?? null,
    });
    if (error) {
      console.error("[rbac.ensureMembership]", error.message);
      return null;
    }
    return data ?? null;
  } catch (e) {
    console.error("[rbac.ensureMembership]", e);
    return null;
  }
}

export async function grantRole({ id, projectId, userId, roleId, scope = {}, grantedBy = null }) {
  if (!projectId || !userId || !roleId || !isSupabaseConfigured()) return null;
  try {
    const sb = grantsClient();
    const { data: existing } = await sb
      .from(GRANTS_TABLE)
      .select("id")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .eq("role_id", roleId)
      .limit(1)
      .maybeSingle();
    const payload = {
      project_id: projectId,
      user_id: userId,
      role_id: roleId,
      scope: scope || {},
      status: "active",
      granted_by: grantedBy,
      deleted_at: null,
    };
    const query = existing?.id
      ? sb.from(GRANTS_TABLE).update(payload).eq("id", existing.id)
      : sb.from(GRANTS_TABLE).insert(id ? { ...payload, id } : payload);
    const { data, error } = await query.select("*").single();
    if (error) {
      console.error("[rbac.grantRole]", error.message);
      return null;
    }
    return normalizeGrant(data);
  } catch (e) {
    console.error("[rbac.grantRole]", e);
    return null;
  }
}

export async function updateGrantScope(id, scope) {
  if (!id || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await grantsClient()
      .from(GRANTS_TABLE)
      .update({ scope: scope || {} })
      .eq("id", id)
      .select("*")
      .single();
    if (error) {
      console.error("[rbac.updateGrantScope]", error.message);
      return null;
    }
    return normalizeGrant(data);
  } catch (e) {
    console.error("[rbac.updateGrantScope]", e);
    return null;
  }
}

export async function revokeGrant(id) {
  if (!id || !isSupabaseConfigured()) return false;
  try {
    const { error } = await grantsClient()
      .from(GRANTS_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[rbac.revokeGrant]", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[rbac.revokeGrant]", e);
    return false;
  }
}

export async function setMemberRole({ projectId, userId, roleId, scope, grantedBy = null, currentGrants = [] }) {
  if (!projectId || !userId || !roleId) return null;
  const mine = currentGrants.filter((g) => g.userId === userId);
  const inherited = scope ?? mine.find((g) => g.scope)?.scope ?? {};
  for (const g of mine.filter((g) => g.roleId !== roleId)) {
    await revokeGrant(g.id);
  }
  return grantRole({ projectId, userId, roleId, scope: inherited, grantedBy });
}
