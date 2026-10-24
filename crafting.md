# Crafting Guide — Building High-Quality Workspace Screens

This is the playbook for taking a screen from "basic table" to a polished,
fully-interactive surface that feels native to the Geiger suite. The **forms
area** is the reference build — when in doubt, open these files and copy the
pattern:

- Shared primitives: `@geiger/ui/screen-kit` (`ScreenHeader`, `DataTable`, `LoadingArea`…),
  `components/internal/shared/screen_wrappers.jsx`
- List screen: `components/internal/screens/forms/forms/forms_screen.jsx`
- Overview screen: `components/internal/screens/forms/overview/overview_screen.jsx`
- Detail editor (sectioned): `components/internal/screens/forms/forms/form_detail.jsx`
  + `form_sections.jsx`
- Data layer (source of truth): `lib/supabase/forms.js` via `lib/hooks/use-forms.js`
- Constants & lookups: `components/internal/screens/forms/forms/constants.js`
- Nav wiring: `components/forms/forms-workspace.jsx` + `components/internal/sidebar/sidebar_nav.js`
- Permissions: `geiger-rbac.config.js` (re-exported by `lib/rbac.js`)

Read `MODULE_CONVENTIONS.md` first — this guide layers craft and UX on top of
those structural rules; it does not replace them.

---

## 0. The quality bar

A screen is "done" when **every interaction a user expects already works** and it
looks like the rest of the suite. Concretely:

- Nothing is read-only that a user would reasonably want to change — create,
  edit, duplicate, delete, filter, and search all work, persisting through the
  data layer (no static in-file data).
- Every list has loading, empty, and "no results for these filters" states.
- Every action gives feedback (`toast`) and updates the UI optimistically.
- Colours are semantic tokens only — never hardcoded hex.
- Dropdowns/popovers/dialogs visibly stand out from the surface behind them.
- Reuse the shared kit and shadcn primitives before writing new layout.
- `npx eslint <changed files>` is clean before you call it done.

Scale effort to the request, but for anything described as "proper", "complete",
"interactable", or "fancy", deliver the full set above — don't ship a stub.

---

## 1. Workflow (how we work)

1. **Ask before you build a module.** A new screen/module carries decisions you
   can't read off the reference — entity fields and types, the status set and
   colors, filters/search/sort, the stat-bar KPIs, detail sections, create-dialog
   required fields + defaults, row actions, whether it's permission-gated, and
   the persistence shape (table columns + storage + RLS — the screen always reads
   through the data layer, never a static array). **Ask the user about all of
   these up front**, in one batched round, before writing code. This is the one time to ask freely — clarity here is worth more than
   speed. (Step 2's "don't over-ask" governs *implementation trivia* once scope
   is agreed, not the module's shape.)
2. **Explore before touching anything.** Read the target screen *and* the
   reference (All Forms / Overview) so new code matches existing naming,
   file layout, and idioms. Use a search agent for breadth.
3. **Plan briefly, then implement.** State a short ordered plan, then build it in
   one pass per file. Don't over-ask on trivia; pick the obvious option and note it.
4. **Edit in small, exact diffs.** Match the surrounding code's comment density
   and style. Keep imports tidy — remove an import the moment it's unused.
5. **Lint after each meaningful change:** `npx eslint <files>`. Treat unused
   imports/vars as errors to fix immediately.
6. **Don't run a build** unless the change is a significant UI modification and
   you're confident a separate build is needed to verify it (per `CLAUDE.md`).
7. **Respect user/linter edits.** If a file changed under you, re-read it and
   build on top — don't revert intentional tweaks.

---

## 2. Data & state pattern

Screens are **data-layer-first**: the per-area module in `lib/supabase/<area>.js`
owns the rows; the screen fetches them. **Never seed state from a static in-file
array or keep mock row data in the component.**

- **Fetch, don't seed.** Start empty (`const [forms, setForms] = useState([])`)
  with a `loading` flag, then load in a mount effect — in this repo that lives in
  the area's hook (`useForms()` returns `{ forms, loading, error, refresh, … }`).
  Render a loading state first, then rows, an `ErrorState`, or an `EmptyState`.
- **Derive, don't duplicate.** Compute `filtered`, KPI `stats`, and any grouped
  views with `useMemo` keyed on `(data, search, filters)`. Don't keep derived
  arrays in their own state.
- **Mutations are optimistic + persisted.** `handleCreate`/`handleDelete`/
  `handleDuplicate` update the array via `setForms(prev => …)`, mint a real UUID
  (`crypto.randomUUID()`) and pass it to `create*` so the optimistic and
  inserted rows match, then `toast`. On a falsy write result, `toast.error` and
  reconcile (re-fetch or roll back). New rows default to a sensible status
  (e.g. `"Draft"`).
- **Lift detail edits.** A list screen swaps to its detail via the URL
  (`?form=<id>`, `useWorkspaceUrl()`) and an early
  `return <FormDetailScreen … onBack={…} />`. Keep list and detail in sync
  through callbacks, not duplicate fetches.
- **Data access goes through the layer, not the screen.** Reach Supabase only via
  `createClient()` from `@/lib/supabase/client` (or its `forms`-scoped
  `schemaClient()` from `@/supabase/components/forms-client`); map snake_case ↔ camelCase inside
  `lib/supabase/<area>.js`; keep that layer pure and let the screen own toasts.
  (See `MODULE_CONVENTIONS.md` → Persistence.)

## 3. Constants & lookups

Keep value/label/colour lookups as plain data in the area's `constants.js` (these
are config, not row data — never put fetched-entity data here) and let components
own JSX:

