import { notFound, ok } from "@/lib/server/http";
import { apiForm, authenticateApiKey, loadKeyForm } from "@/lib/server/api-keys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// REST v1: one form with its field definitions and public settings.
export async function GET(request, { params }) {
  const { id } = await params;
  const { key, error } = await authenticateApiKey(request, "read");
  if (error) return error;
  const form = await loadKeyForm(key, id);
  if (!form) return notFound("Form not found.");
  return ok({ form: apiForm(form, { detail: true }) });
}
