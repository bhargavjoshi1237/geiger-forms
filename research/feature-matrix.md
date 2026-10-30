# Feature Matrix

Table-stakes vs differentiators across the field, and where Geiger Forms stands
today. Pricing/feature data is mid-2026, mostly 🟡 indicative — verify before
quoting. Legend: ✔ yes · ➖ partial/add-on/limited · ✕ no · $ = paywalled up a tier.

## Legend for "Geiger today" column
- 🔵**Have** — already in the repo.
- 🟠**Partial** — foundation exists, needs finishing.
- ⚪**Gap** — not built.

**Status as of 2026-10-30**, from reading the code (the app was not run). Features
that only need a deployment's env keys count as Have. A migration in the repo may
not be applied yet. Competitor columns are unchanged from the mid-2026 study.

---

## 1. Core builder & logic

| Feature | Gravity | Typeform | Jotform | Tally | Fillout | Paperform | Google Forms | **Geiger today** |
|---|---|---|---|---|---|---|---|---|
| Drag-and-drop builder | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | 🔵 Have (undo, autosave, live preview) |
| Field types (breadth) | ✔ 30+ | ➖ | ✔ 40+ | ✔ | ✔ | ✔ | ➖ | 🔵 Have (39 types) |
| Conditional logic | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ➖ | 🔵 Have (visibility, page skip; no jump rules) |
| Calculated fields | ✔ | ➖ | ✔ | ✔ | ✔ | ✔ | ✕ | 🔵 Have (formula eval) |
| Multi-page / steps | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | 🔵 Have |
| Save & resume | $ Elite | ➖ | ✔ | ➖ | ✔ | ✔ | ✕ | 🔵 Have (opt-in per form) |
| Conversational (1-Q) mode | $ Elite | ✔ (core) | ➖ | ➖ | ✔ | ➖ | ✕ | 🔵 Have (per-form layout) |
| Repeating sections | 3rd-party | ✕ | ✔ | ➖ | ✔ | ➖ | ✕ | 🔵 Have (repeating group) |
| Scoring / quiz | $ Elite | ✔ | ✔ | ➖ | ✔ | ✔ | ✔ | 🔵 Have (scoring, quiz, outcomes) |
| Templates | ✔ | ✔ | ✔ 10k+ | ✔ | ✔ | ✔ | ✔ | 🔵 Have (42 templates) |

## 2. Data, responses, collaboration

| Feature | Gravity | Typeform | Jotform | Tally | Fillout | Google | **Geiger today** |
|---|---|---|---|---|---|---|---|
| Response inbox/mgmt | ✔ | ✔ | ✔ (Tables) | ✔ | ✔ | ✔ (Sheets) | 🔵 Have (table and kanban inbox) |
| Export CSV/Excel | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | 🔵 Have (CSV, JSON; no XLSX) |
| Analytics/dashboards | ➖ add-on | ✔ | ✔ | ➖ | ✔ | ➖ | 🔵 Have (dashboard, reports) |
| Field-level drop-off | ✕ | ✔ | ➖ | ✕ | ➖ | ✕ | 🔵 Have (one-up) |
| Response comments/notes | ✔ notes | ✕ | ➖ | ✕ | ➖ | ✕ | 🔵 Have (comments, @mentions) |
| Version history | ✕ | ➖ | ➖ | ✕ | ➖ | ✔ | 🔵 Have (versions, restore) |
| Real-time co-editing | ✕ | ➖ | ➖ | ➖ | ➖ | ✔ | 🟠 Presence only (suite one-up) |
| Data as tables/views | 3rd-party | ✕ | ✔ | ✕ | ✔ | ✔ | 🟠 Saved views, kanban; no relations |

## 3. Monetization & advanced modules

