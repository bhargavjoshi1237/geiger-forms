import "server-only";
import { TYPEFORM_ID } from "@/lib/forms/import/typeform";

// Read-only Typeform API client for one import request. The token is a call argument, never stored or logged, and errors never contain it.

const API_ORIGIN = "https://api.typeform.com";
const THEME_ID = /^[A-Za-z0-9]{1,32}$/;

export const TYPEFORM_LIMITS = { timeoutMs: 10_000, maxResponseBytes: 5 * 1024 * 1024 };

// Safe to show the signed-in user: fixed messages only, never upstream text.
export class TypeformError extends Error {
  constructor(message, status = 502, code = "typeform") {
    super(message);
    this.name = "TypeformError";
    this.status = status;
    this.code = code;
  }
}

async function readCapped(res, maxBytes) {
  if (Number(res.headers?.get?.("content-length") || 0) > maxBytes) return null;
  if (!res.body?.getReader) {
    const text = await res.text();
    return Buffer.byteLength(text) > maxBytes ? null : text;
  }
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const STATUS_ERRORS = {
  401: () => new TypeformError("Typeform rejected that token. Check that it's current and has the forms:read scope.", 400, "bad_token"),
  403: () => new TypeformError("That token can't read this form. Check that it has the forms:read scope and access to the form.", 400, "bad_token"),
  404: () => new TypeformError("Typeform couldn't find that form. Check the link or id.", 404, "not_found"),
  429: () => new TypeformError("Typeform is rate limiting requests. Wait a minute and try again.", 429, "rate_limited"),
};

// `path` is built only from pattern-checked ids; redirects are refused so the token can't leave api.typeform.com.
async function getJson(path, token, { fetchImpl = fetch, timeoutMs = TYPEFORM_LIMITS.timeoutMs, maxBytes = TYPEFORM_LIMITS.maxResponseBytes } = {}) {
  let res;
  let text;
  try {
    res = await fetchImpl(`${API_ORIGIN}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok) text = await readCapped(res, maxBytes);
  } catch (e) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") throw new TypeformError("Typeform took too long to respond. Try again.", 504, "timeout");
    throw new TypeformError("Couldn't reach Typeform. Try again.", 502, "unreachable");
  }
  if (!res.ok) throw (STATUS_ERRORS[res.status] || (() => new TypeformError("Typeform returned an error. Try again.", 502)))();
  if (text === null) throw new TypeformError("This form's definition is too large to import.", 413, "too_large");
  try {
    return JSON.parse(text);
  } catch {
    throw new TypeformError("Typeform sent a response that couldn't be read.", 502);
  }
}

export async function fetchTypeformForm(id, token, options) {
  if (typeof id !== "string" || !TYPEFORM_ID.test(id)) throw new TypeformError("That isn't a valid Typeform form id.", 400, "bad_id");
  return getJson(`/forms/${id}`, token, options);
}

// The theme id in a form's theme.href, only when it points back at the Typeform API.
export function themeIdFromHref(href) {
  try {
    const url = new URL(String(href));
    if (url.origin !== API_ORIGIN) return null;
    const id = url.pathname.match(/^\/themes\/([^/]+)$/)?.[1];
    return id && THEME_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

// Form definition with its theme's basics merged in. A theme that can't be read never fails the import; the mapper warns instead.
export async function fetchTypeformDefinition(id, token, options) {
  const definition = await fetchTypeformForm(id, token, options);
  const themeId = themeIdFromHref(definition?.theme?.href);
  if (!themeId) return definition;
  try {
    const theme = await getJson(`/themes/${themeId}`, token, options);
    return theme && typeof theme === "object" ? { ...definition, theme } : definition;
  } catch {
    return definition;
  }
}
