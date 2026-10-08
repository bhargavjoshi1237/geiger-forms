import { appOrigin, fail, forbidden, ok, readJson } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { userCan } from "@/lib/server/auth";
import { maskEncrypted } from "@/lib/server/crypto";
import { logActivity } from "@/lib/server/forms";
import { sendApprovalRequest, sendDecision } from "@/lib/server/side-effects";
import { dispatchEvent, responsePayload } from "@/lib/server/webhooks";
import { requireResponse } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Records an approve/reject decision on the current approval step and advances the chain.
export async function POST(request, { params }) {
  const { id } = await params;
  const { user, form, row, error } = await requireResponse(id, null);
  if (error) return error;
  const { body, error: bodyError } = await readJson(request, 8 * 1024);
  if (bodyError) return bodyError;
  const decision = body.decision === "reject" ? "reject" : body.decision === "approve" ? "approve" : null;
  if (!decision) return fail("Choose approve or reject.", 400, { code: "validation" });

  const steps = form.settings.approval?.enabled ? form.settings.approval.steps || [] : [];
  const current = row.approval && row.approval.state ? row.approval : { stepIndex: 0, state: "pending", history: [] };
  if (current.state !== "pending") return fail(`This response was already ${current.state}.`, 409, { code: "conflict" });
  if (row.status === "Awaiting payment") return fail("This response is still awaiting payment.", 409, { code: "conflict" });

  const stepIndex = Math.max(0, Number(current.stepIndex) || 0);
  const step = steps[stepIndex];
  const email = String(user.email || "").toLowerCase();
  const isApprover = Boolean(step && (step.approvers || []).some((a) => String(a).trim().toLowerCase() === email));
  if (!isApprover && !(await userCan(user, form, "forms.form.edit"))) return forbidden();

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  const history = [
    ...(Array.isArray(current.history) ? current.history : []),
    { stepIndex, stepName: step?.name || "Approval", decision, by: user.name, byEmail: user.email, note, at: new Date().toISOString() },
  ];
  const hasNext = decision === "approve" && stepIndex + 1 < steps.length;
  const approval = hasNext
    ? { stepIndex: stepIndex + 1, state: "pending", history }
    : { stepIndex, state: decision === "approve" ? "approved" : "rejected", history };
  const status = hasNext ? "Pending" : decision === "approve" ? "Approved" : "Rejected";

  const { data: updated, error: dbError } = await formsAdmin().from("responses").update({ approval, status }).eq("id", row.id).select("*").single();
  if (dbError) {
    console.error("[api.approve]", dbError.message);
    return fail("Couldn't save the decision.", 500);
  }

  const origin = appOrigin(request);
  const payload = responsePayload(form, updated, maskEncrypted(updated.answers));
  await Promise.allSettled([
    hasNext ? sendApprovalRequest({ form, row: updated, origin }) : sendDecision({ form, row: updated, decision, note }),
    !hasNext ? dispatchEvent(form, decision === "approve" ? "response.approved" : "response.updated", payload, updated.id) : null,
    logActivity({
      projectId: form.projectId,
      formId: form.id,
      responseId: row.id,
      actor: user,
      action: decision === "approve" ? "response.approved" : "response.rejected",
      detail: { step: step?.name || "Approval", stepIndex, note: note || undefined, final: !hasNext },
    }),
  ]);

  const response = { ...updated };
  delete response.edit_token;
  return ok({ response });
}
