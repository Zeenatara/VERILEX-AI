-- VeriLex core schema: profiles + analyses, with RLS locked to the owning user.
-- Safe to re-run. Never drops tables.

create extension if not exists pgcrypto;

-- =========================================================
-- profiles
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Insert is normally handled by the handle_new_user trigger below (security
-- definer, so it does not need its own RLS policy), but this covers a client
-- that wants to (re)write its own profile row directly.
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- =========================================================
-- Auto-create a profile row whenever a new auth user signs up.
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- =========================================================
-- analyses
-- Works on a fresh database AND on a project that already has an older
-- "analyses" table (id, user_id, input_text, overall_result, created_at):
-- missing columns are added in place, nothing is dropped, and tables that
-- reference analyses (e.g. safety_checks, red_team_tests) keep working.
-- =========================================================
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  question text,
  answer text,
  jurisdiction text,
  summary text,
  result jsonb,
  created_at timestamptz not null default now()
);

alter table public.analyses add column if not exists question text;
alter table public.analyses add column if not exists answer text;
alter table public.analyses add column if not exists jurisdiction text;
alter table public.analyses add column if not exists summary text;
alter table public.analyses add column if not exists result jsonb;

-- Older schema required input_text; the app no longer writes it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analyses'
      and column_name = 'input_text'
  ) then
    alter table public.analyses alter column input_text drop not null;
  end if;
end $$;

create index if not exists analyses_user_id_idx on public.analyses (user_id);
create index if not exists analyses_created_at_idx on public.analyses (created_at desc);

alter table public.analyses enable row level security;

-- Replace any pre-existing policies so an overly permissive old one cannot
-- defeat the owner-only rules below.
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'analyses'
  loop
    execute format('drop policy %I on public.analyses', pol.policyname);
  end loop;
end $$;

create policy "analyses_select_own"
  on public.analyses for select
  to authenticated
  using (auth.uid() = user_id);

create policy "analyses_insert_own"
  on public.analyses for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "analyses_delete_own"
  on public.analyses for delete
  to authenticated
  using (auth.uid() = user_id);

-- No update policy: the app never edits a stored analysis in place.

-- Make the API layer (PostgREST) pick up the new/changed tables immediately.
notify pgrst, 'reload schema';
