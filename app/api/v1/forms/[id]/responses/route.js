import { MAX_BODY_BYTES, appOrigin, fail, json, notFound, ok, readJson } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { apiResponse, authenticateApiKey, loadKeyForm } from "@/lib/server/api-keys";
import { submitResponse } from "@/lib/server/submit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Opaque cursor: base64url("<submitted_at>|<id>").
const encodeCursor = (row) => Buffer.from(`${row.submitted_at}|${row.id}`).toString("base64url");

function decodeCursor(value) {
  try {
    const [at, id] = Buffer.from(String(value), "base64url").toString("utf8").split("|");
    return !Number.isNaN(Date.parse(at)) && /^[0-9a-f-]{36}$/i.test(id) ? { at, id } : null;
  } catch {
    return null;
  }
}

// REST v1: live responses oldest-first, paged by (submitted_at, id); `since` is an ISO lower bound.
export async function GET(request, { params }) {
  const { id } = await params;
  const { key, error } = await authenticateApiKey(request, "read");
  if (error) return error;
  const form = await loadKeyForm(key, id);
  if (!form) return notFound("Form not found.");

  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const since = url.searchParams.get("since");
  const cursorParam = url.searchParams.get("cursor");
  const cursor = cursorParam ? decodeCursor(cursorParam) : null;
  if (cursorParam && !cursor) return fail("Invalid cursor.", 400);
  if (since && Number.isNaN(Date.parse(since))) return fail("`since` must be an ISO date.", 400);

  let query = formsAdmin()
    .from("responses")
    .select("*")
    .eq("form_id", form.id)
    .is("deleted_at", null)
    .order("submitted_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit + 1);
  if (since) query = query.gte("submitted_at", new Date(since).toISOString());
  if (cursor) query = query.or(`submitted_at.gt."${cursor.at}",and(submitted_at.eq."${cursor.at}",id.gt.${cursor.id})`);
  const { data, error: dbError } = await query;
  if (dbError) {
    console.error("[v1.responses]", dbError.message);
    return fail("Couldn't load responses.", 500);
  }
  const rows = data || [];
  const page = rows.slice(0, limit);
  return ok({ responses: page.map(apiResponse), nextCursor: rows.length > limit ? encodeCursor(page[page.length - 1]) : null });
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
  return json({ ...result.body, response: row ? apiResponse(row) : null }, 201);
}
