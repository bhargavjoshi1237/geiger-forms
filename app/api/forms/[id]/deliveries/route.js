import { fail, ok } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { requireForm } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Recent outbound webhook deliveries for a form (newest first).
export async function GET(request, { params }) {
  const { id } = await params;
  const { form, error } = await requireForm(id, "forms.form.edit");
  if (error) return error;
  const { data, error: dbError } = await formsAdmin()
    .from("webhook_deliveries")
    .select("id, response_id, url, event, status_code, ok, error, created_at")
    .eq("form_id", form.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (dbError) {
    console.error("[api.deliveries]", dbError.message);
    return fail("Couldn't load deliveries.", 500);
  }
  return ok({
    deliveries: (data || []).map((d) => ({
      id: d.id,
      responseId: d.response_id,
      url: d.url,
      event: d.event,
      statusCode: d.status_code,
      ok: d.ok,
      error: d.error,
      createdAt: d.created_at,
    })),
  });
}
