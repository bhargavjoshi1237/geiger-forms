import "server-only";
import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { after } from "next/server";
import { adminClient, formsAdmin } from "@/lib/server/supabase-admin";
import { hmacHex } from "@/lib/server/crypto";
import { OUTBOUND_BLOCKED, appOrigin, isSafeOutboundUrl, postOutbound, workspaceUrl } from "@/lib/server/http";
import { loadForm } from "@/lib/server/forms";
import { renderEmail, sendEmail } from "@/lib/server/email";
import { notifyFormOwner } from "@/lib/server/flow";

// Outbound integrations: signed JSON webhooks with retries and replay (one forms.webhook_deliveries row per delivery) and Slack incoming webhooks.

const MINUTE = 60_000;
const DAY = 1440 * MINUTE;
const TIMEOUT_MS = 8_000;
// Retry policy: attempts 1-3 in-process (now, +2s, +8s), then due 5 min × 4ⁿ later (capped at a day) and run by the next sweep: webhook traffic sweeps at most every 5 min per instance, the daily cron is the backstop. 8 attempts in all.
const QUICK_DELAYS_MS = [2_000, 8_000];
const MAX_QUICK_WAIT_MS = 30_000;
const MAX_ATTEMPTS = 8;
const LEASE_MS = 5 * MINUTE;
const PAYLOAD_TTL_MS = 30 * DAY;
const ATTEMPT_LOG_LIMIT = 25;
const DRAIN_LIMIT = 10;
const SWEEP_BATCH = 10;
const SWEEP_BUDGET_MS = 45_000;
const KICK_INTERVAL_MS = 5 * MINUTE;
const BUSY = "busy";
// webhook_id of an automation's webhook action: "auto:<automation id>" (form webhooks store their own id).
const AUTOMATION_REF = "auto:";
const BLOCKED = { ok: false, status: 0, error: "Blocked or invalid URL", ms: 0, transient: false, retryAfter: null };

let lastKick = 0;

const BASE_COLUMNS = "id, form_id, response_id, webhook_id, url, event, status_code, ok, error, state, attempt_count, attempts, next_retry_at, created_at";
const ROW_COLUMNS = `${BASE_COLUMNS}, payload`;
// Lists read only payload->form: enough to tell whether the payload is still stored for replay.
const LIST_COLUMNS = `${BASE_COLUMNS}, payload:payload->form`;

const isTransient = (status) => status === 0 || status === 408 || status === 425 || status === 429 || status >= 500;

// Claimed but not yet recorded while the claim's lease still runs (an expired lease means the worker died).
const inFlight = (row) => row.attempts?.at(-1)?.n !== row.attempt_count && Date.parse(row.next_retry_at) > Date.now();

// Retry-After in ms (delta-seconds or HTTP date), capped at a day.
function retryAfterMs(header) {
  if (!header) return null;
  const ms = /^\d+$/.test(header.trim()) ? Number(header) * 1000 : Date.parse(header) - Date.now();
  return ms > 0 ? Math.min(ms, DAY) : null;
}

function retryDelay(attempt, retryAfter) {
  const backoff = Math.min(DAY, 5 * MINUTE * 4 ** Math.max(0, attempt - QUICK_DELAYS_MS.length - 1));
  return Math.max(backoff, retryAfter ?? 0);
}

// One POST signed over a body with a fresh createdAt; X-Geiger-Delivery stays the same across retries and replays.
async function send({ id, url, secret, event, data }) {
  if (!isSafeOutboundUrl(url)) return BLOCKED;
  const body = JSON.stringify({ event, createdAt: new Date().toISOString(), data });
  const headers = { "Content-Type": "application/json", "User-Agent": "Geiger-Forms-Webhook/1.0", "X-Geiger-Event": event, "X-Geiger-Delivery": id };
  if (secret) headers["X-Geiger-Signature"] = `sha256=${hmacHex(String(secret), body)}`;
  const started = Date.now();
  let status = 0;
  let error = null;
  let retryAfter = null;
  try {
    const res = await postOutbound(url, { headers, body, timeoutMs: TIMEOUT_MS });
    status = res.status;
    if (status < 200 || status >= 300) {
      error = `HTTP ${status}`;
      retryAfter = retryAfterMs(res.headers["retry-after"]);
    }
  } catch (e) {
    if (e?.code === OUTBOUND_BLOCKED) return BLOCKED;
    // Generic on purpose: socket-level errors would tell the sender how an address answered.
    error = e?.name === "AbortError" ? "Timed out after 8s" : "Couldn't reach the endpoint";
  }
  const ok = status >= 200 && status < 300;
  return { ok, status, error, retryAfter, ms: Date.now() - started, transient: !ok && isTransient(status) };
}

