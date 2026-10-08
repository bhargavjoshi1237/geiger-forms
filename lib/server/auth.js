import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

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

// Verified signed-in user ({ id, email, name }) or null.
export async function getSessionUser() {
  const sb = await sessionClient();
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return null;
  const meta = data.user.user_metadata ?? {};
  const email = data.user.email ?? "";
  return { id: data.user.id, email, name: meta.full_name || meta.name || email.split("@")[0] || "User" };
}

// True when the session user holds `permission` in the form's project (unscoped forms: any signed-in user).
export async function userCan(user, form, permission) {
  if (!user) return false;
  if (!form?.project_id && !form?.projectId) return true;
  const sb = await sessionClient();
  const { data, error } = await sb.schema("forms").rpc("rbac_allows", {
    p_permission: permission,
    p_project: form.project_id ?? form.projectId,
    p_scope_type: "form",
    p_scope_id: form.id,
  });
  if (error) {
    console.error("[auth.userCan]", error.message);
    return false;
  }
  return Boolean(data);
}
