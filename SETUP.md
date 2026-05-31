# Geiger Forms — setup

## 1. Environment

Copy `.env.example` to `.env` and fill in the Supabase values (shared Geiger
project — the same one geiger-flow uses):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
```

## 2. Database

Apply the schema once against the Supabase project:

```bash
psql "$DATABASE_URL" -f supabase/sqls/forms.sql
# or paste supabase/sqls/forms.sql into the Supabase SQL editor and run it.
```

This creates `geiger_forms` and `geiger_form_responses` (prefixed so they don't
collide with flow's tables), their indexes, an `updated_at` trigger, a
response-count trigger, and RLS policies.

> **RLS note:** the admin workspace does not yet authenticate, so it talks to
> Supabase as the `anon` role and the management policies are intentionally
> permissive. Public visitors can only *read published forms* and *insert
> responses*. When Geiger auth is wired, replace the `*_anon_manage` policies in
> `forms.sql` with owner/project-scoped rules.

## 3. Run

```bash
npm install
npm run dev
```

## What's wired to the database

| Area | Status |
| --- | --- |
| Forms list (create / edit meta / delete / filter) | ✅ live (`/forms`) |
| Builder (load, **autosave**, publish / unpublish, field types, choice options) | ✅ live (`/forms/[slug]`) |
| Public filler (dynamic schema render, validation, conditional fields, calculated fields, triage scoring, **submit**) | ✅ live (`/form/[slug]`) |
| Responses list + per-form responses (real volume/status charts, status mutation, CSV/JSON export) | ✅ live |
| Overview & archived (metric cards, review queue, restore/delete) | ✅ live |

## Architecture

```
lib/forms/        domain layer (pure)         field-types, schema (normalize/validate/score),
                                              builder mapping, export
lib/supabase/     data access                 client, activity tracker, forms CRUD, responses CRUD
lib/hooks/        React data hooks            use-forms, use-responses
components/forms/ feature UI                  builder, filler, field renderer, response panel
```

## Known gaps (intentionally left as UI for now)

- **Templates / Folders / Shared / Settings** screens are static UI — not yet
  backed by tables.
- **File uploads** capture the filename only; binary storage (a Supabase bucket)
  is not wired.
- A few **overview charts** (traffic/channel/conversion trend) remain
  illustrative because the app does not track form *views* yet — only
  submissions.
- **Version history / "save as template"** in the builder are local-only.
