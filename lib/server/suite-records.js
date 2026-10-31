import "server-only";
import { mergeResponseMeta } from "@/lib/server/forms";
import { signRecordToken, verifyRecordToken } from "@/lib/server/crypto";
import { adminClient } from "@/lib/server/supabase-admin";
import { contactFromAnswers, contactUpdate, prefillFromContact } from "@/lib/forms/suite-records";

// Events contacts as a suite record behind a form. Every read and write is pinned to the form's own project.

const RECORD_LINK_DAYS = 30;
const CONTACT_COLUMNS = "id, name, email, phone, company, title, location, tags, blocked";
const contacts = (db) => db.schema("events").from("contacts");

// ILIKE gives a case-insensitive match; "_" is common in addresses, so its wildcards are escaped.
const exactly = (text) => text.replace(/[\\%_]/g, "\\$&");

async function contactById(db, projectId, id) {
  const { data, error } = await contacts(db).select(CONTACT_COLUMNS).eq("id", id).eq("project_id", projectId).is("deleted_at", null).maybeSingle();
  if (error) console.error("[suite.contact.get]", error.message);
  return data || null;
}

export async function contactByEmail(db, projectId, email) {
  const { data, error } = await contacts(db).select(CONTACT_COLUMNS).eq("project_id", projectId).ilike("email", exactly(email)).is("deleted_at", null).order("created_at", { ascending: true }).limit(1);
  if (error) console.error("[suite.contact.find]", error.message);
  return data?.[0] || null;
}

// A signed link that prefills the form from one contact and updates that contact on submit.
export function recordLinkToken(form, contactId) {
  return signRecordToken({ formId: form.id, contactId, expiresAt: Date.now() + RECORD_LINK_DAYS * 86_400_000 });
}

// Answers to prefill for a valid record link, else {}. Holding the link is what grants this, as with any signed form link.
export async function recordPrefill(form, token) {
  const claim = token ? verifyRecordToken(token, form.id) : null;
  const db = claim && form.projectId ? adminClient() : null;
  if (!db) return {};
  return prefillFromContact(form, await contactById(db, form.projectId, claim.contactId));
}

// Creates or updates the contact for a submission and notes it on the response; a record link targets its contact, otherwise the email finds or creates one.
export async function syncContact({ form, row, answers, recordToken, db = adminClient() }) {
  const mapped = contactFromAnswers(form, answers);
  if (!mapped || !form.projectId || !db) return null;
  const claim = recordToken ? verifyRecordToken(recordToken, form.id) : null;
  const existing = claim ? await contactById(db, form.projectId, claim.contactId) : mapped.email ? await contactByEmail(db, form.projectId, mapped.email) : null;
  // Blocklisting is the Events team's decision, so a form never edits a blocked person.
  if (existing?.blocked) return null;

  if (existing) {
    const { error } = await contacts(db).update(contactUpdate(existing, mapped, { verified: Boolean(claim) })).eq("id", existing.id).eq("project_id", form.projectId);
    if (error) {
      console.error("[suite.contact.update]", error.message);
      return null;
    }
    await mergeResponseMeta(row.id, { eventsContact: existing.id });
    return existing.id;
  }
  if (!mapped.email) return null;
  // A new contact has nothing to overwrite; its consent stands as the form's own opt-in. Withdrawing consent is a separate, explicit flow in Events.
  const consent = mapped.consent ? { consent_email: true, consent_updated_at: new Date().toISOString() } : {};
  const { data, error } = await contacts(db)
    .insert({ project_id: form.projectId, ...mapped.patch, tags: mapped.tags, ...consent, metadata: { source: "geiger-forms", formId: form.id } })
    .select("id")
    .single();
  if (error) {
    console.error("[suite.contact.insert]", error.message);
    return null;
  }
  await mergeResponseMeta(row.id, { eventsContact: data.id });
  return data.id;
}
