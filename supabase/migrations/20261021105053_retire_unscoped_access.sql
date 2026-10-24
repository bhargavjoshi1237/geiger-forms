-- Retire unscoped access
--
-- Closes the legacy path from 20261008155427_lock_down_rls that opened every project_id-less row to any
-- signed-in user: unscoped forms (and, via forms.can_form, their child rows) now answer to their creator only,
-- new forms must belong to a project, and unscoped workspace settings and API keys are retired.
-- Owns: forms.keep_form_scoped() + trigger, the *_project_id_fkey constraints, a new body for forms.can_form.

-- @up
-- CASE keeps rbac_allows off a null project, which it reads as "any project".
create or replace function forms.can_form(p_form_id uuid, p_permission text)
returns boolean language sql stable security definer set search_path = forms, public as $$
  select exists (
    select 1 from forms.forms f
     where f.id = p_form_id
       and auth.uid() is not null
       and case when f.project_id is null then f.created_by = auth.uid()
                else forms.rbac_allows(p_permission, f.project_id, 'form', f.id) end
  );
$$;
grant execute on function forms.can_form(uuid, text) to authenticated;

-- forms.forms
drop policy if exists forms_select on forms.forms;
create policy forms_select on forms.forms for select to authenticated
  using (case when project_id is null then created_by = auth.uid()
              else forms.rbac_allows('forms.forms.view', project_id) or forms.rbac_allows('forms.form.edit', project_id, 'form', id) end);
drop policy if exists forms_insert on forms.forms;
create policy forms_insert on forms.forms for insert to authenticated
  with check (project_id is not null and forms.rbac_allows('forms.form.edit', project_id));
drop policy if exists forms_update on forms.forms;
create policy forms_update on forms.forms for update to authenticated
  using (case when project_id is null then created_by = auth.uid() else forms.rbac_allows('forms.form.edit', project_id, 'form', id) end)
  with check (case when project_id is null then created_by = auth.uid() else forms.rbac_allows('forms.form.edit', project_id, 'form', id) end);
drop policy if exists forms_delete on forms.forms;
create policy forms_delete on forms.forms for delete to authenticated
  using (case when project_id is null then created_by = auth.uid() else forms.rbac_allows('forms.form.delete', project_id, 'form', id) end);

-- Clearing project_id would pull a form and its responses out of the project, past every grant.
create or replace function forms.keep_form_scoped()
returns trigger language plpgsql as $$
begin
  if old.project_id is not null and new.project_id is null then
    raise exception 'A project form cannot be made unscoped' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists forms_keep_scoped on forms.forms;
create trigger forms_keep_scoped
  before update of project_id on forms.forms
  for each row execute function forms.keep_form_scoped();

-- Workspace tables
drop policy if exists saved_views_all on forms.saved_views;
create policy saved_views_all on forms.saved_views for all to authenticated
  using (case when project_id is null then created_by = auth.uid() else forms.rbac_allows('forms.responses.view', project_id) end)
  with check (case when project_id is null then created_by = auth.uid() else forms.rbac_allows('forms.responses.view', project_id) end);
drop policy if exists activity_all on forms.activity;
create policy activity_all on forms.activity for all to authenticated
  using (case when project_id is null then actor_id = auth.uid() or forms.can_form(form_id, 'forms.overview.view')
              else forms.rbac_allows('forms.overview.view', project_id) end)
  with check (auth.uid() is not null);
drop policy if exists access_log_all on forms.access_log;
create policy access_log_all on forms.access_log for all to authenticated
  using (case when form_id is null then actor_id = auth.uid() else forms.can_form(form_id, 'forms.responses.view') end)
  with check (auth.uid() is not null);
-- The single unscoped settings row and unscoped API keys were shared by every signed-in user.
drop policy if exists workspace_settings_all on forms.workspace_settings;
create policy workspace_settings_all on forms.workspace_settings for all to authenticated
  using (project_id is not null and (forms.rbac_allows('forms.settings.view', project_id) or forms.rbac_allows('forms.settings.manage', project_id)))
  with check (project_id is not null and forms.rbac_allows('forms.settings.manage', project_id));
