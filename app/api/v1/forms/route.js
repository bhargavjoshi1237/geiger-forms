import { json, ok } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { authenticateApiKey, authorizeWrite } from "@/lib/server/api-keys";
import { API_KEY_ACTOR, apiFailure, apiForm, createForm, listForms } from "@/lib/server/forms-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// REST v1: forms in the API key's project.
export async function GET(request) {
  const { key, error } = await authenticateApiKey(request, "read");
  if (error) return error;
  try {
    const forms = await listForms(formsAdmin(), key.projectId);
    return ok({ forms: forms.map((form) => apiForm(form)) });
  } catch (e) {
    return apiFailure(e, "v1.forms");
  }
}

// REST v1: creates a Draft form in the key's project; fields and settings go through the same normalization as the builder.
export async function POST(request) {
  const { key, body, error } = await authorizeWrite(request);
  if (error) return error;
  try {
    const form = await createForm(formsAdmin(), { projectId: key.projectId, input: body, actor: API_KEY_ACTOR });
    return json({ ok: true, form: apiForm(form, { detail: true }) }, 201);
  } catch (e) {
    return apiFailure(e, "v1.forms.create");
  }
}
