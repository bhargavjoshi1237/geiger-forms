import { fail, ok } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { toServerForm } from "@/lib/server/forms";
import { apiForm, authenticateApiKey, scopeToProject } from "@/lib/server/api-keys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// REST v1: forms in the API key's project.
export async function GET(request) {
  const { key, error } = await authenticateApiKey(request, "read");
  if (error) return error;
  const query = formsAdmin().from("forms").select("*").is("deleted_at", null).eq("is_template", false).order("updated_at", { ascending: false }).limit(500);
  const { data, error: dbError } = await scopeToProject(query, key);
  if (dbError) {
    console.error("[v1.forms]", dbError.message);
    return fail("Couldn't load forms.", 500);
  }
  return ok({ forms: (data || []).map((row) => apiForm(toServerForm(row))) });
}
