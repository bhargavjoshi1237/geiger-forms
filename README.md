<div align="center">

# Geiger Forms

**Build forms and surveys.**

A drag-and-drop form builder with logic, scoring, payments, and a public filler — plus the analytics to see what happens after submit.

Part of the [Geiger](#the-geiger-suite) suite.

</div>

---

## Overview

Geiger Forms is the form, survey, and data-collection application of the Geiger suite. Builders compose forms on a canvas, layer on conditional logic and calculations, publish them to a public link, and work the responses from a built-in inbox — with folders, templates, versioning, and analytics around the whole lifecycle.

The product has two sides: an **authoring workspace** at `/project/[projectId]` for building and managing forms (signed-out visitors are sent to the suite login), and a **public filler** at `/form/[slug]` that renders a published form's schema for respondents.

## Highlights

| Area | What it does |
| --- | --- |
| **Builder** | Drag-and-drop canvas with layout and columns, per-field configuration, live preview, autosave, and version history. |
| **Field types** | Text, email, phone, number, currency, choice, picture choice, date and time, rating, scale, opinion scale, matrix, file upload, name, address, calculated, hidden, consent (timestamp and wording hash per response), repeating groups, product/quantity, plus statement, image and video blocks. Inputs carry correct browser-autofill markup. |
| **Logic** | Conditional visibility, page skip logic, calculations, scoring and outcome branching with per-outcome endings, answer recall in questions and endings, and validation rules. |
| **Flow & UX** | Multi-step pages, a fast-then-slow progress indicator (optional per form), save and resume with optional opt-in before progress is stored, conversational mode, and submission rules. |
| **Design** | A searchable picker over 100 fonts loaded via Bunny Fonts (no requests to Google), uploaded logo, cover and background images, 10 theme presets plus saved workspace themes, welcome, default and per-outcome ending screens, a per-form switch for the Geiger footer, and built-in text in 7 languages. Emails come from one shared Geiger Forms sender. |
| **Payments** | Stripe Checkout for one-off and subscription payments, product and order-total fields, coupons and discounts, and printable receipts and invoices. |
| **Surveys & quizzes** | Survey fields, a quiz engine, NPS and CSAT, survey reporting, and polls. |
| **Documents & signing** | Signature capture with reviewer countersign, send for signing, document templates, and a printable record with an audit trail (saved as PDF from the browser's print dialog). |
| **Workflow** | Approval routing, assignment to workspace members, @mentions in internal comments with suite bell notifications, automation triggers, and hand-off into Geiger Flow. |
| **Responses** | A response inbox with table and kanban layouts and saved views, bulk actions, partial and abandoned submissions, CSV and JSON export, retention controls, and GDPR subject-access export and erasure by email. |
| **Analytics** | Dashboard, funnel and drop-off, source and attribution, A/B testing of a form's title and description, and reports. |
| **Distribution** | Public link and QR; inline, popup, slider, side-tab, popover and full-screen embeds with delay, scroll and exit-intent triggers and frequency caps; signed personal links; and email and social sharing. |
| **Integrations** | Signed webhooks with automatic retries (up to 8 attempts), replay from the delivery log and owner alerts on permanent failure, a REST API (v1), Slack alerts, Geiger Flow issues, and Geiger Assets file sync. Zapier and Make connect through their catch-hook webhooks. |

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
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key     # server routes (public filler, uploads, webhooks)
STRING_URI=your-direct-postgres-connection-string   # migrations only
```

Email, Stripe, captcha, field encryption, signed links and cron each need their own key (listed in [`SETUP.md`](SETUP.md)); without it, that feature is skipped. **Workspace Settings → Configuration** shows which ones this deployment has. Set `NEXT_PUBLIC_DASH_ORIGIN` so signed-out visitors are redirected to the suite login.

### Database

Schema changes are timestamped SQL migrations in `supabase/migrations/`, applied
in version order by [`@geiger/orm`](https://github.com/bhargavjoshi1237/geiger-orm)
and recorded in `forms.geiger_migrations`:

```bash
npm run db:status                     # applied vs pending
npm run db:new -- <name>              # scaffold a migration
npm run db:push                       # apply everything pending
npm run db:seed                       # re-runnable data
```

See [`MIGRATION_CONVENTIONS.md`](MIGRATION_CONVENTIONS.md) before writing any DDL.

A fresh push builds the `forms` schema (forms, responses and their supporting
tables), its indexes and triggers, and RLS policies scoped by `@geiger/rbac`
grants. Anonymous visitors have no direct table access: the public filler reads
and submits through the app's server routes.

### Develop

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. In production the app is served under the `/forms` asset prefix behind the suite hub.

See [`SETUP.md`](SETUP.md) for the full setup walkthrough and the current wiring status of each area.

## Project structure

```
app/
  project/[projectId]/   Project-scoped authoring workspace
  forms/                 Workspace entry for users without a project (?view=)
  forms/[formId]/        Form builder
  form/[formId]/         Public filler for a published form
  print/                 Printable responses
  api/                   Public filler API, workspace actions, cron, REST v1
components/
  forms/                 Builder, field renderers, filler, response panel, workspace router
  internal/screens/      Workspace screens (overview, responses, analytics, security, templates, settings…)
  internal/shared/       Screen wrappers, pagination, filter dropdown
lib/forms/               Domain logic (field types, schema, logic, export, templates, theme)
lib/server/              Server-only code (submission pipeline, email, Stripe, webhooks, storage, crypto)
lib/supabase/            Browser data-access layer
supabase/migrations/     Timestamped @up/@down migrations (npm run db:push)
```

## Conventions

This codebase follows a consistent set of patterns. Read these before contributing:

- [`MODULE_CONVENTIONS.md`](MODULE_CONVENTIONS.md) — how to build a workspace screen
- [`SUPABASE_CONVENTIONS.md`](SUPABASE_CONVENTIONS.md) — the data-layer playbook
- [`MIGRATION_CONVENTIONS.md`](MIGRATION_CONVENTIONS.md) — schema changes and `@geiger/orm`
- [`crafting.md`](crafting.md) — UI craft and quality bar

## The Geiger suite

Geiger Forms is one application in the broader Geiger suite, alongside Geiger Flow, Geiger Events, and Geiger Notes. Every product shares one Supabase project, a common design language, and the [`@geiger/ui`](https://github.com/bhargavjoshi1237/geiger-ui) component library, so each app feels native to the whole.

## License

Private and unpublished. All rights reserved.
