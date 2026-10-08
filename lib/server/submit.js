import "server-only";
import { randomUUID } from "node:crypto";
import { editWindowMs } from "@/lib/forms/schema";
import {
  computeOrder,
  detectRespondent,
  evaluateFormula,
  formatMoney,
  includedFields,
  interpolate,
  scoreResponse,
  stripHiddenAnswers,
  validateAnswers,
  visibleFieldIds,
} from "@/lib/forms/logic";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { MAX_BODY_BYTES, clientIp, formUrl, ipHash, jsonSize, rateLimit } from "@/lib/server/http";
import { checkPassword, encryptSensitive, randomToken } from "@/lib/server/crypto";
import { countLiveResponses, logActivity } from "@/lib/server/forms";
import { evaluateGate, hasPasswordCookie } from "@/lib/server/public-form";
import { checkSlot } from "@/lib/server/booking";
import { isFormPath, newUploadPath, uploadPngDataUrl } from "@/lib/server/storage";
import { createCheckoutSession, isStripeConfigured } from "@/lib/server/stripe";
import { runEditEffects, runSubmissionEffects } from "@/lib/server/side-effects";

// The authoritative submission pipeline shared by the public filler and REST v1.
// Returns { status, body } so routes stay thin.

const reply = (status, body) => ({ status, body });
const failure = (status, code, error, extra = {}) => reply(status, { ok: false, code, error, ...extra });

function isBlank(v) {
  return v == null || v === "" || (Array.isArray(v) && v.length === 0);
}

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token || typeof token !== "string") return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }).toString(),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    return Boolean(data?.success);
  } catch (e) {
    console.error("[submit.turnstile]", e?.message);
    return false;
  }
}

// When an edit token stops working: request-edit override, else the form's edit window from submission.
export function editExpiresAt(row, form) {
  if (row?.metadata?.editExpiresAt) return Date.parse(row.metadata.editExpiresAt) || 0;
  const ms = editWindowMs(form.settings.editWindow);
  if (ms === null) return Infinity;
  if (!ms) return 0;
  return Date.parse(row.submitted_at) + ms;
}

