import { ok, readJson } from "@/lib/server/http";
import { decryptAnswers } from "@/lib/server/crypto";
import { logAccess } from "@/lib/server/forms";
import { requireResponse } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Decrypts sensitive answers (all, or one field) for an authorised viewer and records the reveal.
export async function POST(request, { params }) {
  const { id } = await params;
  const { user, form, row, error } = await requireResponse(id, "forms.responses.view");
  if (error) return error;
  const { body, error: bodyError } = await readJson(request, 2 * 1024);
  if (bodyError) return bodyError;
  const fieldId = typeof body.fieldId === "string" && body.fieldId ? body.fieldId.slice(0, 80) : null;
  const answers = decryptAnswers(row.answers || {}, fieldId || undefined);
  await logAccess({
    formId: form.id,
    responseId: row.id,
    user,
    action: "reveal",
    fieldId,
    metadata: { fields: fieldId ? [fieldId] : row.metadata?.encryptedFields || [] },
  });
  return ok({ answers });
}
