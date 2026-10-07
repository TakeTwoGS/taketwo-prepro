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

-- =====================================================================
-- ZIP 3: schedule, cast and crew, equipment, call sheets, tasks
-- (Safe to run again. Run the whole file.)
-- =====================================================================

-- ---------- Cast and crew ----------
create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null default 'crew' check (kind in ('cast', 'crew')),
  name text not null,
  role text not null default '',
  plays text not null default '',
  email text not null default '',
  phone text not null default '',
  notes text not null default '',
  photo_path text,
  unavailable jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists people_project_idx on public.people (project_id);

-- ---------- Shoot days (the schedule, and the call sheet for each day) ----------
create table if not exists public.shoot_days (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label text not null default 'Day 1',
  date date,
  call_time text not null default '08:00',
  scene_ids jsonb not null default '[]'::jsonb,
  equip_checked jsonb not null default '{}'::jsonb,
  call_sheet jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shoot_days_project_idx on public.shoot_days (project_id, date);

-- ---------- Equipment: your own gear (shared across all your projects) ----------
create table if not exists public.equipment_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'Other',
  quantity integer not null default 1,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Which gear is used where: the whole project, one scene, one shot, or one shoot day
create table if not exists public.equipment_uses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null references public.equipment_items(id) on delete cascade,
  scope text not null check (scope in ('project', 'scene', 'shot', 'day')),
  target_id text,
  created_at timestamptz not null default now()
);
create unique index if not exists equipment_uses_unique
  on public.equipment_uses (project_id, item_id, scope, coalesce(target_id, ''));

-- ---------- Tasks ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  person_id uuid references public.people(id) on delete set null,
  due_date date,
  priority text not null default 'Medium',
  status text not null default 'To do',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_project_idx on public.tasks (project_id);

-- ---------- Privacy ----------
alter table public.people enable row level security;
alter table public.shoot_days enable row level security;
alter table public.equipment_items enable row level security;
alter table public.equipment_uses enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "own people" on public.people;
create policy "own people" on public.people for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own shoot days" on public.shoot_days;
create policy "own shoot days" on public.shoot_days for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own equipment" on public.equipment_items;
create policy "own equipment" on public.equipment_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own equipment uses" on public.equipment_uses;
create policy "own equipment uses" on public.equipment_uses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own tasks" on public.tasks;
create policy "own tasks" on public.tasks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.people to authenticated;
grant select, insert, update, delete on public.shoot_days to authenticated;
grant select, insert, update, delete on public.equipment_items to authenticated;
grant select, insert, update, delete on public.equipment_uses to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

drop trigger if exists people_touch on public.people;
create trigger people_touch before update on public.people
  for each row execute function public.touch_updated_at();
drop trigger if exists shoot_days_touch on public.shoot_days;
create trigger shoot_days_touch before update on public.shoot_days
  for each row execute function public.touch_updated_at();
drop trigger if exists equipment_items_touch on public.equipment_items;
create trigger equipment_items_touch before update on public.equipment_items
  for each row execute function public.touch_updated_at();
drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- ZIP 4: on-set mode, slate, collaboration (sharing, comments, versions)
-- (Safe to run again. Run the whole file.)
-- =====================================================================

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.projects add column if not exists slate jsonb not null default '{}'::jsonb;

-- ---------- On-set takes ----------
create table if not exists public.takes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  shot_id uuid not null references public.shots(id) on delete cascade,
  take_number integer not null default 1,
  rating text not null default '' check (rating in ('', 'good', 'bad', 'favorite')),
  director_note text not null default '',
  continuity_note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists takes_project_idx on public.takes (project_id, shot_id);

-- ---------- Script versions (Draft 1, Shooting Draft, ...) ----------
create table if not exists public.script_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  note text not null default '',
  content jsonb not null,
  scene_info jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists script_versions_project_idx on public.script_versions (project_id, created_at desc);

-- ---------- Comments on script lines ----------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  block_id text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null,
  quote text not null default '',
  mentions jsonb not null default '[]'::jsonb,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists comments_project_idx on public.comments (project_id);

