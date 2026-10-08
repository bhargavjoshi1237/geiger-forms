import { appOrigin, fail, formUrl, ok, readJson } from "@/lib/server/http";
import { randomToken } from "@/lib/server/crypto";
import { logActivity, mergeResponseMeta } from "@/lib/server/forms";
import { isEmailConfigured, renderEmail, sendEmail } from "@/lib/server/email";
import { requireResponse } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Mints a fresh edit link (valid windowHours) and emails it to the respondent when possible.
export async function POST(request, { params }) {
  const { id } = await params;
  const { user, form, row, error } = await requireResponse(id, "forms.form.edit");
  if (error) return error;
  const { body, error: bodyError } = await readJson(request, 8 * 1024);
  if (bodyError) return bodyError;
  if (["Approved", "Rejected", "Spam"].includes(row.status)) return fail(`A ${row.status.toLowerCase()} response can't be edited.`, 409, { code: "conflict" });

  const hours = Math.min(24 * 30, Math.max(1, Number(body.windowHours) || 72));
  const token = randomToken(24);
  const expiresAt = new Date(Date.now() + hours * 3_600_000).toISOString();
  const updated = await mergeResponseMeta(row.id, { editExpiresAt: expiresAt, editRequestedBy: user.id }, { edit_token: token });
  if (!updated) return fail("Couldn't create the edit link.", 500);

  const url = formUrl(appOrigin(request), form.slug, { edit: token });
  let emailed = false;
  if (row.respondent_email && isEmailConfigured()) {
    const message = typeof body.message === "string" && body.message.trim() ? body.message.trim().slice(0, 4000) : `Please review and update your response to "${form.title}".`;
    const result = await sendEmail({
      to: row.respondent_email,
      subject: `Update requested: ${form.title}`,
      text: `${message}\n\n${url}\n\nThis link expires ${new Date(expiresAt).toUTCString()}.`,
      html: renderEmail({ heading: form.title, text: `${message}\n\nThis link expires ${new Date(expiresAt).toUTCString()}.`, cta: { url, label: "Update your response" } }),
      replyTo: user.email,
    });
    emailed = result.sent;
  }
  await logActivity({ projectId: form.projectId, formId: form.id, responseId: row.id, actor: user, action: "response.edit_requested", detail: { hours, emailed } });
  return ok({ url, emailed, expiresAt });
}
