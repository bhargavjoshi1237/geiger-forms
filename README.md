<div align="center">

# Geiger Forms

**Build forms and surveys.**

A drag-and-drop form builder with logic, scoring, payments, and a public filler — plus the analytics to see what happens after submit.

Part of the [Geiger](#the-geiger-suite) suite.

</div>

---

## Overview

Geiger Forms is the form, survey, and data-collection application of the Geiger suite. Builders compose forms on a canvas, layer on conditional logic and calculations, publish them to a public link, and work the responses from a built-in inbox — with folders, templates, versioning, and analytics around the whole lifecycle.

The product has two sides: an **authoring workspace** at `/forms` for building and managing forms, and a **public filler** at `/form/[slug]` that renders a published form's schema for respondents.

## Highlights

| Area | What it does |
| --- | --- |
| **Builder** | Drag-and-drop canvas with layout and columns, per-field configuration, live preview, autosave, and version history. |
| **Field types** | Text, email, phone, number, currency, choice, date and time, rating, scale, matrix, file upload, name, address, calculated, hidden, repeating groups, and product/quantity. |
| **Logic** | Conditional visibility, skip and branch logic, calculations, scoring and outcomes, personalisation, and validation rules. |
| **Flow & UX** | Multi-step pages, progress indicators, save and resume, conversational mode, and submission rules. |
| **Design** | Themes and colours, layout modes, welcome and ending screens, branding and white-label, and localisation. |
| **Payments** | Stripe and PayPal gateways, payment types, an order builder, coupons and discounts, receipts and invoices. |
| **Surveys & quizzes** | Survey fields, a quiz engine, NPS and CSAT, survey reporting, and polls. |
| **Documents & signing** | Signature capture, send for signing, signed PDF with audit trail, and document templates. |
| **Workflow** | Approval routing, task assignment, automation triggers, and hand-off into Geiger Flow. |
| **Responses** | A response inbox with data tables and views, bulk actions, partial and abandoned submissions, export and sync, and retention controls. |
| **Analytics** | Dashboard, funnel and drop-off, source and attribution, A/B testing, and reports. |
| **Distribution** | Public link and QR, iframe and popup embeds, custom domains, and multi-channel sharing. |
| **Integrations** | CRM and marketing tools, productivity apps, Zapier/Make, webhooks, REST API, and suite connectors. |

## Tech stack

- **Framework** — Next.js 16 (App Router, SSR/SSG) and React 19
- **Styling** — Tailwind CSS v4 and shadcn/ui, with the shared [`@geiger/ui`](https://github.com/bhargavjoshi1237/geiger-ui) component library
- **Icons** — Lucide
- **Backend** — Supabase (Postgres, Auth, Storage)
- **Charts** — Recharts

## Getting started

### Prerequisites

- Node.js 20 or later
- A Supabase project (the shared Geiger project)

### Installation

```bash
npm install
```

### Environment

Create a `.env` file in the project root:

```bash
# Runtime (browser)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-only
STRING_URI=your-direct-postgres-connection-string   # migrations only
```

### Database

Idempotent SQL lives in `supabase/sqls/` and runs in filename order:

```bash
npm run db:push
```

This creates the forms and response tables, their indexes, the `updated_at` and response-count triggers, and RLS policies. Public visitors can only read published forms and insert responses.

### Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. In production the app is served under the `/forms` asset prefix behind the suite hub.

See [`SETUP.md`](SETUP.md) for the full setup walkthrough and the current wiring status of each area.

## Project structure

```
app/
  forms/                 Authoring workspace (list + builder)
  forms/[formId]/        Form builder
  form/[formId]/         Public filler for a published form
components/
  forms/                 Builder, field renderer, filler, publish dialog
  internal/screens/      Workspace screens (overview, responses, analytics, templates, folders, settings)
  internal/shared/       Shared screen kit
  ui/                    shadcn primitives
lib/supabase/            Data-access layer (forms, responses, versions, comments)
supabase/sqls/           Idempotent SQL schema and policies
scripts/run-sqls.js      Migration runner (npm run db:push)
```

## Conventions

This codebase follows a consistent set of patterns. Read these before contributing:

- [`MODULE_CONVENTIONS.md`](MODULE_CONVENTIONS.md) — how to build a workspace screen
- [`SUPABASE_CONVENTIONS.md`](SUPABASE_CONVENTIONS.md) — the data-layer playbook
- [`crafting.md`](crafting.md) — UI craft and quality bar

## The Geiger suite

Geiger Forms is one application in the broader Geiger suite, alongside Geiger Flow, Geiger Events, and Geiger Notes. Every product shares one Supabase project, a common design language, and the [`@geiger/ui`](https://github.com/bhargavjoshi1237/geiger-ui) component library, so each app feels native to the whole.

## License

Private and unpublished. All rights reserved.
