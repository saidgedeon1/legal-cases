-- Run this if you already ran schema.sql before file uploads were added.

create table if not exists public.case_files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.case_folders(id) on delete cascade,
  folder_slug text not null,
  category_id text not null,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists case_files_folder_category_idx
  on public.case_files (folder_slug, category_id, created_at desc);

alter table public.case_files enable row level security;

drop policy if exists "case_files_public_read" on public.case_files;
create policy "case_files_public_read"
  on public.case_files for select to anon, authenticated using (true);

drop policy if exists "case_files_public_insert" on public.case_files;
create policy "case_files_public_insert"
  on public.case_files for insert to anon, authenticated with check (true);

drop policy if exists "case_files_public_delete" on public.case_files;
create policy "case_files_public_delete"
  on public.case_files for delete to anon, authenticated using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('legal-case-files', 'legal-case-files', true, 52428800, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "legal_case_files_public_read" on storage.objects;
create policy "legal_case_files_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'legal-case-files');

drop policy if exists "legal_case_files_public_insert" on storage.objects;
create policy "legal_case_files_public_insert"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'legal-case-files');

drop policy if exists "legal_case_files_public_delete" on storage.objects;
create policy "legal_case_files_public_delete"
  on storage.objects for delete to anon, authenticated
  using (bucket_id = 'legal-case-files');