// Row columns for an attempt's outcome: delivered, rescheduled while transient and under the cap, or failed.
function attemptColumns(row, attempt, result, { replay = false, retry = true } = {}) {
  const again = retry && result.transient && attempt < MAX_ATTEMPTS;
  return {
    url: String(row.url || "invalid").slice(0, 2000),
    status_code: result.status || null,
    ok: result.ok,
    error: result.error ? String(result.error).slice(0, 500) : null,
    state: result.ok ? "delivered" : again ? "retrying" : "failed",
    next_retry_at: again ? new Date(Date.now() + retryDelay(attempt, result.retryAfter)).toISOString() : null,
    attempts: [
      ...(row.attempts || []),
      { n: attempt, at: new Date().toISOString(), status: result.status || null, error: result.error, ms: result.ms, ...(replay ? { replay: true } : {}) },
    ].slice(-ATTEMPT_LOG_LIMIT),
  };
}

async function update(db, id, patch) {
  const { error } = await db.from("webhook_deliveries").update(patch).eq("id", id);
  if (error) console.error("[webhooks.update]", error.message);
}

// Bell + email to the form owner when a delivery fails for good, at most once a day per endpoint.
async function alertOwner(db, form, row) {
  if (!form.createdBy) return;
  const { data: recent, error } = await db
    .from("webhook_deliveries")
    .select("id")
    .eq("form_id", form.id)
    .eq("url", row.url)
    .gte("alerted_at", new Date(Date.now() - DAY).toISOString())
    .limit(1);
  if (error || recent.length) return;
  await update(db, row.id, { alerted_at: new Date().toISOString() });
  const description = `A ${row.event} delivery to ${row.url} failed after ${row.attempt_count} attempt${row.attempt_count === 1 ? "" : "s"} (${row.error}).`;
  const text = `${description} Fix the endpoint, then replay the delivery from the delivery log. Further failures for this endpoint stay quiet for 24 hours.`;
  const origin = appOrigin();
  const link = /^https?:\/\//.test(origin) ? new URL(workspaceUrl(origin, form)) : null;
  link?.searchParams.set("section", "integrations");
  const { data: owner } = await adminClient().auth.admin.getUserById(form.createdBy);
  await Promise.allSettled([
    notifyFormOwner({ form, type: "webhook_failed", title: `Webhook failing: ${form.title}`, description, icon: "WebhookOff", extra: { deliveryId: row.id } }),
    owner?.user?.email
      ? sendEmail({
          to: owner.user.email,
          subject: `Webhook failing: ${form.title}`,
          text: link ? `${text}\n\n${link}` : text,
          html: renderEmail({ heading: "A webhook delivery failed", text, cta: link ? { url: String(link), label: "Open integrations" } : null }),
        })
      : null,
  ]);
}

// Writes an attempt's outcome and alerts the owner when an automatic attempt fails for good.
async function record(db, form, row, attempt, result, options = {}) {
  const columns = attemptColumns(row, attempt, result, options);
  await update(db, row.id, columns);
  const next = { ...row, ...columns, attempt_count: attempt };
  if (next.state === "failed" && !options.replay) await alertOwner(db, form, next);
  return next;
}

// Reserves the next attempt with a compare-and-set on attempt_count, so concurrent workers never double-send.
async function claim(db, row) {
  const attempt = row.attempt_count + 1;
  const { data, error } = await db
    .from("webhook_deliveries")
    .update({ attempt_count: attempt, next_retry_at: new Date(Date.now() + LEASE_MS).toISOString() })
    .eq("id", row.id)
    .eq("attempt_count", row.attempt_count)
    .select("id");
  if (error) console.error("[webhooks.claim]", error.message);
  return data?.length ? attempt : null;
}

// Where a stored delivery goes now, per the form's current settings: its webhook's URL and secret (an id-less webhook is matched by URL), or its automation's unchanged webhook action.
function targetFor(form, row) {
  if (!form) return { error: "Form deleted" };
  const ref = row.webhook_id || "";
  if (ref.startsWith(AUTOMATION_REF)) {
    const automation = (form.settings?.automations || []).find((a) => a?.id === ref.slice(AUTOMATION_REF.length));
    if (!automation) return { error: "Automation removed from the form" };
    if (automation.enabled === false) return { error: "Automation paused" };
    if (!(automation.actions || []).some((a) => a?.type === "webhook" && a.value === row.url)) return { error: "Automation webhook changed" };
    return { url: row.url, secret: null };
  }
  const hook = (form.settings?.webhooks || []).find((h) => (ref ? h?.id === ref : !h?.id && h?.url === row.url));
  if (!hook?.url) return { error: "Webhook removed from the form" };
  if (hook.enabled === false) return { error: "Webhook paused" };
  return { url: hook.url, secret: hook.secret };
}