- Status/format maps (`FORM_STATUS_MAP`, `RESPONSE_STATUS_MAP`) carry `{ label,
  variant, dotClass }` and feed `StatusPill` / `Badge`.
- Filter option lists (`STATUS_FILTER_OPTIONS`) are arrays of `{ value, label }`
  with an all-statuses sentinel (`"all"` first in responses; All Forms leads with
  `"Active"`, then `"All"`).
- Formatters (`formatRate`, `formatCount`) live beside the lookups and are imported,
  not re-implemented per screen.

---

## 4. UI craft

### 4.1 Colour & elevation hierarchy (the #1 polish lever)

The suite ships light and dark themes (dark on an `#161616`-ish canvas). Establish depth with
semantic tokens, lightest-needed surface per layer:

- **Canvas / shell:** `bg-background`.
- **Cards / panels / table shells:** `bg-surface-subtle` (the standard card
  surface — `StatsBar`, `SectionCard`, `DataTable` all use it).
- **Fields & inner controls** (`Input`, `SearchInput`, `SelectTrigger`):
  `bg-surface-card`, a touch above the panel.
- **Hover / active rows & menu items:** `bg-surface-hover` / `bg-surface-active`.
- **Dropdowns / menus** (`DropdownMenuContent`): `border-border bg-surface-subtle`
  so they read as a distinct floating surface.

Always use **semantic tokens**: `bg-background`,
`bg-surface-subtle|card|hover|active|strong`, `text-foreground`,
`text-muted-foreground`, `text-text-secondary`, `text-text-tertiary`,
`border-border`, `border-border-strong`, `bg-primary`/`text-primary-foreground`.
Trends use `text-emerald-600 dark:text-emerald-400` (up) / `text-red-600 dark:text-red-400` (down); status/severity
badges use tailwind colours at `/10` bg + `/20` border. **Never hardcode hex.**

### 4.2 Reuse before you build

Before writing anything visual, reach for the shared kit
(`@geiger/ui/screen-kit`):

- **Frame:** `ScreenHeader` (title + description + right-aligned actions),
  `MainScreenWrapper` / `SecondaryScreenWrapper`.
- **KPIs:** `StatsBar` (single divider-separated card with animated
  `RollingNumber` values) or `StatGrid`/`StatTile` (separate tiles). Each stat:
  `{ label, value, delta?, trend?, footer? }`.
- **Sections:** `SectionCard` (titled, optional action, bordered header).
- **Toolbar:** `Toolbar` + `SearchInput` + `FilterDropdown`
  (`@/components/internal/shared/filter_dropdown`).
- **Lists:** `DataTable` (columns: `{ key, header, align?, className?, render }`,
  with `getRowKey` and `onRowClick`), `StatusPill`, `EmptyState`.
- **Settings:** `SettingsList` + `SettingRow` (auto-renders a `Switch`, or takes a
  custom `control`).
- **Forms:** `Field` (label + hint wrapper) around shadcn `Input`/`Select`.

