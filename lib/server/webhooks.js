import "server-only";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { hmacHex } from "@/lib/server/crypto";
import { isSafeOutboundUrl } from "@/lib/server/http";

// Outbound integrations: signed JSON webhooks (logged to forms.webhook_deliveries) and Slack incoming webhooks.

async function logDelivery({ formId, responseId, url, event, statusCode, ok, error }) {
  const db = formsAdmin();
  if (!db) return;
  const { error: dbError } = await db.from("webhook_deliveries").insert({
    form_id: formId,
    response_id: responseId ?? null,
    url: String(url).slice(0, 2000),
    event,
    status_code: statusCode ?? null,
    ok: Boolean(ok),
    error: error ? String(error).slice(0, 500) : null,
  });
  if (dbError) console.error("[webhooks.log]", dbError.message);
}

// POSTs `payload` with `X-Geiger-Signature: sha256=<hmac(secret, body)>`. Returns { ok, status }.
export async function postSignedWebhook({ url, secret, event, payload, formId, responseId, log = true }) {
  if (!isSafeOutboundUrl(url)) {
    if (log) await logDelivery({ formId, responseId, url: String(url || "invalid"), event, ok: false, error: "Blocked or invalid URL" });
    return { ok: false, status: 0, error: "invalid_url" };
  }
  const body = JSON.stringify({ event, createdAt: new Date().toISOString(), data: payload });
  const headers = { "Content-Type": "application/json", "User-Agent": "Geiger-Forms-Webhook/1.0", "X-Geiger-Event": event };
  if (secret) headers["X-Geiger-Signature"] = `sha256=${hmacHex(String(secret), body)}`;
  let status = 0;
  let error = null;
  try {
    const res = await fetch(url, { method: "POST", headers, body, redirect: "manual", signal: AbortSignal.timeout(8000) });
    status = res.status;
    if (!res.ok) error = `HTTP ${res.status}`;
  } catch (e) {
    error = e?.name === "TimeoutError" ? "Timed out after 8s" : e?.message || "Network error";
  }
  const ok = status >= 200 && status < 300;
  if (log) await logDelivery({ formId, responseId, url, event, statusCode: status || null, ok, error });
  return { ok, status, error };
}

// Fans an event out to every enabled form webhook subscribed to it.
export async function dispatchEvent(form, event, payload, responseId) {
  const hooks = (form.settings?.webhooks || []).filter(
    (h) => h && h.url && h.enabled !== false && (!Array.isArray(h.events) || h.events.length === 0 || h.events.includes(event)),
  );
  return Promise.allSettled(
    hooks.map((h) => postSignedWebhook({ url: h.url, secret: h.secret, event, payload, formId: form.id, responseId })),
  );
}

export async function postSlack(url, text) {
  if (!url || !/^https:\/\/hooks\.slack\.com\//.test(url)) return { ok: false };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.ok };
  } catch (e) {
    console.error("[webhooks.slack]", e?.message);
    return { ok: false };
  }
}

// Public webhook payload for a response row (sensitive answers stay encrypted/masked by the caller).
export function responsePayload(form, row, answers) {
  return {
    form: { id: form.id, slug: form.slug, title: form.title },
    response: {
      id: row.id,
      status: row.status,
      priority: row.priority,
      score: row.score,
      outcome: row.outcome,
      tags: row.tags || [],
      respondent: { name: row.respondent_name, email: row.respondent_email },
      answers,
      approval: row.approval || {},
      payment: row.payment_status ? { status: row.payment_status, amount: Number(row.payment_amount ?? 0), currency: row.payment_currency } : null,
      submittedAt: row.submitted_at,
      editedAt: row.edited_at ?? null,
    },
  };
}
