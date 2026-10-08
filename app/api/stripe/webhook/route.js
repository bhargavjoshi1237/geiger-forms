import { appOrigin, fail, json, unavailable } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { verifyStripeSignature } from "@/lib/server/stripe";
import { loadForm, logActivity } from "@/lib/server/forms";
import { sendApprovalRequest } from "@/lib/server/side-effects";
import { dispatchEvent, responsePayload } from "@/lib/server/webhooks";
import { maskEncrypted } from "@/lib/server/crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Maps a Stripe event to { responseId, outcome: 'paid' | 'failed' | 'expired' }.
function classify(event) {
  const obj = event?.data?.object || {};
  const sessionRef = obj.metadata?.responseId || obj.client_reference_id;
  const invoiceRef = obj.parent?.subscription_details?.metadata?.responseId || obj.subscription_details?.metadata?.responseId || obj.metadata?.responseId;
  switch (event?.type) {
    case "checkout.session.completed":
      return { responseId: sessionRef, outcome: ["paid", "no_payment_required"].includes(obj.payment_status) ? "paid" : null, ref: obj.subscription || null };
    case "checkout.session.async_payment_succeeded":
      return { responseId: sessionRef, outcome: "paid" };
    case "checkout.session.async_payment_failed":
      return { responseId: sessionRef, outcome: "failed" };
    case "checkout.session.expired":
      return { responseId: sessionRef, outcome: "expired" };
    case "invoice.paid":
      return { responseId: invoiceRef, outcome: "paid" };
    case "invoice.payment_failed":
      return { responseId: invoiceRef, outcome: "failed" };
    default:
      return {};
  }
}

// Stripe-signed payment events → response payment status.
export async function POST(request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) return unavailable("Stripe webhooks aren't configured.");
  const db = formsAdmin();
  if (!db) return unavailable();
  const raw = await request.text();
  if (raw.length > 1024 * 1024) return fail("Payload too large.", 413);
  if (!verifyStripeSignature(raw, request.headers.get("stripe-signature"))) return fail("Invalid signature.", 400);

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return fail("Invalid payload.", 400);
  }
  const { responseId, outcome, ref } = classify(event);
  if (!responseId || !outcome || !/^[0-9a-f-]{36}$/i.test(responseId)) return json({ received: true });

  const { data: row } = await db.from("responses").select("*").eq("id", responseId).maybeSingle();
  if (!row || row.payment_status === "paid") return json({ received: true });

  if (outcome !== "paid") {
    if (row.payment_status !== "paid") await db.from("responses").update({ payment_status: outcome }).eq("id", row.id);
    return json({ received: true });
  }

  const form = await loadForm({ id: row.form_id });
  const approvalOn = Boolean(form?.settings.approval?.enabled) && (form.settings.approval.steps || []).length > 0;
  const status = row.status === "Awaiting payment" ? (approvalOn ? "Pending" : "Complete") : row.status;
  const metadata = ref ? { ...(row.metadata || {}), stripeSubscription: ref } : row.metadata;
  const { data: updated, error } = await db
    .from("responses")
    .update({ payment_status: "paid", status, metadata, ...(approvalOn && !row.approval?.state ? { approval: { stepIndex: 0, state: "pending", history: [] } } : {}) })
    .eq("id", row.id)
    .select("*")
    .single();
  if (error) {
    console.error("[stripe.webhook]", error.message);
    return fail("Couldn't record the payment.", 500);
  }
  if (form) {
    await Promise.allSettled([
      status === "Pending" ? sendApprovalRequest({ form, row: updated, origin: appOrigin(request) }) : null,
      dispatchEvent(form, "response.updated", responsePayload(form, updated, maskEncrypted(updated.answers)), updated.id),
      logActivity({ projectId: form.projectId, formId: form.id, responseId: row.id, actor: { name: "Stripe" }, action: "payment.paid", detail: { amount: row.payment_amount, currency: row.payment_currency } }),
    ]);
  }
  return json({ received: true });
}
