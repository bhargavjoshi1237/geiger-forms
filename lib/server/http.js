import "server-only";
import { NextResponse } from "next/server";
import { formsAdmin } from "@/lib/server/supabase-admin";
import { sha256Hex } from "@/lib/server/crypto";

// Shared route-handler plumbing: JSON replies, body limits, client identity, rate limits and absolute URLs.

export const MAX_BODY_BYTES = 256 * 1024;

export function json(data, status = 200, headers) {
  return NextResponse.json(data, { status, headers });
}

export function ok(data = {}) {
  return json({ ok: true, ...data });
}

export function fail(error, status = 400, extra = {}) {
  return json({ ok: false, error, ...extra }, status);
}

export const notFound = (what = "Not found") => fail(what, 404, { code: "not_found" });
export const unauthorized = () => fail("Sign in to continue.", 401, { code: "unauthorized" });
export const forbidden = () => fail("You don't have permission to do that.", 403, { code: "forbidden" });
export const unavailable = (what = "Service unavailable") => fail(what, 503, { code: "unconfigured" });

// Parses a JSON body, refusing anything over `limit` bytes. Returns { body } or { error: Response }.
export async function readJson(request, limit = MAX_BODY_BYTES) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > limit) return { error: fail("Request is too large.", 413, { code: "too_large" }) };
  let text = "";
  try {
    text = await request.text();
  } catch {
    return { error: fail("Couldn't read the request.", 400) };
  }
  if (text.length > limit) return { error: fail("Request is too large.", 413, { code: "too_large" }) };
  if (!text) return { body: {} };
  try {
    const body = JSON.parse(text);
    return { body: body && typeof body === "object" && !Array.isArray(body) ? body : {} };
  } catch {
    return { error: fail("Invalid JSON body.", 400) };
  }
}

export function jsonSize(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
  } catch {
    return Infinity;
  }
}

export function clientIp(request) {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "0.0.0.0";
}

// Salted, one-way IP fingerprint so raw addresses are never stored.
export function ipHash(request) {
  const salt = process.env.FORMS_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "geiger-forms";
  return sha256Hex(`ip:${salt}:${clientIp(request)}`).slice(0, 32);
}

// Fixed-window limiter backed by forms.hit_rate_limit. Fails open when the DB is unreachable.
export async function rateLimit(key, max, windowSeconds = 3600) {
  if (!max || max <= 0) return true;
  const db = formsAdmin();
  if (!db) return true;
  const { data, error } = await db.rpc("hit_rate_limit", { p_key: key, p_window_seconds: windowSeconds, p_max: max });
  if (error) {
    console.error("[http.rateLimit]", error.message);
    return true;
  }
  return data !== false;
}

export const rateLimited = () => fail("Too many requests. Please wait a while and try again.", 429, { code: "rate_limited" });

const PREFIX = process.env.NEXT_PUBLIC_ASSET_PREFIX || "";

// Absolute app origin including the production /forms mount, e.g. https://suite.example/forms.
export function appOrigin(request) {
  let base = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/+$/, "");
  if (!base && request) {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
    base = host ? `${proto}://${host}` : new URL(request.url).origin;
  }
  if (PREFIX && !base.endsWith(PREFIX)) base += PREFIX;
  return base;
}

export function formUrl(origin, slug, query = {}) {
  const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v != null && v !== "")).toString();
  return `${origin}/form/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`;
}

// Workspace deep link to a form's responses (project-scoped when the form has a project).
export function workspaceUrl(origin, form, responseId) {
  const qs = new URLSearchParams({ form: form.id, section: "responses" });
  if (responseId) qs.set("response", responseId);
  if (form.projectId) return `${origin}/project/${form.projectId}/forms?${qs}`;
  qs.set("view", "Forms");
  return `${origin}/forms?${qs}`;
}

// Cron routes require `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends it automatically).
export function cronAuthError(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return unavailable("CRON_SECRET is not configured.");
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return unauthorized();
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value) {
  return typeof value === "string" && value.length <= 320 && EMAIL_RE.test(value.trim());
}

// Blocks outbound requests to loopback, link-local and private networks (SSRF guard for user-supplied URLs).
export function isSafeOutboundUrl(value) {
  let url;
  try {
    url = new URL(String(value));
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(url.protocol)) return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;
  if (host.includes(":") && (host === "::1" || host === "::" || /^(fc|fd|fe80|::ffff:)/.test(host))) return false;
  const v4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return false;
  }
  return true;
}
