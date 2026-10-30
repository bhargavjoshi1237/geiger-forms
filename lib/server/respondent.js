import "server-only";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { userCan } from "@/lib/server/auth";
import { emailIndex } from "@/lib/server/crypto";

// Data-subject requests (erase, export): a respondent's rows by email across the forms the caller may act on.

const MAX_ROWS = 5000;

// Escapes LIKE wildcards so ilike() matches the address exactly, case-insensitively.
export const likeExact = (value) => value.replace(/[\\%_]/g, (c) => `\\${c}`);

// Remembers a partial's email by its keyed index when the form treats that email as sensitive, keeping the rest of the row's metadata.
export async function indexPartialEmail(db, formId, token, email) {
  const index = emailIndex(email);
  if (!index) return;
  const match = (query) => query.eq("form_id", formId).eq("token", token);
  const { data } = await match(db.from("partials").select("metadata")).maybeSingle();
  if (!data || data.metadata?.emailIndex === index) return;
  const { error } = await match(db.from("partials").update({ metadata: { ...(data.metadata || {}), emailIndex: index } }));
  if (error) console.error("[respondent.indexPartial]", error.message);
}

const uniqueById = (...lists) => [...new Map(lists.flat().map((r) => [r.id, r])).values()];

// Responses and partials submitted with `email`, or holding it as a sensitive answer (found by keyed index), kept only in forms the caller holds `permission` on; `formColumns` adds form columns. Null when the lookup fails.
export async function findRespondentRows(user, email, permission, { responseColumns = "*", partialColumns = "*", formColumns = "" } = {}) {
  const db = formsAdmin();
  const match = likeExact(email);
  const index = emailIndex(email);
  const byIndex = (table, columns) => (index ? db.from(table).select(columns).contains("metadata", { emailIndex: index }).limit(MAX_ROWS) : { data: [] });
  const results = await Promise.all([
    db.from("responses").select(responseColumns).ilike("respondent_email", match).limit(MAX_ROWS),
    byIndex("responses", responseColumns),
    db.from("partials").select(partialColumns).ilike("respondent_email", match).limit(MAX_ROWS),
    byIndex("partials", partialColumns),
  ]);
  const failed = results.find((r) => r.error);
  if (failed) {
    console.error("[respondent.find]", failed.error.message);
    return null;
  }
  const responses = uniqueById(results[0].data || [], results[1].data || []);
  const partials = uniqueById(results[2].data || [], results[3].data || []);

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
