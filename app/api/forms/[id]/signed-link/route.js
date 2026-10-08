import { appOrigin, formUrl, isEmail, ok, readJson, unavailable } from "@/lib/server/http";
import { signLinkToken } from "@/lib/server/crypto";
import { logActivity } from "@/lib/server/forms";
import { requireForm } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Mints an expiring, HMAC-signed respondent link (optionally bound to an email).
export async function POST(request, { params }) {
  const { id } = await params;
  const { user, form, error } = await requireForm(id, "forms.form.edit");
  if (error) return error;
  const { body, error: bodyError } = await readJson(request, 4 * 1024);
  if (bodyError) return bodyError;
  const hours = Math.min(24 * 90, Math.max(1, Number(body.expiresInHours) || 72));
  const email = isEmail(body.email) ? body.email.trim().toLowerCase() : "";
  const expiresAt = Date.now() + hours * 3_600_000;
  const token = signLinkToken({ formId: form.id, email, expiresAt });
  if (!token) return unavailable("Link signing isn't configured (set FORMS_LINK_SECRET).");
  await logActivity({ projectId: form.projectId, formId: form.id, actor: user, action: "form.signed_link", detail: { title: form.title, email: email || null, hours } });
  return ok({ url: formUrl(appOrigin(request), form.slug, { t: token }), expiresAt: new Date(expiresAt).toISOString() });
}
