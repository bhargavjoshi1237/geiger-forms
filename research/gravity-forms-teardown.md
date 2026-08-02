# Gravity Forms — Full Teardown

The reference product to beat in the WordPress / self-hosted world. It is a
plugin, not a SaaS — you own the data, it runs on your server. Its power is the
**add-on ecosystem**; its weakness is the **license ladder** that gates that
ecosystem.

**Pricing valid mid-2026 — verify at purchase.** ✅ = verified this pass.

---

## 1. Pricing & license gating ✅

No free tier. Annual license, renews for continued updates/support (the plugin
keeps working if you lapse, but no updates/add-on downloads).

| License | Price/yr | Sites | What you unlock |
|---|---|---|---|
| **Basic** | **$59** | 1 | Core builder + email-marketing add-ons (Mailchimp, HubSpot, ActiveCampaign, Campaign Monitor). **No payments.** |
| **Pro** | **$159** | 3 | Everything in Basic **+ payments** (Stripe, Square, PayPal Checkout) + Zapier, Slack, Trello, Dropbox, Twilio, Mailgun, Postmark, Advanced auto-complete, GP add-ons access varies. |
| **Elite** | **$259** | Unlimited | **All** add-ons: User Registration, **Survey (incl. Quiz)**, Polls, **Signature**, Conversational Forms, Partial Entries, Salesforce, **Webhooks**, Coupons, Zoho CRM, Agile CRM, plus everything above. |

**The gates that matter (this is the whole opportunity):**
- 💥 **Payments start at $159.** You cannot take a single Stripe payment on the
  $59 tier. ✅
- 💥 **Surveys, Quiz, e-Signature, Polls, User Registration, Webhooks,
  Salesforce, Conversational Forms — all Elite-only ($259).** ✅
- Quiz is not its own product; it ships **inside the Survey add-on**. ✅

**Correction logged:** Stripe/PayPal are **Pro-tier, not Elite** — an earlier
research draft got this wrong; don't repeat it. ✅

---

## 2. Core feature set (in the base plugin, all tiers)

- **Drag-and-drop builder** with 30+ field types: single/multi-line text, email,
  phone, number, dropdown, radio, checkbox, date, time, file upload (multi),
  hidden, HTML block, section break, page break (**multi-page forms**), name
  (composite), address (composite), list (repeating rows), consent.
- **Conditional logic** — show/hide fields, sections, pages, and even submit
  button based on prior answers. Also conditional confirmations & notifications.
- **Calculations** — math across number/pricing fields (quote builders, order
  totals).
- **Multi-page forms** with progress bar/steps and save-and-continue (Partial
  Entries add-on for true resume).
- **Entry management** — view/edit/search/filter/export entries (CSV) in
  wp-admin; entry notes.
- **Notifications & confirmations** — multiple, conditional; email routing,
  auto-responders, redirect/text/page confirmations.
- **Merge tags** — inject field values, user data, post/site data anywhere.
- **Anti-spam** — honeypot, reCAPTCHA, Turnstile, Akismet integration.
- **Scheduling & limits** — schedule form availability, limit total entries,
  require login.
- **Accessibility** — WCAG-oriented markup (a selling point vs. older builders).
- **Developer surface** — huge hooks/filters API, REST API, add-on framework.
  This is why the third-party ecosystem is enormous.

---

## 3. Official add-on ecosystem (the moat)

Grouped by job. **Tier** = lowest license that includes it.

### Payments (Pro)
Stripe, Square, PayPal Checkout, PayPal (legacy), Authorize.Net, 2Checkout,
Mollie, GoCardless (subscriptions/recurring, one-off, and "pay what you want").

### CRM & marketing (Basic→Elite)
Mailchimp, HubSpot, ActiveCampaign, Campaign Monitor, AWeber, GetResponse,
EmomerCRM/Agile CRM, **Salesforce (Elite)**, **Zoho CRM (Elite)**, Mailgun,
Postmark, Twilio (SMS notifications).

