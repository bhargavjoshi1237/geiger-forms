# Geiger Forms — Differentiation, One-Up Bets & Roadmap

Ties the market study to the **actual code in this repo** (🔵 confirmed by
reading it). The point: Geiger is much closer to competitive than a blank page —
it needs *finishing and extending in the right order*, not rebuilding.

---

## 1. Where the code actually is (🔵 from the repo)

**Already built and real:**
- Visual **builder** (`components/forms/form-builder.jsx`, 1,187 lines), public
  **filler** (`form-filler-content.jsx`), **field renderer**, publish dialog.
- **10 field types** + **conditional visibility** + **calculated fields (formula
  eval)** + **scoring/priority thresholds** (`lib/forms/`).
- **9-screen workspace**: Overview, Forms, Responses, Analytics, Templates,
  Folders, Shared, Archived, Settings.
- **Data layer + SQL + RLS**: `geiger_forms`, `geiger_form_responses`,
  `geiger_form_versions`, `geiger_form_comments`. Comments and version history
  already exist — features most competitors *lack*.

**The blocking gap (do this first):**
- 🔴 The builder and filler **aren't routed.** `app/forms/[formId]/page.js` and
  `app/form/[formId]/page.js` are **empty (0 bytes)**. The landing page links to
  `/form/demo` → dead. **Nothing renders the builder or the public form yet.**

**So the honest status:** ~70% of a strong v1 forms product is built; it's not
shippable until the two routes are wired and a payment path + a few table-stakes
(multi-page, embed, spam) land.

---

## 2. Priority order (what closes the gap to Gravity + SaaS fastest)

### P0 — Make it work end-to-end (ship blocker)
1. **Wire the routes.** Implement `app/forms/[formId]/page.js` (builder shell)
   and `app/form/[formId]/page.js` (public filler via `getPublishedFormBySlug`).
   Everything below depends on this.
2. **Fix landing dead links** (`/form/demo`) → a real seeded demo form.

### P1 — Table-stakes to be credible vs anyone
3. **Multi-page / step forms + progress bar** + **save & resume** (Gravity gates
   resume at Elite; be generous).
4. **Embed + share** — public link, iframe embed snippet, "copy embed code."
5. **Spam/anti-abuse** — honeypot + Turnstile/reCAPTCHA + rate limit.
6. **Field-type breadth** — from 10 → ~25: address (composite), name
   (composite), rating/scale, ranking, matrix/Likert, signature, section break,
   repeating group, hidden, HTML block, image/choice cards, URL, currency.
7. **Payments (Stripe)** — the single highest-ROI feature. Products, quantity,
   totals (you already calculate), coupons, one-off + subscription. This alone
   beats Gravity Basic and Typeform/Google/MS free.

### P2 — Differentiators (the "one-up")
8. **AI form generation** — "describe your form → built" (Claude via the suite).
   Now table-stakes at Jotform/Fillout/Paperform; parity needed.
9. **AI response analysis** — summarize open-text, auto-categorize, sentiment,
   "top themes across 500 responses." **Genuine one-up** — nobody does this well.
