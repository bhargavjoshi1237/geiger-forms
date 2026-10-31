import { fail, formUrl, appOrigin, isEmail, notFound, ok, readJson } from "@/lib/server/http";
import { contactByEmail, recordLinkToken } from "@/lib/server/suite-records";
import { adminClient } from "@/lib/server/supabase-admin";
import { requireForm } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Builds a signed form link for one Events contact in this form's project.
export async function POST(request, { params }) {
  const { id } = await params;
  const { form, error } = await requireForm(id, "forms.form.edit");
  if (error) return error;
  if (!form.projectId) return fail("This form isn't in a project, so it has no contacts.", 409, { code: "conflict" });
  const { body, error: bodyError } = await readJson(request, 4 * 1024);
  if (bodyError) return bodyError;
  const email = String(body.email || "").trim().toLowerCase();
  if (!isEmail(email)) return fail("Enter a valid email address.", 400, { code: "validation" });
  const contact = await contactByEmail(adminClient(), form.projectId, email);
  if (!contact) return notFound("No contact in this project has that email.");
  const token = recordLinkToken(form, contact.id);
  if (!token) return fail("Link signing isn't configured.", 503);
  return ok({ url: formUrl(appOrigin(request), form.slug, { record: token }) });
}
