# Module Conventions (Screen ↔ Suite)

How to build a workspace screen (navigation, data, UI, permissions) so it matches
the rest of the app. Reference implementation: the **forms** area
(`components/internal/screens/forms/forms`, `components/internal/screens/forms/overview`)
and the shared kit (`@geiger/ui/screen-kit` plus `components/internal/shared`).

## Where things go

| Concern | Location | Naming |
|---|---|---|
| Workspace screen | `components/internal/screens/forms/<area>/<name>_screen.jsx` | snake_case file, `*Screen` export |
| Screen ↔ nav wiring | `components/forms/forms-workspace.jsx` | `renderActiveScreen` switch on the nav `id` |
| Sidebar nav entries | `components/internal/sidebar/sidebar_nav.js` | `id` is the routing key; `title` is display-only |
| Shared screen primitives | `@geiger/ui/screen-kit` (suite library) | `ScreenHeader`, `StatsBar`, `DataTable`… |
| Page-width wrappers | `components/internal/shared/screen_wrappers.jsx` | `MainScreenWrapper`, `SecondaryScreenWrapper` |
| Lookups & formatters | `components/internal/screens/forms/<area>/constants.js` | status `*_MAP`, `*_FILTER_OPTIONS`, `formatRate`/`formatCount` |
| shadcn primitives | `@geiger/ui/*` (shared suite library) | `import { Button } from "@geiger/ui/button"` (file inputs: `@geiger/ui/file-input`) |
| Permissions catalog | `geiger-rbac.config.js` (re-exported by `lib/rbac.js`) | `WORKSPACE_PERMISSIONS`, `forms.<scope>.<action>` keys |
| Supabase client | `lib/supabase/client.js`, `supabase/components/forms-client.js` | `createClient()` (browser, activity-tracked), `schemaClient()` (pinned to `forms`) |
| Data layer (per area) | `lib/supabase/<area>.js` + `lib/hooks/use-<area>.js` | `list*/get*/create*/update*/softDelete*`, `normalize*/toRow` |
| Respondent uploads | `lib/server/storage.js` (server-only) | private `forms-uploads` bucket, `forms/<formId>/` prefix, path persisted |
| Signed-in user | `lib/supabase/user.js` | `getUser()` → stamps `created_by` and authorship |
| SQL (when persisted) | `supabase/migrations/<version>_<name>.sql` | `<schema>.<table>`, idempotent + self-contained DDL |
| Migrations | `@geiger/orm` (`npm run db:push`) | timestamped `@up`/`@down` SQL, ledgered in `<schema>.geiger_migrations` — see `MIGRATION_CONVENTIONS.md` |
| Re-runnable data | `supabase/seeds/**.sql` | idempotent inserts, `npm run db:seed`, never ledgered |
| Environment | `.env` | `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` (runtime), `SUPABASE_SERVICE_ROLE_KEY` (server routes), `STRING_URI` (migrations) |

Screen files use snake_case names (builder and filler files under `components/forms/`
use kebab-case); React components are PascalCase; permission keys are
dot-namespaced (`forms.overview.view`, `forms.team.invite`). All imports use the
`@/` root alias.

## Screens & navigation

- A screen is a `"use client"` component exporting a named `*Screen` (and a
  matching default). It renders inside a width wrapper — `MainScreenWrapper` for
  primary list/overview screens, `SecondaryScreenWrapper` for narrower
  detail/settings screens.
- **Wire it through the workspace switch, never by ad-hoc routing.** Add a `case`
  to `renderActiveScreen` in `components/forms/forms-workspace.jsx` keyed by the
  **exact** nav `id` from `sidebar_nav.js`. In the `default` branch,
  `DEVELOPER_VIEWS` ids open the developer hub and ids listed in
  `catalog/feature_map.js` open a `FeatureHubScreen`; only `AI_VIEWS` reach
  `ComingSoonScreen`. `BUILT_VIEWS` is every other nav id.
- **Per-entity features are editor sections, not top-level screens.** Access,
  payments, notifications, sharing, workflow, etc. live as sections of the form
  editor (`forms/form_detail.jsx`, grouped in `forms/form_sections.jsx`, one file
  per section under `forms/sections/`), reached by selecting a row in All Forms —
  they do **not** get their own switch case. Only workspace-level views
  (Overview, All Forms, Responses, Templates…) are wired.
