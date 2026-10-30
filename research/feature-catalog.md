# Master Feature Catalog — Every Feature & Sub-Item

The complete, exhaustive capability tree assembled from the whole study: the
union of what Gravity Forms + every competitor + every adjacent category offers,
broken down to **feature → sub-items**. This is the buildable spec / coverage
checklist for Geiger Forms — if a competitor has it, it's here.

**Status tags** (🔵 Have · 🟠 Partial — foundation in repo · ⚪ Gap) reflect the
Geiger Forms code. **Tier hint** notes where incumbents usually gate it.

**Status as of 2026-10-30**, from reading the code (the app was not run). 🔵 means
the feature ships, not that every sub-item under it does; notable misses sit on
the tag. Features that only need a deployment's env keys (Stripe, email, captcha,
encryption) count as shipped. A migration in the repo may not be applied yet.
Per-recommendation status is in
[`Forms app competitive feature gaps.md`](../reports/Forms%20app%20competitive%20feature%20gaps.md).

> Source docs: [`gravity-forms-teardown.md`](./gravity-forms-teardown.md) ·
> [`competitor-landscape.md`](./competitor-landscape.md) ·
> [`feature-matrix.md`](./feature-matrix.md)

---

## 1. Form Builder & Editor

- **Drag-and-drop canvas** 🔵
  - Add / reorder / delete fields by drag
  - Drag from a field-type palette / sidebar
  - Duplicate field, duplicate whole section
  - Multi-select / bulk move fields
  - Undo / redo
  - Keyboard shortcuts & keyboard-only building (a11y)
  - Copy field between forms / paste
- **Layout & structure** 🔵 (half/third widths, heading, text, statement, image and video blocks, page breaks; no HTML blocks or spacers)
  - Columns / rows (2-col, 3-col, responsive grid)
  - Section blocks / field groups
  - Page breaks → multi-page (see §4)
  - Spacers, dividers, HTML/rich-text blocks, image/media blocks
  - Field width control (full / half / third)
- **Field configuration panel** 🔵
  - Label, placeholder, help/description text
  - Default value (static, dynamic, from URL param, from prior answer)
  - Required toggle + custom required message
  - Read-only / disabled / hidden
  - Custom CSS class / field ID / name attribute
  - Admin-only label (internal name distinct from public label)
- **Preview & test** 🔵 (desktop and mobile widths; test fill records nothing)
  - Live preview (desktop / tablet / mobile)
  - Test-fill mode without recording a response
  - Preview a specific page/step
- **Autosave & drafts of the form itself** 🔵
  - Autosave while editing
  - Manual save
  - Version history / restore (🔵 restore dialog in the builder)
  - Draft vs Published state (🔵 status field; edits to a published form save to it directly, with no staged draft)

## 2. Field Types (with per-field sub-options)

39 field types ship today (33 input or computed, 6 layout), past the original ~25+ target. Each field's sub-items are its config.

