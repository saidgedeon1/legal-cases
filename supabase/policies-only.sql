-- Run ONLY if uploads fail with "row-level security" error.
-- The storage bucket already exists.

drop policy if exists "legal_case_files_public_read" on storage.objects;
create policy "legal_case_files_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'legal-case-files');

drop policy if exists "legal_case_files_public_insert" on storage.objects;
create policy "legal_case_files_public_insert"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'legal-case-files');

drop policy if exists "legal_case_files_public_update" on storage.objects;
create policy "legal_case_files_public_update"
  on storage.objects for update to anon, authenticated
  using (bucket_id = 'legal-case-files');

drop policy if exists "legal_case_files_public_delete" on storage.objects;
create policy "legal_case_files_public_delete"
  on storage.objects for delete to anon, authenticated
  using (bucket_id = 'legal-case-files');

notify pgrst, 'reload schema';