- A list screen swaps to its detail screen by reading the open entity id from the
  URL (`?form=<id>&section=<key>` via `useWorkspaceUrl()`, opened with
  `openForm(id, section)`), resolving it against the fetched rows, and
  early-returning the detail component (`<FormDetailScreen … onBack={…} />`) —
  there is no separate route/page push, but the id lives in the URL so a
  refresh/deep-link stays on it.

## Data layer

Screens are **data-layer-first**: the per-area module in `lib/supabase/<area>.js`
is the single source of truth for rows. **Do not seed screen state from a static
in-file array** (`useState(EVENTS)`) and **do not keep mock row data in the
component file** — fetch the real rows from the data layer instead.

- A screen starts **empty** (`useState([])`) with a `loading` flag, fetches via
  `list*()`/`get*()` in a mount effect, and renders a **loading** state, then the
  rows (or an **empty** state when there are none). No static seed array.
- Keep only **constants** in the area's `constants.js` — status/type `*_MAP`
  lookups, `*_FILTER_OPTIONS`, and `formatDate`/`currency` formatters. These are
  config, not data; never put row data there.
- Derive everything else with `useMemo` over the fetched rows — filtered lists,
  KPI stats, grouped views — keyed on `(rows, search, filters)`.
- Mutations are **optimistic**: update local state immediately, persist through
  the data layer, and `toast.error` + reconcile only if the write fails. Mint a
  real UUID up front (`crypto.randomUUID()`) for the optimistic row so it matches
  the inserted DB row.
- Talk to Supabase only through `createClient()` from `@/lib/supabase/client` (a
  browser client whose `fetch` is wrapped for activity tracking — don't construct
  a raw client), or its `forms`-scoped `schemaClient()` from
  `@/supabase/components/forms-client`. The DB is snake_case; the UI is camelCase — map at that boundary
  and keep the screen rendering camelCase view models. Keep data access pure
  (validate, `console.error` on failure, return `null`/`false`/`[]`); the screen
  decides UX (toasts). See **Persistence (Supabase)** below for the full pattern.

## Persistence (Supabase)

The data layer is the source of truth for every screen — see **`SUPABASE_CONVENTIONS.md`**
for the full data-layer playbook (client, `normalize`/`toRow`, RLS, metadata bag);
this is the screen-side summary. Schema changes have their own playbook in
**`MIGRATION_CONVENTIONS.md`**. Reference: `lib/supabase/forms.js` with its
`lib/hooks/use-forms.js` hook, `supabase/migrations/`, and the load in
`forms/forms_screen.jsx`. (`forms.js`, `responses.js`, `versions.js` and most
other data files don't follow the tri-state contract below — they **throw** on error;
their `lib/hooks/use-<area>.js` hook catches it and exposes `error` for the
screen's `ErrorState`. `lib/supabase/rbac.js` follows the contract.)

### Three clients, three paths

- **Runtime (browser):** `createClient()` from `@/lib/supabase/client` — the
  anon client, `fetch` wrapped for activity tracking. Every data-layer call first
  checks `isSupabaseConfigured()` (both `NEXT_PUBLIC_SUPABASE_URL` and
  `_ANON_KEY` present); missing env degrades to "no DB", never crashes.
- **Server routes:** `formsAdmin()` from `lib/server/supabase-admin.js` — the
  service-role client (`SUPABASE_SERVICE_ROLE_KEY`, **server-only**). The public
  filler, uploads, webhooks and REST v1 go through `app/api` on it; anon has no
  direct table access.
- **Migrations (Node):** `@geiger/orm` connects over `STRING_URI` (direct Postgres,
  **server-only**, never `NEXT_PUBLIC_`). `npm run db:push` applies every pending
  `supabase/migrations/<version>_<name>.sql` in version order and records it in
  `<schema>.geiger_migrations`; applied files are skipped. `npm run db:rollback`
  undoes the last push. The Supabase project is **shared across the suite**, so each
  app keeps its ledger in its own schema. Never edit an applied migration and never
  run DDL by hand — see `MIGRATION_CONVENTIONS.md`.

### Data-layer module shape (`lib/supabase/<area>.js`)

- `"use client"`; a `TABLE` const; `isSupabaseConfigured()` guard on every call.
- `normalize<Entity>(row)` maps snake → camel, **defaults every field**, and
  spreads the `metadata` bag last so promoted keys surface as first-class fields.
- `toRow(input)` maps camel → snake and **emits a column only when its key is
  present in `input`**, so one `update*` serves both a full-form save and a
  single-field inline edit (`{ status }`, `{ visibility }`). Empty-string
  dates/times → `null`; numerics coerced.
- CRUD surface: `list*` / `get*` / `create*` / `update*` / `softDelete*`, plus
  per-area extras (`list*By*`, `update*Meta`). `create*` honors a
  **caller-supplied `id`** so the optimistic row and the DB row share a UUID.
- **Tri-state return contract** the screen branches on — keep it exact:
  - `null` → not configured **or** read failed ⇒ screen renders its empty state
    (and may `toast.error` on a failure)
  - `[]` → configured, no rows ⇒ empty state
  - object / `true` → success;  `false` → a write failed
- Pure: validate, `console.error` on failure, **never throw, never toast**.

### List-screen load pattern

Fetch from the data layer; there is no static seed:

1. Start empty with a loading flag: `useState([])` + `useState(true)` for
   `loading`. Render a loading state until the first fetch resolves.
2. On mount, call `list*()`; `setRows(result ?? [])` and clear `loading`. A
   `null`/`[]` result renders the **empty** state.
3. Mutations update local state **optimistically**, then persist through the data
   layer; `toast.error` and reconcile (re-fetch or roll back) only if the write
   returns falsy. Mint the optimistic row's id with `crypto.randomUUID()` and pass
   it to `create*` so the optimistic row and the inserted row share a UUID.
4. The open entity lives in the **URL** (`?form=<id>` via `useWorkspaceUrl()`),
   not plain state, so refresh/deep-link stays on it.
5. Stamp `createdBy` from `getUser()` (`lib/supabase/user.js`) where a table
   records ownership.

### SQL / DDL (`supabase/migrations/<version>_<name>.sql`)

**`MIGRATION_CONVENTIONS.md` is the full playbook** — scaffolding, `@up`/`@down`,
idempotency, drift, rollback, seeds. What matters to a screen:

- Tables live in the **product's own schema** (`<schema>.<table>` — no `flow_`
  prefix, not in `public`). Standard columns:
  `id uuid primary key default gen_random_uuid()`,
  `metadata jsonb not null default '{}'::jsonb`, `created_by uuid` (plain, no FK),
  `created_at`/`updated_at timestamptz not null default now()`, and
  `deleted_at timestamptz` for **soft delete** (lists filter `deleted_at is null`).
