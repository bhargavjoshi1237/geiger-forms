# Master Feature Catalog — Every Feature & Sub-Item

The complete, exhaustive capability tree assembled from the whole study: the
union of what Gravity Forms + every competitor + every adjacent category offers,
broken down to **feature → sub-items**. This is the buildable spec / coverage
checklist for Geiger Forms — if a competitor has it, it's here.

**Status tags** (🔵 Have · 🟠 Partial — foundation in repo · ⚪ Gap) reflect the
current Geiger Forms code. **Tier hint** notes where incumbents usually gate it.

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
- **Layout & structure** 🟠
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
- **Preview & test** 🟠
  - Live preview (desktop / tablet / mobile)
  - Test-fill mode without recording a response
  - Preview a specific page/step
- **Autosave & drafts of the form itself** 🟠
  - Autosave while editing
  - Manual save
  - Version history / restore (🔵 versions table exists)
  - Draft vs Published state (🔵 status field)

## 2. Field Types (with per-field sub-options)

Target: expand from the current 10 → ~25+. Each field's sub-items are its config.

- **Text — single line** 🔵 (min/max length, input mask, pattern/regex, prefix/suffix)
- **Text — paragraph / long** 🔵 (rows, max chars, char counter)
- **Email** 🔵 (confirm-email second field, domain allow/deny, MX validation)
- **Phone** 🔵 (country code, format mask, international)
- **Number** 🔵 (min/max, step, decimals, currency vs plain, thousands separator)
- **Currency / price** ⚪ (symbol, per-item price, quantity link)
- **Dropdown / select** 🔵 (single, searchable, option groups, "other" write-in)
- **Multi-select** 🟠 (min/max choices, searchable)
- **Radio / single choice** 🟠 (inline vs stacked, images as choices, "other")
- **Checkboxes / multi choice** 🔵 (select-all, min/max, images as choices)
- **Choice cards / image select** ⚪ (grid of images/icons as answers)
- **Date** 🔵 (range limits, disable past/future, disable specific days, format, min age)
- **Time** ⚪ (12/24h, step interval)
- **Date-time range** ⚪ (start/end, duration calc)
- **Rating** ⚪ (stars, hearts, emoji, scale length)
- **Scale / Likert** ⚪ (1–5 / 1–10, labels at ends, NPS 0–10 mode)
- **Ranking** ⚪ (drag to order options)
- **Matrix / grid** ⚪ (rows × columns of radios/checks)
- **Slider** ⚪ (min/max/step, single or range)
- **Name (composite)** ⚪ (prefix/first/middle/last/suffix, which parts shown)
- **Address (composite)** ⚪ (street/city/state/zip/country, autocomplete, map)
- **File upload** 🔵 (types allowed, max size, multiple, count limit, image preview, drag-drop)
- **Signature / draw-to-sign** ⚪ (see §8 e-sign)
- **URL / website** ⚪ (validation)
- **Hidden field** ⚪ (value from URL param / cookie / user / computed)
- **Calculated / formula field** 🔵 (math, string, date math, reference other fields)
- **HTML / rich content block** 🟠 (static content, merge tags)
- **Section break / page break** 🟠
- **Consent / GDPR checkbox** ⚪ (linked policy text, required, audit-logged)
- **Repeating group / list** ⚪ (add-another rows, min/max rows, per-row calc)
- **Lookup / reference field** ⚪ (pull from a table/dataset, cascading dropdowns)
- **Product field** ⚪ (name, price, options that adjust price — for order forms)
- **Quantity field** ⚪ (linked to product, stock/inventory limit)
- **Total field** ⚪ (order summary, subtotal/tax/discount/total)
- **Rating/NPS** (covered above)
- **Password / confirm** ⚪ (for user registration)
- **reCAPTCHA / Turnstile field** ⚪ (see §19)

## 3. Logic & Intelligence

- **Conditional visibility** 🔵
  - Show/hide field, section, page, or submit button
  - Based on any prior answer, URL param, user, computed value
  - AND / OR condition groups, nested rules
