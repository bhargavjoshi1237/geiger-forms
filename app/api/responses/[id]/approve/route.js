import { appOrigin, fail, forbidden, ok, readJson } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { userCan } from "@/lib/server/auth";
import { logActivity, safeAnswers } from "@/lib/server/forms";
import { sendApprovalRequest, sendDecision } from "@/lib/server/side-effects";
import { dispatchEvent, responsePayload } from "@/lib/server/webhooks";
import { requireResponse } from "@/lib/server/workspace";
import { editableFields, recordDecision, stepApprovers } from "@/lib/forms/approvals";
import { validateAnswers } from "@/lib/forms/logic";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Keeps only the corrections this step allows and checks them with the form's own rules: { answers, edited } or { error }.
function applyEdits(body, step, form, row) {
  const allowed = editableFields(step, form.fieldDefs);
  const edits = body.edits && typeof body.edits === "object" && !Array.isArray(body.edits) ? body.edits : {};
  const edited = allowed.map((f) => f.id).filter((id) => Object.hasOwn(edits, id) && JSON.stringify(edits[id]) !== JSON.stringify(row.answers?.[id]));
  if (!edited.length) return { answers: row.answers, edited };
  const answers = { ...row.answers };
  for (const id of edited) answers[id] = edits[id];
  const errors = validateAnswers(form.fieldDefs, answers, new Set(edited));
  const first = edited.find((id) => errors[id]);
  return first ? { error: errors[first] } : { answers, edited };
}

// Records one approver's vote (or an editor's override) on the current step and advances the chain when the step's rule is met.
export async function POST(request, { params }) {
  const { id } = await params;
  const { user, form, row, error } = await requireResponse(id, null);
  if (error) return error;
  const { body, error: bodyError } = await readJson(request, 64 * 1024);
  if (bodyError) return bodyError;
  const decision = body.decision === "reject" ? "reject" : body.decision === "approve" ? "approve" : null;
  if (!decision) return fail("Choose approve or reject.", 400, { code: "validation" });

  const steps = form.settings.approval?.enabled ? form.settings.approval.steps || [] : [];
  const current = row.approval && row.approval.state ? row.approval : { stepIndex: 0, state: "pending", history: [] };
  if (current.state === "skipped") return fail("No approval step applies to this response.", 409, { code: "conflict" });
  if (current.state !== "pending") return fail(`This response was already ${current.state}.`, 409, { code: "conflict" });
  if (row.status === "Awaiting payment") return fail("This response is still awaiting payment.", 409, { code: "conflict" });

  const stepIndex = Math.max(0, Number(current.stepIndex) || 0);
  const step = steps[stepIndex];
  const approvers = stepApprovers(step);
  const isApprover = approvers.includes(String(user.email || "").trim().toLowerCase());
  const canEdit = isApprover ? false : await userCan(user, form, "forms.form.edit");
  if (!isApprover && !canEdit) return forbidden();

  const corrected = applyEdits(body, step, form, row);
  if (corrected.error) return fail(corrected.error, 422, { code: "validation" });

  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";
  // An editor stepping in for named approvers overrides the step; a step with no one named is simply theirs to decide.
  const override = !isApprover && approvers.length > 0;
  const result = recordDecision({ steps, approval: current, answers: corrected.answers, decision, actor: user, note, override, edits: corrected.edited });
  if (result.error) return fail(result.error, 409, { code: result.code });

  // Parallel approvers can vote at once, so a write only lands on the version it read.
  const { data: updated, error: dbError } = await formsAdmin()
    .from("responses")
    .update({ approval: result.approval, status: result.status, ...(corrected.edited.length ? { answers: corrected.answers } : {}) })
    .eq("id", row.id)
    .eq("updated_at", row.updated_at)
    .select("*")
    .maybeSingle();
  if (dbError) {
    console.error("[api.approve]", dbError.message);
    return fail("Couldn't save the decision.", 500);
  }
  if (!updated) return fail("Someone else just decided this. Reload it and try again.", 409, { code: "conflict" });

  const origin = appOrigin(request);
  const payload = responsePayload(form, updated, safeAnswers(updated, form, "[protected]"));
  await Promise.allSettled([
    result.advanced ? sendApprovalRequest({ form, row: updated, origin }) : result.final ? sendDecision({ form, row: updated, decision, note }) : null,
    result.final ? dispatchEvent(form, decision === "approve" ? "response.approved" : "response.updated", payload, updated.id) : null,
    logActivity({
      projectId: form.projectId,
      formId: form.id,
      responseId: row.id,
      actor: user,
      action: decision === "approve" ? "response.approved" : "response.rejected",
      detail: { step: step?.name || "Approval", stepIndex, note: note || undefined, final: result.final, override: override || undefined, edited: corrected.edited.length ? corrected.edited : undefined },
    }),
  ]);

  const response = { ...updated };
  delete response.edit_token;
  return ok({ response });
}
