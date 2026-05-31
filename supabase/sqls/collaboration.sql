create extension if not exists "pgcrypto";

create table if not exists public.geiger_form_versions (
  id          uuid primary key default gen_random_uuid(),
  form_id     uuid not null references public.geiger_forms(id) on delete cascade,
  version     integer not null,
  label       text not null,
  author      text not null default 'You',
  notes       text not null default '',
  schema      jsonb not null default '{"fields": []}'::jsonb,
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  unique (form_id, version)
);

create table if not exists public.geiger_form_comments (
  id          uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.geiger_form_responses(id) on delete cascade,
  author      text not null default 'You',
  body        text not null,
  created_at  timestamptz not null default now()
);

alter table public.geiger_form_responses
  add column if not exists completion_ms integer;

create index if not exists geiger_form_versions_form_idx
  on public.geiger_form_versions (form_id, version desc);
create index if not exists geiger_form_comments_response_idx
  on public.geiger_form_comments (response_id, created_at);

alter table public.geiger_form_versions enable row level security;
alter table public.geiger_form_comments enable row level security;

drop policy if exists geiger_form_versions_anon_manage on public.geiger_form_versions;
create policy geiger_form_versions_anon_manage on public.geiger_form_versions
  for all to anon, authenticated using (true) with check (true);

drop policy if exists geiger_form_comments_anon_manage on public.geiger_form_comments;
create policy geiger_form_comments_anon_manage on public.geiger_form_comments
  for all to anon, authenticated using (true) with check (true);