### Advanced form types (Elite)
- **Survey** — Likert, rank, rating, net-promoter-style; built-in reporting/charts.
- **Quiz** (inside Survey) — scored questions, right/wrong, grades, results.
- **Polls** — embeddable polls with live results.
- **Conversational Forms** — Typeform-style one-question-at-a-time mode.
- **Signature** — draw-to-sign (basic e-sign).

### Users & access (Elite)
- **User Registration** — front-end WP user signup/login/profile, role
  assignment, membership gating.

### Ops & automation (Pro→Elite)
- **Zapier** (Pro), **Webhooks** (Elite), Slack, Trello, Dropbox, Google Sheets
  (via 3rd party), **Partial Entries** (Elite — capture abandoned forms),
  **Coupons** (Elite), Advanced Post Creation (create WP posts from submissions),
  GravityView (3rd party — display entries on the front end as tables/listings/
  directories; a whole product of its own).

### Notable third-party ecosystem (not Gravity's, but part of the pull)
GravityView, GravityWiz "Gravity Perks" (60+ micro-add-ons: nested forms,
populate anything, live merge tags, inventory, unique ID, etc.), GravityFlow
(**approval workflows / multi-step routing** — this is the workflow engine
Gravity itself lacks natively), GravityExport (Excel/PDF), GravityCharts,
GravityImport, Fillable PDFs, and dozens of niche connectors.

> **Insight:** Gravity's most valuable "features" (front-end display, approval
> workflow, PDFs, advanced perks) are sold by **third parties**, each its own
> subscription. A customer running a real business on Gravity often pays
> $259 + GravityView + GravityFlow + Gravity Perks = **$600–900+/yr** across
> vendors. That stack is exactly what a bundled product collapses into one price.

---

## 4. Use cases Gravity Forms is bought for

This is the "cover all use cases" list — treat it as Geiger's template/coverage
checklist.

| Category | Concrete forms |
|---|---|
| **Lead gen / marketing** | Contact, quote request, newsletter signup, gated content, demo request, multi-step lead qualification |
| **Payments / commerce** | Order forms, donations, event tickets, deposits, "pay what you want," recurring subscriptions, invoices |
| **Registration / membership** | Event registration, course signup, user account creation, membership gating, RSVP |
| **Surveys & research** | NPS, CSAT, market research, Likert scales, polls |
| **Assessment** | Quizzes, graded tests, certifications, self-scoring calculators |
| **HR / recruiting** | Job applications (w/ résumé upload), employee onboarding, time-off requests, feedback |
| **Support / service** | Support tickets, bug reports, RMA/returns, appointment/booking intake |
| **Healthcare / legal** | Patient intake, consent forms, e-sign agreements (needs HIPAA — Gravity is weak here) |
| **Education** | Admissions, permission slips, parent forms, grading |
| **Real estate / finance** | Mortgage/loan applications, property inquiries, quote calculators |
| **Internal ops** | Approval requests, purchase orders, IT requests, inventory, inspections/checklists |
| **Content / community** | User-submitted posts, directories (via GravityView), reviews, contest entries |

---

## 5. Where Gravity Forms is weak (attack surface)

1. **WordPress-only.** No hosted/standalone option — you need a WP site, hosting,
   and maintenance. Huge friction for non-WP users.
2. **License ladder gates fundamentals.** Payments at $159, everything
   interesting at $259. ✅
3. **Ecosystem fragmentation & cost stacking.** Workflow, front-end display,
   PDFs, advanced perks = separate third-party subscriptions.
4. **Native workflow is basically absent.** Approvals/routing require GravityFlow.
5. **UI is dated** vs Typeform/Tally/Paperform. Conversational mode is a
   bolt-on, not the default beautiful experience.
6. **No native analytics dashboard** worth the name — reporting is per-add-on.
7. **No AI.** No AI form generation, no AI response summarization, no AI cleanup.
8. **Weak compliance story** (no first-class HIPAA/BAA like Zoho).
9. **Self-hosting = you own security, spam, uptime, GDPR plumbing.**
10. **No real-time collaboration** on building forms (it's a wp-admin, single-editor tool).

Every one of these is a Geiger one-up. See `geiger-forms-strategy.md`.
