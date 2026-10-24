import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { adminClient } from "@/lib/server/supabase-admin";

// Reads the shared suite session (the @supabase/ssr auth cookie) in a route handler or server component.
export async function sessionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const store = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      // Route handlers may refresh the session; server components can't write cookies, so ignore there.
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {}
      },
    },
  });
}

// An auth user as { id, email, name }, named the way forms.rbac_list_members names members.
function personOf(authUser) {
  const meta = authUser.user_metadata ?? {};
  const email = authUser.email ?? "";
  return { id: authUser.id, email, name: meta.full_name || meta.name || email.split("@")[0] || "User" };
}

// Verified signed-in user ({ id, email, name }) or null.
export async function getSessionUser() {
  const sb = await sessionClient();
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return null;
  return personOf(data.user);
}

// True when the session user holds `permission` in the form's project (legacy unscoped forms: only their creator).
export async function userCan(user, form, permission) {
  if (!user) return false;
  const projectId = form?.project_id ?? form?.projectId;
  if (!projectId) return (form?.created_by ?? form?.createdBy) === user.id;
  const sb = await sessionClient();
  const { data, error } = await sb.schema("forms").rpc("rbac_allows", {
    p_permission: permission,
    p_project: projectId,
    p_scope_type: "form",
    p_scope_id: form.id,
  });
  if (error) {
    console.error("[auth.userCan]", error.message);
    return false;
  }
  return Boolean(data);
}

// Assignable / @mentionable people on a form: project members via forms.rbac_list_members under the caller's session, else just the caller.
export async function formMembers(user, form) {
  if (!user) return [];
  const projectId = form?.project_id ?? form?.projectId;
  if (!projectId) return [{ id: user.id, name: user.name, email: user.email }];
  const sb = await sessionClient();
  const { data, error } = await sb.schema("forms").rpc("rbac_list_members", { p_project_id: projectId });
  if (error) {
    console.error("[auth.formMembers]", error.message);
    return [];
  }
  return (data || []).map((m) => ({ id: m.user_id, name: m.name, email: m.email }));
}

// The active project member whose email (else display name) matches `query`, via the service role for flows without a session (automations).
export async function findProjectMember(form, query) {
  const projectId = form?.project_id ?? form?.projectId;
  const needle = String(query || "").trim().toLowerCase();
  const admin = adminClient();
  if (!projectId || !needle || !admin) return null;
  try {
    const { data, error } = await admin
      .schema("forms")
      .from("role_grants")
      .select("user_id")
      .eq("project_id", projectId)
      .eq("status", "active")
      .is("deleted_at", null)
      .limit(200);
    if (error) throw error;
    const users = await Promise.all([...new Set(data.map((g) => g.user_id))].map(async (id) => (await admin.auth.admin.getUserById(id)).data?.user));
    const members = users.filter(Boolean).map(personOf);
    return members.find((m) => m.email.toLowerCase() === needle) || members.find((m) => m.name.toLowerCase() === needle) || null;
  } catch (e) {
    console.error("[auth.findProjectMember]", e?.message || e);
    return null;
  }
}
