-- Platform expansion
--
-- Backs the research roadmap (research/geiger-forms-strategy.md P0–P4, FEATURES_*.md).
-- Owns: forms.partials, forms.form_events, forms.saved_views, forms.activity,
-- forms.access_log, forms.workspace_settings, forms.api_keys,
-- forms.webhook_deliveries, forms.rate_limits, forms.bookings, the private
-- `forms-uploads` storage bucket, and these functions: forms.merge_settings,
-- forms.hit_rate_limit, forms.purge_expired_responses, forms.rbac_ensure_membership,
-- plus a new body for forms.sync_response_count (it now counts soft deletes).
-- New tables stay closed to anon. Public traffic goes through the app's server
-- routes, which use the service role. Workspace tables keep the suite's demo-open
-- policy for authenticated users until 20261008155427_lock_down_rls is pushed.

-- @up
create extension if not exists pgcrypto;
create schema if not exists forms;
grant usage on schema forms to anon, authenticated, service_role;

create or replace function forms.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- forms.forms: soft delete, templates, expansion bag.
alter table forms.forms add column if not exists deleted_at timestamptz;
alter table forms.forms add column if not exists is_template boolean not null default false;
alter table forms.forms add column if not exists metadata jsonb not null default '{}'::jsonb;
create index if not exists forms_live_idx on forms.forms (project_id, updated_at desc) where deleted_at is null;

-- forms.responses: workflow, payment, edit-link, audit and soft-delete columns.
alter table forms.responses add column if not exists tags text[] not null default '{}';
alter table forms.responses add column if not exists assignee text;
alter table forms.responses add column if not exists outcome text;
alter table forms.responses add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table forms.responses add column if not exists approval jsonb not null default '{}'::jsonb;
alter table forms.responses add column if not exists respondent_user_id uuid;
alter table forms.responses add column if not exists edit_token text;
alter table forms.responses add column if not exists edited_at timestamptz;
alter table forms.responses add column if not exists payment_status text;
alter table forms.responses add column if not exists payment_amount numeric;
alter table forms.responses add column if not exists payment_currency text;
alter table forms.responses add column if not exists payment_ref text;
alter table forms.responses add column if not exists updated_at timestamptz not null default now();
alter table forms.responses add column if not exists deleted_at timestamptz;

alter table forms.responses drop constraint if exists responses_status_check;
alter table forms.responses add constraint responses_status_check
  check (status in ('Complete', 'Needs review', 'Pending', 'In progress', 'Approved', 'Rejected', 'Awaiting payment', 'Spam'));

create unique index if not exists forms_responses_edit_token_uniq on forms.responses (edit_token) where edit_token is not null;
create index if not exists forms_responses_live_idx on forms.responses (form_id, submitted_at desc) where deleted_at is null;
create index if not exists forms_responses_email_idx on forms.responses (lower(respondent_email)) where respondent_email is not null;
create index if not exists forms_responses_tags_idx on forms.responses using gin (tags);
create index if not exists forms_responses_payment_ref_idx on forms.responses (payment_ref) where payment_ref is not null;

drop trigger if exists responses_touch_updated_at on forms.responses;
create trigger responses_touch_updated_at
  before update on forms.responses
  for each row execute function forms.touch_updated_at();

-- response_count now follows soft deletes as well as inserts and deletes.
create or replace function forms.sync_response_count()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and new.deleted_at is null then
    update forms.forms set response_count = response_count + 1 where id = new.form_id;
  elsif tg_op = 'DELETE' and old.deleted_at is null then
    update forms.forms set response_count = greatest(0, response_count - 1) where id = old.form_id;
  elsif tg_op = 'UPDATE' and old.deleted_at is null and new.deleted_at is not null then
    update forms.forms set response_count = greatest(0, response_count - 1) where id = new.form_id;
  elsif tg_op = 'UPDATE' and old.deleted_at is not null and new.deleted_at is null then
    update forms.forms set response_count = response_count + 1 where id = new.form_id;
  end if;
  return null;
end;
$$;

drop trigger if exists forms_responses_count on forms.responses;
create trigger forms_responses_count
  after insert or delete or update of deleted_at on forms.responses
  for each row execute function forms.sync_response_count();

