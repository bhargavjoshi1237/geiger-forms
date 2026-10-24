import "server-only";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { userCan } from "@/lib/server/auth";

// Data-subject requests (erase, export): a respondent's rows by email across the forms the caller may act on.

const MAX_ROWS = 5000;

// Escapes LIKE wildcards so ilike() matches the address exactly, case-insensitively.
export const likeExact = (value) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

// Responses and partials submitted with `email`, kept only in forms the caller holds `permission` on; `formColumns` adds form columns. Null when the lookup fails.
export async function findRespondentRows(user, email, permission, { responseColumns = "*", partialColumns = "*", formColumns = "" } = {}) {
  const db = formsAdmin();
  const match = likeExact(email);
  const [{ data: responses, error: rErr }, { data: partials, error: pErr }] = await Promise.all([
    db.from("responses").select(responseColumns).ilike("respondent_email", match).limit(MAX_ROWS),
    db.from("partials").select(partialColumns).ilike("respondent_email", match).limit(MAX_ROWS),
  ]);
  if (rErr || pErr) {
    console.error("[respondent.find]", rErr?.message || pErr?.message);
    return null;
  }

  // Authorise each form (grants can be scoped to single forms; unscoped forms answer to their creator), then keep only rows in allowed forms.
  const formIds = [...new Set([...(responses || []), ...(partials || [])].map((r) => r.form_id))];
  const forms = new Map();
  if (formIds.length) {
    const { data } = await db.from("forms").select(`id, project_id, created_by${formColumns ? `, ${formColumns}` : ""}`).in("id", formIds);
    const allowed = await Promise.all((data || []).map(async (f) => ((await userCan(user, f, permission)) ? f : null)));
    for (const f of allowed) if (f) forms.set(f.id, f);
  }
  return {
    forms,
    responses: (responses || []).filter((r) => forms.has(r.form_id)),
    partials: (partials || []).filter((p) => forms.has(p.form_id)),
  };
}
