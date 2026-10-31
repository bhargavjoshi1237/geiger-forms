import "server-only";
import { startApproval } from "@/lib/forms/approvals";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { loadForm, logActivity, safeAnswers } from "@/lib/server/forms";
import { sendApprovalRequest } from "@/lib/server/side-effects";
import { dispatchEvent, responsePayload } from "@/lib/server/webhooks";

// Gateway-neutral payment outcomes, shared by the Stripe webhook and the PayPal return and webhook routes.

// Marks a response paid once, moves it on to approval or Complete, and runs the follow-up effects; false when the write fails.
export async function markResponsePaid({ row, actor, origin, ref = null }) {
  const db = formsAdmin();
  const form = await loadForm({ id: row.form_id });
  const approval = row.approval?.state ? row.approval : form ? startApproval(form.settings, row.answers) : null;
  const approvalOn = approval?.state === "pending";
  const status = row.status === "Awaiting payment" ? (approvalOn ? "Pending" : "Complete") : row.status;
  const metadata = ref ? { ...(row.metadata || {}), ...ref } : row.metadata;
  const { data: updated, error } = await db
    .from("responses")
    .update({ payment_status: "paid", status, metadata, ...(approvalOn && !row.approval?.state ? { approval } : {}) })
    .eq("id", row.id)
    .select("*")
    .single();
  if (error) {
    console.error(`[payments.${actor}]`, error.message);
    return false;
  }
  if (form) {
    await Promise.allSettled([
      status === "Pending" ? sendApprovalRequest({ form, row: updated, origin }) : null,
      dispatchEvent(form, "response.updated", responsePayload(form, updated, safeAnswers(updated, form, "[protected]")), updated.id),
      logActivity({ projectId: form.projectId, formId: form.id, responseId: row.id, actor: { name: actor }, action: "payment.paid", detail: { amount: row.payment_amount, currency: row.payment_currency } }),
    ]);
  }
  return true;
}
