import { appOrigin, fail, ok } from "@/lib/server/http";
import { logActivity } from "@/lib/server/forms";
import { disableShare, enableShare, shareUrl } from "@/lib/server/report-share";
import { requireForm } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// A public report republishes response data, so it takes the same permission as exporting it.
const PERMISSION = "forms.response.export";

export async function GET(request, { params }) {
  const { id } = await params;
  const { form, error } = await requireForm(id, PERMISSION);
  if (error) return error;
  return ok({ url: shareUrl(appOrigin(request), form) });
}

// Creates the link, or replaces it so the previous one stops working.
export async function POST(request, { params }) {
  const { id } = await params;
  const { user, form, error } = await requireForm(id, PERMISSION);
  if (error) return error;
  const next = await enableShare(form);
  const url = next && shareUrl(appOrigin(request), next);
  if (!url) return fail("Couldn't create the link.", 500);
  await logActivity({ projectId: form.projectId, formId: form.id, actor: user, action: "report.shared", detail: {} });
  return ok({ url });
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const { user, form, error } = await requireForm(id, PERMISSION);
  if (error) return error;
  if (!(await disableShare(form))) return fail("Couldn't turn sharing off.", 500);
  await logActivity({ projectId: form.projectId, formId: form.id, actor: user, action: "report.unshared", detail: {} });
  return ok({ url: null });
}
