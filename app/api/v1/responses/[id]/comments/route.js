import { json } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { authorizeWrite } from "@/lib/server/api-keys";
import { API_KEY_ACTOR, addComment, apiFailure, getResponse } from "@/lib/server/forms-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY = 32 * 1024;

// REST v1: adds an internal comment to a response; mentions are kept only for members of the form's project.
export async function POST(request, { params }) {
  const { id } = await params;
  const { key, body, error } = await authorizeWrite(request, MAX_BODY);
  if (error) return error;
  try {
    const { form, row } = await getResponse(formsAdmin(), key.projectId, id);
    const comment = await addComment({ form, row, body: body.body, mentions: body.mentions, actor: API_KEY_ACTOR });
    return json({ ok: true, comment }, 201);
  } catch (e) {
    return apiFailure(e, "v1.responses.comment");
  }
}