- Each file is **self-contained + idempotent** and ships an `@down`. Scaffold it
  with `npm run db:new -- <name> --template table`; never hand-name a file, never
  edit one that has already been pushed.
- `metadata jsonb` is the **expansion bag** — store not-yet-promoted config there;
  promote to a real column once it needs indexing, constraints, or its own RLS.
  A form's per-section config lives in `forms.forms.settings`, and editor saves go
  through a **shallow-merge RPC** (`forms.merge_settings(p_id, p_patch)` →
  `settings || patch`, called by `mergeFormSettings`) so one section never
  clobbers another.
- **RLS on.** `20261008155427_lock_down_rls.sql` replaced the demo-open policies
  with ones scoped by `forms.rbac_allows`, and anon has no direct access;
  tightening further is a **new** migration.
- **Demo rows are seeds, not migrations** — `supabase/seeds/`, `npm run db:seed`,
  idempotent `insert … on conflict … do …` with stable keys so shared links
  resolve (`demo_form.sql` backs `/form/demo`). The screen never depends on the
  seed; an empty table renders the empty state.

### Storage (`lib/server/storage.js`)

- Respondent files live in the private **`forms-uploads`** bucket under
  `forms/<formId>/`. The filler gets a signed upload URL from
  `/api/public/forms/<slug>/upload` and the answer stores the **path**, not a
  public URL.
- Downloads go through `/api/responses/<id>/file`, which redirects to a
  short-lived signed URL and writes the access log. The helpers are server-only.

## Permissions (RBAC)

UI gating is **advisory** — it hides/disables nav and controls. Data is secured
by RLS (`forms.rbac_allows`) and by server routes (`userCan` in
`lib/server/auth.js`).

- The catalog lives in `geiger-rbac.config.js` (`@geiger/rbac`), re-exported by
  `lib/rbac.js` as `WORKSPACE_PERMISSIONS` — dot-namespaced
  `{ key, label, group, scopeBy? }` entries (`forms.<view>.view` for workspace
  views, plus `forms.form.*`, `forms.response.*`, `forms.team.*`,
  `forms.role.manage`, `forms.billing.manage`, `forms.settings.manage`).
