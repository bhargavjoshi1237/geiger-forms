-- Imported from 02_collaboration.sql by geiger-orm.
-- No @down section — this migration cannot be rolled back.

-- @up
-- ===========================================================================
-- Geiger Forms — collaboration (versions + comments), forms schema.
-- Runs AFTER 01_forms.sql (filename order) since it references forms.forms /
-- forms.responses. Self-contained + idempotent.
-- ===========================================================================

create extension if not exists "pgcrypto";
create schema if not exists forms;

create table if not exists forms.versions (
  id          uuid primary key default gen_random_uuid(),
  form_id     uuid not null references forms.forms(id) on delete cascade,
  version     integer not null,
  label       text not null,
  author      text not null default 'You',
  notes       text not null default '',
  schema      jsonb not null default '{"fields": []}'::jsonb,
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (form_id, version)
);

create table if not exists forms.comments (
  id          uuid primary key default gen_random_uuid(),
  response_id uuid not null references forms.responses(id) on delete cascade,
  author      text not null default 'You',
  body        text not null,
  created_at  timestamptz not null default now()
);

alter table forms.responses
  add column if not exists completion_ms integer;

create index if not exists forms_versions_form_idx
  on forms.versions (form_id, version desc);
create index if not exists forms_comments_response_idx
  on forms.comments (response_id, created_at);

grant all on all tables in schema forms to anon, authenticated, service_role;
grant all on all sequences in schema forms to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security — demo open policy (tighten when auth lands).
-- ---------------------------------------------------------------------------

alter table forms.versions enable row level security;
alter table forms.comments enable row level security;

drop policy if exists versions_all on forms.versions;
create policy versions_all on forms.versions
  for all to anon, authenticated using (true) with check (true);

drop policy if exists comments_all on forms.comments;
create policy comments_all on forms.comments
  for all to anon, authenticated using (true) with check (true);
