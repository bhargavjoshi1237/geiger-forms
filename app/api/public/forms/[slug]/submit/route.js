import { MAX_BODY_BYTES, appOrigin, json, notFound, readJson, unavailable } from "@/lib/server/http";
import { isAdminConfigured } from "@/lib/server/supabase-admin";
import { getSessionUser } from "@/lib/server/auth";
import { loadPublishedForm } from "@/lib/server/forms";
import { submitResponse } from "@/lib/server/submit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Respondent submission (or edit resubmission via editToken).
export async function POST(request, { params }) {
  const { slug } = await params;
  if (!isAdminConfigured()) return unavailable("Submissions are unavailable right now.");
  const { body, error } = await readJson(request, MAX_BODY_BYTES + 64 * 1024);
  if (error) return error;
  const form = await loadPublishedForm(slug);
  if (!form) return notFound("Form not found.");
  const user = await getSessionUser().catch(() => null);
  const result = await submitResponse(form, body, { request, user, origin: appOrigin(request) });
  return json(result.body, result.status);
}