| Feature | Gravity | Typeform | Jotform | Tally | Cognito | Formstack | **Geiger today** |
|---|---|---|---|---|---|---|---|
| Payments (Stripe/etc.) | $ Pro | ➖ | ✔ | ✔ (free!) | ✔ | ✔ | 🔵 Have (Stripe only) |
| Subscriptions/recurring | $ Pro | ✕ | ✔ | ➖ | ✔ | ➖ | 🔵 Have (monthly, yearly) |
| Coupons/discounts | $ Elite | ✕ | ➖ | ✕ | ✔ | ➖ | 🔵 Have |
| E-signature | $ Elite (draw) | ✕ | ✔ Sign | ✕ | ✔ | ✔ | 🟠 Draw or type, countersign; no signing order |
| Surveys / NPS | $ Elite | ✔ | ✔ | ➖ | ➖ | ➖ | 🔵 Have (NPS, reports; no crosstabs) |
| Approvals / workflow | 3rd-party | ✕ | ✔ | ✕ | ✕ | ✔ | 🟠 Sequential chain, Flow issues; no parallel |
| PDF/doc generation | 3rd-party | ✕ | ✔ | ✕ | ➖ | ✔ | 🟠 Browser print only |
| User registration/login | $ Elite | ✕ | ➖ | ✕ | ✕ | ➖ | 🟠 Login-gated forms; no registration |

## 4. Distribution, integrations, platform

| Feature | Gravity | Typeform | Jotform | Tally | Fillout | **Geiger today** |
|---|---|---|---|---|---|---|
| Hosted (no WP needed) | ✕ | ✔ | ✔ | ✔ | ✔ | 🔵 Have (Next.js/Supabase) |
| Public link + embed | ➖ (WP) | ✔ | ✔ | ✔ | ✔ | 🔵 Have (SSR link, 6 embed modes) |
| Custom domain | ✔ (your WP) | $ | $ | $ | $ | ⚪ Gap |
| Webhooks/API | $ Elite | ✔ | ✔ | ➖ | ✔ | 🔵 Have (retries, replay; REST v1 reads and submits) |
| Zapier/Make | $ Pro | ✔ | ✔ | ➖ | ✔ | 🟠 Through webhooks; no published apps |
| Native CRM/marketing | tiered | ✔ | ✔ | ➖ | ✔ | ⚪ Gap (or via suite) |
| Slack/Sheets/etc. | tiered | ✔ | ✔ | ➖ | ✔ | 🟠 Slack native; Sheets through webhooks |

## 5. AI, compliance, trust (the modern differentiators)

| Feature | Gravity | Typeform | Jotform | Fillout | Paperform | Zoho | **Geiger today** |
|---|---|---|---|---|---|---|---|
| AI form generation | ✕ | ➖ | ✔ | ✔ | ✔ | ➖ | ⚪ Gap (waits on `@geiger/ai`) |
| AI response analysis | ✕ | ➖ | ➖ | ➖ | ➖ | ✕ | ⚪ Gap (one-up; waits on `@geiger/ai`) |
| HIPAA / BAA | ✕ | ✕ | $ high tier | ✕ | ✕ | ✔ | 🟠 Readiness controls; no BAA (moat bet) |
| GDPR/data residency | self | ✔ | ✔ | ✔ | ✔ | ✔ | 🟠 Export, erasure, retention; no region choice |
| SSO / RBAC | ➖ | $ | $ | $ | $ | ✔ | 🟠 RBAC enforced; SSO from suite account |
| Spam/captcha | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | 🔵 Have (honeypot, Turnstile, rate limit) |

---

## Reading of the matrix

**Table-stakes (must have to be credible):** builder, field breadth, conditional
logic, calculations, multi-page, response management, export, public link +
embed, basic integrations, spam protection, **payments**. As of 2026-10-30 Geiger
has all of these in code — the gaps left against the rest of the grid are **AI
generation and analysis (waiting on `@geiger/ai`), custom domains, native
Sheets/Zapier/Make connectors, and server-rendered PDFs.**

**Differentiators (where you win):** absorbed adjacent categories (e-sign,
approvals→Flow, surveys, PDF, data-tables), **AI response analysis**,
**field-level drop-off analytics**, **suite-native workflow + real-time collab**,
and **compliance (HIPAA)** for regulated verticals.

**Geiger's structural advantages the incumbents can't easily copy:**
1. **Supabase-native** → "form is a front-end to your real database + tables/
   views" is a first-class capability, not a bolt-on.
2. **Part of a suite** → Notes, Flow, Docs, Events already exist, so absorbing
   workflow/approvals/scheduling is integration, not new product.
3. **Modern stack + AI access** → AI generation and analysis are cheap to add.
4. **No legacy metering business model** → can lead with "unlimited submissions"
   without cannibalizing an existing metered revenue line.