- **Conditional logic beyond visibility** 🟠
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
- **Dynamic content / personalization** 🟠
  - Recall prior answers into later labels/text ("Hi {name}")
  - Merge tags anywhere (field, notification, confirmation, redirect)
  - Prefill from URL params, logged-in user, CRM, last submission
- **Validation** 🔵
  - Required, format (email/phone/URL), min/max, length, regex
  - Cross-field validation (match, sum, date-after)
  - Custom error messages per rule
  - Server-side re-validation on submit

## 4. Multi-Page & Submission Flow

- **Multi-page / multi-step forms** ⚪
  - Page breaks, step navigation (next/back)
  - Progress bar / step indicator / % complete
  - Per-page validation before advancing
  - Conditional page skipping
- **Save & resume** ⚪
  - Save partial, resume via emailed link / cookie / account
  - Partial/abandoned-entry capture (Gravity Elite)
- **Conversational / one-question-at-a-time mode** 🟠 (Typeform-style)
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

- **Themes & styling** 🟠
  - Prebuilt themes, dark/light (🔵 light mode exists)
  - Colors, fonts, spacing, border radius, button styles
  - Per-form custom CSS
  - Brand kit (logo, colors) reused across forms
- **Layout modes** ⚪
  - Classic, conversational, card, full-page, inline
  - Background image/color/gradient, cover image
- **Custom cover / welcome & ending screens** ⚪
  - Welcome screen (title, description, start button)
  - Multiple ending screens (conditional by outcome/score)
- **White-label / branding removal** ⚪ (tier-gated by competitors)
  - Remove "Powered by Geiger"
  - Custom domain (see §15)
  - Agency multi-brand (Paperform Agency+ pattern)
- **Responsive / mobile** 🟠 (🔵 mobile topbar/sidebar work done)
- **Localization / multi-language** ⚪
  - Per-form language, RTL support, translated field labels/errors
  - Auto-detect visitor language

## 6. Payments & Commerce

- **Payment gateways** ⚪
  - Stripe (priority), PayPal, Square, Authorize.Net, Mollie, GoCardless, Razorpay
- **Payment types** ⚪
  - One-time, recurring/subscription, "pay what you want," authorize-only
  - Deposits / partial payments / installments
- **Order builder** ⚪
  - Products, options that modify price, quantity, inventory limits
  - Subtotal, tax/VAT, shipping, discounts
  - Coupons / promo codes (Gravity Elite)
  - Order summary / cart field
- **Checkout UX** ⚪
  - Inline card entry, Apple/Google Pay, wallets
  - Currency selection, multi-currency
  - Conditional pricing (price changes by answer)
- **Post-payment** ⚪
  - Receipts / invoices (PDF, see §10)
  - Payment status tracking in responses
  - Refund handling, failed-payment retry
  - Payment webhooks / accounting sync

## 7. Surveys, Quizzes & Assessment

- **Survey field types** 🟠 (Likert, matrix, NPS, rating, ranking — see §2)
- **Quiz engine** 🔵 (scoring foundation exists)
  - Correct/incorrect answers, points per question
  - Grades / pass-fail / percentage
  - Timed quizzes, question shuffling, answer shuffling
  - Show correct answers / explanations after submit
  - Certificates on pass (see §10 PDF)
- **Survey reporting** ⚪
  - Aggregate charts per question (bar/pie/distribution)
  - NPS score calculation & trend
  - Cross-tabulation / filtering by segment
  - Text-response analysis (see §14 AI)
- **Polls** ⚪ (embeddable, live results, one-vote enforcement)

## 8. E-Signature

- **Signature capture** ⚪
  - Draw, type, or upload signature
  - Multiple signers, signing order
  - Signature + date/timestamp + IP audit trail
- **Document signing flow** ⚪
  - Attach a document/contract to sign
  - Send-for-signature via email link
  - Reminders, expiry, decline
  - Signed PDF generation & storage (see §10)
  - Legal audit certificate (who/when/IP/hash)
  - Compliance (ESIGN/UETA, eIDAS) posture

