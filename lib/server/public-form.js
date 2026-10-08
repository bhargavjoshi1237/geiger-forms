import "server-only";
import { cookies } from "next/headers";
import { publicSettings } from "@/lib/forms/schema";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { getSessionUser } from "@/lib/server/auth";
import { countLiveResponses, loadPublishedForm } from "@/lib/server/forms";
import { safeEqual, signValue, verifyLinkToken } from "@/lib/server/crypto";

// Respondent-facing form loading: access gates and the public (secret-free) projection.

export const passwordCookieName = (formId) => `gf_pw_${String(formId).replace(/-/g, "").slice(0, 16)}`;

export function passwordCookieValue(form) {
  return signValue(`pw:${form.id}:${form.settings?.access?.passwordHash || ""}`);
}

export async function hasPasswordCookie(form) {
  try {
    const store = await cookies();
    const value = store.get(passwordCookieName(form.id))?.value;
    const expected = passwordCookieValue(form);
    return Boolean(value && expected && safeEqual(value, expected));
  } catch {
    return false;
  }
}

function parseMoment(value, endOfDay = false) {
  if (!value) return null;
  const text = String(value);
  const ms = Date.parse(text);
  if (Number.isNaN(ms)) return null;
  return endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(text) ? ms + 86_400_000 - 1 : ms;
}

function emailDomain(email) {
  return String(email || "").split("@")[1]?.toLowerCase().trim() || "";
}

export async function hasResponded(formId, userId) {
  if (!userId) return false;
  const { count } = await formsAdmin()
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("form_id", formId)
    .eq("respondent_user_id", userId)
    .is("deleted_at", null);
  return (count ?? 0) > 0;
}

// Resolves the first gate blocking this respondent. Returns { gate, gateMessage, signed, count }.
export async function evaluateGate(form, { user, signedToken, passwordOk = false, now = Date.now() }) {
  const s = form.settings;
  const closedMessage = s.closedMessage || "";
  const openAt = parseMoment(s.openDate);
  const closeAt = parseMoment(s.closeDate, true);
  if (openAt && now < openAt) {
    return { gate: "scheduled", gateMessage: `This form opens on ${new Date(openAt).toUTCString().replace(" GMT", " UTC")}.` };
  }
  if (closeAt && now > closeAt) return { gate: "closed", gateMessage: closedMessage || "This form is no longer accepting responses." };

  const limit = Number(s.responseLimit) || 0;
  const count = limit > 0 || s.showResponseLimit ? await countLiveResponses(form.id) : null;
  if (limit > 0 && count >= limit) {
    return { gate: "limit", gateMessage: closedMessage || "This form has reached its response limit.", count };
  }

  const access = s.access || {};
  let signed = null;
  if (access.mode === "signed") {
    signed = verifyLinkToken(signedToken, form.id);
    if (!signed) return { gate: "signed", gateMessage: "This form needs a personal invitation link. Ask the sender for a new one.", count };
  }
  if (access.mode === "login" && !user) return { gate: "login", gateMessage: "Sign in to fill out this form.", count };
  if (access.mode === "domain") {
    const domain = String(access.orgDomain || "").replace(/^@/, "").toLowerCase().trim();
    if (!user) return { gate: "login", gateMessage: domain ? `Sign in with your @${domain} account to continue.` : "Sign in to continue.", count };
    if (domain && emailDomain(user.email) !== domain) {
      return { gate: "domain", gateMessage: `This form is only open to @${domain} accounts.`, count };
    }
  }
  if (access.mode === "password" && access.passwordHash && !passwordOk) {
    return { gate: "password", gateMessage: "This form is password protected.", count };
  }
  if (access.onePerUser) {
    if (!user) return { gate: "login", gateMessage: "Sign in to respond — this form accepts one response per person.", count };
    if (await hasResponded(form.id, user.id)) return { gate: "closed", gateMessage: "You've already responded to this form.", count };
  }
  return { gate: null, gateMessage: "", signed, count };
}

// Field defs safe for respondents: quiz answer keys are never sent.
export function publicFieldDefs(fieldDefs) {
  return (fieldDefs || []).map((f) => {
    const out = { ...f };
    delete out.correctAnswer;
    return out;
  });
}

export function pickVariant(settings, variantId) {
  const ab = settings.abTest || {};
  const variants = Array.isArray(ab.variants) ? ab.variants.filter((v) => v && v.id) : [];
  if (!ab.enabled || !variants.length) return null;
  const v = variants.find((x) => x.id === variantId) || variants[Math.floor(Math.random() * variants.length)];
  return { id: v.id, title: v.title || "", description: v.description || "" };
}

// Public payload for GET /api/public/forms/:slug and the filler page. Returns null when not found.
export async function loadPublicForm(slug, { signedToken, variantId } = {}) {
  const form = await loadPublishedForm(slug);
  if (!form) return null;
  const user = await getSessionUser().catch(() => null);
  const passwordOk = await hasPasswordCookie(form);
  const { gate, gateMessage, count } = await evaluateGate(form, { user, signedToken, passwordOk });
  return {
    ok: true,
    form: {
      id: form.id,
      slug: form.slug,
      title: form.title,
      description: form.description,
      fieldDefs: gate ? [] : publicFieldDefs(form.fieldDefs),
      settings: publicSettings(form.settings),
      responses: form.settings.showResponseLimit ? count ?? null : null,
      status: form.status,
    },
    gate,
    gateMessage,
    user: user ? { id: user.id, email: user.email, name: user.name } : null,
    variant: pickVariant(form.settings, variantId),
  };
}