// One more attempt for a stored delivery → { row, result }, or { error } when its target is gone or another worker holds it.
async function retryDelivery(db, form, row, { replay = false } = {}) {
  const target = targetFor(form, row);
  if (target.error) {
    if (!replay) await update(db, row.id, { state: "failed", next_retry_at: null, error: target.error });
    return { error: target.error };
  }
  const attempt = await claim(db, row);
  if (!attempt) return { error: BUSY };
  const result = await send({ id: row.id, url: target.url, secret: target.secret, event: row.event, data: row.payload });
  return { row: await record(db, form, { ...row, url: target.url }, attempt, result, { replay }), result };
}

// The endpoint just answered: retry its other waiting deliveries now instead of at the next sweep.
async function drainEndpoint(db, form, row) {
  let query = db.from("webhook_deliveries").select(ROW_COLUMNS).eq("form_id", form.id).eq("state", "retrying").neq("id", row.id);
  query = row.webhook_id ? query.eq("webhook_id", row.webhook_id) : query.eq("url", row.url);
  const { data, error } = await query.order("created_at").limit(DRAIN_LIMIT);
  if (error) return console.error("[webhooks.drain]", error.message);
  for (const waiting of data.filter((d) => !inFlight(d))) {
    const { result } = await retryDelivery(db, form, waiting);
    if (result && !result.ok) break;
  }
}

// Logged before sending (already holding attempt 1) so a delivery cut off mid-flight is still swept; quick retries follow.
async function deliver({ form, hook, automation, url, event, payload, responseId }) {
  let row = {
    id: randomUUID(),
    form_id: form.id,
    response_id: responseId,
    webhook_id: hook?.id ?? (automation?.id ? `${AUTOMATION_REF}${automation.id}` : null),
    url: String(url || "invalid").slice(0, 2000),
    event,
    payload,
    state: "retrying",
    attempt_count: 1,
    attempts: [],
    next_retry_at: new Date(Date.now() + LEASE_MS).toISOString(),
  };
  const message = { id: row.id, url, secret: hook?.secret, event, data: payload };
  const db = formsAdmin();
  if (!db) return send(message);
  const { error } = await db.from("webhook_deliveries").insert(row);
  if (error) {
    console.error("[webhooks.log]", error.message);
    return send(message);
  }
  let result = await send(message);
  row = await record(db, form, row, 1, result);
  for (const delay of QUICK_DELAYS_MS) {
    if (row.state !== "retrying") break;
    const wait = Math.max(delay, result.retryAfter ?? 0);
    if (wait > MAX_QUICK_WAIT_MS) return;
    await sleep(wait);
    const next = await retryDelivery(db, form, row);
    if (!next.row) return;
    ({ row, result } = next);
  }
  if (row.state === "delivered") await drainEndpoint(db, form, row);
}

// Webhook traffic also sweeps one batch of due retries, at most every few minutes per instance, so they don't wait for the daily cron.
function kickSweep() {
  if (Date.now() - lastKick < KICK_INTERVAL_MS) return;
  lastKick = Date.now();
  after(() => sweepWebhooks({ budgetMs: 0, prune: false }).catch((e) => console.error("[webhooks.kick]", e)));
}

// Schedules a delivery (to a form `hook`, or an `automation`'s webhook action at `url`) for after the response is sent, so attempts and retries never delay or fail the caller.
export async function queueWebhook({ form, hook = null, automation = null, url = hook?.url, event, payload, responseId = null }) {
  after(() => deliver({ form, hook, automation, url, event, payload, responseId }).catch((e) => console.error("[webhooks.deliver]", e)));
  kickSweep();
}

// Fans an event out to every enabled form webhook subscribed to it.
export async function dispatchEvent(form, event, payload, responseId) {
  for (const hook of form.settings?.webhooks || []) {
    if (!hook?.url || hook.enabled === false) continue;
    if (Array.isArray(hook.events) && hook.events.length && !hook.events.includes(event)) continue;
    await queueWebhook({ form, hook, event, payload, responseId });
  }
}

// One signed sample POST, logged as a final attempt (tests are never retried or replayed). Returns { ok, status, error }.
export async function sendTestWebhook({ form, url, secret, payload }) {
  const id = randomUUID();
  const result = await send({ id, url, secret, event: "test", data: payload });
  const db = formsAdmin();
  if (db) {
    const { error } = await db
      .from("webhook_deliveries")
      .insert({ id, form_id: form.id, event: "test", attempt_count: 1, ...attemptColumns({ url }, 1, result, { retry: false }) });
    if (error) console.error("[webhooks.log]", error.message);
  }
  return result;
}

