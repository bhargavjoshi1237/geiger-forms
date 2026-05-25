# Geiger Forms — Security & Privacy Features

Features that address how form data is collected, stored, accessed, and eventually removed.
These are not checkbox compliance items — each addresses a specific failure mode that occurs in practice.

---

## 1. Field-Level Encryption

**Sensitive fields are encrypted at the field level, separately from the rest of the response, using a key the workspace admin controls.**

The form owner can mark any field as "sensitive" in the builder (e.g., Date of Birth, NIN, salary, bank account). On submission, the value of that field is encrypted with a workspace-specific key before reaching the database. In the response view, the field value is shown as redacted by default. Authorised reviewers (defined by the form owner) can request a decryption view, which requires re-authentication and is logged as an access event. Exports that include sensitive fields are encrypted archives — not plaintext CSVs.

**Why it matters:** Standard form tools store all field values identically. A database breach, a misconfigured export, or an overly-permissive role exposes personal data across the board. Field-level encryption limits blast radius: an attacker who reads the response table cannot read sensitive values without the key.

---

## 2. Respondent Anonymisation Mode

**The form can be configured to accept responses without recording any identifying information about the respondent.**

When anonymisation mode is enabled, the submission pipeline strips all identity signals before the response is stored: no IP address, no browser fingerprint, no account linkage, no email. Even the form owner cannot determine who submitted a given response. Anonymisation is disclosed to the respondent before they begin — the gate screen explicitly states that their identity will not be collected. This mode is incompatible with features that require identity (prefill, approval routing, edit links, response threads) — the builder enforces this and disables those options when anonymisation is active.

**Why it matters:** Employee satisfaction surveys, whistleblower reports, and sensitive HR feedback consistently suffer from low participation when respondents believe they can be identified. Enforced anonymisation — where even the platform operator cannot de-anonymise — is the only technically credible basis for claiming the survey is truly anonymous.

---

## 3. Data Residency Configuration

**The form owner (or workspace admin) can pin all data for a given form or workspace to a specific geographic region.**

When configured, all storage, processing, and log data for that form stays within the chosen region (EU, US, APAC). This applies to response data, file uploads, thread comments, and audit logs. The form builder shows a data residency label in the settings panel. Residency is enforced at the infrastructure level — not a tagging convention — and is auditable via the workspace compliance log.

**Why it matters:** GDPR, PDPA, PIPEDA, and equivalent regulations in most jurisdictions require that personal data not leave a specific territory without legal basis. For a forms tool used in HR, client intake, or research contexts, cross-border data flow is a direct compliance exposure. Data residency configuration eliminates this without requiring legal review on every form.

---

## 4. Automatic Data Retention and Deletion

**Responses are automatically deleted after a configurable retention period, with a grace window and audit trail.**

The form owner sets a retention policy per form: responses older than N days, months, or after the form closes are scheduled for deletion. Before deletion, a digest (anonymised summary counts only) can be preserved. Respondents can be notified before their specific response is deleted if the form collected contact details. Deletions are logged with a reason code in the workspace audit trail. Bulk deletion requests (e.g., a GDPR erasure request for a named individual) can be triggered manually by workspace admins and process within 72 hours.

**Why it matters:** Indefinite data retention is a liability, not a feature. Many organisations commit to retention schedules in their privacy policies but have no mechanism to enforce them. Automatic deletion with audit logging turns a governance commitment into a working system.

---

## 5. Response Access Log

**Every access to a response — view, export, status change, comment — is logged with the accessor's identity and timestamp.**

The response detail panel includes an "Access log" tab visible to workspace admins. Each entry records: who accessed the response, what action they took, the timestamp, and the IP address. Exports of a specific response include its access log as a separate sheet. The log is append-only — it cannot be modified or deleted by any workspace member, including admins. Alerts can be configured to notify a designated privacy contact when a response with sensitive fields is accessed outside business hours or by an unexpected role.

**Why it matters:** Data access auditing is required under most enterprise security frameworks (ISO 27001, SOC 2) and under GDPR's accountability principle. Without a response-level access log, there is no way to demonstrate — or even check — whether personal data was accessed appropriately.

---

## 6. Phishing-Resistant Form URLs

**Published forms use signed, expiring URLs that cannot be forwarded to unintended recipients without detection.**

When a form is distributed via personalised link (via the workspace dispatch feature), each link includes a signed token tied to the intended recipient's identity and an expiry. If the link is opened by an account other than the intended recipient, the gate screen shows a mismatch warning and the open event is logged as a suspicious access. The original recipient is notified. For public forms, the standard published URL is permanent — this feature applies only to direct-dispatch personalised links where recipient identity matters.

**Why it matters:** Personalised form links for HR intake, performance reviews, and legal documents are frequently forwarded — accidentally or intentionally. Without signed tokens, there is no way to verify that the person completing the form is the person who was meant to receive it. A signed link makes impersonation detectable rather than invisible.

---

## 7. Sensitive Field Masking in Previews and Exports

**Fields marked as sensitive are automatically redacted in UI previews, notification emails, and exports unless explicitly unmasked by an authorised user.**

In the response list, response detail panel, and any email notification triggered by a submission, values of sensitive fields are shown as "••••••••" by default. An authorised reviewer can unmask a field for their session — this unmask event is logged. Exports default to excluding sensitive fields entirely; including them requires explicit selection and generates an audit event. Screenshot prevention (where technically enforceable) is applied to the sensitive field display area.

**Why it matters:** A form tool that shows full data in all contexts is not a security control — it is a convenience layer. Masking at the view layer ensures that people who have incidental access to the response view (e.g., a colleague glancing at a screen, a notification on a shared device) do not see data they should not. It also reduces the value of partial access — a user who can view responses but not unmask sensitive fields has significantly reduced exposure.
