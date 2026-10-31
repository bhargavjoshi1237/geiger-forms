// Maps a form's answers onto a suite record (an Events contact today), so one submission can also create or update it.

import { displayValue } from "./logic";

export const CONTACT_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "title", label: "Job title" },
  { key: "location", label: "Location" },
];

// Answer types a stored text column can hand back to a question unchanged.
const PREFILLABLE = new Set(["text", "email", "phone", "textarea", "url"]);

// A mapped field, unless it's sensitive: encrypted answers must never be copied out in plaintext.
function mappedField(form, fieldId) {
  const field = fieldId ? (form.fieldDefs || []).find((f) => f.id === fieldId) : null;
  return field && !field.sensitive ? field : null;
}

// { email, patch, tags, consent } from a submission; only answered columns appear, so a blank answer never wipes what a contact already has.
export function contactFromAnswers(form, answers) {
  const sync = form.settings?.contactSync;
  if (!sync?.enabled) return null;
  const patch = {};
  for (const { key } of CONTACT_COLUMNS) {
    const field = mappedField(form, sync.map?.[key]);
    const text = field ? String(displayValue(field, answers?.[field.id]) ?? "").trim() : "";
    if (text) patch[key] = text;
  }
  if (patch.email) patch.email = patch.email.toLowerCase();
  const consentField = mappedField(form, sync.consentFieldId);
  return { email: patch.email || "", patch, tags: Array.isArray(sync.tags) ? sync.tags.filter(Boolean) : [], consent: consentField ? answers?.[consentField.id] === true : false };
}

// The update for an existing contact. Only a signed record link proves who's answering: anyone can type someone else's email into a public form, so a match by email can only fill blanks, and can't grant consent.
export function contactUpdate(existing, mapped, { verified = false, now = new Date().toISOString() } = {}) {
  const patch = verified ? { ...mapped.patch } : Object.fromEntries(Object.entries(mapped.patch).filter(([key]) => !String(existing[key] ?? "").trim()));
  const update = { ...patch, tags: [...new Set([...(existing.tags || []), ...mapped.tags])] };
  if (verified && mapped.consent) Object.assign(update, { consent_email: true, consent_updated_at: now });
  return update;
}

// Answers to prefill from an existing contact, for question types that accept its plain text.
export function prefillFromContact(form, contact) {
  const sync = form.settings?.contactSync;
  if (!sync?.enabled || !contact) return {};
  const out = {};
  for (const { key } of CONTACT_COLUMNS) {
    const field = mappedField(form, sync.map?.[key]);
    if (field && PREFILLABLE.has(field.type) && contact[key]) out[field.id] = contact[key];
  }
  return out;
}
