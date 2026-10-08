# Geiger Forms — setup

## 1. Environment

Copy `.env.example` to `.env`. The required values are the shared Geiger Supabase project:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server routes (public submissions, uploads, webhooks)
STRING_URI=...                  # migrations only
```

Everything else is optional; each feature degrades cleanly when its key is missing:

| Variable | Enables |
| --- | --- |
| `RESEND_API_KEY`, `FORMS_EMAIL_FROM` | Confirmation, admin, approval, resume, edit-request, reminder and digest emails |
| `NEXT_PUBLIC_APP_URL` | Absolute links in emails and webhooks |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Payments via Stripe Checkout (webhook: `/api/stripe/webhook`) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Captcha on forms that turn it on |
| `FORMS_ENCRYPTION_KEY` | AES-256-GCM encryption of fields marked sensitive |
| `FORMS_LINK_SECRET` | Signed/expiring form links |
| `CRON_SECRET` | `/api/cron/{retention,reminders,reports}` (scheduled daily in `vercel.json`) |

## 2. Database

Schema changes are ledgered migrations (`MIGRATION_CONVENTIONS.md`):

```bash
npm run db:status
npm run db:push        # applies pending migrations in order
npm run db:seed        # optional: the /form/demo form linked from the landing page
```

- `20261008155426_platform_expansion` is **required** by the current code (new columns and tables).
- `20261008155427_lock_down_rls` replaces the demo-open policies with `@geiger/rbac` grants and removes anon access. Push it once the workspace runs behind a signed-in suite session; without a session the workspace sees no rows.

## 3. Run

```bash
npm install
npm run dev
```

## Architecture

```
lib/forms/        pure domain layer         field-types, schema (model/settings), logic (visibility, pages,
                                            validation, scoring, quiz, outcomes, orders), formula, templates,
                                            i18n, theme, export
lib/supabase/     browser data access       forms, responses, audit, saved views, workspace settings, api keys,
                                            comments, versions, rbac
lib/server/       server-only               service-role client, session auth, submission pipeline, email,
                                            stripe, webhooks, flow, storage, crypto
app/api/          route handlers            public respondent API, workspace actions, cron, REST v1
app/form/[slug]   public filler             server-loaded, gated, themed, multi-page / conversational
app/forms/[slug]  builder
app/print/        printable responses (PDF via the browser)
components/       builder, filler, field renderers, response panel, workspace screens
```

Public traffic never touches the database directly: the filler and the REST API go through `app/api`, which
enforces gates, captcha, rate limits, validation, encryption and payments with the service role.

## Not in app code

- **AI** (form generation, response analysis, fill assist, moderation) waits for the suite's `@geiger/ai` package.
- **Custom domains, data residency, SSO/2FA, SMS, a HIPAA BAA** are hosting, provider or suite-auth concerns;
  the catalog screens explain the setup for each.
