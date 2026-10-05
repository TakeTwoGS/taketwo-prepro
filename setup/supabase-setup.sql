-- TakeTwo PrePro: database setup
-- Run this ONCE in Supabase: SQL Editor -> New query -> paste everything -> Run.
-- It is safe to run again if you are not sure it worked.

-- ---------- Tables ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  beginner_mode boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Untitled Film',
  status text not null default 'active' check (status in ('active', 'archived')),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One script per project for now.
-- content   = the screenplay, as a list of lines (scene heading, action, dialogue...)
-- scene_info = notes for each scene (props, wardrobe, production notes...)
-- stats     = a small summary used on the dashboard (pages, scenes...)
create table if not exists public.scripts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content jsonb not null default '[]'::jsonb,
  scene_info jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_updated_idx on public.projects (user_id, updated_at desc);

-- ---------- Privacy: every person only sees their own data ----------

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.scripts enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "own projects" on public.projects;
create policy "own projects" on public.projects
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "own scripts" on public.scripts;
create policy "own scripts" on public.scripts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- Keep "last edited" times correct ----------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists scripts_touch on public.scripts;
create trigger scripts_touch
  before update on public.scripts
  for each row execute function public.touch_updated_at();

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- When a script is saved, the project counts as edited too
create or replace function public.bump_project()
returns trigger
language plpgsql
as $$
begin
  update public.projects set updated_at = now() where id = new.project_id;
  return new;
end;
$$;

drop trigger if exists scripts_bump_project on public.scripts;
create trigger scripts_bump_project
  after update on public.scripts
  for each row execute function public.bump_project();
