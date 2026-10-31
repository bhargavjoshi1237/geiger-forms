import { appOrigin, fail, json, unavailable } from "@/lib/server/http";
import { markResponsePaid } from "@/lib/server/payments";
import { captureMatches, verifyPayPalWebhook } from "@/lib/server/paypal";
import { formsAdmin } from "@/lib/server/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Backstop for a payer who never comes back from PayPal: signed capture events settle the response the same way the return route does.
export async function POST(request) {
  if (!process.env.PAYPAL_WEBHOOK_ID) return unavailable("PayPal webhooks aren't configured.");
  const db = formsAdmin();
  if (!db) return unavailable();
  const raw = await request.text();
  if (raw.length > 1024 * 1024) return fail("Payload too large.", 413);
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return fail("Invalid payload.", 400);
  }
  if (!(await verifyPayPalWebhook(request.headers, event))) return fail("Invalid signature.", 400);

  const resource = event.resource || {};
  const responseId = resource.custom_id;
  if (!UUID_RE.test(String(responseId || ""))) return json({ received: true });
  const { data: row } = await db.from("responses").select("*").eq("id", responseId).maybeSingle();
  if (!row || row.payment_status === "paid") return json({ received: true });

  if (event.event_type === "PAYMENT.CAPTURE.DENIED") {
    await db.from("responses").update({ payment_status: "failed" }).eq("id", row.id);
    return json({ received: true });
  }
  if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") return json({ received: true });

  const capture = { status: resource.status, customId: responseId, amount: resource.amount?.value, currency: resource.amount?.currency_code, captureId: resource.id };
  if (!captureMatches(capture, row)) {
    console.error("[paypal.webhook] capture didn't match", responseId);
    return json({ received: true });
  }
  // A failed write answers 500 so PayPal delivers the event again.
  const saved = await markResponsePaid({ row, actor: "PayPal", origin: appOrigin(request), ref: { paypalCapture: resource.id } });
  return saved ? json({ received: true }) : fail("Couldn't record the payment.", 500);
}
