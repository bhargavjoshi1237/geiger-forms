import { appOrigin, fail, ok, workspaceUrl } from "@/lib/server/http";
import { labelledAnswers, logActivity } from "@/lib/server/forms";
import { createFlowIssue } from "@/lib/server/flow";
import { requireResponse } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Creates (once) a Geiger Flow issue for this response.
export async function POST(request, { params }) {
  const { id } = await params;
  const { user, form, row, error } = await requireResponse(id, "forms.form.edit");
  if (error) return error;
  if (row.metadata?.flowIssue?.id) return ok({ issue: row.metadata.flowIssue, existing: true });
  const issue = await createFlowIssue({
    form,
    row,
    rows: labelledAnswers(form, row.answers),
    link: workspaceUrl(appOrigin(request), form, row.id),
  });
  if (!issue) return fail("Couldn't create a Flow issue. Make sure this form's project is linked to Geiger Flow.", 422, { code: "flow_unavailable" });
  await logActivity({ projectId: form.projectId, formId: form.id, responseId: row.id, actor: user, action: "response.escalated", detail: { issue } });
  return ok({ issue });
}
