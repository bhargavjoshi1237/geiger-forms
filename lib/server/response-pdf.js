import "server-only";
import { signPdfToken } from "@/lib/server/crypto";
import { responseFilePaths } from "@/lib/server/forms";
import { appOrigin } from "@/lib/server/http";
import { renderResponsePdf, responsePdfFilename } from "@/lib/server/pdf";
import { downloadFile, isFormPath } from "@/lib/server/storage";

// Delivery around the PDF renderer: stored signatures, email attachments and signed links.

const ATTACHMENT_TIMEOUT_MS = 6_000;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const LINK_TTL_MS = 60 * 60 * 1000;

// Renders a response row, reading only signature files that this row references inside its form's upload prefix.
export function renderStoredResponsePdf({ form, row, audience }) {
  const allowed = new Set(responseFilePaths(row));
  const loadFile = (path) => (allowed.has(path) && isFormPath(form.id, path) ? downloadFile(path) : null);
  return renderResponsePdf({ form, response: row, audience, loadFile });
}

// The PDF as a Resend attachment, or null on any failure or timeout: a PDF problem never costs the email or the submission.
export async function responsePdfAttachment({ form, row, audience }) {
  let timer;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("Timed out")), ATTACHMENT_TIMEOUT_MS);
    });
    const bytes = await Promise.race([renderStoredResponsePdf({ form, row, audience }), timeout]);
    if (bytes.length > MAX_ATTACHMENT_BYTES) return null;
    return { filename: responsePdfFilename(row), content: Buffer.from(bytes).toString("base64") };
  } catch (e) {
    console.error("[pdf.attachment]", e?.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// One-hour signed link to the external record, or null without a signing secret or an absolute app URL (NEXT_PUBLIC_APP_URL).
export function responsePdfLink(responseId) {
  const origin = appOrigin();
  if (!/^https?:\/\//.test(origin)) return null;
  const token = signPdfToken(responseId, Date.now() + LINK_TTL_MS);
  return token ? `${origin}/api/responses/${responseId}/pdf?token=${token}` : null;
}

// Binary reply shared by the session, signed-link and API-key routes.
export function pdfResponse(bytes, row) {
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${responsePdfFilename(row)}"`,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
