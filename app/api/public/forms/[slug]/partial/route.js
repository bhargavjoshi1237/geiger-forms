import { MAX_BODY_BYTES, fail, ipHash, isEmail, jsonSize, notFound, ok, rateLimit, rateLimited, readJson, unavailable } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { loadPublishedForm } from "@/lib/server/forms";
import { decryptAnswers, encryptSensitive, randomToken } from "@/lib/server/crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const validToken = (t) => typeof t === "string" && t.length >= 16 && t.length <= 128;

// Resume a saved partial by its token.
export async function GET(request, { params }) {
  const { slug } = await params;
  const db = formsAdmin();
  if (!db) return unavailable();
  const token = new URL(request.url).searchParams.get("token");
  if (!validToken(token)) return fail("A resume token is required.", 400);
  const form = await loadPublishedForm(slug);
  if (!form) return notFound("Form not found.");
  const { data, error } = await db
    .from("partials")
    .select("answers, page_index, completed_at")
    .eq("form_id", form.id)
    .eq("token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) console.error("[api.partial.get]", error.message);
  if (!data || data.completed_at) return notFound("This saved response is no longer available.");
  return ok({ answers: decryptAnswers(data.answers || {}), pageIndex: data.page_index ?? 0 });
}

// Create (no token) or update (token) an in-progress response.
export async function POST(request, { params }) {
  const { slug } = await params;
  const db = formsAdmin();
  if (!db) return unavailable();
  const { body, error } = await readJson(request, MAX_BODY_BYTES + 8 * 1024);
  if (error) return error;
  const answers = body.answers && typeof body.answers === "object" && !Array.isArray(body.answers) ? body.answers : {};
  if (jsonSize(answers) > MAX_BODY_BYTES) return fail("Your answers are too large to save.", 413);
  const form = await loadPublishedForm(slug);
  if (!form) return notFound("Form not found.");
  if (!(await rateLimit(`partial:${form.id}:${ipHash(request)}`, 600))) return rateLimited();

  // Inline signature images aren't kept in drafts; the respondent signs again on resume.
  const known = new Set(form.fieldDefs.map((f) => f.id));
  const kept = {};
  for (const [k, v] of Object.entries(answers)) {
    if (!known.has(k) && k !== "__coupon") continue;
    if (typeof v === "string" && v.startsWith("data:")) continue;
    kept[k] = v;
  }
  const row = {
    answers: encryptSensitive(form.fieldDefs, kept).answers,
    last_field_id: typeof body.lastFieldId === "string" ? body.lastFieldId.slice(0, 80) : null,
    page_index: Math.max(0, Math.min(500, Number(body.pageIndex) || 0)),
    progress: Math.max(0, Math.min(100, Number(body.progress) || 0)),
    ...(isEmail(body.email) && !form.settings.anonymous ? { respondent_email: body.email.trim() } : {}),
  };

  if (validToken(body.token)) {
    const { data, error: dbError } = await db
      .from("partials")
      .update(row)
      .eq("form_id", form.id)
      .eq("token", body.token)
      .is("completed_at", null)
      .is("deleted_at", null)
      .select("token")
      .maybeSingle();
    if (dbError) console.error("[api.partial.update]", dbError.message);
    if (data) return ok({ token: data.token });
  }
  const token = randomToken(24);
  const { error: insertError } = await db.from("partials").insert({ ...row, form_id: form.id, token });
  if (insertError) {
    console.error("[api.partial.insert]", insertError.message);
    return fail("Couldn't save your progress.", 500);
  }
  return ok({ token });
}
