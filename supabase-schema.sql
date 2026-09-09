-- =============================================================================
-- GymApp — Supabase schema
-- =============================================================================
-- Run this whole file once in the Supabase dashboard:
--   Project → SQL Editor → New query → paste → Run.
--
-- It is idempotent: safe to run again after edits.
--
-- Security model
--   * Row Level Security is ON for every table.
--   * A normal user can only ever SELECT / INSERT / UPDATE / DELETE their own
--     rows (user_id = auth.uid()).
--   * Admins are the rows of `public.admins`. They get read-only SELECT on
--     everyone's data, and can call the admin_* reporting functions.
--   * No "service_role" / secret key is used anywhere. The dashboard reads
--     through SECURITY DEFINER functions that themselves check is_admin().
-- =============================================================================

create extension if not exists pgcrypto;

-- =============================================================================
-- 1. profiles  (one row per auth user)
-- =============================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text        not null default '',
  avatar_url   text,
  age          integer,
  weight_kg    numeric,
  height_cm    numeric,
  daily_steps  integer,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- optional body metrics, added after the first release
alter table public.profiles add column if not exists age         integer;
alter table public.profiles add column if not exists weight_kg   numeric;
alter table public.profiles add column if not exists height_cm   numeric;
alter table public.profiles add column if not exists daily_steps integer;

alter table public.profiles enable row level security;

-- =============================================================================
-- 2. admins  (membership in this table == administrator)
--    No client may INSERT / UPDATE / DELETE here. You grant admin with the
--    one-time bootstrap SQL at the bottom of this file, from the SQL Editor.
-- =============================================================================
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Helper: is a given user an administrator?
-- SECURITY DEFINER so it can read `admins` regardless of the caller's RLS,
-- which also prevents recursive policy evaluation.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = uid);
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated, anon;

-- =============================================================================
-- 3. exercises  (personal exercise library)
-- =============================================================================
create table if not exists public.exercises (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  category   text not null default 'Perso',
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- personal per-exercise note, added after the first release
alter table public.exercises add column if not exists note text;

alter table public.exercises enable row level security;
create index if not exists exercises_user_id_idx on public.exercises (user_id);

-- =============================================================================
-- 4. templates  (reusable session templates; exercises stored as JSON)
-- =============================================================================
create table if not exists public.templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  exercises  jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.templates enable row level security;
create index if not exists templates_user_id_idx on public.templates (user_id);

-- =============================================================================
-- 5. workouts  (completed sessions; exercises + sets stored as JSON, with a
--    few denormalised columns so admin stats stay cheap)
-- =============================================================================
create table if not exists public.workouts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text,
  performed_at   timestamptz not null default now(),
  duration_min   integer not null default 0,
  exercises      jsonb   not null default '[]'::jsonb,
  exercise_count integer not null default 0,
  set_count      integer not null default 0,
  total_volume   numeric not null default 0,
  created_at     timestamptz not null default now()
);

-- for projects created before the `name` column existed
alter table public.workouts add column if not exists name text;

alter table public.workouts enable row level security;
create index if not exists workouts_user_id_idx      on public.workouts (user_id);
create index if not exists workouts_performed_at_idx on public.workouts (performed_at);

-- =============================================================================
-- 6. Auto-create a profile row when a user signs up
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 7. Table privileges (RLS still filters every row on top of these)
-- =============================================================================
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.profiles  to authenticated;
grant select, insert, update, delete on public.exercises to authenticated;
grant select, insert, update, delete on public.templates to authenticated;
grant select, insert, update, delete on public.workouts  to authenticated;
grant select on public.admins to authenticated;

-- =============================================================================
-- 8. Row Level Security policies
-- =============================================================================

-- ---- profiles ---------------------------------------------------------------
drop policy if exists "profiles_select_self"  on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_insert_self"  on public.profiles;
drop policy if exists "profiles_update_self"  on public.profiles;

create policy "profiles_select_self" on public.profiles
  for select to authenticated
  using (id = auth.uid());

create policy "profiles_select_admin" on public.profiles
  for select to authenticated
  using (public.is_admin());

create policy "profiles_insert_self" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---- admins ---------------------------------------------------------------
-- You may read your own admin row (so the app can show the admin entry);
-- admins may read all rows. Nobody can write from the client.
drop policy if exists "admins_select_self_or_admin" on public.admins;

create policy "admins_select_self_or_admin" on public.admins
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---- exercises ------------------------------------------------------------
drop policy if exists "exercises_owner_all" on public.exercises;

create policy "exercises_owner_all" on public.exercises
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- templates ---------------------------------------------------------------
drop policy if exists "templates_owner_all" on public.templates;

create policy "templates_owner_all" on public.templates
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- workouts ------------------------------------------------------------
drop policy if exists "workouts_owner_all"  on public.workouts;
drop policy if exists "workouts_select_admin" on public.workouts;

create policy "workouts_owner_all" on public.workouts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admins get read-only visibility (no insert/update/delete policy for them).
create policy "workouts_select_admin" on public.workouts
  for select to authenticated
  using (public.is_admin());

-- =============================================================================
-- 9. Admin reporting functions
--    SECURITY DEFINER + explicit is_admin() gate. Granted to `authenticated`
--    but they raise for anyone who is not in public.admins.
-- =============================================================================

create or replace function public.admin_overview()
returns table (
  total_users   bigint,
  total_workouts bigint,
  active_7d     bigint,
  active_30d    bigint,
  workouts_7d   bigint,
  total_volume  numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from auth.users),
    (select count(*) from public.workouts),
    (select count(distinct w.user_id) from public.workouts w
       where w.performed_at > now() - interval '7 days'),
    (select count(distinct w.user_id) from public.workouts w
       where w.performed_at > now() - interval '30 days'),
    (select count(*) from public.workouts w
       where w.performed_at > now() - interval '7 days'),
    (select coalesce(sum(w.total_volume), 0) from public.workouts w);
end;
$$;

revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

create or replace function public.admin_user_stats()
returns table (
  user_id         uuid,
  email           text,
  display_name    text,
  signed_up_at    timestamptz,
  workout_count   bigint,
  last_workout_at timestamptz,
  total_volume    numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.display_name,
    u.created_at,
    count(w.id),
    max(w.performed_at),
    coalesce(sum(w.total_volume), 0)
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.workouts w on w.user_id = u.id
  group by u.id, u.email, p.display_name, u.created_at
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_user_stats() from public, anon;
grant execute on function public.admin_user_stats() to authenticated;

-- =============================================================================
-- 10. ONE-TIME ADMIN BOOTSTRAP  ***  do this AFTER you have signed up  ***
-- =============================================================================
-- 1. Create your account in the app first (normal email + password sign-up).
-- 2. Come back here, in the Supabase SQL Editor (which runs as a privileged
--    role — this is NOT the app and NOT the service_role key in client code).
-- 3. Run the statement below, replacing the email with the EXACT address you
--    registered with. Your address is never hard-coded in the repo.
--
--     insert into public.admins (user_id)
--     select id from auth.users
--     where email = 'REPLACE_WITH_YOUR_SIGNUP_EMAIL'
--     on conflict (user_id) do nothing;
--
-- 4. Verify:
--
--     select u.email, a.created_at
--     from public.admins a
--     join auth.users u on u.id = a.user_id;
--
-- To revoke admin later:
--
--     delete from public.admins
--     where user_id = (select id from auth.users where email = 'that-email');
-- =============================================================================
