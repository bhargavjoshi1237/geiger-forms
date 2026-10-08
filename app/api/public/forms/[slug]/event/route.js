import { fail, ipHash, notFound, ok, rateLimit, readJson, unavailable } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { loadPublishedForm } from "@/lib/server/forms";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const clip = (v, n) => (typeof v === "string" ? v.slice(0, n) : null);

// Funnel tracking: view / start events (submit is recorded by the pipeline).
export async function POST(request, { params }) {
  const { slug } = await params;
  const db = formsAdmin();
  if (!db) return unavailable();
  const { body, error } = await readJson(request, 8 * 1024);
  if (error) return error;
  if (!["view", "start"].includes(body.type)) return fail("Unknown event type.", 400);
  const form = await loadPublishedForm(slug);
  if (!form) return notFound("Form not found.");
  if (!(await rateLimit(`event:${form.id}:${ipHash(request)}`, 300))) return ok({ skipped: true });
  const utm = body.utm && typeof body.utm === "object" ? Object.fromEntries(Object.entries(body.utm).slice(0, 5).map(([k, v]) => [clip(k, 20), clip(String(v ?? ""), 200)])) : undefined;
  const { error: dbError } = await db.from("form_events").insert({
    form_id: form.id,
    type: body.type,
    session_id: clip(body.sessionId, 80),
    variant: clip(body.variant, 80),
    metadata: JSON.parse(JSON.stringify({ utm, referrer: clip(body.referrer, 500) || undefined })),
  });
  if (dbError) {
    console.error("[api.event]", dbError.message);
    return fail("Couldn't record the event.", 500);
  }
  return ok();
}
