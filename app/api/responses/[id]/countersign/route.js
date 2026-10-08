import { fail, ok, readJson } from "@/lib/server/http";
import { logActivity, mergeResponseMeta } from "@/lib/server/forms";
import { newUploadPath, uploadPngDataUrl } from "@/lib/server/storage";
import { requireResponse } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Stores a reviewer's countersignature PNG and stamps it (server time) on the response.
export async function POST(request, { params }) {
  const { id } = await params;
  const { user, form, row, error } = await requireResponse(id, "forms.form.edit");
  if (error) return error;
  const { body, error: bodyError } = await readJson(request, 1.5 * 1024 * 1024);
  if (bodyError) return bodyError;
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 200) : "";
  if (!name) return fail("Type your full name to countersign.", 400, { code: "validation" });
  const path = await uploadPngDataUrl(newUploadPath(form.id, `${row.id}.png`, "countersign"), body.signature);
  if (!path) return fail("Draw your signature before countersigning.", 400, { code: "validation" });
  const countersign = { name, userId: user.id, signature: path, at: new Date().toISOString() };
  const updated = await mergeResponseMeta(row.id, { countersign });
  if (!updated) return fail("Couldn't save the countersignature.", 500);
  await logActivity({ projectId: form.projectId, formId: form.id, responseId: row.id, actor: user, action: "response.countersigned", detail: { name } });
  return ok({ countersign });
}
