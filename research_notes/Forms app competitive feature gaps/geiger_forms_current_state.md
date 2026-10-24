# Geiger Forms: current-state feature inventory (codebase audit, 2026-10-21)

Method: read-only audit of C:/Pro/geiger-forms (git HEAD 0ff0af6) plus planning docs in C:/Pro. Every source link is a local file. Status tags: **[WORKING]** means implemented end-to-end and persisted in the Supabase `forms` schema. **[ENV-GATED]** means the code is complete but does nothing until an env key is set. **[UI-ONLY]** means a screen or copy exists with no backing behaviour. **[ABSENT]** means it was not found in the code.

## Objective summary: what Geiger Forms actually does today

### Takeaway
Geiger Forms is much further along than its own conventions docs and strategy doc suggest. It is a mostly working, Supabase-persisted form platform with a real server-side submission pipeline: 32 field types, logic and scoring, Stripe, uploads, signatures, booking, approvals, automations, webhooks, a REST API, funnel analytics, A/B tests, RLS, RBAC and encryption. The clear holes are:
- AI (all 4 AI views are "Coming soon")
- custom domains
- PayPal
- native third-party connectors
- per-question translations
- custom CSS
- XLSX/server-side PDF
- webhook retries
- billing

### Cited Findings
- Respondent submissions go through one server pipeline shared by the public filler and REST v1. It covers gates, captcha, rate limit, validation, hidden-answer stripping, files, bookings, duplicates, signatures, scoring, Stripe checkout, insert, events, activity and side-effects — [lib/server/submit.js](C:/Pro/geiger-forms/lib/server/submit.js)
- Side-effects after insert: automations, confirmation email, admin email, Slack, webhooks, Flow issue, Flow bell notifications, approval request and Assets sync. Each is isolated so a failure never fails the submission — [lib/server/side-effects.js](C:/Pro/geiger-forms/lib/server/side-effects.js)
- All 5 migrations are applied to the shared DB, including `lock_down_rls` (output of `npm run db:status` on 2026-10-21: "5 applied, 0 pending") — [supabase/migrations/](C:/Pro/geiger-forms/supabase/migrations/20261008155427_lock_down_rls.sql)
- External services are env-gated:
  - email: `RESEND_API_KEY`, `FORMS_EMAIL_FROM`
  - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - captcha: `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  - signed links: `FORMS_LINK_SECRET`
  - field encryption: `FORMS_ENCRYPTION_KEY`
  - cron: `CRON_SECRET`
  
  Sources: grep of `process.env.*` across lib/app/components; [lib/server/email.js](C:/Pro/geiger-forms/lib/server/email.js), [lib/server/stripe.js](C:/Pro/geiger-forms/lib/server/stripe.js), [lib/server/crypto.js](C:/Pro/geiger-forms/lib/server/crypto.js)
- The README claims features the code does not have:
  - "Stripe and PayPal gateways": no PayPal (grep "paypal" finds nothing in app/components/lib)
  - "custom domains": none found (grep custom.?domain/cname finds nothing)
  - "CRM and marketing tools" integrations: grep hubspot/salesforce/mailchimp finds nothing
  
  Source: [README.md](C:/Pro/geiger-forms/README.md)
- The strategy doc's "where the code is" section is stale. It cites "10 field types" and `geiger_forms` tables, but the code now has 32 types and the `forms.*` schema — [research/geiger-forms-strategy.md](C:/Pro/geiger-forms/research/geiger-forms-strategy.md)

### Inferences
- For competitor comparison, treat Geiger Forms as roughly Jotform/Fillout-class breadth: payments, approvals, e-sign-lite, booking, HIPAA-style controls. Its UX modes are Typeform-like (conversational) and Google-like (classic). The main gaps are AI, ecosystem integrations, design depth and distribution polish (custom domains, more embed modes).
- Many features are env-gated. A deployment without Resend/Stripe/Turnstile keys silently skips emails, payments and captcha. Any competitive claim should say "available when configured".

### Gaps
- I did not exercise the app at runtime, so "working" means the code path is complete and persisted, not that it was tested in a browser.
- The only automated tests are playground seed tests ([lib/playground/__tests__](C:/Pro/geiger-forms/lib/playground/__tests__/seed.test.mjs)). The submit pipeline, logic engine and API have no unit tests.

## Build: field types, editor UX, multi-page, templates, AI, undo/versions

### Takeaway
**[WORKING]** A drag-and-drop builder with 32 field types (27 that take answers), half/third-width columns, page breaks, classic or conversational rendering, a 100-step undo stack, autosave, version history and 42 templates. AI form generation is **[ABSENT]** (Coming soon). Real-time co-editing is presence-only ("partial").

### Cited Findings
- The field registry has 32 types in 8 palette groups — [lib/forms/field-types.js](C:/Pro/geiger-forms/lib/forms/field-types.js):
  - Basic: text, textarea, email, phone, url, number, currency
  - Choice: single choice, dropdown, multiple choice, yes/no checkbox, ranking
  - Date & time: date, time, datetime, booking slot
  - Survey: star rating, linear scale, NPS 0–10, matrix/Likert
  - Contact: full name, address
  - Advanced: file upload, signature, repeating group, hidden, calculated
  - Payments: product, order total
  - Layout: section heading, text block, page break
- Repeating-group rows can only contain 7 sub-types: text, textarea, email, phone, number, date, dropdown — [lib/forms/field-types.js](C:/Pro/geiger-forms/lib/forms/field-types.js) (`REPEATER_SUBTYPES`)
- The canonical field carries label, placeholder, hint, info, required, options, optionPoints, correctAnswer, formula, conditions, conditionLogic, width (full/half/third), defaultValue, prefillKey, readOnly, sensitive, validation and config — [lib/forms/schema.js](C:/Pro/geiger-forms/lib/forms/schema.js) lines 39–66
- Not in the registry **[ABSENT]**: image/picture-choice cards, media (image/video) blocks, opinion/emoji scales, a legal/consent field type, phone-with-country picker, date range, colour/slider beyond the linear scale, and a "statement" screen type. Text block and heading are the only content blocks — [lib/forms/field-types.js](C:/Pro/geiger-forms/lib/forms/field-types.js)
- The builder route is `/forms/<slug>` (FormBuilderShell) — [app/forms/[formId]/page.js](<C:/Pro/geiger-forms/app/forms/[formId]/page.js>)
- The canvas uses native HTML5 drag-and-drop for palette inserts (copy) and reordering (move). An empty canvas offers one-click starters — [components/forms/builder/builder-canvas.jsx](C:/Pro/geiger-forms/components/forms/builder/builder-canvas.jsx) lines 48, 85, 154–158
- Undo/redo: one stack for the whole doc, capped at 100 steps, with typing coalesced inside 900 ms — [components/forms/builder/doc-history.js](C:/Pro/geiger-forms/components/forms/builder/doc-history.js)
- Autosave hook — [components/forms/builder/use-autosave.js](C:/Pro/geiger-forms/components/forms/builder/use-autosave.js). The topbar shows an icon-only autosave indicator (commit 0ff0af6 message).
- Version history:
  - `forms.versions` (version, label, author, notes, schema, settings) — [supabase/migrations/20260711205608_collaboration.sql](C:/Pro/geiger-forms/supabase/migrations/20260711205608_collaboration.sql)
  - `listVersions`/`createVersion` — [lib/supabase/versions.js](C:/Pro/geiger-forms/lib/supabase/versions.js)
  - The feature hub lists it as "Available … with restore" — [catalog/feature_map.js](C:/Pro/geiger-forms/components/internal/screens/forms/catalog/feature_map.js)
- Multi-page works through `page` break fields. A page break's own conditions can skip the whole page — [lib/forms/logic.js](C:/Pro/geiger-forms/lib/forms/logic.js) (`splitPages`, `visiblePages`)
- Conversational mode shows one question per screen. Enter advances (Shift+Enter keeps a newline), A–Z picks a choice option, and screens slide between questions — [components/forms/filler/conversational-view.jsx](C:/Pro/geiger-forms/components/forms/filler/conversational-view.jsx) lines 14, 46. It is toggled per form by `settings.layout` (default "classic") — [lib/forms/schema.js](C:/Pro/geiger-forms/lib/forms/schema.js)
- Templates: 42 built-in in [lib/forms/templates.js](C:/Pro/geiger-forms/lib/forms/templates.js):
  - Operations 6, Surveys 5, HR 5
  - Lead generation 4, Payments 4, Support 4
  - Registration 3, Healthcare & legal 3
  - Assessment, Community, Education and Finance 2 each
  
  The gallery also has a "Your templates" tab backed by the `forms.is_template` column — [templates_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/templates/templates_screen.jsx) lines 290–291
- Real-time co-editing uses Supabase Realtime presence avatars and "saved" broadcasts on channel `forms-builder:<id>` — [components/forms/builder/use-builder-presence.js](C:/Pro/geiger-forms/components/forms/builder/use-builder-presence.js). Its catalog status is "partial" — [feature_map.js](C:/Pro/geiger-forms/components/internal/screens/forms/catalog/feature_map.js)
- AI form generation (`ai.generate`) renders ComingSoonScreen: "Describe a form in plain language and get a ready-to-edit draft…" — [sidebar_nav.js](C:/Pro/geiger-forms/components/internal/sidebar/sidebar_nav.js) line 145; [coming_soon_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/coming-soon/coming_soon_screen.jsx)
- Importing from Typeform or other tools is **[ABSENT]**. It is listed as a suite priority: "Import tools — … Typeform (forms)" — [C:/Pro/ADD-REMOVE.md](C:/Pro/ADD-REMOVE.md) line 75

### Inferences
- Field breadth beats Google Forms and Tally free and is close to Jotform/Fillout on core types. It trails on visual choice types and media blocks, which Typeform and Tally users expect.
- Co-editing is awareness only (who is here, "someone saved"). There is no merge of concurrent edits, so it is not Google-Docs-style.

### Gaps
- I did not read `doc-checks.js` (it looks like builder lint/checks) or `history-section.jsx` line by line, so the exact restore/diff UX of versions is unverified.
- I could not confirm whether question labels support answer piping inside the filler. Merge tags are confirmed only for thank-you text, redirect URL and emails (see Logic).

## Logic: conditions, branching, calculations, hidden fields, prefill, piping, validation

### Takeaway
**[WORKING]** The logic engine runs identically on client and server. It covers 11-operator show/hide conditions with any/all, page skip, calculated formulas, scoring and priority, quizzes, named-outcome branching, URL/user prefill, hidden fields with UTM capture, merge tags and rich validation. There is no "jump to question X" logic or global variables separate from calculated fields.

### Cited Findings
- The logic module is shared by the filler and the submit route ("runs identically in the filler (client) and the submit route (server)") — [lib/forms/logic.js](C:/Pro/geiger-forms/lib/forms/logic.js) header
- Condition operators: equals, not_equals, contains, not_contains, starts_with, is_empty, is_not_empty, gt, gte, lt, lte. They combine with "any" (OR, the default) or "all" (AND) — [lib/forms/logic.js](C:/Pro/geiger-forms/lib/forms/logic.js) (`CONDITION_OPERATORS`, `matchesConditions`)
- Conditions cascade: hidden earlier fields are blanked so dependants also hide, and calculated values can feed later conditions — [lib/forms/logic.js](C:/Pro/geiger-forms/lib/forms/logic.js) (`visibleFieldIds`)
- Branching is outcome routing: `settings.branches[]`, where the first matching branch sets a named outcome and can set priority and initial status. It is not page-jump logic — [lib/forms/logic.js](C:/Pro/geiger-forms/lib/forms/logic.js) (`resolveOutcome`); [lib/server/submit.js](C:/Pro/geiger-forms/lib/server/submit.js) (`initialStatus`)
- Calculations — [lib/forms/formula.js](C:/Pro/geiger-forms/lib/forms/formula.js), [lib/forms/logic.js](C:/Pro/geiger-forms/lib/forms/logic.js) (`evaluateFormula`, `numericValue`), [components/forms/builder/formula-editor.jsx](C:/Pro/geiger-forms/components/forms/builder/formula-editor.jsx):
  - formulas reference fields by id, title or label
  - choices contribute option points, products contribute price × quantity, dates count as days
  - a cycle guard prevents self-reference
  - computed values are stored with the response
- Scoring sums option points, calculated fields and quiz points. High/medium thresholds (defaults 80/40) set priority — [lib/forms/logic.js](C:/Pro/geiger-forms/lib/forms/logic.js) (`scoreResponse`)
- Quiz: each field can have a correct answer and points, with a pass mark and an optional "show correct answers". Answer keys are stripped from the public payload — [lib/forms/logic.js](C:/Pro/geiger-forms/lib/forms/logic.js) (`gradeQuiz`); [lib/server/public-form.js](C:/Pro/geiger-forms/lib/server/public-form.js) (`publicFieldDefs`)
- Prefill — [components/forms/filler/session.js](C:/Pro/geiger-forms/components/forms/filler/session.js) lines 87–113:
  - URL keys match by prefillKey, slugified title (dash or underscore) or field id
  - hidden fields always accept URL values; other fields only when `prefill.url` is on
  - optional prefill from the signed-in user (`prefill.user`)
- UTM capture: utm_source/medium/campaign/term/content plus referrer are stored in response metadata. The embed script forwards host-page `utm_*` params — [session.js](C:/Pro/geiger-forms/components/forms/filler/session.js); [lib/server/submit.js](C:/Pro/geiger-forms/lib/server/submit.js) (`cleanUtm`); [public/embed.js](C:/Pro/geiger-forms/public/embed.js)
- Merge tags: `{Field Title}`, `{field-id}`, `{score}`, `{outcome}` and `{total}` are interpolated into the thank-you title/text, the redirect URL (http/https only) and the confirmation email subject/body — [lib/forms/logic.js](C:/Pro/geiger-forms/lib/forms/logic.js) (`interpolate`); [lib/server/submit.js](C:/Pro/geiger-forms/lib/server/submit.js) (`thankYouFor`); [lib/server/side-effects.js](C:/Pro/geiger-forms/lib/server/side-effects.js) (`sendConfirmation`)
- Validation rules (re-validated on the server) — [lib/forms/logic.js](C:/Pro/geiger-forms/lib/forms/logic.js) (`validateField`):
  - required
  - email, URL and phone format
  - numeric min/max
  - text min/max length
  - regex pattern with a custom message
  - min/max selections for multiple choice
  - composite name (first + last) and address (line1 + city)
  - matrix requires every row
  - repeater min rows plus per-sub-field validation
- Read-only fields and server-enforced defaults are supported — [lib/server/submit.js](C:/Pro/geiger-forms/lib/server/submit.js)

### Inferences
- The logic is about Jotform/Fillout depth for show/hide and calculations, and stronger than Google Forms (section-only branching). It lacks Typeform-style "logic jumps", global variables and a visual logic map.

### Gaps
- I found no visual logic-flow diagram. The "Rules" summary in [structure.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/structure.jsx) line 186 is a read-only list.

## Design: themes, fonts/colours/CSS, branding, backgrounds, light/dark, Design section, playground

### Takeaway
**[WORKING]** but shallow:
- mode (light/dark/auto)
- any accent hex
- 5 corner radii
- 3 fonts
- plain, accent-gradient or image background
- cover image, logo by URL, welcome and ending screens
- a free per-form "Made with Geiger Forms" toggle
- a live ThemePreview in the new builder Design section

**[ABSENT]**: custom CSS, custom or Google fonts, saved theme library, per-element styling, Typeform-style split layouts. The "live playground" is a landing-page demo, not a respondent feature.

### Cited Findings
- Theme engine — [lib/forms/theme.js](C:/Pro/geiger-forms/lib/forms/theme.js):
  - light and dark token sets, with mode resolved against `prefersDark`
  - accent overrides `--primary` with an auto-contrast foreground
  - radius: none/sm/md/lg/full
  - fonts: sans (Geist), serif (Merriweather), mono (Geist Mono)
  - background: plain, gradient (accent-tinted radial) or image (cover URL, faded)
  - embeds force a transparent background
- Default theme is `{ mode: "dark", accent: "", radius: "md", font: "sans", background: "plain" }` — [lib/forms/schema.js](C:/Pro/geiger-forms/lib/forms/schema.js) line 93
- The builder Design panel has: live ThemePreview, accent presets, colour picker and hex input, background image URL, corners, font, layout, progress bar, logo toggle with logo URL, and the "Made with Geiger Forms" footer toggle — [components/forms/builder/design-section.jsx](C:/Pro/geiger-forms/components/forms/builder/design-section.jsx) lines 27–102
- Commit 0ff0af6 (2026-10-18) added the "Design section with a live ThemePreview (accent presets, background, font, layout, mode, radius)" — `git show 0ff0af6`
- The logo is a URL field, not an upload — [design-section.jsx](C:/Pro/geiger-forms/components/forms/builder/design-section.jsx) line 95. Cover presets and a picker — [cover-presets.js](C:/Pro/geiger-forms/components/forms/builder/cover-presets.js), [cover-picker.jsx](C:/Pro/geiger-forms/components/forms/builder/cover-picker.jsx)
- Welcome screen (title, body, button label). Ending screen is a message or a redirect, with options to show score and allow another submission — [sections/screens.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/screens.jsx)
- Workspace-level "Branding: default look for new forms" — [settings_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/settings/settings_screen.jsx) line 348
- A grep for customCss, custom_css, customFont or Google Fonts in lib/components/app finds nothing **[ABSENT]**
- Live playground: the landing page mounts the app against an in-memory, seeded copy of the schema ("Halcyon Studio"). Edits survive tab switches but reset on reload — [lib/playground/mode.js](C:/Pro/geiger-forms/lib/playground/mode.js), [lib/playground/db.js](C:/Pro/geiger-forms/lib/playground/db.js), [components/landing/PlaygroundFrame.jsx](C:/Pro/geiger-forms/components/landing/PlaygroundFrame.jsx)

### Inferences
- Design control is below Typeform, Tally Pro and Jotform (custom fonts, CSS, theme galleries and layouts). This is a visible gap for a suite that sells "the craft of a creative tool" ([C:/Pro/GTM-STRATEGY.md](C:/Pro/GTM-STRATEGY.md) line 35).
- Removing branding is free per form, which undercuts competitors that charge to remove branding.

### Gaps
- None material.

## Distribute: links, embeds, QR, domains, email, white-label

### Takeaway
**[WORKING]**:
- SSR public link `/form/<slug>` with OG/Twitter metadata
- inline auto-resizing embed and popup embed through a hosted `embed.js` with a JS API
- a plain iframe snippet
- QR code
- expiring HMAC-signed personal links
- email invitations up to 200 recipients **[ENV-GATED Resend]**

**[ABSENT]**: custom domains (despite the README), slider/side-panel/popover-bubble embeds, and SMS/WhatsApp distribution.

### Cited Findings
- The public filler is SSR at `/form/[slug]` and sets OG/Twitter cards from title, description and cover. Signed or password gates are noindexed — [app/form/[formId]/page.js](<C:/Pro/geiger-forms/app/form/[formId]/page.js>)
- Production mounts under `/forms` (assetPrefix) — [next.config.mjs](C:/Pro/geiger-forms/next.config.mjs); commit 89b07e0 "keep navigations under the /forms mount in production"
- [public/embed.js](C:/Pro/geiger-forms/public/embed.js) provides:
  - `data-geiger-form` with `data-mode="inline|popup"`
  - popup button text and colour
  - auto height via postMessage
  - a `geiger-form:submitted` DOM event
  - `window.GeigerForms.open/mount/url`
  - utm forwarding
  - modal with focus restore and Esc to close
- Embed snippets: inline, popup and plain iframe — [sections/sharing.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/sharing.jsx) lines 75–90
- QR PNG is generated client-side with the `qrcode` package — [sections/qr_code.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/qr_code.jsx); [package.json](C:/Pro/geiger-forms/package.json)
- Signed links are HMAC-signed, expire after 1 hour to 90 days and can be bound to an email — [api/forms/:id/signed-link](<C:/Pro/geiger-forms/app/api/forms/[id]/signed-link/route.js>); [lib/server/crypto.js](C:/Pro/geiger-forms/lib/server/crypto.js) (`signLinkToken`)
- Email invites — [api/forms/:id/invite](<C:/Pro/geiger-forms/app/api/forms/[id]/invite/route.js>):
  - up to 200 recipients, custom message
  - optional per-recipient signed links ("Review & sign"), valid 30 days
  - form must be Published
- A/B variant links (`?variant=`) swap the form title and description — [lib/server/public-form.js](C:/Pro/geiger-forms/lib/server/public-form.js) (`pickVariant`)
- Custom domains: no code found; only claimed in [README.md](C:/Pro/geiger-forms/README.md) and planned as P4 in [research/geiger-forms-strategy.md](C:/Pro/geiger-forms/research/geiger-forms-strategy.md) **[ABSENT]**
- White-label is the footer toggle only. Email sender is global (`FORMS_EMAIL_FROM`, default "Geiger Forms <forms@notifications.geiger.studio>") — [lib/server/email.js](C:/Pro/geiger-forms/lib/server/email.js)

### Inferences
- Distribution is at Tally/Jotform baseline for links and embeds. It lacks Typeform's richer embed modes and any agency-grade custom domain or white-label email story.

### Gaps
- I did not verify what "social sharing" in the Share section renders ([sharing.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/sharing.jsx) line 207 comment).

## Collect: payments, uploads, signatures, partials, limits, protection, i18n, a11y, offline

### Takeaway
**[WORKING]** and broad:
- Stripe one-off and subscription checkout with coupons **[ENV-GATED]**
- private file uploads with signed URLs
- drawn signatures plus reviewer countersign
- bookable time slots with reminders
- partials, save and resume by email
- offline drafts plus a queued submit
- schedule, limits and closed message
- five access modes and one-response-per-user
- honeypot, Turnstile, rate limit, minimum review time and duplicate detection
- edit after submit, delegate, attestation and policy acknowledgement

Multi-language covers built-in UI strings only (7 locales). PayPal and other gateways are **[ABSENT]**.

### Cited Findings
- Payments — [lib/forms/logic.js](C:/Pro/geiger-forms/lib/forms/logic.js) (`computeOrder`), [lib/server/stripe.js](C:/Pro/geiger-forms/lib/server/stripe.js), [lib/server/submit.js](C:/Pro/geiger-forms/lib/server/submit.js):
  - product fields have price and quantity mode (fixed or variable); the order total is computed client and server
  - coupons are percent or amount and become a one-time Stripe coupon
  - checkout is a Stripe Checkout Session, `mode: payment | subscription`, monthly or yearly
  - the response waits as "Awaiting payment"
- The Stripe webhook verifies signatures and handles checkout.session.completed, async_payment_succeeded/failed, expired, invoice.paid and invoice.payment_failed. When paid, the response moves to Complete, or Pending if approval is on — [api/stripe/webhook](C:/Pro/geiger-forms/app/api/stripe/webhook/route.js)
- Stripe uses one deployment-level secret key ("Payments run through your own Stripe account"). No Stripe Connect or per-workspace keys were found — [sections/payments.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/payments.jsx) line 67; [lib/server/stripe.js](C:/Pro/geiger-forms/lib/server/stripe.js)
- The print view renders a receipt or invoice block — [components/forms/response/print-document.jsx](C:/Pro/geiger-forms/components/forms/response/print-document.jsx) lines 132–139
- File uploads — [api/public/forms/:slug/upload](<C:/Pro/geiger-forms/app/api/public/forms/[slug]/upload/route.js>); [lib/server/storage.js](C:/Pro/geiger-forms/lib/server/storage.js); [lib/server/submit.js](C:/Pro/geiger-forms/lib/server/submit.js) (`checkFiles`):
  - signed upload URL into the private `forms-uploads` bucket
  - per-field accept rules and max MB, plus maxFiles
  - the server verifies each path belongs to `forms/<formId>/`
- Downloads go through a short-lived signed URL and are access-logged — [api/responses/:id/file](<C:/Pro/geiger-forms/app/api/responses/[id]/file/route.js>)
- Signatures are drawn and stored as PNG in storage. Reviewers can countersign with a typed name, a drawn PNG and a server timestamp — [lib/server/submit.js](C:/Pro/geiger-forms/lib/server/submit.js) (`persistSignatures`); [api/responses/:id/countersign](<C:/Pro/geiger-forms/app/api/responses/[id]/countersign/route.js>)
- Booking — [lib/server/booking.js](C:/Pro/geiger-forms/lib/server/booking.js); [api/public/forms/:slug/slots](<C:/Pro/geiger-forms/app/api/public/forms/[slug]/slots/route.js>); [api/cron/reminders](C:/Pro/geiger-forms/app/api/cron/reminders/route.js):
  - booking field with a slots API and conflict check
  - `forms.bookings` table
  - 24-hour reminder emails from the daily cron
- Partials and resume — [api/public/forms/:slug/partial](<C:/Pro/geiger-forms/app/api/public/forms/[slug]/partial/route.js>); [resume-email](<C:/Pro/geiger-forms/app/api/public/forms/[slug]/resume-email/route.js>); [partials_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/partials/partials_screen.jsx):
  - `forms.partials` stores token, answers, last field, page index, progress and email
  - resume link emailed on request
  - abandoned list in the workspace
- Offline — [components/forms/filler/form-runner.jsx](C:/Pro/geiger-forms/components/forms/filler/form-runner.jsx) lines 62, 199–210, 344–368; [sections/save_resume.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/save_resume.jsx) line 19:
  - localStorage drafts with a "resume draft" offer
  - a submission is queued if offline and retried on the `online` event or next load
  - no service worker or PWA manifest (none in public/ or app/)
- Gates — [lib/server/public-form.js](C:/Pro/geiger-forms/lib/server/public-form.js) (`evaluateGate`); [api/public/forms/:slug/password](<C:/Pro/geiger-forms/app/api/public/forms/[slug]/password/route.js>):
  - open and close dates; custom closed message
  - response limit with an optional "spots left" count
  - access modes: public, password (signed httpOnly cookie), login (suite session), org email domain, signed links only
  - one response per user (requires login)
- Spam — [lib/server/submit.js](C:/Pro/geiger-forms/lib/server/submit.js); [migration platform_expansion](C:/Pro/geiger-forms/supabase/migrations/20261008155426_platform_expansion.sql) (`hit_rate_limit`):
  - honeypot, on by default; a bot gets fake success and nothing is stored
  - Cloudflare Turnstile **[ENV-GATED]**
  - per-IP-hash hourly rate limit (default 20) through the `forms.hit_rate_limit` RPC
  - minimum review seconds
  - duplicate detection on chosen fields within N days, either flag ("Needs review") or block (409)
- Edit after submit — [lib/forms/schema.js](C:/Pro/geiger-forms/lib/forms/schema.js) (`editWindowMs`); [api/public/forms/:slug/edit](<C:/Pro/geiger-forms/app/api/public/forms/[slug]/edit/route.js>); [api/responses/:id/request-edit](<C:/Pro/geiger-forms/app/api/responses/[id]/request-edit/route.js>):
  - edit tokens with windows: disabled, 1h, 24h, 7d, 30d, always
  - staff can mint and email a fresh edit link
- Delegate submission, attestation checkbox and policy acknowledgement (must scroll, typed name) are stored with timestamps in response metadata — [lib/server/submit.js](C:/Pro/geiger-forms/lib/server/submit.js); [sections/submission.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/submission.jsx)
- Multi-language: 7 locales (en, es, fr, de, pt, hi, ar with RTL) for built-in strings ("Translates the form's built-in text — buttons, validation messages and date formats"). Per-question translation is **[ABSENT]** — [lib/forms/i18n.js](C:/Pro/geiger-forms/lib/forms/i18n.js) lines 2–10; [sections/localization.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/localization.jsx) line 14
- Accessibility: 88 `aria-*` attributes across the filler and field components (grep count), keyboard navigation in conversational mode, RTL. No WCAG statement or audit doc was found — [components/forms/filler/](C:/Pro/geiger-forms/components/forms/filler/conversational-view.jsx), [components/forms/fields/](C:/Pro/geiger-forms/components/forms/fields/field-shell.jsx)
- Completion time is stored (`completion_ms`) — [lib/server/submit.js](C:/Pro/geiger-forms/lib/server/submit.js)

### Inferences
- Collection features (payments, booking, e-sign-lite, save and resume, offline queue, duplicate detection, approvals) are a differentiator against Typeform, Tally and Google Forms, and on par with Jotform/Paperform for small teams.
- Payment depth stops at Stripe Checkout through one platform account. That suits self-hosting but not a multi-tenant SaaS where each customer needs their own Stripe account.

### Gaps
- I did not check whether file-type and size limits are configurable in the builder UI or only through field config.
- I did not verify Turnstile rendering in the client gates ([components/forms/filler/gates.jsx](C:/Pro/geiger-forms/components/forms/filler/gates.jsx)).

## Respond / Manage: inbox, filters, tags, notes, assignment, status, approvals, notifications, PDF

### Takeaway
**[WORKING]**:
- project-wide inbox with table and kanban
- 8 statuses enforced by the DB, 3 priorities
- filters, sort, search and persisted saved views
- tags, free-text assignee and internal comments
- bulk actions
- multi-step email approvals
- confirmation and admin emails, drip follow-ups, weekly digests, Slack and Flow bell notifications
- browser print-to-PDF with document templates and receipts

**[ABSENT]**: server-side PDF generation or PDF email attachments, and user-linked assignment.

### Cited Findings
- Response statuses: Complete, Needs review, Pending, In progress, Approved, Rejected, Awaiting payment, Spam. Priorities: High, Medium, Low. The DB check constraint was widened to match — [lib/forms/schema.js](C:/Pro/geiger-forms/lib/forms/schema.js) line 14; [platform_expansion.sql](C:/Pro/geiger-forms/supabase/migrations/20261008155426_platform_expansion.sql) lines 49–51
- The inbox has saved views, toolbar, bulk actions, table or kanban, and a detail panel. Filters cover form, status, assignee ("Unassigned" option), sort and search — [responses/response_workspace.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/responses/response_workspace.jsx) lines 117, 146, 490–493
- Kanban: dropping a card in another column changes its status — [responses/kanban_board.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/responses/kanban_board.jsx) lines 52–69
- Saved views persist in `forms.saved_views` (name, layout table/kanban, filters) — [lib/supabase/saved_views.js](C:/Pro/geiger-forms/lib/supabase/saved_views.js); [platform_expansion.sql](C:/Pro/geiger-forms/supabase/migrations/20261008155426_platform_expansion.sql)
- Bulk actions: status, priority, tags add/remove, assign/unassign, export, print — [responses/bulk_bar.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/responses/bulk_bar.jsx) lines 127–170
- Tags are `text[]` with a GIN index. Assignee is a plain `text` column, so it is not linked to a user or member — [platform_expansion.sql](C:/Pro/geiger-forms/supabase/migrations/20261008155426_platform_expansion.sql) lines 34–35
- Internal comments: `forms.comments(author text default 'You', body)`. There is a cross-response comments feed screen — [collaboration.sql](C:/Pro/geiger-forms/supabase/migrations/20260711205608_collaboration.sql); [comments_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/comments/comments_screen.jsx)
- Approvals: an ordered chain where each step lists approver emails. Approve or reject advances the chain, approvers are emailed, and the respondent gets the decision by email — [sections/workflow.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/workflow.jsx) line 53; [api/responses/:id/approve](<C:/Pro/geiger-forms/app/api/responses/[id]/approve/route.js>); [lib/server/side-effects.js](C:/Pro/geiger-forms/lib/server/side-effects.js) (`sendApprovalRequest`, `sendDecision`)
- Notifications **[ENV-GATED Resend for email]** — [lib/server/side-effects.js](C:/Pro/geiger-forms/lib/server/side-effects.js); [api/cron/reminders](C:/Pro/geiger-forms/app/api/cron/reminders/route.js); [api/cron/reports](C:/Pro/geiger-forms/app/api/cron/reports/route.js); [vercel.json](C:/Pro/geiger-forms/vercel.json):
  - respondent confirmation with answers table and edit link
  - admin alerts with reply-to set to the respondent
  - drip follow-ups (`delayHours`) sent by the daily cron
  - weekly digest on Mondays (responses, views, starts, completion rate, by-status)
  - Slack incoming webhook
- Response detail actions: assign, tags, reveal encrypted fields, payment info, countersign, escalate to Flow, print, request edit, copy as CSV row — [components/forms/response-detail-panel.jsx](C:/Pro/geiger-forms/components/forms/response-detail-panel.jsx) lines 48, 114, 142, 146, 212, 265, 275, 383; [response-dialogs.jsx](C:/Pro/geiger-forms/components/forms/response/response-dialogs.jsx) line 99
- PDF output — [app/print/response/[id]/page.js](<C:/Pro/geiger-forms/app/print/response/[id]/page.js>) line 8; [print-document.jsx](C:/Pro/geiger-forms/components/forms/response/print-document.jsx) lines 182, 306–350; [sections/workflow.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/workflow.jsx) line 204:
  - print pages `/print/response/[id]` and `/print/responses` (contract/certificate page, answers, receipt, audit trail)
  - an optional per-form document template
  - output is `window.print()` (browser save-as-PDF); no server PDF renderer

### Inferences
- Inbox and workflow depth (kanban, saved views, approvals, automations) is stronger than Typeform, Tally and Google Forms and comparable to Jotform Tables/Approvals or Fillout. Assignment by free text and comments with a hard-coded "You" author are the weak spots for team use.

### Gaps
- I did not verify whether comment authors are filled from the session user in the UI (the DB default is 'You').

## Analyze: dashboards, funnel/drop-off, rates, A/B, exports

### Takeaway
**[WORKING]**:
- view, start and submit funnel events with session dedupe, UTM and variant
- Recharts dashboard and Overview
- field- and page-level drop-off
- source attribution
- A/B testing of title and description with conversion significance
- per-form survey reports, public poll results and weekly digests
- CSV (Excel-safe) and JSON export

**[ABSENT]**: XLSX, AI response analysis, A/B variants that change fields or design.

### Cited Findings
- `forms.form_events(type in view|start|submit, session_id, variant, metadata)`. View and start come from the public event route (rate-limited); submit is written by the pipeline — [platform_expansion.sql](C:/Pro/geiger-forms/supabase/migrations/20261008155426_platform_expansion.sql); [api/public/forms/:slug/event](<C:/Pro/geiger-forms/app/api/public/forms/[slug]/event/route.js>); [lib/server/submit.js](C:/Pro/geiger-forms/lib/server/submit.js)
- Analytics data dedupes events per (form, type, session), excludes spam from conversion and offers range options — [analytics/analytics_data.js](C:/Pro/geiger-forms/components/internal/screens/forms/analytics/analytics_data.js) lines 10–77
- Drop-off screen: funnel, field drop-off (share of abandoned sessions whose last touched field was X), page drop-off and an abandoned-sessions list — [analytics/dropoff_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/analytics/dropoff_screen.jsx) lines 182–225
- Attribution groups events and responses by a chosen dimension (UTM/referrer) — [analytics/attribution_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/analytics/attribution_screen.jsx) line 37
- A/B: per-variant views, submissions and conversion "with significance against the first variant". Variants only carry title and description — [analytics/abtest_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/analytics/abtest_screen.jsx) line 46; [lib/server/public-form.js](C:/Pro/geiger-forms/lib/server/public-form.js) (`pickVariant` returns `{id, title, description}`)
- Reports hub has per-form reports with survey summaries — [analytics/reports_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/analytics/reports_screen.jsx) line 25; [responses/survey_report.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/responses/survey_report.jsx)
- Public poll results (opt-in): choice counts and numeric averages, excluding sensitive fields and spam — [api/public/forms/:slug/results](<C:/Pro/geiger-forms/app/api/public/forms/[slug]/results/route.js>)
- Exports — [lib/forms/export.js](C:/Pro/geiger-forms/lib/forms/export.js) lines 3, 47–48, 173–182:
  - CSV with question labels, composite answers flattened, UTF-8 BOM for Excel and formula-injection neutralised
  - JSON with raw plus labelled answers
  - export access is logged
- Charts use Recharts ([package.json](C:/Pro/geiger-forms/package.json)). Overview has its own charts — [overview/overview_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/overview/overview_screen.jsx) line 66
- "AI Response Analysis" (`ai.analysis`) is ComingSoonScreen — [coming_soon_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/coming-soon/coming_soon_screen.jsx)

### Inferences
- Field-level drop-off plus attribution plus A/B on a self-hosted stack is a real differentiator. Typeform and Jotform keep drop-off behind higher tiers, and Google Forms and Tally free lack it. Title/description-only A/B is limited next to Typeform/Zuko-style experiments.

### Gaps
- I did not inspect the statistical method behind "significance" in abtest_screen.jsx.

## Integrate / Automate: webhooks, API, native integrations, Zapier, cross-suite

### Takeaway
**[WORKING]**:
- per-form HMAC-signed webhooks with a delivery log and test button
- Slack
- a read-mostly REST v1 with project-scoped hashed API keys plus headless submit
- IF/THEN automations (7 action types)
- Geiger Flow issue escalation and bell notifications
- Geiger Assets upload sync

**[UI-ONLY]**: the webhook card says "Retries automatically on failure", but there is no retry code.

**[ABSENT]**: a native Google Sheets/HubSpot/Mailchimp connector, a Zapier app, and any integration with Events, Notes, Comms, Campaign or Dash.

### Cited Findings
- Webhooks — [lib/server/webhooks.js](C:/Pro/geiger-forms/lib/server/webhooks.js); [api/forms/:id/deliveries](<C:/Pro/geiger-forms/app/api/forms/[id]/deliveries/route.js>); [api/forms/:id/test-webhook](<C:/Pro/geiger-forms/app/api/forms/[id]/test-webhook/route.js>):
  - events: response.created, response.updated, test
  - header `X-Geiger-Signature: sha256=<hmac>`
  - SSRF guard (`isSafeOutboundUrl`), 8-second timeout, redirects not followed
  - deliveries logged to `forms.webhook_deliveries`; last 100 viewable
- **Retry claim is not backed by code:**
  - The UI copy reads "POST each response as JSON to your endpoint. Retries automatically on failure." — [sections/integrations.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/integrations.jsx) line 133
  - A grep for retry/retries in lib/server and app/api finds nothing.
  - `postSignedWebhook` makes a single attempt — [lib/server/webhooks.js](C:/Pro/geiger-forms/lib/server/webhooks.js)
- REST v1 — [app/api/v1/forms/route.js](C:/Pro/geiger-forms/app/api/v1/forms/route.js); [api/v1/forms/:id](<C:/Pro/geiger-forms/app/api/v1/forms/[id]/route.js>); [api/v1/forms/:id/responses](<C:/Pro/geiger-forms/app/api/v1/forms/[id]/responses/route.js>); [lib/server/api-keys.js](C:/Pro/geiger-forms/lib/server/api-keys.js):
  - `GET /api/v1/forms`
  - `GET /api/v1/forms/:id` (fields plus public settings)
  - `GET /api/v1/forms/:id/responses` (cursor-paged, `since`)
  - `POST /api/v1/forms/:id/responses` (headless submit; gates and spam checks skipped)
  - no endpoints to create, update or delete forms or responses
  - keys are `gf_…`, stored as sha256, with read/write scopes and project scope
- Automations run on each new response. Actions: set_status (never skips payment), set_priority, add_tag, assign, email, flow_issue, webhook — [lib/server/side-effects.js](C:/Pro/geiger-forms/lib/server/side-effects.js) (`runAutomations`); [sections/workflow.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/workflow.jsx) line 138
- The "Google Sheets, Zapier & Make" card is instructions only: use a Catch hook or Webhook → Add row, or poll the REST API — [sections/integrations.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/integrations.jsx) lines 186–196
- A grep for hubspot, salesforce, mailchimp, notion or Google Sheets API finds nothing in app/components/lib **[ABSENT]**
- Geiger Flow — [lib/server/flow.js](C:/Pro/geiger-forms/lib/server/flow.js); [api/responses/:id/escalate](<C:/Pro/geiger-forms/app/api/responses/[id]/escalate/route.js>):
  - inserts into `flow.issues` (title, description with answers, labels, priority) through the `next_issue_number` RPC
  - needs `public.projects.flow_project_id` to be linked
  - escalation rule: High priority, every response, or outcome matches
  - manual escalate route
  - bell notifications are written to `public.flow_notifications` for the form owner and active project grantees
- Geiger Assets: uploads are copied as `assets.assets` rows pointing at the `forms-uploads` bucket — [lib/server/side-effects.js](C:/Pro/geiger-forms/lib/server/side-effects.js) (`syncAssets`)
- Cross-schema access in the code is only `flow`, `assets`, `public` (projects, roles, flow_notifications) and `forms`. Nothing touches Events, Notes, Comms, Campaign, Grey or Dash — grep of `schema("…")`/`from("…")` in lib/app
- "Grey Entity Population from Responses" is planned but **[ABSENT]** — [FEATURES_SUITE.md](C:/Pro/geiger-forms/FEATURES_SUITE.md) §6
- The Developer hub (Hooks & Events, Headless/API-first, Data Front-end, REST/API, Webhooks nav items) shows API keys, a REST reference with curl, a webhook catalog with HMAC verify snippet, and embed docs — [developer/developer_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/developer/developer_screen.jsx); [developer/reference_tabs.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/developer/reference_tabs.jsx)

### Inferences
- The "suite-native workflow" bet (form → Flow issue) is real today, but only Flow and Assets are wired. Events, Notes, Comms and Campaign hooks are the obvious next adjacent features (for example Events registration, or Campaign audience sync).
- Ecosystem integrations are the weakest area against Jotform, Typeform and Fillout, which ship dozens of native connectors and Zapier apps.

### Gaps
- I could not confirm whether `public.projects.flow_project_id` exists or is populated in the shared DB; it is only referenced in code.

## Collaborate / Admin: workspaces, invites, roles, audit, SSO, billing

### Takeaway
**[WORKING]**:
- project-scoped workspaces (`/project/<id>/<view>`)
- @geiger/rbac with 5 system roles plus custom roles and a granular permission catalog, enforced in server routes and RLS
- members and roles screens
- an activity audit trail and a response access log
- folders, archive and duplicate

**[ABSENT in Forms]**: SSO/2FA (delegated to the suite account; copy only) and billing (permission key only).

### Cited Findings
- Workspace routing: `/project/[projectId]/[[...rest]]` mirrors geiger-events; the legacy `/forms` uses `?view=` — [app/project/[projectId]/[[...rest]]/page.js](<C:/Pro/geiger-forms/app/project/[projectId]/[[...rest]]/page.js>); [components/forms/forms-workspace.jsx](C:/Pro/geiger-forms/components/forms/forms-workspace.jsx); commit 8e3d8a1
- RBAC — [geiger-rbac.config.js](C:/Pro/geiger-forms/geiger-rbac.config.js) lines 50–209; [adopt_rbac.sql](C:/Pro/geiger-forms/supabase/migrations/20260907120000_adopt_rbac.sql):
  - storage: `public.roles` (suite-wide), `forms.role_grants` and the `forms.rbac_allows()` predicate
  - system roles: owner (`*`), admin, manager, member, viewer
  - permissions: `view.*` nav keys plus forms.form.edit/publish/delete, forms.response.export/delete, forms.team.invite/assign, forms.role.manage, forms.billing.manage, forms.settings.manage
- Server routes enforce RBAC through `userCan` → `rbac_allows` RPC — [lib/server/auth.js](C:/Pro/geiger-forms/lib/server/auth.js); [lib/server/workspace.js](C:/Pro/geiger-forms/lib/server/workspace.js)
- Roles screen has Members and Roles tabs, custom role creation and a grouped permission checklist (read-only for system roles) — [roles/roles_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/roles/roles_screen.jsx) lines 76, 163, 398–443
- Data layer: `listRoles`, `createRole`, `grantRole`, `setMemberRole`, `ensureMembership`… — [lib/supabase/rbac.js](C:/Pro/geiger-forms/lib/supabase/rbac.js)
- SSO and 2FA copy: "Sign-in, SSO (SAML/OIDC), and two-factor authentication are handled by the Geiger suite account, not by Forms" — [roles_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/roles/roles_screen.jsx) lines 521–525
- Audit: `forms.activity` (form edits, publishes, submissions, automations, invites, signed links, erasures) and `forms.access_log` (view, reveal, export, print, edit). The Activity screen shows both as tabs — [platform_expansion.sql](C:/Pro/geiger-forms/supabase/migrations/20261008155426_platform_expansion.sql); [activity/activity_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/activity/activity_screen.jsx) lines 219–220; [lib/supabase/audit.js](C:/Pro/geiger-forms/lib/supabase/audit.js)
- Team & Sharing screen; per-form sharing list is "Advisory" — [shared/shared_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/shared/shared_screen.jsx); [sections/access.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/access.jsx) line 173
- Folders are form categories, with the folder list kept in workspace settings — [folders/folders_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/folders/folders_screen.jsx) line 123
- Workspace settings (persisted in `forms.workspace_settings`): workspace, new-form defaults (status), branding defaults, notifications, API keys, GDPR erasure — [settings/settings_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/settings/settings_screen.jsx) lines 110, 216, 245–376
- Billing: no billing UI or code in Forms; only the `forms.billing.manage` key. Billing entitlements are planned in Dash ("Paid beta — Notes/Flow/Forms … billing entitlements wired in Dash") — [geiger-rbac.config.js](C:/Pro/geiger-forms/geiger-rbac.config.js) line 100; [C:/Pro/SALES-PLAYBOOK.md](C:/Pro/SALES-PLAYBOOK.md) line 47

### Inferences
- Admin and governance are unusually strong for a form builder at this stage (custom roles, field-level access logs). SSO and billing depend on suite work in Dash.

### Gaps
- There is no server-side auth gate for workspace pages: no `middleware.js`/`proxy.js`, and no redirect in [app/project/[projectId]/layout.js](<C:/Pro/geiger-forms/app/project/[projectId]/layout.js>). Protection relies on RLS, so an unauthenticated visitor sees empty screens rather than a login redirect.

## Trust / Compliance: RLS, auth, residency, encryption, GDPR, consent

### Takeaway
**[WORKING]**:
- RLS locked down and applied (anon has no direct access; RBAC-scoped policies)
- public traffic goes through service-role server routes
- AES-256-GCM field encryption for "sensitive" fields with masked display and logged reveals **[ENV-GATED]**
- IP stored only as a hash; an anonymous mode
- per-form retention with a daily purge (rows and files)
- GDPR erasure by email

**[UI-ONLY]**: data residency, the HIPAA checklist and BAA (informational copy only).

**[ABSENT]**: GDPR subject-access export and a dedicated consent field type.

### Cited Findings
- The lockdown migration is applied (db:status: `20261008155427_lock_down_rls.sql` applied 2026-10-08). The migration header says: "anon loses all direct access. Public filling goes through the app's server routes (service role)" — [lock_down_rls.sql](C:/Pro/geiger-forms/supabase/migrations/20261008155427_lock_down_rls.sql)
- RLS caveats — [lock_down_rls.sql](C:/Pro/geiger-forms/supabase/migrations/20261008155427_lock_down_rls.sql) lines 12–100:
  - `forms.can_form` lets "legacy unscoped forms" (project_id null) be used by **any signed-in user**
  - workspace tables allow `project_id is null` rows to any authenticated user
  - project rows require `rbac_allows`
- `forms.forms.project_id` is a "soft uuid link (no FK)", which departs from the conventions — [20260711205607_forms.sql](C:/Pro/geiger-forms/supabase/migrations/20260711205607_forms.sql) lines 28–30
- Encryption: "Answers are encrypted with AES-256-GCM before they're stored, masked in the inbox, and only revealed on request (which is logged)". The key is `FORMS_ENCRYPTION_KEY`, and the reveal route logs to `access_log` — [sections/security.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/security.jsx) line 67; [lib/server/crypto.js](C:/Pro/geiger-forms/lib/server/crypto.js) lines 72, 115; [api/responses/:id/reveal](<C:/Pro/geiger-forms/app/api/responses/[id]/reveal/route.js>)
- Encrypted answers stay masked in webhooks and API responses (`maskEncrypted`) — [lib/server/side-effects.js](C:/Pro/geiger-forms/lib/server/side-effects.js); [lib/server/api-keys.js](C:/Pro/geiger-forms/lib/server/api-keys.js)
- Retention: per-form `retentionDays`; the daily cron deletes files, then calls `forms.purge_expired_responses()` (hard-deletes responses and partials) — [api/cron/retention](C:/Pro/geiger-forms/app/api/cron/retention/route.js); [platform_expansion.sql](C:/Pro/geiger-forms/supabase/migrations/20261008155426_platform_expansion.sql) lines 269–290
- GDPR erasure: `POST /api/workspace/erase` hard-deletes a respondent's responses, partials, bookings and files across forms the caller may delete from, and logs an email hash — [app/api/workspace/erase/route.js](C:/Pro/geiger-forms/app/api/workspace/erase/route.js)
- No subject-access "export everything for this email" endpoint or UI exists; the retention screen has no export/download — grep of [retention_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/security/retention_screen.jsx) **[ABSENT]**
- Anonymous mode drops IP hash, user agent and user id — [lib/server/submit.js](C:/Pro/geiger-forms/lib/server/submit.js); [sections/access.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/access.jsx) line 168
- Data residency is informational ("live in the suite's Supabase project, in the region it was created in… Moving regions means migrating the Supabase project") — [retention_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/security/retention_screen.jsx) lines 306–312
- HIPAA: a readiness and safeguards checklist. The product says it "is not itself a certified product" and advises a BAA with Supabase — [security/hipaa_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/security/hipaa_screen.jsx) lines 32, 143, 162–170
- Consent is handled through the attestation checkbox and policy acknowledgement (timestamped, typed name, scroll proof). There is no dedicated consent or GDPR checkbox field type — [lib/server/submit.js](C:/Pro/geiger-forms/lib/server/submit.js); [lib/forms/field-types.js](C:/Pro/geiger-forms/lib/forms/field-types.js)
- Other hardening — [lib/server/submit.js](C:/Pro/geiger-forms/lib/server/submit.js); [lib/forms/export.js](C:/Pro/geiger-forms/lib/forms/export.js):
  - body-size limits
  - upload paths verified as form-owned
  - redirect URLs limited to http/https
  - CSV formula-injection escaping

### Inferences
- The compliance feature set (field encryption, reveal logs, retention, erasure) is enterprise-grade relative to Tally, Typeform and Google Forms. Certifications and residency choice depend on hosting, which matters for "HIPAA without the enterprise tax" positioning.

### Gaps
- I could not verify which env keys are set in production (I did not read .env, to avoid exposing secrets). Encryption, email, Stripe and captcha may be inactive in a given deployment.

## Sidebar nav and registry: real screens vs ComingSoon fallbacks

### Takeaway
The sidebar lists 37 views (Overview plus 9 groups). Routing is a `switch` in `forms-workspace.jsx`; there is no `registry.jsx`, so MODULE_CONVENTIONS is stale on this point. 33 views render real screens, often the same component with a focus prop. Only the 4 AI views fall back to ComingSoonScreen.

### Cited Findings
- Sidebar nav — [components/internal/sidebar/sidebar_nav.js](C:/Pro/geiger-forms/components/internal/sidebar/sidebar_nav.js):
  - Overview
  - Form Builder: All Forms, Version History
  - Responses: Response Inbox, Data Tables & Views, Bulk Actions, Partial/Abandoned, Export & Sync, Retention & GDPR
  - Analytics: Dashboard, Funnel & Drop-off, Source & Attribution, A/B Testing, Reports, Survey Reporting
  - AI: AI Form Generation, AI Response Analysis, AI Fill Assist, AI Moderation
  - Integrations: Webhooks, REST/API
  - Collaboration: Team & Sharing, Roles & Permissions, Real-time Co-editing, Response Comments, Activity & Audit
  - Security & Compliance: Spam & Abuse, Data Protection & GDPR, Access Control (SSO/RBAC), HIPAA & Certifications
  - Templates & Admin: Template Gallery, Folders, Archived, Workspace Settings
  - Developer: Hooks & Events, Headless/API-first, Data Front-end
- `AI_VIEWS` = ai.generate, ai.analysis, ai.assist, ai.moderation, with the comment "until then they render ComingSoonScreen"; every other id is in `BUILT_VIEWS` — [sidebar_nav.js](C:/Pro/geiger-forms/components/internal/sidebar/sidebar_nav.js) lines 144–150
- Router mapping — [components/forms/forms-workspace.jsx](C:/Pro/geiger-forms/components/forms/forms-workspace.jsx) lines 36–94:
  - Responses, responses.tables, responses.bulk, responses.export → ResponsesScreen (focus/layout props)
  - responses.partial → PartialsScreen
  - responses.retention and security.gdpr → RetentionScreen
  - Analytics, dropoff, attribution, abtest → their own screens
  - analytics.reports and survey.reporting → ReportsScreen
  - collab.activity → ActivityScreen
  - collab.comments → CommentsScreen
  - collab.roles and security.access → RolesScreen
  - security.spam → SpamScreen
  - security.hipaa → HipaaScreen
  - Templates, Folders, Shared, Archived, Settings, Forms → their own screens
  - dev.hooks, dev.headless, dev.frontend, integ.api, integ.webhooks → DeveloperScreen tabs
  - builder.versions and collab.realtime → FeatureHubScreen (per-form usage list that deep-links into the builder)
  - default → ComingSoonScreen
- AI ComingSoon copy promises:
  - generate: "Describe a form in plain language…"
  - analysis: "Summaries, themes, and sentiment across free-text answers"
  - assist: "Help respondents phrase long answers and fill structured fields from pasted text"
  - moderation: "Flag abusive, spammy, or off-topic free-text answers"
  
  Source: [coming_soon_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/coming-soon/coming_soon_screen.jsx) lines 10–15
- The per-form editor has 27 sections in 8 nav groups — [form_sections.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/form_sections.jsx):
  - Overview, Details
  - Build: Canvas, Layout & Columns, Fields, Logic & Scoring, Preview & Test
  - Design: Themes, Welcome & Ending, Branding, Localization
  - Flow: Multi-step Pages, Save & Resume, Submission Rules
  - Payments: Gateways, Order Builder, Coupons
  - Sharing: Publish, Embed, Share & Send
  - Workflow: Approvals, Automations, Document Template
  - Settings: Notifications, Access & Sharing, Security & Compliance, Integrations
- The "Build" sections are read-only summaries that hand off to the builder ("Read-only structure summaries; the builder is where structure is edited") — [sections/structure.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/forms/sections/structure.jsx) line 20
- Conventions reference `registry.jsx` and `SCREEN_REGISTRY`, but no such file exists (grep: only the Coming Soon import in forms-workspace) — [MODULE_CONVENTIONS.md](C:/Pro/geiger-forms/MODULE_CONVENTIONS.md)

### Inferences
- Several nav entries are views of the same screen (for example 4 inbox entries share ResponsesScreen). The nav is partly a feature catalogue for marketing breadth rather than 37 distinct tools.

### Gaps
- None.

## Database tables/columns (schema `forms`) and data-layer modules

### Takeaway
There are 15 product tables in `forms` plus the migration ledger, the shared `public.roles` table, a private storage bucket and 7 functions. The browser data layer has 13 modules in `lib/supabase/`. A separate server layer of 17 modules in `lib/server/` uses the service role for public and API traffic.

### Cited Findings
- `forms.forms`: id, project_id (soft, no FK), created_by, slug unique, title, description, status (Draft/Published/Archived), category, tags[], schema jsonb (fields), settings jsonb, response_count, created_at, updated_at, published_at. Later columns: deleted_at, is_template, metadata — [20260711205607_forms.sql](C:/Pro/geiger-forms/supabase/migrations/20260711205607_forms.sql) lines 26–45; [platform_expansion.sql](C:/Pro/geiger-forms/supabase/migrations/20261008155426_platform_expansion.sql) lines 28–30
- `forms.responses`: id, form_id, answers jsonb, respondent_name/email, status, priority, score, submitted_at, user_agent, completion_ms. Later columns: tags[], assignee, outcome, metadata, approval jsonb, respondent_user_id, edit_token (unique), edited_at, payment_status/amount/currency/ref, updated_at, deleted_at — [forms.sql](C:/Pro/geiger-forms/supabase/migrations/20260711205607_forms.sql) lines 47–59; [collaboration.sql](C:/Pro/geiger-forms/supabase/migrations/20260711205608_collaboration.sql) line 36; [platform_expansion.sql](C:/Pro/geiger-forms/supabase/migrations/20261008155426_platform_expansion.sql) lines 34–57
- Other tables — [collaboration.sql](C:/Pro/geiger-forms/supabase/migrations/20260711205608_collaboration.sql); [adopt_rbac.sql](C:/Pro/geiger-forms/supabase/migrations/20260907120000_adopt_rbac.sql); [platform_expansion.sql](C:/Pro/geiger-forms/supabase/migrations/20261008155426_platform_expansion.sql) lines 84–242:
  - `forms.versions`, `forms.comments`
  - `forms.role_grants`
  - `forms.partials`, `forms.form_events`, `forms.saved_views`
  - `forms.activity`, `forms.access_log`, `forms.workspace_settings`
  - `forms.api_keys`, `forms.webhook_deliveries`, `forms.rate_limits`, `forms.bookings`
  - `public.roles`
  - ledger `forms.geiger_migrations`
- Functions: `forms.touch_updated_at`, `sync_response_count`, `merge_settings` (shallow-merge RPC), `hit_rate_limit`, `purge_expired_responses`, `rbac_ensure_membership`, `rbac_allows`, `can_form`. Private storage bucket `forms-uploads` — same migrations
- The first two migrations were imported legacy files with no `@down` (irreversible) — [20260711205607_forms.sql](C:/Pro/geiger-forms/supabase/migrations/20260711205607_forms.sql) line 2
- Browser data layer (`lib/supabase/`) — [lib/supabase/](C:/Pro/geiger-forms/lib/supabase/forms.js):
  - forms.js: listForms, getFormBySlug, getFormById, getPublishedFormBySlug, createForm, updateForm, mergeFormSettings, saveFormBySlug, setFormStatus, deleteForm, duplicateForm
  - responses.js: listResponses, getResponse, updateResponse, updateResponseStatus, updateResponses, retagResponses, deleteResponses, eraseRespondent, summarizeResponses, listFormEvents, listPartials
  - versions.js, comments.js, comment_feed.js
  - saved_views.js, audit.js, api_keys.js
  - rbac.js, workspace_settings.js
  - user.js, client.js, activity.js (fetch-activity tracking)
- Schema-scoped client helper `schemaClient()` — [supabase/components/forms-client.js](C:/Pro/geiger-forms/supabase/components/forms-client.js)
- Server layer (`lib/server/`): submit, side-effects, public-form, forms, auth, workspace, api-keys, crypto, email, flow, webhooks, stripe, booking, storage, http, supabase-admin — [lib/server/](C:/Pro/geiger-forms/lib/server/submit.js)
- Hooks: use-forms, use-responses, use-versions, use-comments, use-workspace-url — [lib/hooks/](C:/Pro/geiger-forms/lib/hooks/use-forms.js)
- Seeds: a demo form; "Geiger Summit 2026 — Registration" showcase covering every field type and settings group; a large Notes workspace seed — [supabase/seeds/](C:/Pro/geiger-forms/supabase/seeds/demo/geiger_forms_showcase.sql); commit 0ff0af6

### Inferences
- Form structure lives as a jsonb document (`schema.fields`) with settings in jsonb. That enables fast iteration and a "Forms as database front-end" story, but there are no per-field relational columns for cross-form querying.

### Gaps
- None material.

## Recent direction: git history and planning docs

### Takeaway
There are 24 commits in total. Recent work (Sept–Oct 2026) is platform hardening and suite alignment: @geiger/ui, @geiger/rbac, @geiger/orm migrations, /project routing, LogoLoading, a prerendered shell, SuiteHeader, then the Design section, live playground and light mode on 2026-10-18. Planning positions Forms as the suite's "distribution surface" competing with Typeform and Google Forms. AI, a Typeform importer, custom domains and white-label, and corporate/ops readiness are the stated next bets.

### Cited Findings
- `git log --oneline` shows these 24 commits, newest first:
  - 0ff0af6 Design section, live playground and light-mode screens
  - 5784112 adopt @geiger/ui shell and primitives
  - e60a3ca SuiteHeader on landing
  - 1cd2083 project shell as prerendered static route
  - 8ed3b11 / 893a3da / 8f85766 @geiger/ui bumps, LogoLoading
  - 89b07e0 /forms mount fix
  - 8e3d8a1 /project routing mirroring geiger-events
  - eb78299 adopt @geiger/rbac, @geiger/ui latest
  - dcbfef0 next 16.3.1
  - 5503dae shared screen kit, form detail screens, @geiger/orm migrations, research docs
  - f2668bd README
  - 8d391a9 light mode
  - a7dde05 hooks for comments/forms/responses/versions
  - …down to 641cd4f "Initial geiger forms app"
  
  Source: `git log` in C:/Pro/geiger-forms
- Migration ledger dates: rbac pushed 2026-09-07, platform_expansion and lock_down_rls pushed 2026-10-08 — `npm run db:status`
- Strategy doc — [research/geiger-forms-strategy.md](C:/Pro/geiger-forms/research/geiger-forms-strategy.md) lines 33–106:
  - P0 wire routes
  - P1 multi-page, embeds, spam, ~25 field types, Stripe
  - P2 AI generation, AI response analysis, conversational, surveys/quiz reporting, data tables, field drop-off
  - P3 e-sign, Flow workflow, PDF, scheduling, integrations (Sheets/Slack/Zapier)
  - P4 HIPAA, RBAC/SSO/realtime collab, custom domains and white-label
- The strategy doc's "five one-up bets":
  - "No meter, ever" (unlimited submissions on every tier)
  - suite-native workflow
  - AI that reads responses
  - forms as a real database front-end
  - compliance without the enterprise tax
  
  Source: [research/geiger-forms-strategy.md](C:/Pro/geiger-forms/research/geiger-forms-strategy.md) lines 90–106
- Status of the strategy roadmap: everything except the AI items (P2 #8–9), custom domains (P4 #21), SSO (delegated) and native Sheets is implemented in some form — cross-reference of the findings above
- FEATURES docs (Unique, Suite, Corporate, Security, Standalone) enumerate response threads, prefill, calculated summaries, revision history, respondent editing, named outcomes and auto-triage; Flow association, escalation, notifications, asset-backed files, RBAC and Grey entity population; approvals, policy acknowledgement, delegate, review windows, duplicates, offline sync, attestation and countersign; encryption, anonymisation, residency, retention, access log, phishing-resistant URLs and masking. Almost all are implemented; Grey population and residency configuration are not — [FEATURES_SUITE.md](C:/Pro/geiger-forms/FEATURES_SUITE.md), [FEATURES_CORPORATE.md](C:/Pro/geiger-forms/FEATURES_CORPORATE.md), [FEATURES_SECURITY.md](C:/Pro/geiger-forms/FEATURES_SECURITY.md), [FEATURES_UNIQUE.md](C:/Pro/geiger-forms/FEATURES_UNIQUE.md), [FEATURES_STANDALONE.md](C:/Pro/geiger-forms/FEATURES_STANDALONE.md)
- GTM positioning — [C:/Pro/GTM-STRATEGY.md](C:/Pro/GTM-STRATEGY.md) lines 19, 35, 53–59:
  - "Forms — form builder, responses, analytics, collaboration | Typeform, Google Forms | Distribution surface — every form is an ad"
  - suite positioning: "open source and self-hostable", "craft of a creative tool"
  - Forms is the expansion product for community organisers (speaker/vendor intake) and creative studios (client intake)
  - corporate ops "Enter through Forms + Flow"
- Sales timing: "Paid beta — Notes/Flow/Forms … ~Oct–Nov 2026", gated on a security gate plus billing in Dash. Corporate ICP-4 (Forms + Flow + Chat) is "sell last, ~2027" and needs enforced auth/RBAC, audit logs, light theme and admin UI — [C:/Pro/SALES-PLAYBOOK.md](C:/Pro/SALES-PLAYBOOK.md) lines 28–30, 46–49
- Suite plans that touch Forms — [C:/Pro/ADD-REMOVE.md](C:/Pro/ADD-REMOVE.md) lines 41, 57–59, 75–77, 91; [C:/Pro/OVERALL-IMPROVEMENT.md](C:/Pro/OVERALL-IMPROVEMENT.md) lines 15, 30:
  - a unified project spine
  - suite-wide command-K search including form responses
  - import tools including Typeform
  - basic export, API and webhooks
  - Forms is in the GA-2027 core six (Dash, Notes, Events, Flow, Forms, Chat)
  - each project contributes an "intake form (Forms)" facet
  - delete local components/ui copies; Forms no longer has `components/ui/` in its file tree, so this appears done

### Inferences
- The corporate-readiness prerequisites listed in SALES-PLAYBOOK (RBAC, audit logs, light theme, admin/settings UI) now largely exist in Forms. What remains gated is suite-level auth and billing.
- The likely next feature fronts: @geiger/ai integration for the 4 AI views, importers, design depth, custom domains, and more cross-suite hooks.

### Gaps
- I did not map which commit introduced the large `lib/server/` and API surface. The commit list has no message naming it; it likely arrived within 5503dae, eb78299 or 5784112.

## Suite context and AI code status

### Takeaway
The suite spans about 12 product repos plus shared packages; one-line descriptions are below. There is **no AI or provider code in Forms**. Only nav labels and ComingSoon copy mention AI, and `package.json` has no AI SDK. This confirms the memory note that AI will ship through a shared `@geiger/ai` package.

### Cited Findings
- AI check:
  - A grep for openai, anthropic, @ai-sdk, llm, gpt-, gemini or @geiger/ai across app/components/lib/context/package.json only matches sidebar_nav.js, coming_soon_screen.jsx and forms-workspace.jsx (labels and placeholder).
  - Dependencies include no AI packages — [package.json](C:/Pro/geiger-forms/package.json)
  - The ComingSoon copy says: "AI features across the Geiger suite are delivered by one shared package, @geiger/ai" — [coming_soon_screen.jsx](C:/Pro/geiger-forms/components/internal/screens/forms/coming-soon/coming_soon_screen.jsx)
- Shared packages Forms uses: @geiger/ui (component library), @geiger/rbac (authorization), @geiger/orm (migrations). Forms does **not** use @geiger/notify (it writes `flow_notifications` directly) — [package.json](C:/Pro/geiger-forms/package.json); [lib/server/flow.js](C:/Pro/geiger-forms/lib/server/flow.js)
- Sibling apps (from their READMEs):
  - Geiger Flow: "Plan and track work. Projects, issues, tasks, milestones, objectives, and goals" — [C:/Pro/geiger-flow/README.md](C:/Pro/geiger-flow/README.md)
  - Geiger Notes: "A visual, free-form canvas for notes, diagrams, and thinking out loud — solo or with your team, live" — [C:/Pro/geiger-notes/README.md](C:/Pro/geiger-notes/README.md)
  - Geiger Events: "A modern event platform for communities and small organisers… pages, fast ticketing, social momentum, and reliable check-in" — [C:/Pro/geiger-events/README.md](C:/Pro/geiger-events/README.md)
  - Geiger Comms: "A shared inbox with AI assistance, routing, SLAs, and a help centre", plus a messenger SDK (@geiger/comms-widget) — [C:/Pro/geiger-comms/README.md](C:/Pro/geiger-comms/README.md); [C:/Pro/geiger-comms-widget/README.md](C:/Pro/geiger-comms-widget/README.md)
  - Geiger Campaign: "Audience, email, SMS, WhatsApp, automations, and deliverability — the whole lifecycle marketing stack" — [C:/Pro/geiger-campaign/README.md](C:/Pro/geiger-campaign/README.md)
  - Geiger Dash: "The marketing site, the account system, and the routing hub that stitches every Geiger product into one experience at one domain" — [C:/Pro/geiger-dash/README.md](C:/Pro/geiger-dash/README.md)
  - Geiger Content: "A headless CMS with structured modelling, editorial workflow, API delivery, and personalisation" — [C:/Pro/geiger-content/README.md](C:/Pro/geiger-content/README.md)
  - Geiger Property: "Properties, tenants, leasing, maintenance, and accounting" — [C:/Pro/geiger-property/README.md](C:/Pro/geiger-property/README.md)
  - Geiger Pods: "The Geiger API gateway product. Phase 0…" — [C:/Pro/geiger-pods/README.md](C:/Pro/geiger-pods/README.md)
  - @geiger/notify: "Cross-app notifications for the Geiger suite" — [C:/Pro/geiger-notify/README.md](C:/Pro/geiger-notify/README.md)
  - @geiger/ui: "The shared component library of the Geiger suite" — [C:/Pro/geiger-ui/README.md](C:/Pro/geiger-ui/README.md)
  - Geiger Assets: no README description (default create-next-app README). Forms writes uploads into its `assets.assets` table, which implies a digital-asset library — [C:/Pro/geiger-assets/README.md](C:/Pro/geiger-assets/README.md); [lib/server/side-effects.js](C:/Pro/geiger-forms/lib/server/side-effects.js)
  - Geiger Grey: no README and minimal package.json; purpose undetermined. FEATURES_SUITE.md plans "Grey Entity Population from Responses" — [C:/Pro/geiger-grey/package.json](C:/Pro/geiger-grey/package.json); [FEATURES_SUITE.md](C:/Pro/geiger-forms/FEATURES_SUITE.md)
- Suite roadmap status: "Suite (GA 2027): Dash · Notes · Events · Flow · Forms · Chat… Paused/absorbed: Campaign (rescoped, later), Content (paused), Comms (→Chat), Docs (→Dash), Property (parked), Pods (archived)" — [C:/Pro/ADD-REMOVE.md](C:/Pro/ADD-REMOVE.md) lines 91–93

### Inferences
- The obvious adjacent-feature recommendations have ready sibling surfaces:
  - Events: registration and ticket forms
  - Campaign: audience sync and email distribution of forms
  - Comms: a support-ticket form feeding the shared inbox
  - Notes: a response-to-canvas board
  - Dash: billing, SSO and cross-suite search
  - Notify: replace the direct `flow_notifications` writes
  
  ADD-REMOVE marks Comms, Campaign and Content as absorbed or paused, so the Flow, Events and Notes hooks align best with the GA-2027 core.

### Gaps
- I could not determine Geiger Grey's or Geiger Assets' product scope from their repos. "Chat", named in GTM docs, does not appear as a separate repo in C:/Pro; per ADD-REMOVE, Comms is being folded into Chat.
