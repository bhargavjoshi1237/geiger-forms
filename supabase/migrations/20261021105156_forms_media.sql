-- Forms media
--
-- Owns the public `forms-media` storage bucket and the "Forms media *" policies on storage.objects.
-- Builder images (picture-choice options, image blocks) live at forms-media/<form-uuid>/<file>; the field
-- config stores the public URL. Reads are public; writes need edit rights on that form (forms.can_form,
-- owned by lock_down_rls). The bucket caps uploads at 5 MB of still or animated web images.

-- @up
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('forms-media', 'forms-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Forms media insert" on storage.objects;
create policy "Forms media insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'forms-media'
    and exists (
      select 1 from forms.forms f
       where f.id::text = (storage.foldername(storage.objects.name))[1]
         and forms.can_form(f.id, 'forms.form.edit')
    )
  );

drop policy if exists "Forms media update" on storage.objects;
create policy "Forms media update" on storage.objects for update to authenticated
  using (
    bucket_id = 'forms-media'
    and exists (
      select 1 from forms.forms f
       where f.id::text = (storage.foldername(storage.objects.name))[1]
         and forms.can_form(f.id, 'forms.form.edit')
    )
  );

drop policy if exists "Forms media delete" on storage.objects;
create policy "Forms media delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'forms-media'
    and exists (
      select 1 from forms.forms f
       where f.id::text = (storage.foldername(storage.objects.name))[1]
         and forms.can_form(f.id, 'forms.form.edit')
    )
  );

-- @down
drop policy if exists "Forms media insert" on storage.objects;
drop policy if exists "Forms media update" on storage.objects;
drop policy if exists "Forms media delete" on storage.objects;
-- The forms-media bucket is left in place: dropping it would orphan images live forms still show.
