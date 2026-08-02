# Feature Matrix

Table-stakes vs differentiators across the field, and where Geiger Forms stands
today. Pricing/feature data is mid-2026, mostly 🟡 indicative — verify before
quoting. Legend: ✔ yes · ➖ partial/add-on/limited · ✕ no · $ = paywalled up a tier.

## Legend for "Geiger today" column
- 🔵**Have** — already in the repo.
- 🟠**Partial** — foundation exists, needs finishing.
- ⚪**Gap** — not built.

---

## 1. Core builder & logic

| Feature | Gravity | Typeform | Jotform | Tally | Fillout | Paperform | Google Forms | **Geiger today** |
|---|---|---|---|---|---|---|---|---|
| Drag-and-drop builder | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | 🔵 Have (1187-line builder) |
| Field types (breadth) | ✔ 30+ | ➖ | ✔ 40+ | ✔ | ✔ | ✔ | ➖ | 🟠 10 types — expand |
| Conditional logic | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ➖ | 🔵 Have (visibility) |
| Calculated fields | ✔ | ➖ | ✔ | ✔ | ✔ | ✔ | ✕ | 🔵 Have (formula eval) |
| Multi-page / steps | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ⚪ Gap |
| Save & resume | $ Elite | ➖ | ✔ | ➖ | ✔ | ✔ | ✕ | ⚪ Gap |
| Conversational (1-Q) mode | $ Elite | ✔ (core) | ➖ | ➖ | ✔ | ➖ | ✕ | 🟠 Renderer can support |
| Repeating sections | 3rd-party | ✕ | ✔ | ➖ | ✔ | ➖ | ✕ | ⚪ Gap |
| Scoring / quiz | $ Elite | ✔ | ✔ | ➖ | ✔ | ✔ | ✔ | 🔵 Have (scoring/thresholds) |
| Templates | ✔ | ✔ | ✔ 10k+ | ✔ | ✔ | ✔ | ✔ | 🟠 Screen exists, needs library |

## 2. Data, responses, collaboration

| Feature | Gravity | Typeform | Jotform | Tally | Fillout | Google | **Geiger today** |
|---|---|---|---|---|---|---|---|
| Response inbox/mgmt | ✔ | ✔ | ✔ (Tables) | ✔ | ✔ | ✔ (Sheets) | 🔵 Have (responses screens) |
| Export CSV/Excel | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | 🔵 Have (export.js) |
| Analytics/dashboards | ➖ add-on | ✔ | ✔ | ➖ | ✔ | ➖ | 🟠 Analytics screen exists |
| Field-level drop-off | ✕ | ✔ | ➖ | ✕ | ➖ | ✕ | ⚪ Gap (one-up) |
| Response comments/notes | ✔ notes | ✕ | ➖ | ✕ | ➖ | ✕ | 🔵 Have (comments table) |
| Version history | ✕ | ➖ | ➖ | ✕ | ➖ | ✔ | 🔵 Have (versions table) |
| Real-time co-editing | ✕ | ➖ | ➖ | ➖ | ➖ | ✔ | ⚪ Gap (suite one-up) |
| Data as tables/views | 3rd-party | ✕ | ✔ | ✕ | ✔ | ✔ | 🟠 Supabase-native strength |

## 3. Monetization & advanced modules

| Feature | Gravity | Typeform | Jotform | Tally | Cognito | Formstack | **Geiger today** |
|---|---|---|---|---|---|---|---|
| Payments (Stripe/etc.) | $ Pro | ➖ | ✔ | ✔ (free!) | ✔ | ✔ | ⚪ Gap (priority) |
| Subscriptions/recurring | $ Pro | ✕ | ✔ | ➖ | ✔ | ➖ | ⚪ Gap |
| Coupons/discounts | $ Elite | ✕ | ➖ | ✕ | ✔ | ➖ | ⚪ Gap |
| E-signature | $ Elite (draw) | ✕ | ✔ Sign | ✕ | ✔ | ✔ | ⚪ Gap |
| Surveys / NPS | $ Elite | ✔ | ✔ | ➖ | ➖ | ➖ | 🟠 Scoring foundation |
| Approvals / workflow | 3rd-party | ✕ | ✔ | ✕ | ✕ | ✔ | ⚪ Gap (route to Flow) |
| PDF/doc generation | 3rd-party | ✕ | ✔ | ✕ | ➖ | ✔ | ⚪ Gap |
| User registration/login | $ Elite | ✕ | ➖ | ✕ | ✕ | ➖ | ⚪ Gap |

## 4. Distribution, integrations, platform

| Feature | Gravity | Typeform | Jotform | Tally | Fillout | **Geiger today** |
|---|---|---|---|---|---|---|
| Hosted (no WP needed) | ✕ | ✔ | ✔ | ✔ | ✔ | 🔵 Have (Next.js/Supabase) |
| Public link + embed | ➖ (WP) | ✔ | ✔ | ✔ | ✔ | 🟠 Filler built, not routed |
| Custom domain | ✔ (your WP) | $ | $ | $ | $ | ⚪ Gap |
| Webhooks/API | $ Elite | ✔ | ✔ | ➖ | ✔ | 🟠 Supabase gives base |
| Zapier/Make | $ Pro | ✔ | ✔ | ➖ | ✔ | ⚪ Gap |
| Native CRM/marketing | tiered | ✔ | ✔ | ➖ | ✔ | ⚪ Gap (or via suite) |
| Slack/Sheets/etc. | tiered | ✔ | ✔ | ➖ | ✔ | ⚪ Gap |

## 5. AI, compliance, trust (the modern differentiators)

| Feature | Gravity | Typeform | Jotform | Fillout | Paperform | Zoho | **Geiger today** |
|---|---|---|---|---|---|---|---|
| AI form generation | ✕ | ➖ | ✔ | ✔ | ✔ | ➖ | ⚪ Gap (Claude via suite) |
| AI response analysis | ✕ | ➖ | ➖ | ➖ | ➖ | ✕ | ⚪ Gap (one-up) |
| HIPAA / BAA | ✕ | ✕ | $ high tier | ✕ | ✕ | ✔ | ⚪ Gap (moat bet) |
| GDPR/data residency | self | ✔ | ✔ | ✔ | ✔ | ✔ | 🟠 Supabase-controlled |
| SSO / RBAC | ➖ | $ | $ | $ | $ | ✔ | 🟠 Suite auth |
| Spam/captcha | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ⚪ Gap |

---

## Reading of the matrix

**Table-stakes (must have to be credible):** builder, field breadth, conditional
logic, calculations, multi-page, response management, export, public link +
embed, basic integrations, spam protection, **payments**. Geiger has most of the
logic core already — the urgent gaps are **routing the filler, payments,
multi-page, and embed/distribution.**

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
