import "server-only";
import { hmacHex, safeEqual } from "@/lib/server/crypto";

// Stripe over plain fetch (form-encoded REST): Checkout Sessions, ad-hoc coupons and webhook signature checks.

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

// Flattens nested params into Stripe's bracket notation (a[b][0][c]=…).
function encode(params, prefix = "", out = new URLSearchParams()) {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) value.forEach((v, i) => (typeof v === "object" ? encode(v, `${name}[${i}]`, out) : out.append(`${name}[${i}]`, String(v))));
    else if (typeof value === "object") encode(value, name, out);
    else out.append(name, String(value));
  }
  return out;
}

async function stripe(path, params) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encode(params).toString(),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Stripe HTTP ${res.status}`);
  return data;
}

const cents = (amount) => Math.round((Number(amount) || 0) * 100);

// Creates a Checkout Session for a computeOrder() result. Returns { id, url } or null.
export async function createCheckoutSession({ order, form, responseId, email, successUrl, cancelUrl }) {
  if (!isStripeConfigured() || !order?.items?.length) return null;
  try {
    const subscription = order.mode === "subscription";
    const line_items = order.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: order.currency,
        unit_amount: cents(item.price),
        product_data: { name: String(item.name || "Item").slice(0, 250) },
        ...(subscription ? { recurring: { interval: order.interval === "year" ? "year" : "month" } } : {}),
      },
    }));
    const metadata = { responseId, formId: form.id };
    const params = {
      mode: subscription ? "subscription" : "payment",
      line_items,
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: responseId,
      metadata,
      ...(email ? { customer_email: email } : {}),
      ...(subscription ? { subscription_data: { metadata } } : { payment_intent_data: { metadata } }),
    };
    if (order.coupon && order.discount > 0) {
      const coupon = await stripe("coupons", {
        duration: "once",
        name: String(order.coupon.code).slice(0, 40),
        ...(order.coupon.type === "amount"
          ? { amount_off: cents(order.discount), currency: order.currency }
          : { percent_off: Math.min(100, Number(order.coupon.value) || 0) }),
        max_redemptions: 1,
      });
      params.discounts = [{ coupon: coupon.id }];
    }
    const session = await stripe("checkout/sessions", params);
    return { id: session.id, url: session.url };
  } catch (e) {
    console.error("[stripe.checkout]", e?.message);
    return null;
  }
}

// Verifies `Stripe-Signature: t=…,v1=…` against HMAC-SHA256(`${t}.${rawBody}`) with a 5-minute tolerance.
export function verifyStripeSignature(rawBody, header, toleranceSeconds = 300) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !signatures.length) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSeconds) return false;
  const expected = hmacHex(secret, `${t}.${rawBody}`);
  return signatures.some((sig) => safeEqual(sig, expected));
}
