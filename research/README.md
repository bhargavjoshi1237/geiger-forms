# Geiger Forms — Competitive Research & Product Strategy

> Market study of Gravity Forms + the online form-builder / data-collection
> space, mapped against what Geiger Forms already ships, with a concrete
> "replicate → one-up → undercut" plan.

**Compiled:** 2026-07-11 · **Pricing valid as of:** mid-2026 (verify at purchase)

## What's in here

| Doc | What it covers |
|---|---|
| [`gravity-forms-teardown.md`](./gravity-forms-teardown.md) | Gravity Forms core + its full add-on ecosystem, pricing gates, and use cases |
| [`competitor-landscape.md`](./competitor-landscape.md) | 20+ competitors (SaaS + WordPress) and 7 adjacent categories worth absorbing |
| [`feature-catalog.md`](./feature-catalog.md) | **Exhaustive feature → sub-item tree** (21 areas) — the full capability spec/coverage checklist |
| [`feature-matrix.md`](./feature-matrix.md) | Table-stakes vs differentiator feature grid across all major players |
| [`pricing-and-undercut.md`](./pricing-and-undercut.md) | Pricing structures decoded + exactly how Geiger undercuts each |
| [`geiger-forms-strategy.md`](./geiger-forms-strategy.md) | Gap analysis vs current code + the one-up feature bets + phased roadmap |

## Confidence key

- ✅ **Verified** — confirmed in this research pass against primary sources.
- 🟡 **Indicative** — from domain knowledge / secondary sources; directionally
  right but numbers move. Re-check before quoting to a customer.
- 🔵 **Our code** — confirmed by reading the Geiger Forms repo.

---

## Executive summary (read this first)

**1. The market is a barbell.** On one end, cheap/free capture tools (Google
Forms, Microsoft Forms, Tally) win on price and simplicity but are thin on logic,
payments, and workflow. On the other, "form-as-a-business-platform" players
(Jotform, Paperform, Formstack, Zoho) charge SaaS subscriptions and absorb
adjacent categories (payments, e-sign, approvals, PDF, tables). Gravity Forms
owns the WordPress/self-hosted middle with a perpetual-feeling annual license.

**2. Gravity Forms' weakness is its own pricing ladder.** ✅ It has **no free
tier** and gates by license: **Basic $59/yr (1 site)** = email-marketing add-ons
only, **no payments**; **Pro $159/yr (3 sites)** unlocks Stripe/Square/PayPal +
Zapier/Slack; **Elite $259/yr (unlimited)** is the only tier with the advanced
suite — User Registration, Surveys **and** Quiz, Signature/e-sign, Polls,
Salesforce, Webhooks, Conversational Forms, Partial Entries. **To take a single
payment you must buy the $159 tier. To run a survey or collect a signature you
must buy the $259 tier.** That laddering is the wedge.

**3. The SaaS players punish success with usage meters.** 🟡 Jotform, Typeform,
Formstack et al. cap **submissions/responses per month**, form count, storage,
and "views" — and force upgrades (or overage fees) exactly when a form starts
performing. Formstack in particular carries implementation/overage costs beyond
sticker price.

**4. The absorb-adjacent play is the real 2026 game.** ✅ Paperform explicitly
positions as "capture data, onboard clients, generate leads, take payments,
trigger workflows **and send documents for signing**, all from one form
builder," backed by standalone siblings (Papersign e-sign, Stepper AI workflow,
Agency+). Winning products no longer sell "forms" — they sell the **workflow the
form starts**.

**5. Compliance is an under-served, high-value moat.** ✅ Zoho Forms differentiates
on **HIPAA** (a "Mark as ePHI" field that auto-enables AES-256 + audit logging,
plus RBAC, 90-day audit trails, and a BAA on request). Regulated verticals
(healthcare, legal, finance, gov) pay premium and churn less.

### The Geiger Forms wedge, in one line

> **One flat, generous plan that bundles what Gravity charges $259 for and what
> the SaaS players meter you into oblivion for — payments, logic, surveys/quiz,
> e-sign, approvals, and workflow — with no per-submission tax, sold inside the
> Geiger suite so a form is the front door to Notes, Flow, Docs, and Events.**

See [`geiger-forms-strategy.md`](./geiger-forms-strategy.md) for how that turns
into a roadmap against the code you already have.

## Where Geiger Forms already stands (🔵 from the repo)

Geiger Forms is **not** a stub. It already has:

- A real **1,187-line visual builder**, public **form filler**, and field
  renderer.
- **10 field types** (text, email, phone, textarea, number, date, select,
  checkbox, file, calculated) with **conditional visibility**, **calculated
  fields w/ formula evaluation**, and **scoring/priority thresholds**.
- A **9-screen workspace** (Overview, Forms, Responses, Analytics, Templates,
  Folders, Shared, Archived, Settings).
- A complete **Supabase data layer + SQL + RLS** for forms, responses, versions,
  and comments.

**The one blocking gap:** the builder and public filler exist as components but
**aren't routed yet** (`app/forms/[formId]/page.js` and `app/form/[formId]/page.js`
are empty). That's step zero of the roadmap.