- A view's permission key derives from its nav id via `navPermissionKey(id)`
  → `forms.<slug>.view` (only ids listed in `NAV_SECTIONS` carry one). Check a
  key with `useCan(key)` (or `useRbac().can`) from `context/rbac-context.js`; it
  returns `true` while grants load and when no provider is mounted, so screens
  stay reachable by default.
- Roles live in `public.roles` (suite-wide) and grants in `forms.role_grants`,
  read through `lib/supabase/rbac.js`. To add a gated surface: add the permission
  to `geiger-rbac.config.js`, then check it where the nav/control is rendered.

## UI conventions

- **Components:** prefer the shared suite library (`@geiger/ui/*`, same as
  geiger-events) and **Lucide** icons. There is no local `components/ui/` — file
  inputs come from `@geiger/ui/file-input` too. Build screens out of the shared kit
  (`@geiger/ui/screen-kit`) before writing bespoke layout —
  `ScreenHeader`, `StatsBar`/`StatGrid`, `SectionCard`, `Toolbar` + `SearchInput`,
  `DataTable`, `StatusPill`, `EmptyState`, `SettingsList`/`SettingRow`, `Field`.
- **Screen frame:** `MainScreenWrapper` → `ScreenHeader` (title + description over
  a bottom divider, primary action on the right; **no** icon chip or badge) →
  `StatsBar` → `Toolbar` → `DataTable`. Match the Overview / All Forms rhythm.
- **Dialogs:** shadcn `Dialog` with `DialogHeader`/`DialogTitle`/`DialogDescription`,
  a `grid gap-4` of `Field`-wrapped controls, then `DialogFooter` with a ghost
  Cancel + a `bg-primary` primary action. Keep the default close button.
- **Feedback:** Sonner `toast` (`toast.success`/`toast.error`); the Toaster is
  global with `richColors` and **no close button** — don't re-add it.
- **State:** every list has loading, empty, and filtered-empty states (`EmptyState`
  with a "create/clear filters" action). Status is rendered via `StatusPill` +
  a `*_MAP` from the area's `constants.js`.
- **Colors — semantic tokens only, never hardcode hex:**
  - Surfaces: `bg-background`, `bg-surface-subtle|card|hover|active|strong`
  - Text: `text-foreground`, `text-muted-foreground`, `text-text-secondary`,
    `text-text-tertiary`
  - Borders: `border-border`, `border-border-strong`
  - Brand/primary: `bg-primary` + `text-primary-foreground`
  - Destructive: `text-red-600 dark:text-red-400` / `focus:bg-red-500/10` (delete actions)
  - Trend/status: `text-emerald-600 dark:text-emerald-400` (up) / `text-red-600 dark:text-red-400` (down); badges use
    tailwind color utilities at `/10` bg + `/20` border.

## New-screen checklist

0. **Ask before you build.** A module has too many unstated decisions to guess.
   Before writing code, ask the user about every detail you can't infer from the
   reference: the entity and its **fields/types**, the **status set** and their
   colors, which **filters/sort/search** apply, the **KPIs** for the stats bar,
   what the **detail sections** are, **create-dialog** required fields and defaults,
   **row actions** (edit/duplicate/delete…), whether it's **gated** (which
   `forms.*.view` permission), and the **persistence shape** (table columns, storage,
   RLS — the screen always reads through the data layer, never a static array).
   Confirm the scope, then build in one pass. Pick an obvious default only when
   the answer is truly inconsequential — and say which default you took.
1. Component at `components/internal/screens/forms/<area>/<name>_screen.jsx` —
   `"use client"`, `*Screen` export, wrapped in `MainScreenWrapper`/`SecondaryScreenWrapper`.
2. Add a `case` for its nav `id` to `renderActiveScreen` in `forms-workspace.jsx`
   (and the nav entry in `sidebar_nav.js` if it's new).
3. Fetch rows from `lib/supabase/<area>.js` (start empty + loading, no static
   seed); keep `*_MAP`/`*_FILTER_OPTIONS`/formatters in `constants.js`; derive
   lists/stats with `useMemo`; mutate optimistically + persist + `toast`.
4. Build the UI from the shared kit + shadcn primitives; three list states;
   semantic color tokens only.
5. (If gated) add the view to `NAV_SECTIONS` in `geiger-rbac.config.js` (its key
   is `forms.<slug>.view`) and check it with `useCan` where the nav/control renders.
