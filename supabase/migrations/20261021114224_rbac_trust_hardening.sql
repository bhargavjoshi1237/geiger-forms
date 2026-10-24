-- RBAC trust hardening
--
-- forms.rbac_ensure_membership granted a role in any project whose id the caller knew (ids are readable through
-- public.roles and forms.role_grants): owner when the project had no Forms grants yet, otherwise any non-"*" role
-- the caller named. It now provisions only people who belong to the project (its creator or a member of its
-- organization, mirroring content.can_access_project and comms' rbac_trust_hardening), makes only the creator an
-- owner, gives everyone else the member role, never hands back a revoked grant, and is no longer callable by anon.
-- forms.role_grants stops being readable by anon and outside the project. Existing grants are untouched.
-- Owns: forms.can_access_project(uuid). Becomes the owner of forms.rbac_ensure_membership(uuid, uuid)
-- (from 20261008155426_platform_expansion) and the role_grants_read policy (from 20260907120000_adopt_rbac).
-- public.roles (roles_read, roles_write) is suite-shared and deliberately left alone.

-- @up
create schema if not exists forms;
grant usage on schema forms to anon, authenticated, service_role;

-- True when the caller is the project's creator or a member of its organization (an org-less project is its creator's alone).
create or replace function forms.can_access_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.projects p
     where p.id = p_project_id
       and p.deleted_at is null
       and (p.created_by = auth.uid() or public.is_org_member(p.organization_id))
  );
$$;
revoke all on function forms.can_access_project(uuid) from public, anon;
grant execute on function forms.can_access_project(uuid) to authenticated, service_role;

-- The caller's own first grant (lib/supabase/rbac.js ensureMembership); p_default_role stays for the RPC signature but is ignored, so nobody picks their own role.
create or replace function forms.rbac_ensure_membership(p_project_id uuid, p_default_role uuid default null)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_role uuid;
begin
  if v_uid is null or p_project_id is null or not forms.can_access_project(p_project_id) then
    return false;
  end if;
  if exists (select 1 from forms.role_grants where project_id = p_project_id and user_id = v_uid and deleted_at is null) then
    return true;
  end if;
  -- A revoked grant is a decision, not a gap.
  if exists (select 1 from forms.role_grants where project_id = p_project_id and user_id = v_uid) then
    return false;
  end if;
  if exists (select 1 from public.projects where id = p_project_id and created_by = v_uid) then
    select id into v_role from public.roles where project_id = p_project_id and key = 'owner' and deleted_at is null limit 1;
  end if;
  if v_role is null then
    select id into v_role from public.roles where project_id = p_project_id and key = 'member' and deleted_at is null limit 1;
  end if;
  if v_role is null then
    return false;
  end if;
  insert into forms.role_grants (project_id, user_id, role_id, granted_by)
  values (p_project_id, v_uid, v_role, v_uid)
  on conflict do nothing;
  return true;
end;
$$;
revoke all on function forms.rbac_ensure_membership(uuid, uuid) from public, anon;
grant execute on function forms.rbac_ensure_membership(uuid, uuid) to authenticated;

-- Your own grants, plus the project's roster when you belong to the project.
drop policy if exists role_grants_read on forms.role_grants;
create policy role_grants_read on forms.role_grants for select to authenticated
  using (deleted_at is null and (user_id = auth.uid() or forms.can_access_project(project_id)));

-- @down
drop policy if exists role_grants_read on forms.role_grants;
create policy role_grants_read on forms.role_grants
  for select to anon, authenticated using (deleted_at is null);

-- The previous body, verbatim from 20261008155426_platform_expansion.
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
grant execute on function forms.rbac_ensure_membership(uuid, uuid) to public, anon, authenticated;

drop function if exists forms.can_access_project(uuid);