// The live response an edit token unlocks, or null when unknown/expired/finalised.
export async function loadEditableResponse(form, token) {
  if (typeof token !== "string" || token.length < 16 || token.length > 128) return null;
  const { data, error } = await formsAdmin()
    .from("responses")
    .select("*")
    .eq("form_id", form.id)
    .eq("edit_token", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  if (["Approved", "Rejected", "Spam"].includes(data.status)) return null;
  return editExpiresAt(data, form) > Date.now() ? data : null;
}

function thankYouFor(form, answers, extras) {
  const s = form.settings;
  const redirect = s.thankYouType === "redirect" && s.thankYouUrl ? interpolate(s.thankYouUrl, form, answers, extras) : "";
  return {
    title: interpolate(s.thankYouTitle, form, answers, extras),
    text: interpolate(s.thankYouText, form, answers, extras),
    // Only absolute http(s) redirects; merge tags can't smuggle in a javascript: URL.
    redirectUrl: /^https?:\/\//i.test(redirect) ? redirect : null,
  };
}

// Normalises file answers and rejects paths outside this form's upload prefix.
function checkFiles(form, answers, visible, errors) {
  const files = [];
  for (const field of includedFields(form.fieldDefs)) {
    if (!visible.has(field.id) || isBlank(answers[field.id])) continue;
    if (field.type === "file") {
      const list = Array.isArray(answers[field.id]) ? answers[field.id] : [answers[field.id]];
      const max = Math.max(1, Number(field.config?.maxFiles) || 1);
      if (list.length > max) {
        errors[field.id] = `Upload at most ${max} file${max === 1 ? "" : "s"}.`;
        continue;
      }
      const clean = [];
      for (const f of list) {
        if (!f || !isFormPath(form.id, f.path)) {
          errors[field.id] = "This upload couldn't be verified. Please upload the file again.";
          break;
        }
        clean.push({ name: String(f.name || "file").slice(0, 200), path: f.path, size: Number(f.size) || 0, type: String(f.type || "").slice(0, 120) });
      }
      if (errors[field.id]) continue;
      answers[field.id] = clean;
      clean.forEach((f) => files.push({ fieldId: field.id, ...f }));
    } else if (field.type === "signature") {
      const value = answers[field.id];
      if (typeof value === "string") {
        if (!value.startsWith("data:image/png;base64,")) errors[field.id] = "Please sign again.";
      } else if (!isFormPath(form.id, value?.path)) {
        errors[field.id] = "This signature couldn't be verified. Please sign again.";
      } else {
        answers[field.id] = { path: value.path, signedAt: value.signedAt || new Date().toISOString() };
        files.push({ fieldId: field.id, path: value.path, name: "signature.png", type: "image/png", size: 0 });
      }
    }
  }
  return files;
}

// Uploads inline signature data URLs and swaps them for { path, signedAt }.
async function persistSignatures(form, answers, files) {
  for (const field of includedFields(form.fieldDefs)) {
    const value = answers[field.id];
    if (field.type !== "signature" || typeof value !== "string") continue;
    const path = await uploadPngDataUrl(newUploadPath(form.id, "signature.png", "signatures"), value);
    if (!path) return false;
    answers[field.id] = { path, signedAt: new Date().toISOString() };
    files.push({ fieldId: field.id, path, name: "signature.png", type: "image/png", size: 0 });
  }
  return true;
}

async function checkBookings(form, answers, visible, errors, exceptResponseId) {
  const bookings = [];
  for (const field of includedFields(form.fieldDefs)) {
    if (field.type !== "booking" || !visible.has(field.id) || isBlank(answers[field.id])) continue;
    const slot = await checkSlot(form.id, field, answers[field.id], { exceptResponseId });
    if (!slot) {
      errors[field.id] = "That time slot is no longer available. Please pick another.";
      continue;
    }
    answers[field.id] = slot.start;
    bookings.push({ fieldId: field.id, ...slot });
  }
  return bookings;
}

async function findDuplicate(form, answers, exceptId) {
  const d = form.settings.duplicates || {};
  if (!d.enabled || !Array.isArray(d.fieldIds) || !d.fieldIds.length) return null;
  const sensitive = new Set(form.fieldDefs.filter((f) => f.sensitive).map((f) => f.id));
  const match = {};
  for (const id of d.fieldIds) if (!sensitive.has(id) && !isBlank(answers[id])) match[id] = answers[id];
  if (!Object.keys(match).length) return null;
  const since = new Date(Date.now() - Math.max(1, Number(d.windowDays) || 30) * 86_400_000).toISOString();
  let query = formsAdmin()
    .from("responses")
    .select("id")
    .eq("form_id", form.id)
    .is("deleted_at", null)
    .gte("submitted_at", since)
    .contains("answers", match)
    .limit(1);
  if (exceptId) query = query.neq("id", exceptId);
  const { data, error } = await query;
  if (error) console.error("[submit.duplicates]", error.message);
  return data?.[0]?.id ?? null;
}

function cleanText(value, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanUtm(utm) {
  if (!utm || typeof utm !== "object") return undefined;
  const out = {};
  for (const k of ["source", "medium", "campaign", "term", "content"]) if (utm[k]) out[k] = cleanText(utm[k], 200);
  return Object.keys(out).length ? out : undefined;
}

function initialStatus(form, { paymentDue, approvalOn, scored, outcome }) {
  const s = form.settings;
  if (paymentDue) return "Awaiting payment";
  if (approvalOn) return "Pending";
  if (s.scoringEnabled && scored.priority === "High") return "Needs review";
  if (outcome?.branch?.status) return outcome.branch.status;
  return "Complete";
}

/**
 * Runs the full submission pipeline.
 * ctx: { request, user, origin, trusted } — `trusted` (REST v1) skips respondent gates and spam checks.
 */
export async function submitResponse(form, body, { request, user = null, origin, trusted = false }) {
  const s = form.settings;
  const db = formsAdmin();
  if (!db) return failure(503, "unconfigured", "Submissions are unavailable right now.");

  const input = body?.answers;
  if (!input || typeof input !== "object" || Array.isArray(input)) return failure(400, "validation", "Answers are required.");
  if (jsonSize(input) > MAX_BODY_BYTES) return failure(413, "validation", "Your answers are too large to submit.");

  const editing = body.editToken ? await loadEditableResponse(form, body.editToken) : null;
  if (body.editToken && !editing) return failure(403, "gate", "This edit link has expired or is no longer valid.");

  const ip = clientIp(request);
  const ipH = ipHash(request);
  let signed = null;

  if (!trusted) {
    // Honeypot: pretend success, store nothing.
    if (s.spam?.honeypot !== false && typeof body.hp === "string" && body.hp.trim()) {
      return reply(200, { ok: true, responseId: randomUUID(), editUrl: null, checkoutUrl: null, score: null, quiz: null, outcome: null, priority: null, thankYou: thankYouFor(form, {}, {}) });
    }
    if (!editing) {
      const passwordOk = checkPassword(s.access, body.password) || (await hasPasswordCookie(form));
      const gate = await evaluateGate(form, { user, signedToken: body.signedToken, passwordOk });
      if (gate.gate) {
        const closed = ["closed", "limit", "scheduled"].includes(gate.gate);
        return failure(403, closed ? "closed" : "gate", gate.gateMessage, { gate: gate.gate });
      }
      signed = gate.signed;
    }
    if (s.spam?.captcha && process.env.TURNSTILE_SECRET_KEY && !(await verifyTurnstile(body.captchaToken, ip))) {
      return failure(400, "captcha", "Please complete the captcha and try again.");
    }
    if (!(await rateLimit(`submit:${form.id}:${ipH}`, Number(s.spam?.rateLimit) || 0, 3600))) {
      return failure(429, "rate_limited", "Too many submissions from your network. Please try again later.");
    }
    const minMs = (Number(s.minReviewSeconds) || 0) * 1000;
    if (minMs > 0 && !editing && !(Number(body.completionMs) >= minMs)) {
      return failure(422, "validation", `Please take at least ${s.minReviewSeconds} seconds to review your answers before submitting.`, { fieldErrors: {} });
    }
    const gateErrors = {};
    if (s.attestation?.enabled && body.attestation !== true) gateErrors.__attestation = "Please confirm the statement to continue.";
    if (s.policy?.enabled) {
      if (s.policy.requireName && !cleanText(body.policy?.typedName)) gateErrors.__policy = "Type your full name to acknowledge the policy.";
      else if (s.policy.requireScroll && body.policy?.scrolled !== true) gateErrors.__policy = "Please read the policy to the end.";
    }
    if (Object.keys(gateErrors).length) return failure(422, "validation", "Please complete the required acknowledgements.", { fieldErrors: gateErrors });
  } else if (!editing) {
    const limit = Number(s.responseLimit) || 0;
    if (limit > 0 && (await countLiveResponses(form.id)) >= limit) return failure(403, "closed", "This form has reached its response limit.");
  }

  // Only known fields (plus the coupon code) survive; hidden fields fall back to their defaults.
  const known = new Map(form.fieldDefs.map((f) => [f.id, f]));
  let answers = {};
  for (const [key, value] of Object.entries(input)) {
    if (known.has(key)) answers[key] = value;
    else if (key === "__coupon" && typeof value === "string") answers.__coupon = value.slice(0, 60);
  }
  for (const field of form.fieldDefs) {
    if (field.type === "hidden" && isBlank(answers[field.id]) && field.defaultValue != null) answers[field.id] = String(field.defaultValue);
    if (field.readOnly && !field.prefillKey && field.defaultValue != null && field.type !== "hidden") answers[field.id] = field.defaultValue;
  }

  const fieldErrors = validateAnswers(form.fieldDefs, answers);
  answers = stripHiddenAnswers(form.fieldDefs, answers);
  const visible = visibleFieldIds(form.fieldDefs, answers);
  const files = checkFiles(form, answers, visible, fieldErrors);
  const bookings = await checkBookings(form, answers, visible, fieldErrors, editing?.id);
  if (Object.keys(fieldErrors).length) {
    return failure(422, "validation", "Please fix the highlighted fields.", { fieldErrors });
  }

  // Calculated values are stored so inboxes and exports read the same number the respondent saw.
  for (const field of includedFields(form.fieldDefs)) {
    if (field.type === "calculated" && visible.has(field.id)) answers[field.id] = evaluateFormula(field.formula, form.fieldDefs, answers);
  }

  const duplicateOf = await findDuplicate(form, answers, editing?.id);
  if (duplicateOf && form.settings.duplicates.action === "block") {
    return failure(409, "duplicate", "It looks like you've already submitted this form.");
  }

  if (!(await persistSignatures(form, answers, files))) return failure(500, "upload", "We couldn't save your signature. Please try again.");

  const scored = scoreResponse(form, answers);
  const outcome = scored.outcome;
  const order = computeOrder(form, answers);
  const anonymous = Boolean(s.anonymous);

  // Respondent identity: answers first, then signed link / session user; delegates submit on behalf of someone else.
  const detected = detectRespondent(form.fieldDefs, answers);
  let name = detected.name || (!anonymous ? user?.name : null) || null;
  let email = detected.email || signed?.email || (!anonymous ? user?.email : null) || null;
  let delegate;
  const forName = cleanText(body.delegate?.forName, 200);
  const forEmail = cleanText(body.delegate?.forEmail, 320);
  if (!anonymous && user && s.allowDelegate && (forName || forEmail)) {
    delegate = { byUserId: user.id, byName: user.name, byEmail: user.email, forName, forEmail };
    name = forName || name;
    email = forEmail || email;
  }
  if (anonymous) {
    name = null;
    email = null;
  }

  const { answers: stored, encryptedFields } = encryptSensitive(form.fieldDefs, answers);
  const quizMeta = scored.quiz ? { earned: scored.quiz.earned, possible: scored.quiz.possible, percent: scored.quiz.percent, passed: scored.quiz.passed } : undefined;
  const extras = {
    score: scored.score ?? "",
    outcome: outcome?.outcome || "",
    total: order.total > 0 ? formatMoney(order.total, order.currency) : "",
  };

  // --- Edit resubmission: update in place, no payment or notification fan-out.
  if (editing) {
    const meta = {
      ...(editing.metadata || {}),
      quiz: quizMeta,
      files,
      encryptedFields,
      ...(duplicateOf ? { duplicateOf } : {}),
    };
    const { data: row, error } = await db
      .from("responses")
      .update({
        answers: stored,
        respondent_name: anonymous ? editing.respondent_name : name,
        respondent_email: anonymous ? editing.respondent_email : email,
        score: scored.score,
        priority: scored.priority,
        outcome: outcome?.outcome ?? null,
        edited_at: new Date().toISOString(),
        metadata: meta,
      })
      .eq("id", editing.id)
      .select("*")
      .single();
    if (error) {
      console.error("[submit.edit]", error.message);
      return failure(500, "server", "We couldn't save your changes. Please try again.");
    }
    await db.from("bookings").update({ deleted_at: new Date().toISOString() }).eq("response_id", row.id).is("deleted_at", null);
    if (bookings.length) await insertBookings(form, row, bookings);
    await runEditEffects({ form, row });
    return reply(200, publicResult(form, row, scored, order, answers, extras, formUrl(origin, form.slug, { edit: row.edit_token }), null));
  }

  const responseId = randomUUID();
  const paymentDue = Boolean(s.payments?.enabled) && order.total > 0;
  const approvalOn = Boolean(s.approval?.enabled) && (s.approval.steps || []).length > 0;
  const status = initialStatus(form, { paymentDue, approvalOn, scored, outcome });
  const editToken = s.editWindow && s.editWindow !== "disabled" ? randomToken(24) : null;

  let checkout = null;
  if (paymentDue && isStripeConfigured()) {
    checkout = await createCheckoutSession({
      order,
      form,
      responseId,
      email,
      successUrl: formUrl(origin, form.slug, { paid: 1, r: responseId }),
      cancelUrl: formUrl(origin, form.slug, { paid: 0, r: responseId }),
    });
    if (!checkout) return failure(502, "payment", "We couldn't start the payment. Please try again in a moment.");
  }

  const metadata = {
    ...(anonymous ? { anonymous: true } : { ipHash: ipH, userAgent: cleanText(request.headers.get("user-agent"), 400) || undefined }),
    referrer: cleanText(body.referrer, 500) || undefined,
    utm: cleanUtm(body.utm),
    variant: cleanText(body.variant, 80) || undefined,
    sessionId: cleanText(body.sessionId, 80) || undefined,
    quiz: quizMeta,
    delegate,
    attestation: s.attestation?.enabled && body.attestation === true ? { statement: s.attestation.statement, acceptedAt: new Date().toISOString() } : undefined,
    policy: s.policy?.enabled ? { acknowledgedAt: new Date().toISOString(), typedName: cleanText(body.policy?.typedName, 200), scrolled: body.policy?.scrolled === true } : undefined,
    files: files.length ? files.map(({ fieldId, path, name: fileName }) => ({ fieldId, path, name: fileName })) : undefined,
    encryptedFields: encryptedFields.length ? encryptedFields : undefined,
    duplicateOf: duplicateOf || undefined,
    signedEmail: signed?.email || undefined,
    source: trusted ? "api" : undefined,
  };

  const insert = {
    id: responseId,
    form_id: form.id,
    answers: stored,
    respondent_name: name,
    respondent_email: email,
    status: duplicateOf && status === "Complete" ? "Needs review" : status,
    priority: scored.priority || "Low",
    score: scored.score,
    user_agent: anonymous ? null : cleanText(request.headers.get("user-agent"), 400) || null,
    completion_ms: Number.isFinite(Number(body.completionMs)) ? Math.max(0, Math.min(2_147_000_000, Math.round(Number(body.completionMs)))) : null,
    outcome: outcome?.outcome ?? null,
    tags: [],
    metadata: JSON.parse(JSON.stringify(metadata)),
    approval: approvalOn ? { stepIndex: 0, state: "pending", history: [] } : {},
    respondent_user_id: anonymous ? null : user?.id ?? null,
    edit_token: editToken,
    ...(paymentDue
      ? {
          payment_status: checkout ? "pending" : "unconfigured",
          payment_amount: order.total,
          payment_currency: order.currency,
          payment_ref: checkout?.id ?? null,
        }
      : {}),
  };

  const { data: row, error } = await db.from("responses").insert(insert).select("*").single();
  if (error) {
    console.error("[submit.insert]", error.message);
    return failure(500, "server", "We couldn't save your response. Please try again.");
  }

  const editUrl = editToken ? formUrl(origin, form.slug, { edit: editToken }) : null;
  await Promise.allSettled([
    bookings.length ? insertBookings(form, row, bookings) : null,
    typeof body.partialToken === "string" && body.partialToken
      ? db.from("partials").update({ completed_at: new Date().toISOString() }).eq("form_id", form.id).eq("token", body.partialToken)
      : null,
    db.from("form_events").insert({
      form_id: form.id,
      type: "submit",
      session_id: metadata.sessionId ?? null,
      variant: metadata.variant ?? null,
      metadata: JSON.parse(JSON.stringify({ responseId: row.id, utm: metadata.utm, referrer: metadata.referrer })),
    }),
    logActivity({ projectId: form.projectId, formId: form.id, responseId: row.id, actor: { name: "Respondent" }, action: "response.submitted", detail: { title: form.title, status: row.status, source: trusted ? "api" : "form" } }),
  ]);

  await runSubmissionEffects({ form, row, answers, origin, editUrl, extras, files });

  return reply(200, publicResult(form, row, scored, order, answers, extras, editUrl, checkout?.url ?? null));
}

async function insertBookings(form, row, bookings) {
  const { error } = await formsAdmin()
    .from("bookings")
    .insert(bookings.map((b) => ({ form_id: form.id, response_id: row.id, field_id: b.fieldId, slot_start: b.start, slot_end: b.end, email: row.respondent_email })));
  if (error) console.error("[submit.bookings]", error.message);
}

// What the respondent sees back: score/priority only when the form shows scores; quiz keys only when allowed.
function publicResult(form, row, scored, order, answers, extras, editUrl, checkoutUrl) {
  const s = form.settings;
  let quiz = null;
  if (scored.quiz) {
    quiz = { earned: scored.quiz.earned, possible: scored.quiz.possible, percent: scored.quiz.percent, passed: scored.quiz.passed };
    if (s.quiz?.showAnswers) {
      quiz.results = scored.quiz.results;
      quiz.correct = Object.fromEntries(form.fieldDefs.filter((f) => f.correctAnswer != null && f.correctAnswer !== "").map((f) => [f.id, f.correctAnswer]));
    }
  }
  return {
    ok: true,
    responseId: row.id,
    editUrl,
    checkoutUrl,
    score: s.showScore || s.quiz?.enabled ? scored.score : null,
    quiz,
    outcome: scored.outcome?.outcome ?? null,
    priority: s.showScore ? scored.priority : null,
    status: row.status,
    order: order.total > 0 ? { total: order.total, currency: order.currency, discount: order.discount } : null,
    thankYou: thankYouFor(form, answers, extras),
  };
}
