import { appOrigin, fail, json, unavailable } from "@/lib/server/http";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { markResponsePaid } from "@/lib/server/payments";
import { verifyStripeSignature } from "@/lib/server/stripe";

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

  const saved = await markResponsePaid({ row, actor: "Stripe", origin: appOrigin(request), ref: ref ? { stripeSubscription: ref } : null });
  return saved ? json({ received: true }) : fail("Couldn't record the payment.", 500);
}
