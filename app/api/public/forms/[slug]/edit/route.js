import { fail, notFound, ok, unavailable } from "@/lib/server/http";
import { isAdminConfigured } from "@/lib/server/supabase-admin";
import { loadPublishedForm } from "@/lib/server/forms";
import { decryptAnswers } from "@/lib/server/crypto";
import { editExpiresAt, loadEditableResponse } from "@/lib/server/submit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Loads a response for editing via its edit token.
export async function GET(request, { params }) {
  const { slug } = await params;
  if (!isAdminConfigured()) return unavailable();
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return fail("An edit token is required.", 400);
  const form = await loadPublishedForm(slug);
  if (!form) return notFound("Form not found.");
  const row = await loadEditableResponse(form, token);
  if (!row) return fail("This edit link has expired or is no longer valid.", 403, { code: "gate" });
  const expires = editExpiresAt(row, form);
  return ok({ answers: decryptAnswers(row.answers || {}), expiresAt: Number.isFinite(expires) ? new Date(expires).toISOString() : null });
}
