-- Run once in Supabase Dashboard → SQL Editor
-- Project: fzkdywytihenesxcaqfg

create extension if not exists "pgcrypto";

create table if not exists public.case_folders (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  opponent text not null default 'دعوى مع الخصم',
  case_ref text not null,
  sort_order int not null default 0,
  accent text,
  created_at timestamptz not null default now()
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null unique references public.case_folders(id) on delete cascade,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.case_folders enable row level security;
alter table public.complaints enable row level security;

drop policy if exists "case_folders_public_read" on public.case_folders;
create policy "case_folders_public_read"
  on public.case_folders
  for select
  to anon, authenticated
  using (true);

drop policy if exists "complaints_public_read" on public.complaints;
create policy "complaints_public_read"
  on public.complaints
  for select
  to anon, authenticated
  using (true);

drop policy if exists "complaints_public_write" on public.complaints;
create policy "complaints_public_write"
  on public.complaints
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "complaints_public_update" on public.complaints;
create policy "complaints_public_update"
  on public.complaints
  for update
  to anon, authenticated
  using (true)
  with check (true);

insert into public.case_folders (slug, name, opponent, case_ref, sort_order, accent)
values
  ('patrick-sayf', 'باتريك سيف', 'دعوى مع الخصم', 'ملف ١', 1, 'folder-accent-1'),
  ('folder-2', 'ملف ٢', 'دعوى مع الخصم', 'ملف ٢', 2, 'folder-accent-2'),
  ('folder-3', 'ملف ٣', 'دعوى مع الخصم', 'ملف ٣', 3, 'folder-accent-3'),
  ('folder-4', 'ملف ٤', 'دعوى مع الخصم', 'ملف ٤', 4, 'folder-accent-4')
on conflict (slug) do update set
  name = excluded.name,
  opponent = excluded.opponent,
  case_ref = excluded.case_ref,
  sort_order = excluded.sort_order,
  accent = excluded.accent;