- **Text — single line** 🔵 (min/max length, input mask, pattern/regex, prefix/suffix)
- **Text — paragraph / long** 🔵 (rows, max chars, char counter)
- **Email** 🔵 (confirm-email second field, domain allow/deny, MX validation)
- **Phone** 🔵 (plain tel input today; country code, format mask, international not built)
- **Number** 🔵 (min/max, step, decimals, currency vs plain, thousands separator)
- **Currency / price** 🔵 (symbol, per-item price, quantity link)
- **Dropdown / select** 🔵 (single, searchable, option groups, "other" write-in)
- **Multi-select** 🔵 (min/max choices, searchable)
- **Radio / single choice** 🔵 (inline vs stacked, images as choices, "other")
- **Checkboxes / multi choice** 🔵 (select-all, min/max, images as choices)
- **Choice cards / image select** 🔵 (grid of images/icons as answers)
- **Date** 🔵 (range limits, disable past/future, disable specific days, format, min age)
- **Time** 🔵 (12/24h, step interval)
- **Date-time range** 🟠 (single date-time field; no start/end range)
- **Rating** 🔵 (stars, plus an opinion scale with faces or labels)
- **Scale / Likert** 🔵 (1–5 / 1–10, labels at ends, NPS 0–10 mode)
- **Ranking** 🔵 (drag to order options)
- **Matrix / grid** 🔵 (rows × columns of radios/checks)
- **Slider** ⚪ (min/max/step, single or range)
- **Name (composite)** 🔵 (prefix/first/middle/last/suffix, which parts shown)
- **Address (composite)** 🔵 (street/city/state/zip/country with browser autofill; no address lookup or map)
- **File upload** 🔵 (types allowed, max size, multiple, count limit, image preview, drag-drop)
- **Signature / draw-to-sign** 🔵 (see §8 e-sign)
- **URL / website** 🔵 (validation)
- **Hidden field** 🔵 (value from URL param / cookie / user / computed)
- **Calculated / formula field** 🔵 (math, string, date math, reference other fields)
- **HTML / rich content block** 🟠 (plain-text block with merge tags; no HTML)
- **Section break / page break** 🔵
- **Consent / GDPR checkbox** 🔵 (linked policy text, required, timestamp and wording hash stored per response)
- **Repeating group / list** 🔵 (add-another rows, 7 sub-field types)
- **Lookup / reference field** ⚪ (pull from a table/dataset, cascading dropdowns)
- **Product field** 🔵 (name, price, options that adjust price — for order forms)
- **Quantity field** 🟠 (quantity is the product field's answer; no stock/inventory limit)
- **Total field** 🔵 (order summary, subtotal/discount/total; no tax)
- **Rating/NPS** (covered above)
- **Password / confirm** ⚪ (for user registration)
- **reCAPTCHA / Turnstile field** 🔵 (a per-form Turnstile setting rather than a field; no reCAPTCHA; see §19)

## 3. Logic & Intelligence

- **Conditional visibility** 🔵
  - Show/hide field, section, page, or submit button
  - Based on any prior answer, URL param, user, computed value
  - AND / OR condition groups, nested rules
- **Conditional logic beyond visibility** 🟠 (page skip through conditions; no jump rules, require-if or set-value)
  - Skip / jump logic (go to page X if…) — branching
  - Require-if (make field required conditionally)
  - Enable/disable field conditionally
  - Set/clear value conditionally
- **Calculations** 🔵
  - Numeric math across fields
  - String concatenation, date math (age, duration, deadlines)
  - Conditional formulas (if/then)
  - Running totals / order totals / tax / discount
  - Reference field values by ID / merge tags in formulas
- **Scoring & outcomes** 🔵
  - Per-answer points, weighted scoring
  - Score thresholds → outcome/grade/route (🔵 priority thresholds)
  - Pass/fail, category buckets, personality-quiz style results
- **Dynamic content / personalization** 🔵 (answer recall, merge tags, prefill from URL and signed-in user; no CRM prefill)
  - Recall prior answers into later labels/text ("Hi {name}")
  - Merge tags anywhere (field, notification, confirmation, redirect)
  - Prefill from URL params, logged-in user, CRM, last submission
- **Validation** 🔵
  - Required, format (email/phone/URL), min/max, length, regex
  - Cross-field validation (match, sum, date-after)
  - Custom error messages per rule
  - Server-side re-validation on submit

## 4. Multi-Page & Submission Flow

- **Multi-page / multi-step forms** 🔵
  - Page breaks, step navigation (next/back)
  - Progress bar / step indicator / % complete
  - Per-page validation before advancing
  - Conditional page skipping
- **Save & resume** 🔵 (opt-in per form, with optional consent gate)
  - Save partial, resume via emailed link / cookie / account
  - Partial/abandoned-entry capture (Gravity Elite)
- **Conversational / one-question-at-a-time mode** 🔵 (Typeform-style)
  - Toggle between classic and conversational render
  - Keyboard-driven (Enter to advance), transitions
- **Submission behavior** 🔵
  - Submit button text / styling / conditional visibility
  - Prevent double-submit, loading state
  - Entry limits (total cap, per-user cap)
  - Form scheduling (open/close dates, timezone)
  - Login-required / password-protected forms
  - Unique-value enforcement (no duplicate email/entry)

## 5. Design, Theming & Branding

- **Themes & styling** 🔵 (no per-form custom CSS)
  - Prebuilt themes, dark/light/device (🔵 presets and saved workspace themes)
  - Colors, fonts (🔵 100 curated), spacing, border radius, button styles
  - Per-form custom CSS
  - Brand kit (logo, colors) reused across forms
- **Layout modes** 🟠 (classic and conversational; colour, gradient, image and cover backgrounds; no card or split layouts)
  - Classic, conversational, card, full-page, inline
  - Background image/color/gradient, cover image
- **Custom cover / welcome & ending screens** 🔵
  - Welcome screen (title, description, start button)
  - Multiple ending screens (conditional by outcome/score)
- **White-label / branding removal** 🟠 (per-form footer toggle; no custom domain or agency multi-brand; tier-gated by competitors)
  - Remove "Powered by Geiger"
  - Custom domain (see §15)
  - Agency multi-brand (Paperform Agency+ pattern)
- **Responsive / mobile** 🟠 (responsive layouts in the code; no mobile QA evidence in the repo)
- **Localization / multi-language** 🟠 (7 locales for built-in text, including RTL; question content isn't translated)
  - Per-form language, RTL support, translated field labels/errors
  - Auto-detect visitor language

## 6. Payments & Commerce

- **Payment gateways** 🟠 (Stripe only)
  - Stripe (priority), PayPal, Square, Authorize.Net, Mollie, GoCardless, Razorpay
- **Payment types** 🟠 (one-time, monthly or yearly subscription)
  - One-time, recurring/subscription, "pay what you want," authorize-only
  - Deposits / partial payments / installments
- **Order builder** 🟠 (products, quantity, subtotal, coupons, total; no tax, shipping or inventory)
  - Products, options that modify price, quantity, inventory limits
  - Subtotal, tax/VAT, shipping, discounts
  - Coupons / promo codes (Gravity Elite)
  - Order summary / cart field
- **Checkout UX** 🟠 (hosted Stripe Checkout)
  - Inline card entry, Apple/Google Pay, wallets
  - Currency selection, multi-currency
  - Conditional pricing (price changes by answer)
- **Post-payment** 🟠 (payment status through the Stripe webhook, printable documents; no refunds or accounting sync)
  - Receipts / invoices (PDF, see §10)
  - Payment status tracking in responses
  - Refund handling, failed-payment retry
  - Payment webhooks / accounting sync

## 7. Surveys, Quizzes & Assessment

- **Survey field types** 🔵 (Likert, matrix, NPS, rating, ranking — see §2)
- **Quiz engine** 🔵 (scoring, pass mark, answer reveal; no timers or shuffling)
  - Correct/incorrect answers, points per question
  - Grades / pass-fail / percentage
  - Timed quizzes, question shuffling, answer shuffling
  - Show correct answers / explanations after submit
  - Certificates on pass (see §10 PDF)
- **Survey reporting** 🟠 (per-question charts and NPS score; no trend or crosstabs)
  - Aggregate charts per question (bar/pie/distribution)
  - NPS score calculation & trend
  - Cross-tabulation / filtering by segment
  - Text-response analysis (see §14 AI)
- **Polls** 🟠 (results shown after voting, one-per-user setting; no dedicated poll type)

## 8. E-Signature

- **Signature capture** 🟠 (draw or type, timestamp, reviewer countersign; no multi-party signing order)
  - Draw, type, or upload signature
  - Multiple signers, signing order
  - Signature + date/timestamp + IP audit trail
- **Document signing flow** 🟠 (signed links by email invite, printable document template; no reminders, stored signed PDF or audit certificate)
  - Attach a document/contract to sign
  - Send-for-signature via email link
  - Reminders, expiry, decline
  - Signed PDF generation & storage (see §10)
  - Legal audit certificate (who/when/IP/hash)
  - Compliance (ESIGN/UETA, eIDAS) posture

## 9. Workflow & Approvals

- **Approval routing** 🟠 (sequential chain, approve or reject with notes, request edits, Flow issue escalation; no parallel or conditional routing)
  - Single or multi-step approval chains
  - Sequential vs parallel approvers
  - Approve / reject / request-changes with comments
  - Conditional routing (route by answer/amount/score)
- **Task & assignment** 🟠 (no SLA or due dates)
  - Assign submission to a user/team
  - Status pipeline (new → in-review → done) — 🔵 8 statuses
  - SLA / due dates / escalation
- **Automation triggers** 🟠 (IF/THEN on new responses only: status, priority, tag, assign, email, webhook, Flow issue)
  - On submit / on approve / on status-change → action
  - Create record in another Geiger app (Flow issue, Note, Doc, Event)
  - Send email / Slack / webhook
  - Update external CRM / sheet

## 10. PDF & Document Generation

- **Response → PDF** 🟠 (print to PDF from the browser; nothing stored or attached to email)
  - Auto-generate PDF of a submission
  - Branded template, logo, layout
  - Attach to notification emails, store in response
- **Document merge / templates** 🟠 (document template with merge tags; no Word or fillable-PDF merge)
  - Map answers into a Word/PDF template (invoices, contracts, certificates, offer letters)
  - Conditional content blocks in the doc
  - Fillable-PDF population
- **Export documents** 🟠 (bulk print of up to 100 responses; no ZIP)

## 11. Scheduling & Booking

- **Booking field / slot picker** 🟠 (availability windows, timezone, duration, capacity; no buffers or calendar sync)
  - Availability windows, timezone handling
  - Duration, buffer times, max bookings/slot
  - Calendar sync (Google/Outlook), holds
- **Appointment forms** 🔵 (intake + booking in one flow)
- **Reminders** 🟠 (email 24 hours before; no SMS)
- **Reschedule / cancel links** ⚪

## 12. Response Management & Data

- **Response inbox** 🔵 (cross-form + per-form screens exist)
  - Table / list / detail views
  - Search, filter (by field, status, date, score), sort
  - Saved views / segments 🔵
  - Kanban by status/score 🔵
- **Response detail** 🔵 (detail panel exists)
  - Full answer view, files, metadata (IP, device, UTM, timing)
  - Edit response, add internal notes/comments (🔵 comments table)
  - Status, priority, score, tags (🔵 status/priority/score)
  - Assignee, activity log
- **Data as database / tables** 🟠 (Supabase-native strength)
  - Spreadsheet grid view, inline edit
  - Relations between forms, lookups
  - Filtered/grouped views, formulas on columns
- **Bulk actions** 🔵 (delete, export, print, change status, priority, tags, assign)
- **Export & sync** 🔵 (CSV and JSON, PDF by print, API; no XLSX or scheduled export)
  - CSV, Excel, JSON, PDF
  - Scheduled exports, export by filter
  - Sync to Sheets/Airtable/Notion/DB (see §16)
- **Partial / abandoned entries** 🔵 (capture, abandoned list, emailed resume link on request; no automatic chasers)
- **Data retention & deletion** 🔵 (auto-purge, GDPR export and erasure, anonymous mode)

## 13. Analytics & Reporting

- **Volume metrics** 🔵 (analytics screen)
  - Submissions over time, by form, by source
  - Completion rate, conversion rate
- **Funnel / drop-off** 🔵 (**one-up**)
  - Field-level abandonment (where users quit)
  - Time-per-field, time-to-complete (🔵 completion_ms column)
  - Page/step drop-off in multi-page
- **Source & attribution** 🔵 (UTM, referrer, device; A/B variants change title and description only)
  - UTM capture, referrer, device, geo
  - A/B testing of form variants (Formsort niche)
- **Dashboards & reports** 🟠 (weekly digest email; no custom report builder or share links)
  - Per-form dashboard, KPI cards (🔵 StatsBar)
  - Custom report builder, shareable report links
  - Scheduled report emails

## 14. AI Features

All ⚪ as of 2026-10-30: these views render Coming soon until the suite's `@geiger/ai` ships.

- **AI form generation** ⚪ (table-stakes now)
  - "Describe your form → built" (prompt → fields + logic)
  - Generate from a document/URL/spreadsheet
  - Suggest fields, improve questions, fix wording/tone
- **AI response analysis** ⚪ (**one-up**)
  - Summarize open-text answers across all responses
  - Auto-categorize / tag / sentiment
  - Theme extraction ("top 5 themes across 500 responses")
  - Per-response AI summary
- **AI assist in filling** ⚪
  - Answer suggestions, autocomplete, translation
  - Conversational AI intake (chat → structured answers)
- **AI moderation** ⚪ (spam/abuse detection, PII flagging)

## 15. Distribution & Sharing

- **Public link** 🔵 (routed SSR filler)
  - Short link, custom slug (🔵 slug field), QR code (🔵)
  - Password / login-gated links
- **Embed** 🔵 (inline, popup, slider, side tab, popover, full-screen; delay, scroll and exit-intent triggers; JS API)
  - Inline iframe, popup/modal, slide-in, full-page
  - Embed code snippet, React/JS SDK
  - Prefill via URL params in embed
- **Custom domain** ⚪ (forms.yourbrand.com)
- **Social / email share** 🔵 (X, LinkedIn, Facebook and email share links)
- **Multi-channel** 🟠 (email invites and a browser offline queue; no WhatsApp/SMS link, kiosk mode or native app)

## 16. Integrations & Connectivity

- **Native integrations** 🟠 (Slack and Stripe only)
  - CRM: Salesforce, HubSpot, Zoho, Pipedrive
  - Email marketing: Mailchimp, ActiveCampaign, Campaign Monitor, ConvertKit
  - Productivity: Google Sheets, Airtable, Notion, Slack, Trello, Dropbox
  - Payments/accounting: Stripe, QuickBooks, Xero
- **Automation platforms** 🟠 (Zapier and Make through webhooks; no published apps)
- **Webhooks** 🔵 — outbound on events, HMAC signing, up to 8 retries, replay, owner alerts
- **REST / GraphQL API** 🟠 (REST v1 reads forms and responses and submits responses; no form create or update, no GraphQL)
  - Create/read forms & responses programmatically
  - API keys, scopes, rate limits
- **Suite-native connectors** 🟠 (**one-up**; Flow issues and bell notifications, Assets sync; Notes, Docs, Events and Chat not built)
  - → Geiger Flow (issue/approval), Notes, Docs, Events, Chat
- **Inbound data** ⚪ (prefill from external DB, cascading lookups)

## 17. Notifications & Confirmations

- **Email notifications** 🔵 (no attachments or per-workspace sender)
  - Multiple notifications, conditional sending
  - Admin + autoresponder to submitter
  - Routing (send to different people by answer)
  - Custom from/reply-to, merge tags, attachments (files, PDF)
- **Confirmations (post-submit)** 🔵 (thank-you or redirect, with per-outcome endings)
  - Thank-you message, redirect URL, show another page
  - Conditional confirmations by answer/outcome
- **Other channels** 🟠 (Slack and the suite bell; no SMS or push)
- **Scheduled / drip follow-ups** 🔵

## 18. Collaboration & Team

- **Team & sharing** 🔵
  - Share form with users/teams (🔵 shared screen)
  - Folders / organization (🔵 folders screen)
  - Roles & permissions (🔵 system and custom roles)
- **Real-time collaboration** 🟠 (**one-up vs most**; presence only, no merged co-editing)
  - Co-editing the builder, presence, comments on fields
- **Response collaboration** 🔵 (comments, @mentions, member assignment)
  - Internal notes, @mentions, assignment
- **Activity & audit** 🔵 (activity and field-level access logs)

## 19. Security, Compliance & Trust

- **Spam & abuse** 🔵 (honeypot, Turnstile, rate limit, minimum review time, duplicate detection; no reCAPTCHA or hCaptcha)
  - Honeypot, reCAPTCHA v2/v3, Cloudflare Turnstile, hCaptcha
  - Rate limiting, IP allow/deny, country blocking
  - Akismet-style content filtering, duplicate detection
- **Data protection** 🟠 (GDPR export and erasure, consent records, AES-256-GCM fields; no region choice or DPA in the app)
  - Encryption in transit (TLS) & at rest
  - GDPR tools (consent logging, data export, right-to-delete, DPA)
  - Data residency / region choice (Supabase-controlled)
  - PII masking, field-level encryption
- **Access control** 🟠 (RBAC with custom roles enforced in RLS; SSO and 2FA come from the suite account)
  - RBAC, SSO/SAML, 2FA, session controls
  - Field/form-level permissions
- **Compliance certifications** 🟠 (**moat**; HIPAA readiness checklist, sensitive fields and audit logs; no certification or BAA)
  - HIPAA + BAA, "Mark as ePHI" field (Zoho pattern)
  - SOC 2, ISO 27001, PCI-DSS (payments)
  - Audit trails (90-day+), tamper-evident logs
- **Reliability** 🟠 (uptime, backups, versioned recovery)

## 20. Templates, Organization & Admin

- **Template gallery** 🔵 (42 built-in templates; save a form as a workspace template; no marketplace)
  - Categorized templates (see use-case list in strategy doc)
  - One-click create from template, preview
  - Save own form as template, share templates in team
  - Community/marketplace templates
- **Organization** 🔵
  - Folders (🔵), tags (🔵 tags[]), favorites, search
  - Archive (🔵 archived screen), trash/restore, duplicate form
- **Workspace admin** 🟠 (members, branding, defaults, API keys, audit log; no billing code in this repo)
  - Members, billing, usage, branding, defaults
  - Audit log, API keys, integrations management
- **Multi-workspace / org** 🟠 (project workspaces; no agency client separation)

## 21. Developer & Platform

- **Extensibility** 🟠
  - Hooks/events on submit/approve/etc.
  - Custom field types / plugins
  - Custom validation & server functions
- **Headless / API-first** 🟠 (REST v1 with headless submit; no SDKs)
  - Use forms as pure backend (submit via API), bring-your-own-UI
  - SDKs (JS/React), TypeScript types
- **Data front-end** 🟠 (**Supabase-native one-up**)
  - Query responses as tables/views/relations
  - Public directories/listings from submissions (GravityView pattern)
- **Self-host / ownership** ⚪ (own the DB — differentiator vs SaaS)

---

## How to use this catalog

- **Coverage audit:** every ⚪ is a gap vs some competitor; every 🔵/🟠 is
  ground you already hold. Prioritize with the P0–P4 order in
  [`geiger-forms-strategy.md`](./geiger-forms-strategy.md).
- **Not all of this ships day one.** Table-stakes (§1–5, §12, §17, §19 spam) make
  it credible; the **one-up** items (AI response analysis §14, drop-off analytics
  §13, suite workflow §9/§16, data front-end §21, compliance §19) are where it
  wins.
- **Each ⚪ that maps to an adjacent category** (payments, e-sign, workflow, PDF,
  scheduling) is also a *second subscription you displace* — the bundling thesis.
