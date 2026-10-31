import "server-only";

// PayPal over plain fetch (Orders v2): one-off orders, capture on return and webhook verification. Recurring billing stays on Stripe, since PayPal needs its own catalog of plans.

const ZERO_DECIMAL = new Set(["huf", "jpy", "twd"]);

export function isPayPalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

// Real money only when explicitly asked for, so a missing variable can't charge anyone.
const apiBase = () => (process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

async function accessToken() {
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`PayPal auth HTTP ${res.status}`);
  return data.access_token;
}

// { ok, status, data } for one API call; only a network failure throws.
async function paypal(path, { method = "POST", body, requestId } = {}) {
  const token = await accessToken();
  const res = await fetch(`${apiBase()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(requestId ? { "PayPal-Request-Id": requestId } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
}

export function paypalAmount(amount, currency) {
  return (Number(amount) || 0).toFixed(ZERO_DECIMAL.has(String(currency).toLowerCase()) ? 0 : 2);
}

// Creates an order for a computeOrder() total. Returns { id, url } or null. The response id rides along so a capture can be checked against it.
export async function createPayPalOrder({ order, form, responseId, returnUrl, cancelUrl }) {
  if (!isPayPalConfigured() || !order?.total) return null;
  try {
    const { ok, status, data } = await paypal("/v2/checkout/orders", {
      requestId: `order-${responseId}`,
      body: {
        intent: "CAPTURE",
        purchase_units: [
          {
            custom_id: responseId,
            description: String(form.title || "Form payment").slice(0, 127),
            amount: { currency_code: String(order.currency).toUpperCase(), value: paypalAmount(order.total, order.currency) },
          },
        ],
        payment_source: { paypal: { experience_context: { return_url: returnUrl, cancel_url: cancelUrl, user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING" } } },
      },
    });
    const url = data.links?.find((l) => l.rel === "payer-action" || l.rel === "approve")?.href;
    if (!ok || !data.id || !url) {
      console.error("[paypal.order]", status, data?.name || "");
      return null;
    }
    return { id: data.id, url };
  } catch (e) {
    console.error("[paypal.order]", e?.message);
    return null;
  }
}

// { status, customId, amount, currency, captureId } from an order or its capture.
function readCapture(data) {
  const unit = data.purchase_units?.[0] || {};
  const capture = unit.payments?.captures?.[0] || {};
  return { status: capture.status || data.status || "", customId: capture.custom_id || unit.custom_id || "", amount: capture.amount?.value ?? unit.amount?.value, currency: capture.amount?.currency_code || unit.amount?.currency_code || "", captureId: capture.id || null };
}

// Captures an approved order; if a retry or the webhook got there first, reads the finished order instead. Returns the capture or null.
export async function capturePayPalOrder(orderId) {
  try {
    const path = `/v2/checkout/orders/${encodeURIComponent(orderId)}`;
    const captured = await paypal(`${path}/capture`, { requestId: `capture-${orderId}`, body: {} });
    if (captured.ok) return readCapture(captured.data);
    if (captured.data?.details?.[0]?.issue !== "ORDER_ALREADY_CAPTURED") {
      console.error("[paypal.capture]", captured.status, captured.data?.details?.[0]?.issue || "");
      return null;
    }
    const existing = await paypal(path, { method: "GET" });
    return existing.ok ? readCapture(existing.data) : null;
  } catch (e) {
    console.error("[paypal.capture]", e?.message);
    return null;
  }
}

// A capture only counts when it finished, belongs to this response, and paid what the response owes.
export function captureMatches(capture, row) {
  if (!capture || capture.status !== "COMPLETED" || capture.customId !== row.id) return false;
  return String(capture.currency).toLowerCase() === String(row.payment_currency).toLowerCase() && paypalAmount(capture.amount, row.payment_currency) === paypalAmount(row.payment_amount, row.payment_currency);
}

// Asks PayPal to check a webhook's signature; there's no local check that's as simple as Stripe's.
export async function verifyPayPalWebhook(headers, event) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId || !isPayPalConfigured()) return false;
  try {
    const { ok, data } = await paypal("/v1/notifications/verify-webhook-signature", {
      body: {
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: event,
      },
    });
    return ok && data.verification_status === "SUCCESS";
  } catch (e) {
    console.error("[paypal.webhook]", e?.message);
    return false;
  }
}