## 9. Workflow & Approvals

- **Approval routing** ⚪ (→ integrate Geiger Flow)
  - Single or multi-step approval chains
  - Sequential vs parallel approvers
  - Approve / reject / request-changes with comments
  - Conditional routing (route by answer/amount/score)
- **Task & assignment** ⚪
  - Assign submission to a user/team
  - Status pipeline (new → in-review → done) — 🟠 status field exists
  - SLA / due dates / escalation
- **Automation triggers** ⚪
  - On submit / on approve / on status-change → action
  - Create record in another Geiger app (Flow issue, Note, Doc, Event)
  - Send email / Slack / webhook
  - Update external CRM / sheet

## 10. PDF & Document Generation

- **Response → PDF** ⚪
  - Auto-generate PDF of a submission
  - Branded template, logo, layout
  - Attach to notification emails, store in response
- **Document merge / templates** ⚪
  - Map answers into a Word/PDF template (invoices, contracts, certificates, offer letters)
  - Conditional content blocks in the doc
  - Fillable-PDF population
- **Export documents** ⚪ (bulk PDF export, ZIP)

## 11. Scheduling & Booking

- **Booking field / slot picker** ⚪
  - Availability windows, timezone handling
  - Duration, buffer times, max bookings/slot
  - Calendar sync (Google/Outlook), holds
- **Appointment forms** ⚪ (intake + booking in one flow)
- **Reminders** ⚪ (email/SMS before appointment)
- **Reschedule / cancel links** ⚪

## 12. Response Management & Data

- **Response inbox** 🔵 (cross-form + per-form screens exist)
  - Table / list / detail views
  - Search, filter (by field, status, date, score), sort
  - Saved views / segments ⚪
  - Kanban by status/score ⚪
- **Response detail** 🔵 (detail panel exists)
  - Full answer view, files, metadata (IP, device, UTM, timing)
  - Edit response, add internal notes/comments (🔵 comments table)
  - Status, priority, score, tags (🔵 status/priority/score)
  - Assignee, activity log
- **Data as database / tables** 🟠 (Supabase-native strength)
  - Spreadsheet grid view, inline edit
  - Relations between forms, lookups
  - Filtered/grouped views, formulas on columns
- **Bulk actions** ⚪ (delete, export, change status, assign, resend)
- **Export & sync** 🔵 (export.js exists)
  - CSV, Excel, JSON, PDF
  - Scheduled exports, export by filter
  - Sync to Sheets/Airtable/Notion/DB (see §16)
- **Partial / abandoned entries** ⚪ (capture, follow-up)
- **Data retention & deletion** ⚪ (auto-purge, GDPR delete, anonymize)

## 13. Analytics & Reporting

- **Volume metrics** 🟠 (analytics screen exists)
  - Submissions over time, by form, by source
  - Completion rate, conversion rate
- **Funnel / drop-off** ⚪ (**one-up**)
  - Field-level abandonment (where users quit)
  - Time-per-field, time-to-complete (🔵 completion_ms column)
  - Page/step drop-off in multi-page
- **Source & attribution** ⚪
  - UTM capture, referrer, device, geo
  - A/B testing of form variants (Formsort niche)
- **Dashboards & reports** 🟠
  - Per-form dashboard, KPI cards (🔵 MetricCard)
  - Custom report builder, shareable report links
  - Scheduled report emails

## 14. AI Features

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

- **Public link** 🟠 (filler built, routing pending)
  - Short link, custom slug (🔵 slug field), QR code
  - Password / login-gated links
- **Embed** ⚪
  - Inline iframe, popup/modal, slide-in, full-page
  - Embed code snippet, React/JS SDK
  - Prefill via URL params in embed
- **Custom domain** ⚪ (forms.yourbrand.com)
- **Social / email share** ⚪ (share buttons, prefilled links)
- **Multi-channel** ⚪ (WhatsApp/SMS link, kiosk mode, offline mobile app)

