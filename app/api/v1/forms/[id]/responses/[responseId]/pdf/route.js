import { authenticateApiKey, loadKeyForm } from "@/lib/server/api-keys";
import { loadResponseRow, logAccess } from "@/lib/server/forms";
import { fail, notFound } from "@/lib/server/http";
import { pdfResponse, renderStoredResponsePdf } from "@/lib/server/response-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// REST v1: one response as a PDF (external record, sensitive answers masked), authenticated by the read-scoped API key.
export async function GET(request, { params }) {
  const { id, responseId } = await params;
  const { key, error } = await authenticateApiKey(request, "read");
  if (error) return error;
  const form = await loadKeyForm(key, id);
  if (!form) return notFound("Form not found.");
  const row = await loadResponseRow(responseId);
  if (!row || row.form_id !== form.id) return notFound("Response not found.");
  let bytes;
  try {
    bytes = await renderStoredResponsePdf({ form, row, audience: "external" });
  } catch (e) {
    console.error("[v1.responses.pdf]", e);
    return fail("Couldn't generate the PDF.", 500);
  }
  await logAccess({ formId: form.id, responseId: row.id, user: { name: "API key" }, action: "export", metadata: { format: "pdf", via: "api_key", keyId: key.id } });
  return pdfResponse(bytes, row);
}
