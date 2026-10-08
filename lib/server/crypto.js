import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Server crypto: hashing, HMAC signing (links, cookies, webhooks), random tokens and field encryption.

export function sha256Hex(text) {
  return createHash("sha256").update(String(text ?? ""), "utf8").digest("hex");
}

export function hmacHex(secret, data) {
  return createHmac("sha256", secret).update(data, "utf8").digest("hex");
}

export function randomToken(bytes = 24) {
  return randomBytes(bytes).toString("base64url");
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? ""), "utf8");
  const y = Buffer.from(String(b ?? ""), "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

// Signing secret for links/cookies; falls back to a value derived from the service key so links still work.
function linkSecret() {
  if (process.env.FORMS_LINK_SECRET) return process.env.FORMS_LINK_SECRET;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fallback ? sha256Hex(`geiger-forms-link:${fallback}`) : null;
}

export function isLinkSigningConfigured() {
  return Boolean(linkSecret());
}

export function signValue(value) {
  const secret = linkSecret();
  return secret ? hmacHex(secret, value) : null;
}

// Signed respondent link token: base64url(payload).hmac — payload { f: formId, e: email, x: expiry ms }.
export function signLinkToken({ formId, email = "", expiresAt }) {
  const secret = linkSecret();
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify({ f: formId, e: email || "", x: expiresAt })).toString("base64url");
  return `${payload}.${hmacHex(secret, payload).slice(0, 43)}`;
}

// Returns { email, expiresAt } for a valid, unexpired token bound to `formId`; otherwise null.
export function verifyLinkToken(token, formId) {
  const secret = linkSecret();
  if (!secret || typeof token !== "string" || token.length > 2048) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, hmacHex(secret, payload).slice(0, 43))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.f !== formId || !(Number(data.x) > Date.now())) return null;
    return { email: data.e || "", expiresAt: Number(data.x) };
  } catch {
    return null;
  }
}

// Mirrors the editor's Web Crypto hash: hex(SHA-256(salt + password)).
export function checkPassword(access, password) {
  if (!access?.passwordHash || typeof password !== "string" || !password) return false;
  return safeEqual(sha256Hex(`${access.passwordSalt || ""}${password}`), String(access.passwordHash).toLowerCase());
}

// --- Field encryption (AES-256-GCM) ------------------------------------------

function encryptionKey() {
  const raw = process.env.FORMS_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  return key.length === 32 ? key : createHash("sha256").update(raw).digest();
}

export function isEncryptionConfigured() {
  return Boolean(encryptionKey());
}

export function isEncrypted(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && typeof value.__enc === "string");
}

// Encrypts any JSON value → { __enc: "v1:<iv>:<tag>:<ciphertext>" } (base64url parts).
export function encryptValue(value) {
  const key = encryptionKey();
  if (!key) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(JSON.stringify(value ?? null), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { __enc: `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${ct.toString("base64url")}` };
}

export function decryptValue(value) {
  if (!isEncrypted(value)) return value;
  const key = encryptionKey();
  if (!key) return null;
  try {
    const [version, iv, tag, ct] = value.__enc.split(":");
    if (version !== "v1") return null;
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const plain = Buffer.concat([decipher.update(Buffer.from(ct, "base64url")), decipher.final()]).toString("utf8");
    return JSON.parse(plain);
  } catch (e) {
    console.error("[crypto.decrypt]", e?.message);
    return null;
  }
}

// Encrypts the answers of `sensitive` fields. Returns { answers, encryptedFields }.
export function encryptSensitive(fieldDefs, answers) {
  const ids = (fieldDefs || []).filter((f) => f?.sensitive).map((f) => f.id);
  if (!ids.length || !isEncryptionConfigured()) return { answers, encryptedFields: [] };
  const out = { ...answers };
  const encryptedFields = [];
  for (const id of ids) {
    if (out[id] === undefined || out[id] === null || out[id] === "" || isEncrypted(out[id])) continue;
    out[id] = encryptValue(out[id]);
    encryptedFields.push(id);
  }
  return { answers: out, encryptedFields };
}

// Decrypts every encrypted answer (or only `onlyFieldId`).
export function decryptAnswers(answers, onlyFieldId) {
  const out = { ...(answers || {}) };
  for (const [key, value] of Object.entries(out)) {
    if (onlyFieldId && key !== onlyFieldId) continue;
    if (isEncrypted(value)) out[key] = decryptValue(value);
  }
  return out;
}

// Replaces encrypted answers with a mask for outbound channels (email, Slack, webhooks, Flow).
export function maskEncrypted(answers, mask = "[protected]") {
  const out = { ...(answers || {}) };
  for (const [key, value] of Object.entries(out)) if (isEncrypted(value)) out[key] = mask;
  return out;
}
