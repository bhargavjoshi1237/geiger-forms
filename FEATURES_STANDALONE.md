# Geiger Forms — Standalone Features

Features that make Forms a complete, production-quality form tool on its own,
independent of the rest of the Geiger suite. These are the gaps between
the current prototype and a tool a team would rely on daily.

---

## 1. Conditional Logic (Field Branching)

**Show or hide fields based on how earlier questions were answered.**

In the form builder, each field gains a "Conditions" panel. A condition is a rule: `if [field] [operator] [value] then show/hide [this field]`. Operators cover equality, contains, is empty, numeric comparisons, and multi-select membership. Multiple conditions can be combined with AND/OR. The live preview in the builder reflects the active branch state as the condition is configured. On the filler page, fields appear and disappear fluidly as the respondent answers.

**Why it matters:** Without branching, every respondent sees every question regardless of relevance. Conditional logic is the single most impactful feature for completion rates and response quality — it is the difference between a form and a guided collection flow.

---

## 2. Multi-Step Forms with Section Progress

**Break long forms into named sections, each on its own step, with a progress indicator.**

In the form schema, questions belong to sections. Each section has a title and optional description. On the filler page, sections render as discrete steps with a top progress bar (e.g., "Step 2 of 4 — Contact details"). Navigation between steps validates required fields before advancing. On the builder side, the canvas shows sections as collapsible groups with drag-to-reorder at the section level.

**Why it matters:** Single-page forms with more than 8–10 questions have measurably lower completion rates. Sectioned forms make long collection flows feel manageable and give respondents a clear sense of how much work remains. This is table stakes for any form used in onboarding, applications, or surveys.

---

## 3. Field-Level Drop-Off Analytics

**Show exactly which questions cause respondents to abandon the form.**

Alongside the existing funnel metrics, each question in a published form reports: how many respondents reached it, how many answered it, how many skipped it, and how many abandoned the form immediately after it. This data surfaces in the Analytics screen as a per-question breakdown, sorted by drop-off rate. Questions with high abandonment rates are flagged. The builder links directly to the analytics for each field so friction points can be fixed without leaving context.

**Why it matters:** Aggregate completion rate is a lagging indicator. Per-field drop-off is the diagnostic that explains why the completion rate is what it is. No other signal is more actionable for improving a form.

---

## 4. Response Export (CSV and JSON)

**Download all submissions for a form as a structured file.**

From the Responses screen, a workspace member can export the full response set for any form as CSV or JSON. The export respects the current filter state — exporting only "Needs review" responses, for example, produces a scoped file. Column headers in CSV map to question labels. The JSON export preserves the full schema including metadata (submission time, respondent identifier, source). Exports are generated server-side and delivered as a file download; no third-party service is involved.

**Why it matters:** Data portability is a basic expectation. Teams that cannot get their response data out of a tool will not trust the tool with important collection flows. Export is also the most common bridge to external analysis, reporting, and handoff to other systems before a deeper integration is built.

---

## 5. Form Scheduling (Open and Close Windows)

**Set a date range during which a form accepts responses, then close automatically.**

In form settings, an optional "Schedule" block lets the owner set an open date, a close date, or both. Outside the active window, the filler page shows a configurable message ("Registration opens May 30" or "This form is now closed"). The form status indicator in the workspace reflects the scheduled state. Scheduling is independent of the Published/Draft status — a form can be published and scheduled simultaneously.

**Why it matters:** Event registration, time-limited surveys, application windows, and batch intake flows all have natural close dates. Without scheduling, someone has to manually close the form at the right moment — or it stays open indefinitely, collecting noise. This is a simple feature with high practical impact.

---

## 6. Respondent Confirmation Email

**Send an automatic email to the person who submitted a form.**

A form can have an optional confirmation email configured in its settings. The email includes a customizable subject, a brief body (with merge tags for submitted field values), and an optional copy of the submitted answers. The "reply-to" address is the form owner's workspace email. This is triggered server-side on response insert using a transactional email provider. The form owner can preview the email template in settings before enabling it.

**Why it matters:** Respondents expect acknowledgment. Without a confirmation, they have no receipt, no way to confirm submission went through, and no reference for what they submitted. This also covers basic legal and professional expectations for any business-facing form.

---

## 7. Submission Limit and Auto-Close

**Automatically stop accepting responses after a specified count is reached.**

In form settings, an optional "Response cap" field accepts an integer. When the submission count hits the cap, the form stops accepting new responses and the filler page shows a closed state message. The workspace shows the cap alongside the current count (e.g., "47 / 50 responses"). The cap can be updated or cleared at any time from settings without republishing.

**Why it matters:** First-come-first-served registrations, limited seat events, and pilot programs all need a hard ceiling. Without a cap, the form owner has to manually monitor the count and close the form — which fails at inconvenient hours and creates over-collection.

---

## 8. Custom Post-Submission Screen

**Replace the default "response submitted" message with a configured screen.**

After a successful submission, the filler page can show one of three configured outcomes: a custom message (with rich text and optional embedded image), a redirect to an external URL, or a "submit another response" prompt that resets the form. The outcome is configured per form in the builder's Submission settings panel. The default state is a plain confirmation message if nothing is configured.

**Why it matters:** The post-submission moment is the last impression the form makes. A generic "Your response has been recorded" is a dead end. Teams use this screen to thank respondents, explain next steps, redirect to a product page, or invite a follow-up action. It is a small surface with outsized effect on how the experience is perceived.