function toDelivery(row) {
  return {
    id: row.id,
    responseId: row.response_id,
    url: row.url,
    event: row.event,
    statusCode: row.status_code,
    ok: row.ok,
    error: row.error,
    state: row.state,
    attemptCount: row.attempt_count,
    attempts: row.attempts || [],
    nextRetryAt: row.next_retry_at,
    replayable: row.event !== "test" && row.payload != null,
    createdAt: row.created_at,
  };
}

// Newest deliveries for a form (payloads stay server-side); null on error.
export async function listDeliveries(formId, limit = 100) {
  const { data, error } = await formsAdmin()
    .from("webhook_deliveries")
    .select(LIST_COLUMNS)
    .eq("form_id", formId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[webhooks.list]", error.message);
    return null;
  }
  return data.map(toDelivery);
}

// Re-sends a stored delivery now with the same delivery id and a fresh signature. Returns { delivery } or { error, status }.
export async function replayDelivery(form, deliveryId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(deliveryId || ""))) return { error: "Delivery not found.", status: 404 };
  const db = formsAdmin();
  const { data: row, error } = await db.from("webhook_deliveries").select(ROW_COLUMNS).eq("id", deliveryId).eq("form_id", form.id).maybeSingle();
  if (error) {
    console.error("[webhooks.replay]", error.message);
    return { error: "Couldn't load the delivery.", status: 500 };
  }
  if (!row) return { error: "Delivery not found.", status: 404 };
  if (row.event === "test") return { error: "Test deliveries can't be replayed. Send a new test instead.", status: 400 };
  if (!row.payload) return { error: "This delivery's payload is no longer stored (payloads are kept for 30 days).", status: 409 };
  const replayed = inFlight(row) ? { error: BUSY } : await retryDelivery(db, form, row, { replay: true });
  if (replayed.error === BUSY) return { error: "This delivery is being retried right now. Try again in a moment.", status: 409 };
  if (replayed.error) return { error: `Can't replay: ${replayed.error.toLowerCase()}.`, status: 409 };
  return { delivery: toDelivery(replayed.row) };
}

// A delivery's form: null once it's deleted, undefined when it couldn't be read.
async function sweepForm(db, id) {
  const form = await loadForm({ id });
  if (form) return form;
  const { data, error } = await db.from("forms").select("id").eq("id", id).is("deleted_at", null).maybeSingle();
  return error || data ? undefined : null;
}

// Retries due deliveries in batches until `budgetMs` is spent (always one batch), then, with `prune`, drops payloads past the replay window.
export async function sweepWebhooks({ budgetMs = SWEEP_BUDGET_MS, prune = true } = {}) {
  const db = formsAdmin();
  if (!db) return null;
  const started = Date.now();
  const forms = new Map();
  let attempted = 0;
  let delivered = 0;
  do {
    const { data: due, error } = await db
      .from("webhook_deliveries")
      .select(ROW_COLUMNS)
      .eq("state", "retrying")
      .lte("next_retry_at", new Date().toISOString())
      .order("next_retry_at")
      .limit(SWEEP_BATCH);
    if (error) {
      console.error("[webhooks.sweep]", error.message);
      break;
    }
    if (!due.length) break;
    for (const id of new Set(due.map((d) => d.form_id))) if (!forms.has(id)) forms.set(id, await sweepForm(db, id));
    // A form that couldn't be read is a transient error, not a deletion: leave the batch for the next sweep.
    if (due.some((d) => forms.get(d.form_id) === undefined)) {
      console.error("[webhooks.sweep]", "Couldn't load a delivery's form; skipping the batch.");
      break;
    }
    const results = await Promise.allSettled(due.map((row) => retryDelivery(db, forms.get(row.form_id), row)));
    for (const r of results) {
      if (r.status === "rejected") console.error("[webhooks.sweep]", r.reason);
      else if (r.value.result) {
        attempted += 1;
        if (r.value.result.ok) delivered += 1;
      }
    }
  } while (Date.now() - started < budgetMs);
  if (prune) {
    const { error } = await db
      .from("webhook_deliveries")
      .update({ payload: null })
      .neq("state", "retrying")
      .not("payload", "is", null)
      .lt("created_at", new Date(Date.now() - PAYLOAD_TTL_MS).toISOString());
    if (error) console.error("[webhooks.prune]", error.message);
  }
  return { attempted, delivered };
}

export async function postSlack(url, text) {
  if (!url || !/^https:\/\/hooks\.slack\.com\//.test(url)) return { ok: false };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
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