-- Partial / in-progress submissions: save & resume, abandoned capture, drop-off.
create table if not exists forms.partials (
  id             uuid primary key default gen_random_uuid(),
  form_id        uuid not null references forms.forms(id) on delete cascade,
  token          text not null unique,
  answers        jsonb not null default '{}'::jsonb,
  last_field_id  text,
  page_index     integer not null default 0,
  progress       numeric not null default 0,
  respondent_email text,
  metadata       jsonb not null default '{}'::jsonb,
  created_by     uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  completed_at   timestamptz,
  deleted_at     timestamptz
);
create index if not exists forms_partials_form_idx on forms.partials (form_id, updated_at desc) where deleted_at is null;
drop trigger if exists partials_touch_updated_at on forms.partials;
create trigger partials_touch_updated_at before update on forms.partials
  for each row execute function forms.touch_updated_at();

-- Funnel events (view → start → submit) with attribution and A/B variant.
create table if not exists forms.form_events (
  id          uuid primary key default gen_random_uuid(),
  form_id     uuid not null references forms.forms(id) on delete cascade,
  type        text not null check (type in ('view', 'start', 'submit')),
  session_id  text,
  variant     text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists forms_events_form_idx on forms.form_events (form_id, type, created_at desc);

-- Saved response views (filters + table/kanban layout).
create table if not exists forms.saved_views (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid,
  form_id     uuid references forms.forms(id) on delete cascade,
  name        text not null,
  layout      text not null default 'table' check (layout in ('table', 'kanban')),
  filters     jsonb not null default '{}'::jsonb,
  metadata    jsonb not null default '{}'::jsonb,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists forms_saved_views_idx on forms.saved_views (project_id, created_at) where deleted_at is null;
drop trigger if exists saved_views_touch_updated_at on forms.saved_views;
create trigger saved_views_touch_updated_at before update on forms.saved_views
  for each row execute function forms.touch_updated_at();

-- Workspace audit trail (form edits, publishes, status changes, submissions).
create table if not exists forms.activity (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid,
  form_id      uuid references forms.forms(id) on delete cascade,
  response_id  uuid references forms.responses(id) on delete cascade,
  actor_id     uuid,
  actor_name   text not null default 'System',
  action       text not null,
  detail       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists forms_activity_idx on forms.activity (project_id, created_at desc);
create index if not exists forms_activity_form_idx on forms.activity (form_id, created_at desc);

-- Who opened, revealed or exported which response (SECURITY #5).
create table if not exists forms.access_log (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid references forms.forms(id) on delete cascade,
  response_id  uuid references forms.responses(id) on delete cascade,
  actor_id     uuid,
  actor_name   text not null default 'Unknown',
  action       text not null check (action in ('view', 'reveal', 'export', 'print', 'edit')),
  field_id     text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists forms_access_log_response_idx on forms.access_log (response_id, created_at desc);
create index if not exists forms_access_log_form_idx on forms.access_log (form_id, created_at desc);

-- One settings row per workspace (project). A null project_id is the unscoped /forms workspace.
create table if not exists forms.workspace_settings (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid,
  settings    jsonb not null default '{}'::jsonb,
  metadata    jsonb not null default '{}'::jsonb,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create unique index if not exists forms_workspace_settings_project_uniq
  on forms.workspace_settings (coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid));
drop trigger if exists workspace_settings_touch_updated_at on forms.workspace_settings;
create trigger workspace_settings_touch_updated_at before update on forms.workspace_settings
  for each row execute function forms.touch_updated_at();

-- REST API keys (only a sha256 hash is stored).
create table if not exists forms.api_keys (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid,
  name          text not null,
  key_prefix    text not null,
  key_hash      text not null unique,
  scopes        text[] not null default '{read}',
  last_used_at  timestamptz,
  metadata      jsonb not null default '{}'::jsonb,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists forms_api_keys_project_idx on forms.api_keys (project_id) where deleted_at is null;
drop trigger if exists api_keys_touch_updated_at on forms.api_keys;
create trigger api_keys_touch_updated_at before update on forms.api_keys
  for each row execute function forms.touch_updated_at();

-- Outbound webhook delivery log.
create table if not exists forms.webhook_deliveries (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid references forms.forms(id) on delete cascade,
  response_id  uuid references forms.responses(id) on delete set null,
  url          text not null,
  event        text not null,
  status_code  integer,
  ok           boolean not null default false,
  error        text,
  created_at   timestamptz not null default now()
);
create index if not exists forms_webhook_deliveries_idx on forms.webhook_deliveries (form_id, created_at desc);

-- Fixed-window rate limiting for public submissions (service role only).
create table if not exists forms.rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  count         integer not null default 0,
  primary key (key, window_start)
);

-- Booking-field slot reservations.
create table if not exists forms.bookings (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references forms.forms(id) on delete cascade,
  response_id  uuid references forms.responses(id) on delete cascade,
  field_id     text not null,
  slot_start   timestamptz not null,
  slot_end     timestamptz not null,
  email        text,
  reminded_at  timestamptz,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index if not exists forms_bookings_slot_idx on forms.bookings (form_id, field_id, slot_start) where deleted_at is null;

-- Shallow-merge a settings patch so one editor tab never clobbers another.
create or replace function forms.merge_settings(p_id uuid, p_patch jsonb)
returns jsonb language sql as $$
  update forms.forms
     set settings = coalesce(settings, '{}'::jsonb) || coalesce(p_patch, '{}'::jsonb)
   where id = p_id
  returning settings;
$$;

-- Returns true while the caller is under p_max hits in the current window.
create or replace function forms.hit_rate_limit(p_key text, p_window_seconds integer, p_max integer)
returns boolean language plpgsql security definer set search_path = forms, public as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_count integer;
begin
  insert into forms.rate_limits (key, window_start, count) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = forms.rate_limits.count + 1
  returning count into v_count;
  delete from forms.rate_limits where window_start < now() - interval '1 day';
  return v_count <= p_max;
end;
$$;

-- Hard-deletes responses and partials older than each form's settings.retentionDays.
create or replace function forms.purge_expired_responses()
returns integer language plpgsql security definer set search_path = forms, public as $$
declare
  v_total integer := 0;
  v_rows integer;
  f record;
begin
  for f in
    select id, (settings->>'retentionDays')::integer as days
      from forms.forms
     where coalesce(settings->>'retentionDays', '') ~ '^[0-9]+$'
       and (settings->>'retentionDays')::integer > 0
  loop
    delete from forms.responses where form_id = f.id and submitted_at < now() - make_interval(days => f.days);
    get diagnostics v_rows = row_count;
    v_total := v_total + v_rows;
    delete from forms.partials where form_id = f.id and updated_at < now() - make_interval(days => f.days);
  end loop;
  return v_total;
end;
$$;

-- Bootstrap a caller's grant (lib/supabase/rbac.js ensureMembership). The first member of a project, or its creator, becomes owner; everyone else gets p_default_role.
create or replace function forms.rbac_ensure_membership(p_project_id uuid, p_default_role uuid default null)
returns boolean language plpgsql security definer set search_path = forms, public as $$
declare
  v_uid uuid := auth.uid();
  v_role uuid;
  v_first boolean;
begin
  if v_uid is null or p_project_id is null then return false; end if;
  if exists (select 1 from forms.role_grants where project_id = p_project_id and user_id = v_uid and deleted_at is null) then
    return true;
  end if;
  select not exists (select 1 from forms.role_grants where project_id = p_project_id and deleted_at is null)
      or exists (select 1 from public.projects where id = p_project_id and created_by = v_uid)
    into v_first;
  if v_first then
    select id into v_role from public.roles where project_id = p_project_id and key = 'owner' and deleted_at is null limit 1;
  end if;
  if v_role is null then
    select id into v_role from public.roles
     where id = p_default_role and project_id = p_project_id and deleted_at is null
       and not ('*' = any(permissions));
  end if;
  if v_role is null then
    select id into v_role from public.roles where project_id = p_project_id and key = 'member' and deleted_at is null limit 1;
  end if;
  if v_role is null then return false; end if;
  insert into forms.role_grants (project_id, user_id, role_id, granted_by) values (p_project_id, v_uid, v_role, v_uid);
  return true;
end;
$$;

grant execute on function forms.merge_settings(uuid, jsonb) to authenticated, service_role;
grant execute on function forms.hit_rate_limit(text, integer, integer) to service_role;
grant execute on function forms.purge_expired_responses() to service_role;
grant execute on function forms.rbac_ensure_membership(uuid, uuid) to authenticated;
revoke execute on function forms.hit_rate_limit(text, integer, integer) from anon, authenticated;
revoke execute on function forms.purge_expired_responses() from anon, authenticated;

grant all on all tables in schema forms to anon, authenticated, service_role;
grant all on all sequences in schema forms to anon, authenticated, service_role;

-- Private bucket for file, signature and asset-backed uploads (written via signed upload URLs).
insert into storage.buckets (id, name, public)
values ('forms-uploads', 'forms-uploads', false)
on conflict (id) do nothing;

-- RLS: new tables are closed to anon; workspace tables are open to authenticated (tightened by lock_down_rls).
alter table forms.partials enable row level security;
alter table forms.form_events enable row level security;
alter table forms.saved_views enable row level security;
alter table forms.activity enable row level security;
alter table forms.access_log enable row level security;
alter table forms.workspace_settings enable row level security;
alter table forms.api_keys enable row level security;
alter table forms.webhook_deliveries enable row level security;
alter table forms.rate_limits enable row level security;
alter table forms.bookings enable row level security;

drop policy if exists partials_read on forms.partials;
create policy partials_read on forms.partials for select to authenticated using (true);
drop policy if exists form_events_read on forms.form_events;
create policy form_events_read on forms.form_events for select to authenticated using (true);
drop policy if exists saved_views_all on forms.saved_views;
create policy saved_views_all on forms.saved_views for all to authenticated using (true) with check (true);
drop policy if exists activity_all on forms.activity;
create policy activity_all on forms.activity for all to authenticated using (true) with check (true);
drop policy if exists access_log_all on forms.access_log;
create policy access_log_all on forms.access_log for all to authenticated using (true) with check (true);
drop policy if exists workspace_settings_all on forms.workspace_settings;
create policy workspace_settings_all on forms.workspace_settings for all to authenticated using (true) with check (true);
drop policy if exists api_keys_all on forms.api_keys;
create policy api_keys_all on forms.api_keys for all to authenticated using (true) with check (true);
drop policy if exists webhook_deliveries_read on forms.webhook_deliveries;
create policy webhook_deliveries_read on forms.webhook_deliveries for select to authenticated using (true);
drop policy if exists bookings_read on forms.bookings;
create policy bookings_read on forms.bookings for select to authenticated using (true);

-- @down
drop policy if exists bookings_read on forms.bookings;
drop policy if exists webhook_deliveries_read on forms.webhook_deliveries;
drop policy if exists api_keys_all on forms.api_keys;
drop policy if exists workspace_settings_all on forms.workspace_settings;
drop policy if exists access_log_all on forms.access_log;
drop policy if exists activity_all on forms.activity;
drop policy if exists saved_views_all on forms.saved_views;
drop policy if exists form_events_read on forms.form_events;
drop policy if exists partials_read on forms.partials;

drop function if exists forms.rbac_ensure_membership(uuid, uuid);
drop function if exists forms.purge_expired_responses();
drop function if exists forms.hit_rate_limit(text, integer, integer);
drop function if exists forms.merge_settings(uuid, jsonb);

drop table if exists forms.bookings cascade;
drop table if exists forms.rate_limits cascade;
drop table if exists forms.webhook_deliveries cascade;
drop table if exists forms.api_keys cascade;
drop table if exists forms.workspace_settings cascade;
drop table if exists forms.access_log cascade;
drop table if exists forms.activity cascade;
drop table if exists forms.saved_views cascade;
drop table if exists forms.form_events cascade;
drop table if exists forms.partials cascade;

-- Restore the original insert/delete-only response counter.
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

drop trigger if exists responses_touch_updated_at on forms.responses;
alter table forms.responses drop constraint if exists responses_status_check;
update forms.responses set status = 'Complete' where status not in ('Complete', 'Needs review', 'Pending');
alter table forms.responses add constraint responses_status_check
  check (status in ('Complete', 'Needs review', 'Pending'));

drop index if exists forms.forms_responses_payment_ref_idx;
drop index if exists forms.forms_responses_tags_idx;
drop index if exists forms.forms_responses_email_idx;
drop index if exists forms.forms_responses_live_idx;
drop index if exists forms.forms_responses_edit_token_uniq;
alter table forms.responses drop column if exists deleted_at;
alter table forms.responses drop column if exists updated_at;
alter table forms.responses drop column if exists payment_ref;
alter table forms.responses drop column if exists payment_currency;
alter table forms.responses drop column if exists payment_amount;
alter table forms.responses drop column if exists payment_status;
alter table forms.responses drop column if exists edited_at;
alter table forms.responses drop column if exists edit_token;
alter table forms.responses drop column if exists respondent_user_id;
alter table forms.responses drop column if exists approval;
alter table forms.responses drop column if exists metadata;
alter table forms.responses drop column if exists outcome;
alter table forms.responses drop column if exists assignee;
alter table forms.responses drop column if exists tags;

drop index if exists forms.forms_live_idx;
alter table forms.forms drop column if exists metadata;
alter table forms.forms drop column if exists is_template;
alter table forms.forms drop column if exists deleted_at;

-- The forms-uploads bucket is left in place: dropping it would orphan uploaded files.
