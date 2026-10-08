import { appOrigin, fail, formUrl, isEmail, ok, readJson } from "@/lib/server/http";
import { signLinkToken } from "@/lib/server/crypto";
import { logActivity } from "@/lib/server/forms";
import { isEmailConfigured, renderEmail, sendEmail } from "@/lib/server/email";
import { requireForm } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SIGNED_LINK_DAYS = 30;

// Emails the form link to each recipient (distribution / "send for signing"); signed links are per-recipient.
export async function POST(request, { params }) {
  const { id } = await params;
  const { user, form, error } = await requireForm(id, "forms.form.edit");
  if (error) return error;
  const { body, error: bodyError } = await readJson(request, 64 * 1024);
  if (bodyError) return bodyError;
  if (form.status !== "Published") return fail("Publish the form before sending it.", 409, { code: "not_published" });
  const emails = [...new Set((Array.isArray(body.emails) ? body.emails : []).map((e) => String(e).trim().toLowerCase()).filter(isEmail))].slice(0, 200);
  if (!emails.length) return fail("Add at least one valid email address.", 400, { code: "validation" });
  if (!isEmailConfigured()) return ok({ sent: 0, failed: emails.length, configured: false });

  const origin = appOrigin(request);
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";
  const sender = user.name || user.email;
  const expiresAt = Date.now() + SIGNED_LINK_DAYS * 86_400_000;
  let sent = 0;
  for (let i = 0; i < emails.length; i += 5) {
    const batch = emails.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map((to) => {
        const token = body.signed ? signLinkToken({ formId: form.id, email: to, expiresAt }) : null;
        const url = formUrl(origin, form.slug, token ? { t: token } : {});
        const intro = message || `${sender} invited you to ${body.signed ? "review and sign" : "fill out"} "${form.title}".`;
        return sendEmail({
          to,
          subject: body.signed ? `Please sign: ${form.title}` : `You're invited: ${form.title}`,
          text: `${intro}\n\n${url}`,
          html: renderEmail({ heading: form.title, text: intro, cta: { url, label: body.signed ? "Review & sign" : "Open form" } }),
          replyTo: user.email,
        });
      }),
    );
    sent += results.filter((r) => r.status === "fulfilled" && r.value?.sent).length;
  }
  await logActivity({ projectId: form.projectId, formId: form.id, actor: user, action: "form.invited", detail: { title: form.title, count: sent, signed: Boolean(body.signed) } });
  return ok({ sent, failed: emails.length - sent, configured: true });
}
