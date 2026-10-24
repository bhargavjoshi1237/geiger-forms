import { fail, forbidden, notFound, ok, readJson } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { formMembers, userCan } from "@/lib/server/auth";
import { loadForm, logActivity } from "@/lib/server/forms";
import { notifyAssignment } from "@/lib/server/flow";
import { requireUser } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IDS = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Assigns responses to a project member (assigneeId null clears it), logs each change and notifies the new assignee.
export async function POST(request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { body, error: bodyError } = await readJson(request, 32 * 1024);
  if (bodyError) return bodyError;

  const ids = [...new Set(Array.isArray(body.ids) ? body.ids.map(String) : [])];
  const assigneeId = body.assigneeId ?? null;
  if (!ids.length || ids.length > MAX_IDS || !ids.every((id) => UUID_RE.test(id))) {
    return fail(`Choose between 1 and ${MAX_IDS} responses.`, 400, { code: "validation" });
  }
  if (assigneeId !== null && !UUID_RE.test(String(assigneeId))) return fail("Choose a teammate to assign.", 400, { code: "validation" });

  const db = formsAdmin();
  const { data: rows, error: loadError } = await db
    .from("responses")
    .select("id, form_id, assignee, assignee_id, respondent_name, respondent_email")
    .in("id", ids)
    .is("deleted_at", null);
  if (loadError) {
    console.error("[api.assign.load]", loadError.message);
    return fail("Couldn't load those responses.", 500);
  }
  if (rows.length !== ids.length) return notFound("Response not found.");

  // Every form must be editable and its responses viewable by the caller (the reply carries full rows), and the assignee must belong to each form's workspace.
  const forms = new Map();
  const rosters = new Map();
  let assignee = null;
  for (const formId of new Set(rows.map((r) => r.form_id))) {
    const form = await loadForm({ id: formId });
    if (!form) return notFound("Form not found.");
    if (!(await userCan(user, form, "forms.form.edit")) || !(await userCan(user, form, "forms.responses.view"))) return forbidden();
    if (assigneeId) {
      const key = form.projectId || "";
      if (!rosters.has(key)) rosters.set(key, await formMembers(user, form));
      assignee = rosters.get(key).find((m) => m.id === assigneeId);
      if (!assignee) return fail("That person isn't a member of this workspace.", 422, { code: "not_member" });
    }
    forms.set(formId, form);
  }

  const { data: updated, error: dbError } = await db
    .from("responses")
    .update({ assignee_id: assigneeId, assignee: assignee?.name ?? null })
    .in("id", ids)
    .select("*, forms(title, slug, project_id)");
  if (dbError) {
    console.error("[api.assign]", dbError.message);
    return fail("Couldn't save the assignee.", 500);
  }

  const changed = rows.filter((r) => (r.assignee_id ?? null) !== assigneeId || (!assigneeId && r.assignee));
  const detail = { assignee: assignee?.name ?? null, assigneeId };
  await Promise.allSettled([
    ...changed.map((r) => {
      const form = forms.get(r.form_id);
      return logActivity({ projectId: form.projectId, formId: form.id, responseId: r.id, actor: user, action: "response.assigned", detail: { title: form.title, ...detail } });
    }),
    ...[...forms.values()].map((form) => notifyAssignment({ form, rows: changed.filter((r) => r.form_id === form.id), assigneeId, actor: user })),
  ]);

  return ok({ responses: updated.map((row) => ({ ...row, edit_token: undefined })) });
}