-- ---------- Sharing ----------
create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('editor', 'commenter', 'viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists project_members_user_idx on public.project_members (user_id);

create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor', 'commenter', 'viewer')),
  invited_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists project_invites_unique on public.project_invites (project_id, lower(email));

-- ---------- Who can do what ----------
-- These helpers answer "what is my role in this project?" without tripping over the privacy rules themselves.
create or replace function public.project_role(pid uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select case
    when p.user_id = auth.uid() then 'owner'
    else (select m.role from public.project_members m where m.project_id = p.id and m.user_id = auth.uid())
  end
  from public.projects p where p.id = pid
$$;

create or replace function public.can_view(pid uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select public.project_role(pid) is not null $$;

create or replace function public.can_comment(pid uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.project_role(pid) in ('owner', 'editor', 'commenter'), false) $$;

create or replace function public.can_edit(pid uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.project_role(pid) in ('owner', 'editor'), false) $$;

create or replace function public.is_owner(pid uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce(public.project_role(pid) = 'owner', false) $$;

create or replace function public.shares_project_with(uid uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where (p.user_id = auth.uid() and exists (select 1 from public.project_members m where m.project_id = p.id and m.user_id = uid))
       or (p.user_id = uid and exists (select 1 from public.project_members m where m.project_id = p.id and m.user_id = auth.uid()))
  ) or exists (
    select 1 from public.project_members a join public.project_members b on a.project_id = b.project_id
    where a.user_id = auth.uid() and b.user_id = uid
  )
$$;

create or replace function public.item_visible(iid uuid) returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.equipment_uses u where u.item_id = iid and public.can_view(u.project_id))
$$;

create or replace function public.can_view_path(object_name text) returns boolean
language sql stable security definer set search_path = public
as $$
  select case
    when (storage.foldername(object_name))[2] ~ '^[0-9a-fA-F-]{36}$'
      then public.can_view(((storage.foldername(object_name))[2])::uuid)
    else false
  end
$$;

-- Accept any invites that were sent to my email address
create or replace function public.accept_invites() returns integer
language plpgsql security definer set search_path = public
as $$
declare
  n integer := 0;
  em text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if em = '' or auth.uid() is null then
    return 0;
  end if;
  with moved as (
    delete from public.project_invites where lower(email) = em returning project_id, role, invited_by
  )
  insert into public.project_members (project_id, user_id, role, invited_by)
  select project_id, auth.uid(), role, invited_by from moved
  on conflict (project_id, user_id) do update set role = excluded.role;
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function public.accept_invites() to authenticated;

-- Only the owner can hand a project to someone else (and nobody can by accident)
create or replace function public.keep_project_owner() returns trigger
language plpgsql
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'The owner of a project cannot be changed';
  end if;
  return new;
end;
$$;
drop trigger if exists projects_keep_owner on public.projects;
create trigger projects_keep_owner before update on public.projects
  for each row execute function public.keep_project_owner();

-- ---------- Privacy rules, now aware of sharing ----------
alter table public.takes enable row level security;
alter table public.script_versions enable row level security;
alter table public.comments enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;

-- projects
drop policy if exists "own projects" on public.projects;
drop policy if exists "projects read" on public.projects;
drop policy if exists "projects add" on public.projects;
drop policy if exists "projects change" on public.projects;
drop policy if exists "projects remove" on public.projects;
create policy "projects read" on public.projects for select to authenticated
  using (user_id = auth.uid() or public.can_view(id));
create policy "projects add" on public.projects for insert to authenticated
  with check (user_id = auth.uid());
create policy "projects change" on public.projects for update to authenticated
  using (user_id = auth.uid() or public.can_edit(id)) with check (user_id = auth.uid() or public.can_edit(id));
create policy "projects remove" on public.projects for delete to authenticated
  using (user_id = auth.uid());

-- everything that lives inside a project
drop policy if exists "own scripts" on public.scripts;
drop policy if exists "own shots" on public.shots;
drop policy if exists "own characters" on public.characters;
drop policy if exists "own locations" on public.locations;
drop policy if exists "own breakdown" on public.breakdown_items;
drop policy if exists "own people" on public.people;
drop policy if exists "own shoot days" on public.shoot_days;
drop policy if exists "own equipment uses" on public.equipment_uses;
drop policy if exists "own tasks" on public.tasks;

do $$
declare t text;
begin
  foreach t in array array['scripts', 'shots', 'characters', 'locations', 'breakdown_items', 'people', 'shoot_days', 'equipment_uses', 'tasks', 'takes', 'script_versions'] loop
    execute format('drop policy if exists "members read" on public.%I', t);
    execute format('drop policy if exists "editors add" on public.%I', t);
    execute format('drop policy if exists "editors change" on public.%I', t);
    execute format('drop policy if exists "editors remove" on public.%I', t);
    execute format('create policy "members read" on public.%I for select to authenticated using (public.can_view(project_id))', t);
    execute format('create policy "editors add" on public.%I for insert to authenticated with check (public.can_edit(project_id) and user_id = auth.uid())', t);
    execute format('create policy "editors change" on public.%I for update to authenticated using (public.can_edit(project_id)) with check (public.can_edit(project_id))', t);
    execute format('create policy "editors remove" on public.%I for delete to authenticated using (public.can_edit(project_id))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- comments: anyone who can comment may add; you change your own (editors can tidy up any)
drop policy if exists "members read" on public.comments;
drop policy if exists "commenters add" on public.comments;
drop policy if exists "commenters change" on public.comments;
drop policy if exists "commenters remove" on public.comments;
create policy "members read" on public.comments for select to authenticated using (public.can_view(project_id));
create policy "commenters add" on public.comments for insert to authenticated
  with check (public.can_comment(project_id) and user_id = auth.uid());
create policy "commenters change" on public.comments for update to authenticated
  using (user_id = auth.uid() or public.can_edit(project_id)) with check (user_id = auth.uid() or public.can_edit(project_id));
create policy "commenters remove" on public.comments for delete to authenticated
  using (user_id = auth.uid() or public.can_edit(project_id));
grant select, insert, update, delete on public.comments to authenticated;

-- members and invites
drop policy if exists "members see members" on public.project_members;
drop policy if exists "owner changes members" on public.project_members;
drop policy if exists "owner or self removes members" on public.project_members;
create policy "members see members" on public.project_members for select to authenticated using (public.can_view(project_id));
create policy "owner changes members" on public.project_members for update to authenticated
  using (public.is_owner(project_id)) with check (public.is_owner(project_id));
create policy "owner or self removes members" on public.project_members for delete to authenticated
  using (public.is_owner(project_id) or user_id = auth.uid());
grant select, update, delete on public.project_members to authenticated;

drop policy if exists "owner manages invites" on public.project_invites;
create policy "owner manages invites" on public.project_invites for all to authenticated
  using (public.is_owner(project_id)) with check (public.is_owner(project_id) and invited_by = auth.uid());
grant select, insert, update, delete on public.project_invites to authenticated;

-- profiles: your own, plus the names and pictures of people you share a project with
drop policy if exists "own profile" on public.profiles;
drop policy if exists "profiles own" on public.profiles;
drop policy if exists "profiles teammates read" on public.profiles;
create policy "profiles own" on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles teammates read" on public.profiles for select to authenticated
  using (public.shares_project_with(id));

-- gear: yours, plus gear that is used in a project you can see
drop policy if exists "own equipment" on public.equipment_items;
drop policy if exists "equipment read" on public.equipment_items;
drop policy if exists "equipment add" on public.equipment_items;
drop policy if exists "equipment change" on public.equipment_items;
drop policy if exists "equipment remove" on public.equipment_items;
create policy "equipment read" on public.equipment_items for select to authenticated
  using (user_id = auth.uid() or public.item_visible(id));
create policy "equipment add" on public.equipment_items for insert to authenticated with check (user_id = auth.uid());
create policy "equipment change" on public.equipment_items for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "equipment remove" on public.equipment_items for delete to authenticated using (user_id = auth.uid());

-- pictures: your own folder, plus any project you can see
drop policy if exists "own images read" on storage.objects;
create policy "own images read" on storage.objects for select to authenticated
  using (bucket_id = 'project-images' and ((storage.foldername(name))[1] = auth.uid()::text or public.can_view_path(name)));

-- ---------- Live updates ----------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['projects', 'scripts', 'shots', 'characters', 'locations', 'breakdown_items', 'people', 'shoot_days', 'equipment_uses', 'tasks', 'takes', 'comments', 'script_versions', 'project_members'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

drop trigger if exists comments_touch on public.comments;
create trigger comments_touch before update on public.comments
  for each row execute function public.touch_updated_at();
