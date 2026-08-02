-- Imported from 01_forms.sql by geiger-orm.
-- No @down section — this migration cannot be rolled back.

-- @up
-- ===========================================================================
-- Geiger Forms — core schema (dedicated `forms` schema, per SUPABASE_CONVENTIONS)
-- ===========================================================================
-- Self-contained + idempotent. Runs against the shared Geiger Supabase project.
-- Forms are standalone (project_id IS NULL) or scoped to a Flow project.
--   node scripts/run-sqls.js   (npm run db:push)  — or paste into the SQL editor.
-- ===========================================================================

create extension if not exists "pgcrypto";
create schema if not exists forms;

-- Expose the schema to the API roles (matches how geiger-events grants `events`).
grant usage on schema forms to anon, authenticated, service_role;
alter default privileges in schema forms grant all on tables to anon, authenticated, service_role;
alter default privileges in schema forms grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema forms grant all on routines to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists forms.forms (
  id              uuid primary key default gen_random_uuid(),
  -- Soft uuid links (no FK): the shared projects/users tables vary across the
  -- suite and aren't required here. Promote to real FKs when auth/projects land.
  project_id      uuid,
  created_by      uuid,
  slug            text not null unique,
  title           text not null,
  description     text not null default '',
  status          text not null default 'Draft'
                    check (status in ('Draft', 'Published', 'Archived')),
  category        text,
  tags            text[] not null default '{}',
  schema          jsonb not null default '{"fields": []}'::jsonb,
  settings        jsonb not null default '{}'::jsonb,
  response_count  integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz
);

create table if not exists forms.responses (
  id               uuid primary key default gen_random_uuid(),
  form_id          uuid not null references forms.forms(id) on delete cascade,
  answers          jsonb not null default '{}'::jsonb,
  respondent_name  text,
  respondent_email text,
  status           text not null default 'Complete'
                     check (status in ('Complete', 'Needs review', 'Pending')),
  priority         text default 'Low'
                     check (priority in ('High', 'Medium', 'Low')),
  score            numeric,
  submitted_at     timestamptz not null default now(),
  user_agent       text
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists forms_project_idx
  on forms.forms (project_id, updated_at desc);
create index if not exists forms_status_idx
  on forms.forms (status, updated_at desc);
create index if not exists forms_created_by_idx
  on forms.forms (created_by) where created_by is not null;
create index if not exists forms_responses_form_idx
  on forms.responses (form_id, submitted_at desc);
create index if not exists forms_responses_answers_idx
  on forms.responses using gin (answers);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function forms.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists forms_set_updated_at on forms.forms;
create trigger forms_set_updated_at
  before update on forms.forms
  for each row execute function forms.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Keep response_count in sync with the responses table
-- ---------------------------------------------------------------------------

create or replace function forms.sync_response_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update forms.forms set response_count = response_count + 1 where id = new.form_id;
  elsif tg_op = 'DELETE' then
    update forms.forms set response_count = greatest(0, response_count - 1) where id = old.form_id;
  end if;
  return null;
end;
$$;

drop trigger if exists forms_responses_count on forms.responses;
create trigger forms_responses_count
  after insert or delete on forms.responses
  for each row execute function forms.sync_response_count();

-- Re-grant on existing objects (covers idempotent re-runs where the tables
-- already existed, so default privileges above didn't apply to them).
grant all on all tables in schema forms to anon, authenticated, service_role;
grant all on all sequences in schema forms to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security — demo open policy (no auth wired yet; mirrors geiger-events
-- and SUPABASE_CONVENTIONS). Replace with an org-scoped policy when auth lands.
-- ---------------------------------------------------------------------------

alter table forms.forms enable row level security;
alter table forms.responses enable row level security;

drop policy if exists forms_all on forms.forms;
create policy forms_all on forms.forms
  for all to anon, authenticated using (true) with check (true);

drop policy if exists responses_all on forms.responses;
create policy responses_all on forms.responses
  for all to anon, authenticated using (true) with check (true);
