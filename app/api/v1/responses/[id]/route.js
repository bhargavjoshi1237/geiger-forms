import { ok } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { authorizeWrite } from "@/lib/server/api-keys";
import { API_KEY_ACTOR, apiFailure, getResponse, updateResponse, withPdfUrl } from "@/lib/server/forms-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY = 32 * 1024;

// REST v1: changes a response's status, priority, tags or assignee.
export async function PATCH(request, { params }) {
  const { id } = await params;
  const { key, body, error } = await authorizeWrite(request, MAX_BODY);
  if (error) return error;
  try {
    const db = formsAdmin();
    const { form, row } = await getResponse(db, key.projectId, id);
    const updated = await updateResponse(db, { form, row, patch: body, actor: API_KEY_ACTOR });
    return ok({ response: withPdfUrl(request, updated, form) });
  } catch (e) {
    return apiFailure(e, "v1.responses.update");
  }
}
