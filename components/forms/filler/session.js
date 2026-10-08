"use client";

import { callApi } from "@/lib/forms/api";
import { slugify } from "@/lib/forms/schema";
import { isInputField } from "@/lib/forms/field-types";

const RESERVED = new Set(["t", "resume", "edit", "paid", "r", "embed", "solid", "variant", "ref", "preview"]);
const UTM_KEYS = ["source", "medium", "campaign", "term", "content"];

function first(v) {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

// Normalizes the page's search params into the filler's options + a lower-cased prefill map.
export function parseFillerParams(searchParams = {}) {
  const sp = searchParams && typeof searchParams === "object" ? searchParams : {};
  const utm = {};
  for (const key of UTM_KEYS) {
    const v = first(sp[`utm_${key}`]);
    if (v) utm[key] = String(v).slice(0, 200);
  }
  const raw = {};
  for (const [key, value] of Object.entries(sp)) raw[key.toLowerCase()] = value;
  return {
    signedToken: first(sp.t) || null,
    resume: first(sp.resume) || null,
    edit: first(sp.edit) || null,
    paid: first(sp.paid) || null,
    responseId: first(sp.r) || null,
    embed: first(sp.embed) === "1" || first(sp.embed) === "true",
    solid: first(sp.solid) === "1",
    variant: first(sp.variant) || null,
    ref: first(sp.ref) || null,
    utm,
    raw,
  };
}

function matchOption(field, value) {
  const want = String(value).trim().toLowerCase();
  return (field.options || []).find((o) => String(o).trim().toLowerCase() === want);
}

// Coerces a URL/default value into the field's stored answer shape (undefined when it doesn't fit).
export function coercePrefill(field, value) {
  if (value === undefined || value === null || value === "") return undefined;
  const list = Array.isArray(value) ? value : String(value).split(",");
  const text = Array.isArray(value) ? String(value[0] ?? "") : value;
  switch (field.type) {
    case "multiselect":
    case "ranking": {
      const picked = list.map((v) => matchOption(field, v)).filter(Boolean);
      return picked.length ? picked : undefined;
    }
    case "select":
    case "dropdown":
      return matchOption(field, text);
    case "checkbox":
      return typeof text === "boolean" ? text : /^(1|true|yes|on|y)$/i.test(String(text).trim()) || undefined;
    case "number":
    case "currency":
    case "rating":
    case "scale":
    case "nps":
    case "product": {
      const n = Number(text);
      return Number.isFinite(n) ? n : undefined;
    }
    case "name": {
      if (typeof value === "object" && !Array.isArray(value)) return value;
      const parts = String(text).trim().split(/\s+/);
      return { first: parts[0] || "", last: parts.slice(1).join(" ") };
    }
    case "address":
    case "matrix":
    case "repeater":
      return typeof value === "object" && !Array.isArray(value) ? value : undefined;
    case "file":
    case "signature":
    case "booking":
      return undefined;
    default:
      return typeof text === "string" ? text.slice(0, 5000) : String(text);
  }
}

// Candidate URL keys for a field: prefillKey, slugified title (dash + underscore), id.
function prefillKeys(field) {
  const slug = slugify(field.title || field.label || "");
  return [field.prefillKey, slug, slug.replace(/-/g, "_"), field.id].filter(Boolean).map((k) => String(k).toLowerCase());
}

// Initial answers: defaults, then URL params (hidden fields always; others when prefill.url), then the signed-in user.
export function buildInitialAnswers(fields, settings, params, user) {
  const answers = {};
  const raw = params?.raw || {};
  const allowUrl = settings?.prefill?.url !== false;
  for (const field of fields || []) {
    if (!isInputField(field.type)) continue;
    const def = coercePrefill(field, field.defaultValue);
    if (def !== undefined) answers[field.id] = def;
    if (field.type !== "hidden" && !allowUrl) continue;
    for (const key of prefillKeys(field)) {
      if (!(key in raw)) continue;
      if (field.type !== "hidden" && RESERVED.has(key)) continue;
      const v = coercePrefill(field, raw[key]);
      if (v !== undefined) {
        answers[field.id] = v;
        break;
      }
    }
  }
  if (settings?.prefill?.user && user) {
    const nameField = (fields || []).find((f) => f.type === "name") || (fields || []).find((f) => f.type === "text" && /name/i.test(`${f.title} ${f.label || ""}`));
    if (nameField && answers[nameField.id] === undefined && user.name) answers[nameField.id] = coercePrefill(nameField, user.name);
    const emailField = (fields || []).find((f) => f.type === "email");
    if (emailField && answers[emailField.id] === undefined && user.email) answers[emailField.id] = user.email;
  }
  return answers;
}

// Fire-and-forget analytics event.
export function postEvent(slug, type, body = {}) {
  return callApi(`/api/public/forms/${encodeURIComponent(slug)}/event`, { method: "POST", body: { type, ...body } });
}

// Answers for partial saves: inline data URLs (unsent signatures) are dropped; the server encrypts sensitive fields.
export function partialAnswers(answers) {
  const out = {};
  for (const [key, value] of Object.entries(answers || {})) {
    if (typeof value === "string" && value.startsWith("data:")) continue;
    out[key] = value;
  }
  return out;
}

export function publicApi(slug, path = "") {
  return `/api/public/forms/${encodeURIComponent(slug)}${path}`;
}

// Absolute URL for an app path (prefix-aware) or an already absolute URL.
export function absoluteUrl(pathOrUrl, withPrefix) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (typeof window === "undefined") return pathOrUrl;
  return `${window.location.origin}${withPrefix(pathOrUrl)}`;
}
