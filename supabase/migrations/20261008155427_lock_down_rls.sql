-- Lock down RLS
--
-- Replaces the demo-open policies on forms.forms, forms.responses, forms.versions and
-- forms.comments, plus the open write policy on forms.role_grants, with policies that
-- respect @geiger/rbac grants (forms.rbac_allows).
-- anon loses all direct access. Public filling goes through the app's server routes
-- (service role), so a leaked anon key no longer exposes responses.
-- Push it once the workspace runs behind a signed-in suite session: an
-- unauthenticated workspace sees no rows after this lands.

-- @up
-- True when the caller may use a form: legacy unscoped forms are open to any
-- signed-in user, project forms need the given permission in that project.
create or replace function forms.can_form(p_form_id uuid, p_permission text)
returns boolean language sql stable security definer set search_path = forms, public as $$
  select exists (
    select 1 from forms.forms f
     where f.id = p_form_id
       and auth.uid() is not null
       and (f.project_id is null or forms.rbac_allows(p_permission, f.project_id, 'form', f.id))
  );
$$;
grant execute on function forms.can_form(uuid, text) to authenticated;

-- forms.forms
drop policy if exists forms_all on forms.forms;
drop policy if exists forms_select on forms.forms;
create policy forms_select on forms.forms for select to authenticated
  using (project_id is null or forms.rbac_allows('forms.forms.view', project_id) or forms.rbac_allows('forms.form.edit', project_id, 'form', id));
drop policy if exists forms_insert on forms.forms;
create policy forms_insert on forms.forms for insert to authenticated
  with check (project_id is null or forms.rbac_allows('forms.form.edit', project_id));
drop policy if exists forms_update on forms.forms;
create policy forms_update on forms.forms for update to authenticated
  using (project_id is null or forms.rbac_allows('forms.form.edit', project_id, 'form', id))
  with check (project_id is null or forms.rbac_allows('forms.form.edit', project_id, 'form', id));
drop policy if exists forms_delete on forms.forms;
create policy forms_delete on forms.forms for delete to authenticated
  using (project_id is null or forms.rbac_allows('forms.form.delete', project_id, 'form', id));

-- forms.responses
drop policy if exists responses_all on forms.responses;
drop policy if exists responses_select on forms.responses;
create policy responses_select on forms.responses for select to authenticated
  using (forms.can_form(form_id, 'forms.responses.view'));
drop policy if exists responses_update on forms.responses;
create policy responses_update on forms.responses for update to authenticated
  using (forms.can_form(form_id, 'forms.form.edit'))
  with check (forms.can_form(form_id, 'forms.form.edit'));
drop policy if exists responses_delete on forms.responses;
create policy responses_delete on forms.responses for delete to authenticated
  using (forms.can_form(form_id, 'forms.response.delete'));

-- forms.versions / forms.comments
drop policy if exists versions_all on forms.versions;
drop policy if exists versions_rw on forms.versions;
create policy versions_rw on forms.versions for all to authenticated
  using (forms.can_form(form_id, 'forms.form.edit'))
  with check (forms.can_form(form_id, 'forms.form.edit'));

drop policy if exists comments_all on forms.comments;
drop policy if exists comments_rw on forms.comments;
create policy comments_rw on forms.comments for all to authenticated
  using (exists (select 1 from forms.responses r where r.id = response_id and forms.can_form(r.form_id, 'forms.responses.view')))
  with check (exists (select 1 from forms.responses r where r.id = response_id and forms.can_form(r.form_id, 'forms.responses.view')));

-- Role grants: only role managers write (bootstrap goes through forms.rbac_ensure_membership).
drop policy if exists role_grants_write on forms.role_grants;
create policy role_grants_write on forms.role_grants for all to authenticated
  using (forms.rbac_allows('forms.team.assign', project_id))
  with check (forms.rbac_allows('forms.team.assign', project_id));

-- Workspace tables from platform_expansion: scope to the caller's projects.
drop policy if exists saved_views_all on forms.saved_views;
create policy saved_views_all on forms.saved_views for all to authenticated
  using (project_id is null or forms.rbac_allows('forms.responses.view', project_id))
  with check (project_id is null or forms.rbac_allows('forms.responses.view', project_id));
