import { fail, isEmail, ok, readJson } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { sha256Hex } from "@/lib/server/crypto";
import { logActivity, responseFilePaths } from "@/lib/server/forms";
import { findRespondentRows, likeExact } from "@/lib/server/respondent";
import { removePaths } from "@/lib/server/storage";
import { requireUser } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GDPR erase: hard-deletes a respondent's responses, partials, bookings and files across forms the caller may delete from.
export async function POST(request) {
  const { user, error } = await requireUser();
  if (error) return error;
  const { body, error: bodyError } = await readJson(request, 2 * 1024);
  if (bodyError) return bodyError;
  if (!isEmail(body.email)) return fail("Enter a valid email address.", 400, { code: "validation" });
  const email = body.email.trim().toLowerCase();
  const db = formsAdmin();

  const found = await findRespondentRows(user, email, "forms.response.delete", {
    responseColumns: "id, form_id, answers, metadata",
    partialColumns: "id, form_id",
  });
  if (!found) return fail("Couldn't look up that respondent.", 500);
  const { forms, responses: doomed, partials: doomedPartials } = found;
  if (!doomed.length && !doomedPartials.length) return ok({ count: 0 });

  await removePaths(doomed.flatMap(responseFilePaths));
  const ids = doomed.map((r) => r.id);
  const results = await Promise.all([
    ids.length ? db.from("responses").delete().in("id", ids) : { error: null },
    doomedPartials.length ? db.from("partials").delete().in("id", doomedPartials.map((p) => p.id)) : { error: null },
    db.from("bookings").delete().in("form_id", [...forms.keys()]).ilike("email", likeExact(email)),
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
      logActivity({ projectId: forms.get(formId)?.project_id ?? null, formId, actor: user, action: "respondent.erased", detail: { emailHash, count } }),
    ),
  );
  return ok({ count: doomed.length, partials: doomedPartials.length });
}
