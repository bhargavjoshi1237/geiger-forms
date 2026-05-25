# Geiger Forms — Unique Standalone Features

Features that go beyond the standard form-builder playbook.
These are not "also has scheduling" or "also has exports" — those are table stakes and are covered in FEATURES_STANDALONE.md.
These are features that most form tools do not have, or have only as shallow implementations,
and that are specifically well-suited to Geiger Forms as a workspace tool inside a professional suite.

---

## 1. Response Threads

**Every submitted response gets a persistent comment thread for internal team discussion.**

Each response in the workspace opens into a detail view with a right-hand thread panel. Team members can leave timestamped comments, @-mention colleagues, attach internal notes, and resolve or reopen threads. The thread is invisible to the original respondent — it is a workspace-only review layer. Comments sync in real-time. A response marked as "Needs review" automatically prompts the assigned reviewer with an unread thread indicator.

**Why it's different:** Most form tools treat responses as static rows. Adding a thread turns each submission into a working document — a place where intake happens, not just a record that something was submitted. This is especially valuable for hiring forms, approval requests, and client intake where the response triggers a multi-person review.

---

## 2. Smart Field Prefill from Context

**Form fields populate automatically when a known respondent opens the form.**

When a respondent opens a published form via a personalised link (sent by the workspace), their known fields (name, email, company, role) are prefilled from a lightweight contact store. The respondent can still edit any value. This works for repeat flows — renewal reminders, annual surveys, re-registration — where asking a known contact to retype their details every time is friction without purpose. The contact store is populated from prior responses; no external CRM sync is required.

**Why it's different:** Most form tools only support prefill via URL query parameters, which require manual URL construction. This approach builds the contact map from past submissions automatically, making prefill maintenance-free after the first response.

---

## 3. Calculated Summary Fields

**Fields that compute a visible output from earlier answers, shown to the respondent in real-time.**

A summary field is not a question — it is a display element that evaluates a formula over other field values and shows the result inline during filling. Examples: a quote calculator that totals selected options; a score that reflects the weight of a rating scale; a "estimated turnaround" that reads a date field and outputs a business-day count. Formulas are built in the field editor using a spreadsheet-style syntax (`=SUM`, `=IF`, `=DAYS`). The result updates live on the filler page as the respondent answers.

**Why it's different:** No mainstream form tool offers live formula fields visible to the respondent during filling (as opposed to backend-computed fields visible only in the admin). This turns forms into lightweight configuration tools for quotes, estimates, and eligibility checks without requiring a developer.

---

## 4. Form Revision History

**Every published change to a form is versioned. Prior versions can be previewed or restored.**

Each time a form is published, a snapshot of its schema, title, and settings is saved as a named version. The builder shows a version timeline panel listing every published version with its timestamp and a summary of what changed (fields added, removed, reordered; settings changed). Any version can be previewed in full-screen filler view. Rolling back to a prior version creates a new publish event — it does not overwrite the current version, it appends a restore.

**Why it's different:** Form builders universally lack version history, which means a single accidental edit to a live form can corrupt ongoing data collection with no recovery path. For teams running long-running surveys or compliance intake, this is a significant gap. Versioning makes form editing as recoverable as code.

---

## 5. Inline Response Editing by Respondent

**Respondents can return to their submitted response and edit specific fields within a configurable window.**

After submitting, respondents receive a secure edit link valid for a set time period (e.g., 48 hours, 7 days, or until the form closes). Opening the link shows their original response with editable fields. The form owner controls which fields are editable post-submission and can disable the feature entirely. Each edit is logged as a revision in the response detail view — the original submission is preserved alongside any subsequent edits. Reviewers can see the edit history in the response thread.

**Why it's different:** Most form tools treat submissions as immutable. In practice, respondents frequently submit with errors (wrong phone, typo in email, missing file). Forcing them to contact the form owner or resubmit entirely creates noise. A controlled edit window eliminates this without opening the submission to unlimited revision.

---

## 6. Branching Paths with Named Outcomes

**Multi-path form flows that route respondents to different end states based on their answers, with each outcome tracked separately in analytics.**

Beyond field-level conditional visibility, entire sections of a form can be routed as discrete branches. For example: a triage form routes "Urgent" respondents to a 3-question fast path ending with an escalation outcome, while "Standard" respondents complete the full 8-question flow ending with a standard intake outcome. Each named outcome (Escalated, Standard, Ineligible, Referred) is tracked as a separate funnel in analytics with its own completion rate and drop-off data. Outcomes can trigger different confirmation emails and post-submission screens.

**Why it's different:** Conditional logic shows or hides individual fields. Branching paths route through fundamentally different section sequences and map to distinct downstream actions. This distinction — which almost no form tool makes explicit — is the feature that separates a form from a decision workflow.

---

## 7. Response Score and Auto-Triage

**Responses are automatically scored and triaged into priority queues using rules the form owner defines.**

In the form settings, owners can define a scoring model: each answer to a question contributes a point value (e.g., "Urgent" priority = 10 points, "Standard" = 3). The total score is computed on submission and displayed alongside the response. Score thresholds define triage levels (High, Medium, Low) which appear as colored priority badges in the response list and filter the inbox view. The form owner can override the triage level manually on any response.

**Why it's different:** Most form tools treat all responses as equal until a human reviews them. Auto-triage brings the review queue closer to a support inbox or hiring pipeline — where priority is established at intake, not after someone reads every submission. The scoring model is transparent and auditable, not a black-box AI ranking.
