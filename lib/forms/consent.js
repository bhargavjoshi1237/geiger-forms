// Consent fields: the statement a respondent ticks, and a fingerprint of its wording so later edits are detectable.

function consentStatement(field) {
  return String(field?.label || field?.title || "");
}

// SHA-256 (hex) of the statement and policy link as authored; Web Crypto, so the server and the inbox hash identically.
export async function consentTextHash(field) {
  const text = `${consentStatement(field)}\n${field?.config?.policyUrl || ""}`;
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
