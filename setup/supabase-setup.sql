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

-- ---------- Permissions: let logged-in people use the tables ----------

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.scripts to authenticated;

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

-- =====================================================================
-- ZIP 2: storyboards, shot lists, script breakdown, characters, locations
-- (Safe to run again. Run the whole file.)
-- =====================================================================

alter table public.projects add column if not exists board_ratio text not null default '16:9';

-- ---------- Shots ----------
-- One shot record powers BOTH the storyboard and the shot list.
-- on_board = shows on the storyboard, in_list = shows in the shot list.
create table if not exists public.shots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  position double precision not null default 0,
  on_board boolean not null default true,
  in_list boolean not null default false,
  scene_id text,
  description text not null default '',
  size text not null default '',
  angle text not null default '',
  movement text not null default '',
  dialogue text not null default '',
  duration numeric,
  notes text not null default '',
  image_path text,
  marks jsonb not null default '[]'::jsonb,
  lens text not null default '',
  fps text not null default '',
  camera text not null default '',
  audio text not null default '',
  equipment text not null default '',
  cast_note text not null default '',
  location_note text not null default '',
  setup_min integer,
  shoot_min integer,
  priority text not null default 'Medium',
  status text not null default 'Not Started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shots_project_idx on public.shots (project_id, position);

-- ---------- Characters ----------
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  aliases text not null default '',
  description text not null default '',
  actor text not null default '',
  costume text not null default '',
  props text not null default '',
  notes text not null default '',
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists characters_project_name_idx on public.characters (project_id, lower(name));

-- ---------- Locations ----------
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  aliases text not null default '',
  address text not null default '',
  contact text not null default '',
  parking text not null default '',
  power text not null default '',
  restrooms text not null default '',
  sound text not null default '',
  lighting text not null default '',
  permission text not null default 'Not asked yet',
  notes text not null default '',
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists locations_project_name_idx on public.locations (project_id, lower(name));

-- ---------- Script breakdown tags ----------
create table if not exists public.breakdown_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null,
  text text not null,
  block_id text,
  start_idx integer,
  end_idx integer,
  scene_id text,
  created_at timestamptz not null default now()
);
create index if not exists breakdown_project_idx on public.breakdown_items (project_id);

-- ---------- Privacy ----------
alter table public.shots enable row level security;
alter table public.characters enable row level security;
alter table public.locations enable row level security;
alter table public.breakdown_items enable row level security;

drop policy if exists "own shots" on public.shots;
create policy "own shots" on public.shots for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own characters" on public.characters;
create policy "own characters" on public.characters for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own locations" on public.locations;
create policy "own locations" on public.locations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own breakdown" on public.breakdown_items;
create policy "own breakdown" on public.breakdown_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.shots to authenticated;
grant select, insert, update, delete on public.characters to authenticated;
grant select, insert, update, delete on public.locations to authenticated;
grant select, insert, update, delete on public.breakdown_items to authenticated;

drop trigger if exists shots_touch on public.shots;
create trigger shots_touch before update on public.shots
  for each row execute function public.touch_updated_at();
drop trigger if exists characters_touch on public.characters;
create trigger characters_touch before update on public.characters
  for each row execute function public.touch_updated_at();
drop trigger if exists locations_touch on public.locations;
create trigger locations_touch before update on public.locations
  for each row execute function public.touch_updated_at();

-- ---------- Image storage (private: only you can see your pictures) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images', 'project-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "own images read" on storage.objects;
create policy "own images read" on storage.objects for select to authenticated
  using (bucket_id = 'project-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own images add" on storage.objects;
create policy "own images add" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own images change" on storage.objects;
create policy "own images change" on storage.objects for update to authenticated
  using (bucket_id = 'project-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'project-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own images delete" on storage.objects;
create policy "own images delete" on storage.objects for delete to authenticated
  using (bucket_id = 'project-images' and (storage.foldername(name))[1] = auth.uid()::text);
