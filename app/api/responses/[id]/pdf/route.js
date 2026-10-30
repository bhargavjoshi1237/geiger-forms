import { verifyPdfToken } from "@/lib/server/crypto";
import { loadForm, loadResponseRow, logAccess } from "@/lib/server/forms";
import { fail, ipHash, notFound, rateLimit, rateLimited, unavailable } from "@/lib/server/http";
import { pdfResponse, renderStoredResponsePdf } from "@/lib/server/response-pdf";
import { isAdminConfigured } from "@/lib/server/supabase-admin";
import { requireResponse } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LINK_RATE_LIMIT = 120;

// A webhook's signed link: no session, external record only, and the token is bound to this response.
async function linkAccess(request, id, token) {
  if (!isAdminConfigured()) return { error: unavailable("The server isn't configured for this action.") };
  if (!verifyPdfToken(token, id)) return { error: fail("This PDF link has expired or is invalid.", 401, { code: "unauthorized" }) };
  if (!(await rateLimit(`pdf-link:${ipHash(request)}`, LINK_RATE_LIMIT))) return { error: rateLimited() };
  const row = await loadResponseRow(id);
  const form = row ? await loadForm({ id: row.form_id }) : null;
  if (!form) return { error: notFound("Response not found.") };
  return { form, row, user: { name: "Signed PDF link" }, audience: "external", via: "signed_link" };
}

async function sessionAccess(id) {
  const access = await requireResponse(id, "forms.response.export");
  return access.error ? access : { ...access, audience: "workspace", via: "session" };
}

// Downloads a response as a PDF with sensitive answers masked, logging the access; `?token=` is the signed-link path for webhooks.
export async function GET(request, { params }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token");
  const { user, form, row, audience, via, error } = token ? await linkAccess(request, id, token) : await sessionAccess(id);
  if (error) return error;
  let bytes;
  try {
    bytes = await renderStoredResponsePdf({ form, row, audience });
  } catch (e) {
    console.error("[responses.pdf]", e);
    return fail("Couldn't generate the PDF.", 500);
  }
  await logAccess({ formId: form.id, responseId: row.id, user, action: "export", metadata: { format: "pdf", via } });
  return pdfResponse(bytes, row);
}
