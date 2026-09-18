-- Create studio storage bucket for asset uploads
insert into storage.buckets (id, name, public)
values ('studio', 'studio', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to studio bucket
create policy "studio_upload" on storage.objects for insert
  to authenticated
  with check (bucket_id = 'studio');

-- Allow public reads from studio bucket
create policy "studio_read" on storage.objects for select
  to public
  using (bucket_id = 'studio');

-- Allow authenticated users to delete their uploads
create policy "studio_delete" on storage.objects for delete
  to authenticated
  using (bucket_id = 'studio');