10. **Conversational mode** — one-question-at-a-time toggle (Gravity Elite-only;
    Typeform's whole product). Your renderer can support it.
11. **Surveys/NPS + Quiz reporting** — you already have scoring; add survey field
    types + a report/chart view. (Gravity Elite $259.)
12. **Data tables & views on Responses** — filterable grid, saved views, kanban
    by status/score. Leans on your Supabase-native strength (Airtable-of-forms).
13. **Field-level drop-off analytics** — where users abandon. Almost nobody
    surfaces this well; cheap with your event model.

### P3 — Absorb adjacent categories (suite superpower)
14. **E-signature** — signature field + "send for signing" + signed-PDF storage.
    (Absorbs Papersign/DocuSign for simple cases.)
15. **Workflow / approvals → Geiger Flow** — route a submission into a Flow issue
    / approval chain. **This is the killer suite integration** — competitors need
    GravityFlow/Zapier; you have Flow in-house.
16. **PDF / document generation** — answers → branded PDF (invoices, contracts,
    certificates), attached to notifications.
17. **Scheduling** — booking/slot field, or deep-link to a suite scheduling
    surface (absorbs Calendly for the "book a call" form).
18. **Integrations** — Slack, Google Sheets, webhooks, Zapier/Make. Webhooks +
    Sheets first (highest demand).

### P4 — Moat & enterprise
19. **HIPAA / compliance** — ePHI field designation, encryption-at-rest labeling,
    audit trails, RBAC, BAA. Opens healthcare/legal/gov at premium price. (Copy
    Zoho's "Mark as ePHI" pattern. ✅)
20. **RBAC + SSO + real-time collaboration** on form building (suite auth already
    there; collab is a Google-Forms-beating differentiator).
21. **Custom domains + white-label** for agencies (Paperform Agency+ pattern).

---

## 3. The five "one-up" bets that define the product

These are where Geiger doesn't just match — it beats the category:

1. **No meter, ever.** Unlimited submissions on every tier including free. The
   incumbents structurally can't follow. *(Marketing + product.)*
2. **Suite-native workflow.** A form isn't a dead-end spreadsheet — it opens a
   Flow issue, a Doc, an Event, a Note. "The form that starts the work." *(Nobody
   with a real multi-product suite is in the form-builder value tier.)*
3. **AI that reads your responses, not just builds your form.** Response
   summarization/theming/sentiment as a first-class Responses feature.
4. **Forms as a real database front-end.** Supabase-native means submissions are
   queryable tables with views/relations — Airtable-of-forms without the bolt-on.
5. **Compliance without the enterprise tax.** HIPAA/BAA priced under Formstack/
   Zoho-premium, opening regulated verticals.

---

## 4. Use-case coverage checklist (ship templates for each)

To "fit the product into their need," Geiger's **template gallery** (screen
already exists 🔵) should cover every job Gravity/Jotform are bought for. Ship
templates + a matching field-type for each:

- Lead gen: contact, quote request, demo booking, gated-content, multi-step qual
- Payments: order form, donation, event tickets, deposit, subscription, invoice
- Registration: event RSVP, course signup, membership, account creation
- Surveys: NPS, CSAT, market research, Likert, poll
- Assessment: quiz, graded test, self-scoring calculator, certification
- HR: job application (+résumé), onboarding, time-off, performance feedback
- Support: ticket, bug report, RMA/return, feature request
- Healthcare/legal: patient intake, consent, e-sign agreement *(HIPAA)*
- Education: admissions, permission slip, parent form
- Finance/real estate: loan/mortgage application, quote calculator, inquiry
- Internal ops: approval request, PO, IT request, inspection checklist, inventory
- Community/content: user-submitted post, review, contest entry, directory listing

Each template that also demonstrates a differentiator (payment, AI, workflow,
e-sign) doubles as a sales asset.

---

## 5. Suggested sequencing (rough)

| Phase | Focus | Outcome |
|---|---|---|
| **Now** | P0 routes + demo | It works end-to-end; landing links live |
| **v1** | P1 table-stakes + Stripe | Credible free product that beats Google/Gravity-Basic |
| **v1.5** | P2 AI + surveys + data tables | Clear differentiation; press-worthy |
| **v2** | P3 e-sign + Flow workflow + PDF + integrations | "Runs your business" positioning (Paperform-class) |
| **v2.5** | P4 HIPAA + RBAC/SSO + white-label | Enterprise/regulated revenue |

---

## 6. Open items to verify before external use

- 🟡 **All competitor pricing** in these docs is indicative (the research pass
  hit rate limits during verification). Re-scrape Jotform/Typeform/Formstack/
  Fillout/Cognito/Zoho pricing pages before quoting to customers or investors.
- ✅ **Solid/verified:** Gravity Forms tiers & gating, Paperform positioning +
  adjacent products, Zoho HIPAA mechanics.
- Decide the **suite bundling** question: is Geiger Forms sold standalone, or
  only as part of a Geiger suite subscription? That determines the pricing table
  in `pricing-and-undercut.md`.
