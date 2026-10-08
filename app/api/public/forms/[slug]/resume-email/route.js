import { appOrigin, fail, formUrl, ipHash, isEmail, notFound, ok, rateLimit, rateLimited, readJson, unavailable } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { loadPublishedForm } from "@/lib/server/forms";
import { renderEmail, sendEmail } from "@/lib/server/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Emails a "continue where you left off" link for a saved partial.
export async function POST(request, { params }) {
  const { slug } = await params;
  const db = formsAdmin();
  if (!db) return unavailable();
  const { body, error } = await readJson(request, 4 * 1024);
  if (error) return error;
  if (!isEmail(body.email)) return fail("Enter a valid email address.", 400, { code: "validation" });
  if (typeof body.token !== "string" || body.token.length < 16 || body.token.length > 128) return fail("A resume token is required.", 400);
  const form = await loadPublishedForm(slug);
  if (!form) return notFound("Form not found.");
  if (!(await rateLimit(`resume:${form.id}:${ipHash(request)}`, 5))) return rateLimited();
  const email = body.email.trim();
  const { data, error: dbError } = await db
    .from("partials")
    .update({ respondent_email: email })
    .eq("form_id", form.id)
    .eq("token", body.token)
    .is("completed_at", null)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (dbError) console.error("[api.resume-email]", dbError.message);
  if (!data) return notFound("This saved response is no longer available.");
  const link = formUrl(appOrigin(request), form.slug, { resume: body.token });
  const text = `You saved your progress on "${form.title}". Use the link below to pick up where you left off.`;
  const result = await sendEmail({
    to: email,
    subject: `Continue: ${form.title}`,
    text: `${text}\n\n${link}`,
    html: renderEmail({ heading: form.title, text, cta: { url: link, label: "Continue your response" } }),
  });
  return ok({ sent: result.sent });
}
