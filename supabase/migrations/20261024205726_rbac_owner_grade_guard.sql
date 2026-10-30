-- RBAC owner-grade guard
--
-- Finishes what 20261021114224_rbac_trust_hardening started; push them in the same run.
-- * rbac_trust_hardening still made a project's creator a Forms owner and let created_by alone open the project,
--   but any member of an organization can rewrite public.projects.created_by (the open "projects" org module), so a
--   plain member could make themselves owner. In an organization's project only the organization's owner is now
--   owner-grade; created_by counts only for an org-less project.
-- * role_grants_write let any forms.team.assign holder (a Manager) grant, revoke, re-point or delete an owner-grade
--   grant ("*" / "forms.*" / key 'owner'), and pair a grant with another project's role, which forms.rbac_allows
--   honours. Only owner-grade callers (organization owner, creator of an org-less project, or a project member holding
--   a real "*" grant) now touch owner-grade grants, a grant's role must belong to its project, and assigners must
--   still belong to the project. rbac_ensure_membership runs as the table owner and is unaffected by the policy.
-- Owns (new): forms.is_project_owner(uuid), forms.role_grant_allowed(uuid, uuid).
-- Becomes the owner of: forms.can_access_project(uuid) and forms.rbac_ensure_membership(uuid, uuid) (from
-- 20261021114224_rbac_trust_hardening) and the role_grants_write policy (from 20261008155427_lock_down_rls).
-- Depends on: forms.role_grants / forms.rbac_allows (20260907120000_adopt_rbac); public.projects, public.organizations,
-- public.roles and public.is_org_member (suite, owned by geiger-dash).
-- Existing grants are untouched. @down restores the state right after 20261021114347_tighten_privileges.

-- @up
create schema if not exists forms;
grant usage on schema forms to anon, authenticated, service_role;

-- Member of the project's organization, or the creator of an org-less project (created_by is member-writable in an organization).
create or replace function forms.can_access_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.projects p
     where p.id = p_project_id
       and p.deleted_at is null
       and ((p.organization_id is null and p.created_by = auth.uid()) or public.is_org_member(p.organization_id))
  );
$$;
revoke all on function forms.can_access_project(uuid) from public, anon;
grant execute on function forms.can_access_project(uuid) to authenticated, service_role;

-- Owner-grade caller: the organization's owner, the creator of an org-less project, or a project member holding a real "*" grant.
-- Ownership is read from the organization row; public.organization_users.role is self-asserted (same rule as geiger-comms).
create or replace function forms.is_project_owner(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and forms.can_access_project(p_project_id) and (
    exists (
      select 1 from public.projects p
        left join public.organizations o on o.id = p.organization_id and o.deleted_at is null
       where p.id = p_project_id
         and (
           (p.organization_id is null and p.created_by = auth.uid())
           or o.owner = auth.uid()
           or o.created_by = auth.uid()
         )
    )
    or exists (
      select 1 from forms.role_grants g
        join public.roles r on r.id = g.role_id and r.project_id = g.project_id
       where g.project_id = p_project_id
         and g.user_id = auth.uid()
         and g.status = 'active'
         and g.deleted_at is null
         and r.deleted_at is null
         and '*' = any (r.permissions)
    )
  );
$$;
revoke all on function forms.is_project_owner(uuid) from public, anon;
grant execute on function forms.is_project_owner(uuid) to authenticated, service_role;

-- A grant may carry this role: it belongs to the project, and an owner-grade role needs an owner-grade caller (soft-deleted roles stay revocable).
create or replace function forms.role_grant_allowed(p_project_id uuid, p_role_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.roles r
     where r.id = p_role_id
       and r.project_id = p_project_id
       and (
         (r.key is distinct from 'owner' and not ('*' = any (r.permissions)) and not ('forms.*' = any (r.permissions)))
         or forms.is_project_owner(p_project_id)
       )
  );
$$;
revoke all on function forms.role_grant_allowed(uuid, uuid) from public, anon;
grant execute on function forms.role_grant_allowed(uuid, uuid) to authenticated, service_role;

-- The caller's own first grant (lib/supabase/rbac.js ensureMembership): owner for an owner-grade caller, else member; p_default_role is ignored.
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
  if forms.is_project_owner(p_project_id) then
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

-- Role assignment: project members holding forms.team.assign, on this project's roles; owner-grade grants only by owner-grade callers.
-- USING checks the existing row and WITH CHECK the new one, so revoking, re-pointing or deleting an owner-grade grant is guarded too.
drop policy if exists role_grants_write on forms.role_grants;
create policy role_grants_write on forms.role_grants for all to authenticated
  using (
    forms.can_access_project(project_id)
    and forms.rbac_allows('forms.team.assign', project_id)
    and forms.role_grant_allowed(project_id, role_id)
  )
  with check (
    forms.can_access_project(project_id)
    and forms.rbac_allows('forms.team.assign', project_id)
    and forms.role_grant_allowed(project_id, role_id)
  );

-- @down
-- The previous policy, verbatim from 20261008155427_lock_down_rls.
drop policy if exists role_grants_write on forms.role_grants;
create policy role_grants_write on forms.role_grants for all to authenticated
  using (forms.rbac_allows('forms.team.assign', project_id))
  with check (forms.rbac_allows('forms.team.assign', project_id));

-- The previous body, verbatim from 20261021114224_rbac_trust_hardening.
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

-- The previous body, verbatim from 20261021114224_rbac_trust_hardening.
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

drop function if exists forms.role_grant_allowed(uuid, uuid);
drop function if exists forms.is_project_owner(uuid);