drop policy if exists activity_all on forms.activity;
create policy activity_all on forms.activity for all to authenticated
  using (project_id is null or forms.rbac_allows('forms.overview.view', project_id))
  with check (auth.uid() is not null);
drop policy if exists access_log_all on forms.access_log;
create policy access_log_all on forms.access_log for all to authenticated
  using (form_id is null or forms.can_form(form_id, 'forms.responses.view'))
  with check (auth.uid() is not null);
drop policy if exists workspace_settings_all on forms.workspace_settings;
create policy workspace_settings_all on forms.workspace_settings for all to authenticated
  using (project_id is null or forms.rbac_allows('forms.settings.view', project_id) or forms.rbac_allows('forms.settings.manage', project_id))
  with check (project_id is null or forms.rbac_allows('forms.settings.manage', project_id));
drop policy if exists api_keys_all on forms.api_keys;
create policy api_keys_all on forms.api_keys for all to authenticated
  using (project_id is null or forms.rbac_allows('forms.settings.manage', project_id))
  with check (project_id is null or forms.rbac_allows('forms.settings.manage', project_id));
drop policy if exists partials_read on forms.partials;
create policy partials_read on forms.partials for select to authenticated using (forms.can_form(form_id, 'forms.responses.view'));
drop policy if exists form_events_read on forms.form_events;
create policy form_events_read on forms.form_events for select to authenticated using (forms.can_form(form_id, 'forms.analytics.view') or forms.can_form(form_id, 'forms.responses.view'));
drop policy if exists webhook_deliveries_read on forms.webhook_deliveries;
create policy webhook_deliveries_read on forms.webhook_deliveries for select to authenticated using (forms.can_form(form_id, 'forms.form.edit'));
drop policy if exists bookings_read on forms.bookings;
create policy bookings_read on forms.bookings for select to authenticated using (forms.can_form(form_id, 'forms.responses.view'));

-- @down
drop policy if exists bookings_read on forms.bookings;
create policy bookings_read on forms.bookings for select to authenticated using (true);
drop policy if exists webhook_deliveries_read on forms.webhook_deliveries;
create policy webhook_deliveries_read on forms.webhook_deliveries for select to authenticated using (true);
drop policy if exists form_events_read on forms.form_events;
create policy form_events_read on forms.form_events for select to authenticated using (true);
drop policy if exists partials_read on forms.partials;
create policy partials_read on forms.partials for select to authenticated using (true);
drop policy if exists api_keys_all on forms.api_keys;
create policy api_keys_all on forms.api_keys for all to authenticated using (true) with check (true);
drop policy if exists workspace_settings_all on forms.workspace_settings;
create policy workspace_settings_all on forms.workspace_settings for all to authenticated using (true) with check (true);
drop policy if exists access_log_all on forms.access_log;
create policy access_log_all on forms.access_log for all to authenticated using (true) with check (true);
drop policy if exists activity_all on forms.activity;
create policy activity_all on forms.activity for all to authenticated using (true) with check (true);
drop policy if exists saved_views_all on forms.saved_views;
create policy saved_views_all on forms.saved_views for all to authenticated using (true) with check (true);

drop policy if exists role_grants_write on forms.role_grants;
create policy role_grants_write on forms.role_grants for all to authenticated using (true) with check (true);

drop policy if exists comments_rw on forms.comments;
create policy comments_all on forms.comments for all to anon, authenticated using (true) with check (true);
drop policy if exists versions_rw on forms.versions;
create policy versions_all on forms.versions for all to anon, authenticated using (true) with check (true);

drop policy if exists responses_delete on forms.responses;
drop policy if exists responses_update on forms.responses;
drop policy if exists responses_select on forms.responses;
create policy responses_all on forms.responses for all to anon, authenticated using (true) with check (true);

drop policy if exists forms_delete on forms.forms;
drop policy if exists forms_update on forms.forms;
drop policy if exists forms_insert on forms.forms;
drop policy if exists forms_select on forms.forms;
create policy forms_all on forms.forms for all to anon, authenticated using (true) with check (true);

drop function if exists forms.can_form(uuid, text);
