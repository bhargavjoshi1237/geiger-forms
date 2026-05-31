-- ===========================================================================
-- Geiger Forms — standalone schema
-- ===========================================================================
-- Run this against the shared Geiger Supabase project (the same one geiger-flow
-- uses). It is self-contained: it does NOT depend on flow_projects, so the
-- Forms app can be used on its own.
--
--   psql "$DATABASE_URL" -f supabase/sqls/forms.sql
--   -- or paste into the Supabase SQL editor.
--
-- RLS NOTE: geiger-forms does not yet wire Geiger auth, so the admin workspace
-- talks to Supabase as the anon role. The policies below are therefore
-- permissive for anon (dev phase). Once auth lands, swap the "_anon_manage"
-- policies for owner/project-scoped ones — the public read/insert policies can
-- stay as-is.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.geiger_forms (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  description  text not null default '',
  status       text not null default 'Draft'
                 check (status in ('Draft', 'Published', 'Archived')),
  category     text,
  tags         text[] not null default '{}',
  schema       jsonb  not null default '{"fields": []}'::jsonb,  -- field definitions
  settings     jsonb  not null default '{}'::jsonb,              -- builder settings
  response_count integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.geiger_form_responses (
  id               uuid primary key default gen_random_uuid(),
  form_id          uuid not null references public.geiger_forms(id) on delete cascade,
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

create index if not exists geiger_forms_status_idx
  on public.geiger_forms (status, updated_at desc);
create index if not exists geiger_form_responses_form_idx
  on public.geiger_form_responses (form_id, submitted_at desc);
create index if not exists geiger_form_responses_answers_idx
  on public.geiger_form_responses using gin (answers);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.geiger_forms_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists geiger_forms_set_updated_at on public.geiger_forms;
create trigger geiger_forms_set_updated_at
  before update on public.geiger_forms
  for each row execute function public.geiger_forms_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Keep response_count in sync with the responses table
-- ---------------------------------------------------------------------------

create or replace function public.geiger_forms_sync_response_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    update public.geiger_forms
      set response_count = response_count + 1
      where id = new.form_id;
  elsif tg_op = 'DELETE' then
    update public.geiger_forms
      set response_count = greatest(0, response_count - 1)
      where id = old.form_id;
  end if;
  return null;
end;
$$;

drop trigger if exists geiger_form_responses_count on public.geiger_form_responses;
create trigger geiger_form_responses_count
  after insert or delete on public.geiger_form_responses
  for each row execute function public.geiger_forms_sync_response_count();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.geiger_forms enable row level security;
alter table public.geiger_form_responses enable row level security;

-- Public: anyone may read a Published form (needed by the public filler).
drop policy if exists geiger_forms_public_read on public.geiger_forms;
create policy geiger_forms_public_read on public.geiger_forms
  for select using (status = 'Published');

-- Public: anyone may submit a response to a Published form.
drop policy if exists geiger_form_responses_public_insert on public.geiger_form_responses;
create policy geiger_form_responses_public_insert on public.geiger_form_responses
  for insert with check (
    exists (
      select 1 from public.geiger_forms f
      where f.id = form_id and f.status = 'Published'
    )
  );

-- Dev phase: admin workspace runs as anon. Grant it full management access.
-- Replace these two policies with owner/project-scoped rules once auth is wired.
drop policy if exists geiger_forms_anon_manage on public.geiger_forms;
create policy geiger_forms_anon_manage on public.geiger_forms
  for all to anon, authenticated using (true) with check (true);

drop policy if exists geiger_form_responses_anon_manage on public.geiger_form_responses;
create policy geiger_form_responses_anon_manage on public.geiger_form_responses
  for all to anon, authenticated using (true) with check (true);
