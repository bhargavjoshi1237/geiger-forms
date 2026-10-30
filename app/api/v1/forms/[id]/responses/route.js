import { MAX_BODY_BYTES, appOrigin, json, notFound, ok, readJson } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { authenticateApiKey, loadKeyForm } from "@/lib/server/api-keys";
import { apiFailure, listResponses, withPdfUrl, withoutAnswerKey } from "@/lib/server/forms-api";
import { submitResponse } from "@/lib/server/submit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// REST v1: live responses oldest-first, paged by (submitted_at, id); `since` is an ISO lower bound.
export async function GET(request, { params }) {
  const { id } = await params;
  const { key, error } = await authenticateApiKey(request, "read");
  if (error) return error;
  const form = await loadKeyForm(key, id);
  if (!form) return notFound("Form not found.");

  const url = new URL(request.url);
  try {
    const { rows, nextCursor } = await listResponses(formsAdmin(), form, {
      limit: url.searchParams.get("limit"),
      since: url.searchParams.get("since"),
      cursor: url.searchParams.get("cursor"),
    });
    return ok({ responses: rows.map((row) => withPdfUrl(request, row, form)), nextCursor });
  } catch (e) {
    return apiFailure(e, "v1.responses");
  }
}

// REST v1: headless submission through the same pipeline (respondent gates and spam checks skipped).
export async function POST(request, { params }) {
  const { id } = await params;
  const { key, error } = await authenticateApiKey(request, "write");
  if (error) return error;
  const { body, error: bodyError } = await readJson(request, MAX_BODY_BYTES + 16 * 1024);
  if (bodyError) return bodyError;
  const form = await loadKeyForm(key, id);
  if (!form || form.status === "Archived") return notFound("Form not found.");
  const result = await submitResponse(form, { ...body, hp: undefined }, { request, origin: appOrigin(request), trusted: true });
  if (!result.body.ok) return json(result.body, result.status);
  const { data: row } = await formsAdmin().from("responses").select("*").eq("id", result.body.responseId).maybeSingle();
  return json({ ...withoutAnswerKey(result.body), response: row ? withPdfUrl(request, row, form) : null }, 201);
}
