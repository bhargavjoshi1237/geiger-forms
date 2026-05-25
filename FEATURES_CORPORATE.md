# Geiger Forms — Corporate & Enterprise Features

Features designed for organisations with formal approval chains, compliance obligations, or large internal user bases.
These are not about making the product enterprise-priced — they are about making it genuinely usable in structured, policy-driven environments.

---

## 1. Approval Routing

**Form responses can require one or more approvers before the submission is marked complete.**

The form owner defines an approval chain of up to five named steps (e.g., Direct Manager → HR Lead → Legal). Each step specifies an approver by workspace role or named account, a deadline, and a fallback action if the deadline lapses (escalate, auto-approve, or reject). The respondent sees the current approval status on their submission receipt page. Approvers receive a notification with a one-click approve/reject interface — they do not need to open the full response detail. Approval decisions are logged to the response thread with a timestamp and the approver's account. If any step is rejected, the respondent is notified with a reason and optionally allowed to revise and resubmit.

**Why it's corporate-specific:** Approval chains are required for procurement requests, expense authorisations, policy acknowledgements, and HR intake. The alternative — emailing a manager a PDF — is untraceable and produces no audit record.

---

## 2. Policy Acknowledgement Mode

**A dedicated form mode for documenting that a specific person read and accepted a policy at a specific time.**

When a form is set to Policy Acknowledgement mode, its submission creates a signed record that includes the respondent's identity (verified via Geiger account), the exact version of the form text they accepted, and the UTC timestamp of submission. The record is immutable — not even the form owner can edit it. Acknowledgement records are exportable as a signed PDF or CSV audit log. The form owner can see at a glance who has and has not acknowledged (completion tracking against a workspace member list), with automated reminders at configurable intervals.

**Why it's corporate-specific:** Organisations must demonstrate that employees have read HR policies, security procedures, and regulatory disclosures. An email read receipt is not sufficient. A timestamped, version-pinned acknowledgement that cannot be retroactively altered is a legal artefact.

---

## 3. Delegate Submission

**A workspace member can submit a form on behalf of another person, with the delegation logged.**

When delegation is enabled, an authorised submitter can select "Submit on behalf of…" and choose a named contact from the workspace directory or enter an external email. The response is attributed to the original respondent, not the delegate. The delegation is recorded: delegate identity, timestamp, and an optional reason field. Delegated submissions are marked with a "Delegated" badge in the response list and flagged in the response detail. Form owners can restrict delegation to specific roles (e.g., only PAs and Coordinators can delegate).

**Why it's corporate-specific:** Executive assistants, HR coordinators, and team admins regularly submit forms on behalf of others — onboarding a contractor, completing a vendor form for a manager who is travelling. Without a delegation record, these submissions are misattributed and audits become inaccurate.

---

## 4. Mandatory Review Windows

**Responses cannot be actioned (approved, archived, exported) until a minimum review period has elapsed.**

For compliance-sensitive forms (grievance reports, security incidents, privacy requests), the form owner can set a mandatory review window (e.g., 72 hours, 5 business days). During this window, the response is in a locked state: its status cannot be changed to Complete and it cannot be exported. This prevents any appearance of accelerated disposal or premature closure. Reviewers can still read the response and add thread comments. A countdown is visible in the response detail header.

**Why it's corporate-specific:** HR and legal teams are sometimes required to demonstrate that complaints or incident reports received formal deliberation time. A configurable review window enforces that standard without relying on process discipline.

---

## 5. Duplicate Detection

**Before a response is logged, the system checks whether a response from the same person already exists for the form within a configurable deduplication window.**

When a new submission arrives from a verified Geiger account (or matching email), the system checks for a prior submission from the same identity within the deduplication window (e.g., last 30 days, last cycle, or until form closes). If a duplicate is found, the submitter is shown their prior response and asked whether they intend to update it or submit a new entry. The form owner can configure the policy: allow duplicates, warn and allow, or block entirely. Duplicate attempts are logged even when blocked.

**Why it's corporate-specific:** Internal forms — employee surveys, annual policy reviews, budget requests — are typically one-per-person. Duplicate submissions cause skewed analytics and require manual cleanup. A configurable deduplication check removes this problem upstream.

---

## 6. Offline-Ready Forms with Sync on Reconnect

**Forms can be filled without an internet connection. Data is stored locally and synced when connectivity is restored.**

When a respondent opens a form on a supported device, the current form schema is cached locally. If connectivity drops, the respondent can continue filling without interruption. Field inputs are saved progressively to local storage. When the connection returns, the partial or complete response is synced to the server and submitted in order. Conflict handling: if the form schema was updated while the respondent was offline, they are shown a diff of changed fields and asked to review before final submission.

**Why it's corporate-specific:** Field workers, warehouse staff, event staff, and remote site teams regularly work in environments with poor or no connectivity. Forms designed for office use break silently in these contexts. Offline-readiness makes the tool usable across the full organisation, not just desk workers.

---

## 7. Response Attestation and Counter-Signature

**After a response is submitted, a designated co-signer must confirm or attest to the submission before it is treated as final.**

Used for forms where two-party agreement is required: a contractor logs hours and their project manager attests; an employee submits a performance self-assessment and their manager countersigns. The counter-signer receives a notification with a read-only view of the response and a required attestation action (confirm, add a note, or flag). The response is held in "Pending attestation" status until the counter-sign action is completed or the deadline passes. Both signatures — respondent and co-signer — are recorded in the response log with timestamps.

**Why it's corporate-specific:** Legal and HR processes frequently require that two parties confirm a shared record. Separate signatures on a shared document are one of the core accountability mechanisms in employment law, contracting, and compliance frameworks. A form tool without counter-signature support forces teams to bolt on a manual PDF step.
