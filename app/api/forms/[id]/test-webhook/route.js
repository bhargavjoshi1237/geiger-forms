import { fail, json, readJson } from "@/lib/server/http";
import { postSignedWebhook } from "@/lib/server/webhooks";
import { requireForm } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Sends a signed sample payload to a webhook URL and reports the receiver's status.
export async function POST(request, { params }) {
  const { id } = await params;
  const { form, error } = await requireForm(id, "forms.form.edit");
  if (error) return error;
  const { body, error: bodyError } = await readJson(request, 8 * 1024);
  if (bodyError) return bodyError;
  if (typeof body.url !== "string" || !body.url) return fail("Enter a webhook URL.", 400, { code: "validation" });
  const payload = {
    test: true,
    form: { id: form.id, slug: form.slug, title: form.title },
    response: { id: "00000000-0000-0000-0000-000000000000", status: "Complete", answers: { example: "This is a test delivery from Geiger Forms." }, submittedAt: new Date().toISOString() },
  };
  const result = await postSignedWebhook({ url: body.url, secret: body.secret, event: "test", payload, formId: form.id });
  return json({ ok: result.ok, status: result.status, error: result.ok ? undefined : result.error === "invalid_url" ? "That URL isn't allowed." : result.error });
}