## 16. Integrations & Connectivity

- **Native integrations** ⚪
  - CRM: Salesforce, HubSpot, Zoho, Pipedrive
  - Email marketing: Mailchimp, ActiveCampaign, Campaign Monitor, ConvertKit
  - Productivity: Google Sheets, Airtable, Notion, Slack, Trello, Dropbox
  - Payments/accounting: Stripe, QuickBooks, Xero
- **Automation platforms** ⚪ (Zapier, Make, n8n)
- **Webhooks** 🟠 (Supabase base) — outbound on events, custom headers, retries
- **REST / GraphQL API** 🟠 (Supabase-provided)
  - Create/read forms & responses programmatically
  - API keys, scopes, rate limits
- **Suite-native connectors** ⚪ (**one-up**)
  - → Geiger Flow (issue/approval), Notes, Docs, Events, Chat
- **Inbound data** ⚪ (prefill from external DB, cascading lookups)

## 17. Notifications & Confirmations

- **Email notifications** 🟠
  - Multiple notifications, conditional sending
  - Admin + autoresponder to submitter
  - Routing (send to different people by answer)
  - Custom from/reply-to, merge tags, attachments (files, PDF)
- **Confirmations (post-submit)** 🔵 (thank-you/redirect in filler)
  - Thank-you message, redirect URL, show another page
  - Conditional confirmations by answer/outcome
- **Other channels** ⚪ (SMS/Twilio, Slack, push, in-app)
- **Scheduled / drip follow-ups** ⚪

## 18. Collaboration & Team

- **Team & sharing** 🟠 (shared screen exists)
  - Share form with users/teams (🔵 shared screen)
  - Folders / organization (🔵 folders screen)
  - Roles & permissions (owner/editor/viewer)
- **Real-time collaboration** ⚪ (**one-up vs most**)
  - Co-editing the builder, presence, comments on fields
- **Response collaboration** 🔵 (comments on responses)
  - Internal notes, @mentions, assignment
- **Activity & audit** 🟠 (versions/activity)

## 19. Security, Compliance & Trust

- **Spam & abuse** ⚪
  - Honeypot, reCAPTCHA v2/v3, Cloudflare Turnstile, hCaptcha
  - Rate limiting, IP allow/deny, country blocking
  - Akismet-style content filtering, duplicate detection
- **Data protection** 🟠
  - Encryption in transit (TLS) & at rest
  - GDPR tools (consent logging, data export, right-to-delete, DPA)
  - Data residency / region choice (Supabase-controlled)
  - PII masking, field-level encryption
- **Access control** 🟠 (suite auth)
  - RBAC, SSO/SAML, 2FA, session controls
  - Field/form-level permissions
- **Compliance certifications** ⚪ (**moat**)
  - HIPAA + BAA, "Mark as ePHI" field (Zoho pattern)
  - SOC 2, ISO 27001, PCI-DSS (payments)
  - Audit trails (90-day+), tamper-evident logs
- **Reliability** 🟠 (uptime, backups, versioned recovery)

## 20. Templates, Organization & Admin

- **Template gallery** 🟠 (screen exists)
  - Categorized templates (see use-case list in strategy doc)
  - One-click create from template, preview
  - Save own form as template, share templates in team
  - Community/marketplace templates
- **Organization** 🔵
  - Folders (🔵), tags (🔵 tags[]), favorites, search
  - Archive (🔵 archived screen), trash/restore, duplicate form
- **Workspace admin** 🟠 (settings screen)
  - Members, billing, usage, branding, defaults
  - Audit log, API keys, integrations management
- **Multi-workspace / org** ⚪ (agencies, client separation)

## 21. Developer & Platform

- **Extensibility** 🟠
  - Hooks/events on submit/approve/etc.
  - Custom field types / plugins
  - Custom validation & server functions
- **Headless / API-first** 🟠 (Supabase)
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
