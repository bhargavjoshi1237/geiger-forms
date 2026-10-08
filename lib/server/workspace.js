import "server-only";
import { getSessionUser, userCan } from "@/lib/server/auth";
import { forbidden, notFound, unauthorized, unavailable } from "@/lib/server/http";
import { isAdminConfigured } from "@/lib/server/supabase-admin";
import { loadForm, loadResponseRow } from "@/lib/server/forms";

// Workspace route guards: session user + RBAC on the target form. Each returns { error } or the loaded context; a null permission skips RBAC.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function requireUser() {
  if (!isAdminConfigured()) return { error: unavailable("The server isn't configured for this action.") };
  const user = await getSessionUser();
  return user ? { user } : { error: unauthorized() };
}

export async function requireForm(formId, permission) {
  const { user, error } = await requireUser();
  if (error) return { error };
  if (!UUID_RE.test(String(formId || ""))) return { error: notFound("Form not found.") };
  const form = await loadForm({ id: formId });
  if (!form) return { error: notFound("Form not found.") };
  if (!(await userCan(user, form, permission))) return { error: forbidden() };
  return { user, form };
}

export async function requireResponse(responseId, permission) {
  const { user, error } = await requireUser();
  if (error) return { error };
  const row = await loadResponseRow(responseId);
  if (!row) return { error: notFound("Response not found.") };
  const form = await loadForm({ id: row.form_id });
  if (!form) return { error: notFound("Form not found.") };
  if (permission && !(await userCan(user, form, permission))) return { error: forbidden() };
  return { user, form, row };
}
