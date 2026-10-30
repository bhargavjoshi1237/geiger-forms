import { notFound, ok } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { authenticateApiKey, authorizeWrite, loadKeyForm } from "@/lib/server/api-keys";
import { API_KEY_ACTOR, apiFailure, apiForm, updateForm } from "@/lib/server/forms-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// REST v1: one form with its field definitions and public settings.
export async function GET(request, { params }) {
  const { id } = await params;
  const { key, error } = await authenticateApiKey(request, "read");
  if (error) return error;
  const form = await loadKeyForm(key, id);
  if (!form) return notFound("Form not found.");
  return ok({ form: apiForm(form, { detail: true }) });
}

// REST v1: partial update of a form's details, fields, allowed settings and status.
export async function PATCH(request, { params }) {
  const { id } = await params;
  const { key, body, error } = await authorizeWrite(request);
  if (error) return error;
  const form = await loadKeyForm(key, id);
  if (!form) return notFound("Form not found.");
  try {
    const result = await updateForm(formsAdmin(), { form, input: body, actor: API_KEY_ACTOR });
    return ok({ form: apiForm(result.form, { detail: true }), warnings: result.warnings });
  } catch (e) {
    return apiFailure(e, "v1.forms.update");
  }
}
