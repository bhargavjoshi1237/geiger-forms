import { fail, isEmail, ok, readJson } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { userCan } from "@/lib/server/auth";
import { sha256Hex } from "@/lib/server/crypto";
import { logActivity, responseFilePaths } from "@/lib/server/forms";
import { removePaths } from "@/lib/server/storage";
import { requireUser } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const likeExact = (value) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

// GDPR erase: hard-deletes a respondent's responses, partials, bookings and files across forms the caller may delete from.
export async function POST(request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { body, error: bodyError } = await readJson(request, 2 * 1024);
  if (bodyError) return bodyError;
  if (!isEmail(body.email)) return fail("Enter a valid email address.", 400, { code: "validation" });
  const email = body.email.trim().toLowerCase();
  const db = formsAdmin();

  const [{ data: responses, error: rErr }, { data: partials, error: pErr }] = await Promise.all([
    db.from("responses").select("id, form_id, answers, metadata").ilike("respondent_email", likeExact(email)).limit(5000),
    db.from("partials").select("id, form_id").ilike("respondent_email", likeExact(email)).limit(5000),
  ]);
  if (rErr || pErr) {
    console.error("[api.erase]", rErr?.message || pErr?.message);
    return fail("Couldn't look up that respondent.", 500);
  }

  // Authorise per project once, then keep only rows in forms the caller may delete from.
  const formIds = [...new Set([...(responses || []), ...(partials || [])].map((r) => r.form_id))];
  const allowed = new Map();
  if (formIds.length) {
    const { data: forms } = await db.from("forms").select("id, project_id").in("id", formIds);
    const byProject = new Map();
    for (const f of forms || []) {
      const key = f.project_id || "";
      if (!byProject.has(key)) byProject.set(key, await userCan(user, { id: f.id, project_id: f.project_id }, "forms.response.delete"));
      if (byProject.get(key)) allowed.set(f.id, f.project_id);
    }
  }
  const doomed = (responses || []).filter((r) => allowed.has(r.form_id));
  const doomedPartials = (partials || []).filter((p) => allowed.has(p.form_id));
  if (!doomed.length && !doomedPartials.length) return ok({ count: 0 });

  await removePaths(doomed.flatMap(responseFilePaths));
  const ids = doomed.map((r) => r.id);
  const results = await Promise.all([
    ids.length ? db.from("responses").delete().in("id", ids) : { error: null },
    doomedPartials.length ? db.from("partials").delete().in("id", doomedPartials.map((p) => p.id)) : { error: null },
    db.from("bookings").delete().in("form_id", [...allowed.keys()]).ilike("email", likeExact(email)),
  ]);
  const failed = results.find((r) => r.error);
  if (failed) {
    console.error("[api.erase.delete]", failed.error.message);
    return fail("Some records couldn't be erased. Please try again.", 500);
  }

  const emailHash = sha256Hex(email).slice(0, 16);
  const perForm = new Map();
  for (const r of doomed) perForm.set(r.form_id, (perForm.get(r.form_id) || 0) + 1);
  await Promise.allSettled(
    [...perForm].map(([formId, count]) =>
      logActivity({ projectId: allowed.get(formId) ?? null, formId, actor: user, action: "respondent.erased", detail: { emailHash, count } }),
    ),
  );
  return ok({ count: doomed.length, partials: doomedPartials.length });
}
