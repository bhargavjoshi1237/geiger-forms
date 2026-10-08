import { json, notFound, unavailable } from "@/lib/server/http";
import { isAdminConfigured } from "@/lib/server/supabase-admin";
import { loadPublicForm } from "@/lib/server/public-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public form payload for the filler (gates resolved server-side, secrets stripped).
export async function GET(request, { params }) {
  const { slug } = await params;
  if (!isAdminConfigured()) return unavailable("Forms are unavailable right now.");
  const url = new URL(request.url);
  const payload = await loadPublicForm(slug, { signedToken: url.searchParams.get("t") || undefined, variantId: url.searchParams.get("variant") || undefined });
  if (!payload) return notFound("Form not found.");
  return json(payload, 200, { "Cache-Control": "no-store" });
}