If a primitive is *almost* right, extend the kit rather than forking layout into a
screen.

### 4.3 Screen anatomy (list view)

`FormsScreen` (All Forms) is the template:

- `MainScreenWrapper` root with `ScreenHeader` (title, description, primary
  Create action that opens a `Dialog`).
- `StatsBar` of `useMemo`-derived KPIs.
- `Toolbar`: `FilterDropdown`s on the left, `SearchInput` on the right. Compute
  `filtered` with a single `useMemo` over (search, filters).
- `DataTable` with a `columns` array; rich cells via `render` (name + meta line,
  `StatusPill`, right-aligned response count, a row-actions
  `DropdownMenu`). Wrap the actions cell in a `stopPropagation` div so the menu
  doesn't trigger `onRowClick`.
- Three states: loading (until the first fetch resolves), data, and filtered-empty
  (`EmptyState` with create + clear-filters) / empty (no rows yet).
- Row click opens the entity in the URL (`?form=<id>`) → render the detail editor.

### 4.4 Detail surface (the interactive editor)

`form_detail.jsx` is the sectioned editor pattern:

- A back affordance (`onBack`) returns to the list.
- Per-entity concerns are **sections** (access, payments, notifications,
  sharing, workflow…) grouped in `form_sections.jsx` and deep-linked with
  `?section=<key>`, not separate registered screens.
- Sections edit a draft; Save persists only the changed keys (details through
  `update`, settings through the `merge_settings` shallow merge) and reflects back
  to the list via lifted callbacks. Leaving with unsaved edits asks first.

### 4.5 Interaction recipes

**Create dialog** — controlled `Dialog`, a `draft` object in state, a
`set(key)(value)` curried updater, validate on submit (`toast.error` + early
return on missing required fields), call `onCreate`, reset the draft, close:

```jsx
const [draft, setDraft] = useState(EMPTY_DRAFT);
const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
```

**Row actions menu** — `DropdownMenu` with Edit / Duplicate / View, a
`DropdownMenuSeparator`, then a destructive Delete
(`variant="destructive"`, `text-red-600 dark:text-red-400 focus:bg-red-500/10`). Stop click
propagation so it doesn't open the row.

**Animated KPI** — pass plain strings to `StatsBar`; `RollingNumber` animates the
digits on mount. Don't reinvent counters.

**Status rendering** — never inline a colour; render `<StatusPill status={…}
map={FORM_STATUS_MAP} />` and add new statuses to the map.

### 4.6 Feedback, states, a11y

- Toasts via Sonner (`toast.success`/`toast.error`) from the screen. The Toaster
  is global with `richColors` and **no close button** — don't re-add one.
- Every list/async surface shows empty (and, when async, loading) states. Buttons
  that mutate disable + show a spinner while pending.
- Icon-only buttons get `aria-label`; decorative dividers/icons are
  `pointer-events-none`.

---

## 5. New / upgraded screen checklist

1. **Component:** `components/internal/screens/forms/<area>/<name>_screen.jsx`, `"use client"`,
   `*Screen` export, wrapped in `MainScreenWrapper`/`SecondaryScreenWrapper`.
2. **Wiring:** add a `case` for its nav `id` to `renderActiveScreen` in
   `forms-workspace.jsx` (add the entry to `sidebar_nav.js` if new). Per-entity
   features become sections in the editor, not new switch cases.
3. **Data:** fetch from `lib/supabase/<area>.js` (empty + loading, no static
   seed); keep lookups/formatters in `constants.js`; derive lists/stats with
   `useMemo`; mutate optimistically + persist + `toast` (real `crypto.randomUUID()`
   ids).
4. **UI:** build from the shared kit — header, stats, toolbar, table — with three
   list states and semantic colour tokens only.
5. **Detail:** sectioned editor whose saves persist only what changed; sync back
   to the list via lifted callbacks.
6. **Permissions:** if gated, add the view to `NAV_SECTIONS` in
   `geiger-rbac.config.js` (key `forms.<slug>.view`) and check it with `useCan`
   where the nav/control renders (advisory; RLS and server routes secure the data).
7. **Lint clean** (`npx eslint`), then tell the user what (if anything) they need
   to do next.

If you follow this, the result will look and feel like the forms area — which is
the bar for this codebase.