drop policy if exists api_keys_all on forms.api_keys;
create policy api_keys_all on forms.api_keys for all to authenticated
  using (project_id is not null and forms.rbac_allows('forms.settings.manage', project_id))
  with check (project_id is not null and forms.rbac_allows('forms.settings.manage', project_id));

-- project_id -> public.projects per MIGRATION_CONVENTIONS (no orphaned rows when written).
alter table forms.forms drop constraint if exists forms_project_id_fkey;
alter table forms.forms add constraint forms_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;
alter table forms.saved_views drop constraint if exists saved_views_project_id_fkey;
alter table forms.saved_views add constraint saved_views_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;
alter table forms.activity drop constraint if exists activity_project_id_fkey;
alter table forms.activity add constraint activity_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;
alter table forms.workspace_settings drop constraint if exists workspace_settings_project_id_fkey;
alter table forms.workspace_settings add constraint workspace_settings_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;
alter table forms.api_keys drop constraint if exists api_keys_project_id_fkey;
alter table forms.api_keys add constraint api_keys_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;

-- @down
alter table forms.api_keys drop constraint if exists api_keys_project_id_fkey;
alter table forms.workspace_settings drop constraint if exists workspace_settings_project_id_fkey;
alter table forms.activity drop constraint if exists activity_project_id_fkey;
alter table forms.saved_views drop constraint if exists saved_views_project_id_fkey;
alter table forms.forms drop constraint if exists forms_project_id_fkey;

drop policy if exists api_keys_all on forms.api_keys;
create policy api_keys_all on forms.api_keys for all to authenticated
  using (project_id is null or forms.rbac_allows('forms.settings.manage', project_id))
  with check (project_id is null or forms.rbac_allows('forms.settings.manage', project_id));
drop policy if exists workspace_settings_all on forms.workspace_settings;
create policy workspace_settings_all on forms.workspace_settings for all to authenticated
  using (project_id is null or forms.rbac_allows('forms.settings.view', project_id) or forms.rbac_allows('forms.settings.manage', project_id))
  with check (project_id is null or forms.rbac_allows('forms.settings.manage', project_id));
drop policy if exists access_log_all on forms.access_log;
create policy access_log_all on forms.access_log for all to authenticated
  using (form_id is null or forms.can_form(form_id, 'forms.responses.view'))
  with check (auth.uid() is not null);
drop policy if exists activity_all on forms.activity;
create policy activity_all on forms.activity for all to authenticated
  using (project_id is null or forms.rbac_allows('forms.overview.view', project_id))
  with check (auth.uid() is not null);
drop policy if exists saved_views_all on forms.saved_views;
create policy saved_views_all on forms.saved_views for all to authenticated
  using (project_id is null or forms.rbac_allows('forms.responses.view', project_id))
  with check (project_id is null or forms.rbac_allows('forms.responses.view', project_id));

drop trigger if exists forms_keep_scoped on forms.forms;
drop function if exists forms.keep_form_scoped();

drop policy if exists forms_delete on forms.forms;
create policy forms_delete on forms.forms for delete to authenticated
  using (project_id is null or forms.rbac_allows('forms.form.delete', project_id, 'form', id));
drop policy if exists forms_update on forms.forms;
create policy forms_update on forms.forms for update to authenticated
  using (project_id is null or forms.rbac_allows('forms.form.edit', project_id, 'form', id))
  with check (project_id is null or forms.rbac_allows('forms.form.edit', project_id, 'form', id));
drop policy if exists forms_insert on forms.forms;
create policy forms_insert on forms.forms for insert to authenticated
  with check (project_id is null or forms.rbac_allows('forms.form.edit', project_id));
drop policy if exists forms_select on forms.forms;
create policy forms_select on forms.forms for select to authenticated
  using (project_id is null or forms.rbac_allows('forms.forms.view', project_id) or forms.rbac_allows('forms.form.edit', project_id, 'form', id));

create or replace function forms.can_form(p_form_id uuid, p_permission text)
returns boolean language sql stable security definer set search_path = forms, public as $$
  select exists (
    select 1 from forms.forms f
     where f.id = p_form_id
       and auth.uid() is not null
       and (f.project_id is null or forms.rbac_allows(p_permission, f.project_id, 'form', f.id))
  );
$$;
