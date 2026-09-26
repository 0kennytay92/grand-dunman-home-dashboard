-- ════════════════════════════════════════════════════════════
-- Grand Dunman Home – online database setup
-- Paste this whole file into Supabase → SQL Editor → Run.
-- It is safe to run more than once.
--
-- What it creates:
--   homes         a household (e.g. "Grand Dunman Home")
--   home_members  who belongs to each home
--   home_invites  email invitations waiting to be accepted
--   items         every room, measurement, photo, design, payment…
--                 (one row each, so edits on different devices merge)
--   home-images   private storage for photos and renders
--
-- Security: only members of a home can see or change its data.
-- ════════════════════════════════════════════════════════════

-- ── Tables ──────────────────────────────────────────────────

create table if not exists public.homes (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our home',
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.home_members (
  home_id uuid not null references public.homes on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  email text,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (home_id, user_id)
);

create table if not exists public.home_invites (
  home_id uuid not null references public.homes on delete cascade,
  email text not null check (email = lower(email)),
  invited_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  primary key (home_id, email)
);

create table if not exists public.items (
  home_id uuid not null references public.homes on delete cascade,
  collection text not null,
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid(),
  primary key (home_id, collection, id)
);
create index if not exists items_home_updated on public.items (home_id, updated_at);

-- ── Helpers ─────────────────────────────────────────────────

-- Is the signed-in person a member of this home?
create or replace function public.is_home_member(h uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.home_members where home_id = h and user_id = auth.uid());
$$;

create or replace function public.is_home_owner(h uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.home_members where home_id = h and user_id = auth.uid() and role = 'owner');
$$;

-- Whoever creates a home becomes its owner.
create or replace function public.add_home_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.home_members (home_id, user_id, email, role)
  values (new.id, new.created_by, lower(auth.jwt() ->> 'email'), 'owner')
  on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists homes_add_owner on public.homes;
create trigger homes_add_owner after insert on public.homes
  for each row execute function public.add_home_owner();

-- The server's clock decides the order of changes (devices' clocks may differ).
create or replace function public.stamp_item()
returns trigger language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists items_stamp on public.items;
create trigger items_stamp before insert or update on public.items
  for each row execute function public.stamp_item();

-- Joins every home you've been invited to (matched by your sign-in email).
create or replace function public.accept_invites()
returns integer language plpgsql security definer set search_path = public as $$
declare
  my_email text := lower(auth.jwt() ->> 'email');
  joined integer;
begin
  if auth.uid() is null or my_email is null then
    return 0;
  end if;
  with accepted as (
    delete from public.home_invites where email = my_email returning home_id
  )
  insert into public.home_members (home_id, user_id, email, role)
  select home_id, auth.uid(), my_email, 'member' from accepted
  on conflict do nothing;
  get diagnostics joined = row_count;
  return joined;
end;
$$;

-- ── Row level security (who may see and change what) ────────

alter table public.homes enable row level security;
alter table public.home_members enable row level security;
alter table public.home_invites enable row level security;
alter table public.items enable row level security;

drop policy if exists "members see their homes" on public.homes;
create policy "members see their homes" on public.homes
  for select to authenticated using (public.is_home_member(id) or created_by = auth.uid());
drop policy if exists "anyone signed in can create a home" on public.homes;
create policy "anyone signed in can create a home" on public.homes
  for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "members rename their home" on public.homes;
create policy "members rename their home" on public.homes
  for update to authenticated using (public.is_home_member(id)) with check (public.is_home_member(id));
drop policy if exists "owners delete their home" on public.homes;
create policy "owners delete their home" on public.homes
  for delete to authenticated using (public.is_home_owner(id));

drop policy if exists "members see fellow members" on public.home_members;
create policy "members see fellow members" on public.home_members
  for select to authenticated using (public.is_home_member(home_id));
drop policy if exists "leave, or owner removes" on public.home_members;
create policy "leave, or owner removes" on public.home_members
  for delete to authenticated using (user_id = auth.uid() or public.is_home_owner(home_id));

drop policy if exists "members manage invites" on public.home_invites;
create policy "members manage invites" on public.home_invites
  for all to authenticated using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));

drop policy if exists "members use items" on public.items;
create policy "members use items" on public.items
  for all to authenticated using (public.is_home_member(home_id)) with check (public.is_home_member(home_id));

grant select, insert, update, delete on public.homes, public.home_members, public.home_invites, public.items to authenticated;
grant execute on function public.accept_invites() to authenticated;
revoke all on public.homes, public.home_members, public.home_invites, public.items from anon;

-- ── Live updates between devices ────────────────────────────

do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'items'
  ) then
    alter publication supabase_realtime add table public.items;
  end if;
end;
$$;

-- ── Private storage for photos and renders ──────────────────
-- Files are stored as  <home id>/<image id>/full.jpg  and  …/thumb.jpg

insert into storage.buckets (id, name, public)
values ('home-images', 'home-images', false)
on conflict (id) do nothing;

create or replace function public.home_of_path(path text)
returns uuid language plpgsql immutable as $$
begin
  return split_part(path, '/', 1)::uuid;
exception when others then
  return null;
end;
$$;

drop policy if exists "members read home images" on storage.objects;
create policy "members read home images" on storage.objects
  for select to authenticated using (bucket_id = 'home-images' and public.is_home_member(public.home_of_path(name)));
drop policy if exists "members add home images" on storage.objects;
create policy "members add home images" on storage.objects
  for insert to authenticated with check (bucket_id = 'home-images' and public.is_home_member(public.home_of_path(name)));
drop policy if exists "members replace home images" on storage.objects;
create policy "members replace home images" on storage.objects
  for update to authenticated using (bucket_id = 'home-images' and public.is_home_member(public.home_of_path(name)));
drop policy if exists "members delete home images" on storage.objects;
create policy "members delete home images" on storage.objects
  for delete to authenticated using (bucket_id = 'home-images' and public.is_home_member(public.home_of_path(name)));
