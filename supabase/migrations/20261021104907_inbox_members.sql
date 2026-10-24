-- Inbox members
--
-- Team-grade response inbox: responses are assigned to a project member by user id, and comments record their
-- author and @mentioned members by user id. The legacy `assignee` / `author` text columns stay as the display-name
-- snapshot, so existing rows keep reading as before.
-- Owns: forms.responses.assignee_id, forms.comments.author_id, forms.comments.mentions,
-- forms.rbac_list_members(uuid) and forms.stamp_comment_author() + its trigger.

-- @up
create schema if not exists forms;
grant usage on schema forms to anon, authenticated, service_role;

alter table forms.responses add column if not exists assignee_id uuid;
alter table forms.comments add column if not exists author_id uuid;
alter table forms.comments add column if not exists mentions uuid[] not null default '{}';

-- Project roster with display info from auth.users (mirrors assets.rbac_list_members); answers only the project's own active members.
create or replace function forms.rbac_list_members(p_project_id uuid)
returns table (
  user_id uuid,
  email text,
  name text,
  avatar_url text,
  role_id uuid,
  role_key text,
  role_name text
)
language plpgsql
stable
security definer
set search_path = public, forms, auth
as $$
begin
  if p_project_id is null or auth.uid() is null then
    return;
  end if;

  if not exists (
    select 1 from forms.role_grants g
     where g.project_id = p_project_id
       and g.user_id = auth.uid()
       and g.status = 'active'
       and g.deleted_at is null
  ) then
    return;
  end if;

  return query
  select distinct on (g.user_id)
    g.user_id,
    coalesce(u.email, '')::text,
    coalesce(
      nullif(u.raw_user_meta_data ->> 'full_name', ''),
      nullif(u.raw_user_meta_data ->> 'name', ''),
      split_part(coalesce(u.email, ''), '@', 1)
    )::text,
    nullif(u.raw_user_meta_data ->> 'avatar_url', '')::text,
    g.role_id,
    r.key::text,
    r.name::text
  from forms.role_grants g
  join public.roles r on r.id = g.role_id and r.deleted_at is null
  left join auth.users u on u.id = g.user_id
  where g.project_id = p_project_id
    and g.status = 'active'
    and g.deleted_at is null
  order by g.user_id, r.sort;
end;
$$;

grant execute on function forms.rbac_list_members(uuid) to authenticated;

-- A signed-in writer always posts as themselves; service-role writes (the comments route) set author_id explicitly.
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

drop trigger if exists comments_stamp_author on forms.comments;
create trigger comments_stamp_author
  before insert or update on forms.comments
  for each row execute function forms.stamp_comment_author();

-- @down
drop trigger if exists comments_stamp_author on forms.comments;
drop function if exists forms.stamp_comment_author();
drop function if exists forms.rbac_list_members(uuid);
alter table forms.comments drop column if exists mentions;
alter table forms.comments drop column if exists author_id;
alter table forms.responses drop column if exists assignee_id;
