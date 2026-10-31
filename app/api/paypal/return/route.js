import { NextResponse } from "next/server";
import { appOrigin, formUrl, unavailable } from "@/lib/server/http";
import { markResponsePaid } from "@/lib/server/payments";
import { captureMatches, capturePayPalOrder, isPayPalConfigured } from "@/lib/server/paypal";
import { formsAdmin } from "@/lib/server/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// PayPal sends the payer back here after approving; an order only takes money once it's captured, so this does that and checks the result.
export async function GET(request) {
  const db = formsAdmin();
  if (!db || !isPayPalConfigured()) return unavailable();
  const url = new URL(request.url);
  const responseId = url.searchParams.get("r") || "";
  const orderId = url.searchParams.get("token") || "";
  const origin = appOrigin(request);
  if (!UUID_RE.test(responseId) || !orderId) return NextResponse.redirect(`${origin}/`);

  const { data: row } = await db.from("responses").select("*").eq("id", responseId).maybeSingle();
  // The order must be the one this response started, so a link can't be replayed with someone else's payment.
  if (!row || row.payment_ref !== orderId) return NextResponse.redirect(`${origin}/`);
  const { data: form } = await db.from("forms").select("slug").eq("id", row.form_id).maybeSingle();
  const back = (paid) => NextResponse.redirect(formUrl(origin, form?.slug || "", { paid, r: responseId }));
  if (row.payment_status === "paid") return back(1);

  const capture = await capturePayPalOrder(orderId);
  if (!captureMatches(capture, row)) {
    console.error("[paypal.return] capture didn't match", responseId, capture?.status);
    return back(0);
  }
  const saved = await markResponsePaid({ row, actor: "PayPal", origin, ref: { paypalCapture: capture.captureId } });
  return back(saved ? 1 : 0);
}
