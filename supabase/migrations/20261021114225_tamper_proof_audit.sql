-- Tamper-proof audit
--
-- Members could post comments under any author name and edit or delete each other's comments, and could insert
-- activity / access-log rows as anyone, or rewrite and delete them. Comments are now written only through
-- /api/responses/[id]/comments (service role) and read by members; audit rows can be inserted (as yourself, into a
-- scope you can read) and read, never changed. Rows written by a signed-in user, or authored by one, show that
-- user's real display name.
-- Owns: forms.user_display_name(uuid), forms.stamp_audit_actor() + its triggers, and the comments_select,
-- activity_select / activity_insert and access_log_select / access_log_insert policies. Becomes the owner of
-- forms.stamp_comment_author() (from 20261021104907_inbox_members).

-- @up
create schema if not exists forms;
grant usage on schema forms to anon, authenticated, service_role;

-- A user's display name, as forms.rbac_list_members shows it.
create or replace function forms.user_display_name(p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), '')
  )
  from auth.users u
  where u.id = p_user;
$$;
revoke all on function forms.user_display_name(uuid) from public, anon, authenticated;

-- forms.comments
drop policy if exists comments_rw on forms.comments;
drop policy if exists comments_select on forms.comments;
create policy comments_select on forms.comments for select to authenticated
  using (exists (select 1 from forms.responses r where r.id = response_id and forms.can_form(r.form_id, 'forms.responses.view')));

-- A signed-in writer always posts as themselves, and an authored comment always shows its author's name.
create or replace function forms.stamp_comment_author()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.author_id := case when tg_op = 'INSERT' then auth.uid() else old.author_id end;
  end if;
  if new.author_id is not null then
    new.author := coalesce(forms.user_display_name(new.author_id), new.author);
  end if;
  return new;
end;
$$;

-- forms.activity / forms.access_log: a signed-in writer is recorded under their own name; service-role writes name their actor.
create or replace function forms.stamp_audit_actor()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.actor_name := coalesce(forms.user_display_name(auth.uid()), new.actor_name);
  end if;
  return new;
end;
$$;

drop trigger if exists activity_stamp_actor on forms.activity;
create trigger activity_stamp_actor
  before insert on forms.activity
  for each row execute function forms.stamp_audit_actor();
drop trigger if exists access_log_stamp_actor on forms.access_log;
create trigger access_log_stamp_actor
  before insert on forms.access_log
  for each row execute function forms.stamp_audit_actor();

drop policy if exists activity_all on forms.activity;
drop policy if exists activity_select on forms.activity;
create policy activity_select on forms.activity for select to authenticated
  using (case when project_id is null then actor_id = auth.uid() or forms.can_form(form_id, 'forms.overview.view')
              else forms.rbac_allows('forms.overview.view', project_id) end);
drop policy if exists activity_insert on forms.activity;
create policy activity_insert on forms.activity for insert to authenticated
  with check (actor_id = auth.uid()
              and case when project_id is null then form_id is null or forms.can_form(form_id, 'forms.overview.view')
                       else forms.rbac_allows('forms.overview.view', project_id) end);

drop policy if exists access_log_all on forms.access_log;
drop policy if exists access_log_select on forms.access_log;
create policy access_log_select on forms.access_log for select to authenticated
  using (case when form_id is null then actor_id = auth.uid() else forms.can_form(form_id, 'forms.responses.view') end);
drop policy if exists access_log_insert on forms.access_log;
create policy access_log_insert on forms.access_log for insert to authenticated
  with check (actor_id = auth.uid() and (form_id is null or forms.can_form(form_id, 'forms.responses.view')));

-- @down
-- The previous policies, verbatim from 20261021105053_retire_unscoped_access.
drop policy if exists access_log_insert on forms.access_log;
drop policy if exists access_log_select on forms.access_log;
drop policy if exists access_log_all on forms.access_log;
create policy access_log_all on forms.access_log for all to authenticated
  using (case when form_id is null then actor_id = auth.uid() else forms.can_form(form_id, 'forms.responses.view') end)
  with check (auth.uid() is not null);

drop policy if exists activity_insert on forms.activity;
drop policy if exists activity_select on forms.activity;
drop policy if exists activity_all on forms.activity;
create policy activity_all on forms.activity for all to authenticated
  using (case when project_id is null then actor_id = auth.uid() or forms.can_form(form_id, 'forms.overview.view')
              else forms.rbac_allows('forms.overview.view', project_id) end)
  with check (auth.uid() is not null);

drop trigger if exists access_log_stamp_actor on forms.access_log;
drop trigger if exists activity_stamp_actor on forms.activity;
drop function if exists forms.stamp_audit_actor();

-- The previous body, verbatim from 20261021104907_inbox_members.
create or replace function forms.stamp_comment_author()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.author_id := auth.uid();
  else
    new.author_id := old.author_id;
  end if;
  return new;
end;
$$;

-- The previous policy, verbatim from 20261008155427_lock_down_rls.
drop policy if exists comments_select on forms.comments;
drop policy if exists comments_rw on forms.comments;
create policy comments_rw on forms.comments for all to authenticated
  using (exists (select 1 from forms.responses r where r.id = response_id and forms.can_form(r.form_id, 'forms.responses.view')))
  with check (exists (select 1 from forms.responses r where r.id = response_id and forms.can_form(r.form_id, 'forms.responses.view')));

drop function if exists forms.user_display_name(uuid);
