import { fail, json, notFound, unavailable } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { loadPublishedForm } from "@/lib/server/forms";
import { includedFields } from "@/lib/forms/logic";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CHOICE = new Set(["select", "dropdown", "multiselect", "checkbox", "ranking"]);
const NUMERIC = new Set(["rating", "scale", "nps"]);

function bump(counts, key) {
  counts[key] = (counts[key] || 0) + 1;
}

// Aggregated poll results (only when the form opts in with showPollResults).
export async function GET(request, { params }) {
  const { slug } = await params;
  const db = formsAdmin();
  if (!db) return unavailable();
  const form = await loadPublishedForm(slug);
  if (!form) return notFound("Form not found.");
  if (!form.settings.showPollResults) return fail("Results aren't public for this form.", 403, { code: "gate" });

  const fields = includedFields(form.fieldDefs).filter((f) => !f.sensitive && (CHOICE.has(f.type) || NUMERIC.has(f.type)));
  const { data, error } = await db
    .from("responses")
    .select("answers")
    .eq("form_id", form.id)
    .is("deleted_at", null)
    .neq("status", "Spam")
    .order("submitted_at", { ascending: false })
    .limit(5000);
  if (error) {
    console.error("[api.results]", error.message);
    return fail("Couldn't load results.", 500);
  }

  const out = fields.map((field) => {
    const counts = {};
    if (CHOICE.has(field.type) && field.type !== "checkbox") for (const o of field.options) counts[o] = 0;
    let total = 0;
    let sum = 0;
    for (const { answers } of data || []) {
      const v = answers?.[field.id];
      if (v == null || v === "" || (Array.isArray(v) && !v.length)) continue;
      total += 1;
      if (field.type === "checkbox") bump(counts, v ? "Yes" : "No");
      // Ranking counts first-place picks.
      else if (field.type === "ranking") bump(counts, String(Array.isArray(v) ? v[0] : v));
      else if (Array.isArray(v)) v.forEach((x) => bump(counts, String(x)));
      else {
        bump(counts, String(v));
        if (NUMERIC.has(field.type)) sum += Number(v) || 0;
      }
    }
    const entry = { fieldId: field.id, label: field.label || field.title, type: field.type, counts, total };
    if (NUMERIC.has(field.type)) entry.average = total ? Math.round((sum / total) * 100) / 100 : null;
    return entry;
  });
  return json({ ok: true, fields: out }, 200, { "Cache-Control": "no-store" });
}
