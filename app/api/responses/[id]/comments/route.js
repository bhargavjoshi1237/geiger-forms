import { fail, ok, readJson } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { formMembers } from "@/lib/server/auth";
import { notifyMentions } from "@/lib/server/flow";
import { requireResponse } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY = 5000;
const MAX_MENTIONS = 20;

// Posts an internal comment as the signed-in member; @mentions are kept only for workspace members, who get notified.
export async function POST(request, { params }) {
  const { id } = await params;
  const { user, form, row, error } = await requireResponse(id, "forms.responses.view");
  if (error) return error;
  const { body, error: bodyError } = await readJson(request, 32 * 1024);
  if (bodyError) return bodyError;

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return fail("Write a comment first.", 400, { code: "validation" });
  if (text.length > MAX_BODY) return fail(`Keep comments under ${MAX_BODY} characters.`, 400, { code: "validation" });

  const requested = new Set((Array.isArray(body.mentions) ? body.mentions : []).map(String).slice(0, MAX_MENTIONS));
  const members = requested.size ? await formMembers(user, form) : [];
  const mentions = members.filter((m) => requested.has(m.id)).map((m) => m.id);

  const { data: comment, error: dbError } = await formsAdmin()
    .from("comments")
    .insert({ response_id: row.id, body: text, author: user.name, author_id: user.id, mentions })
    .select("*")
    .single();
  if (dbError) {
    console.error("[api.comments]", dbError.message);
    return fail("Couldn't post your comment.", 500);
  }

  await notifyMentions({ form, row, comment, actor: user });
  return ok({ comment });
}
