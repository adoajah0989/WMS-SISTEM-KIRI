-- KIRI WMS production foundation
create extension if not exists pgcrypto;

create type public.app_role as enum ('master', 'manajer', 'purchasing', 'warehouse', 'viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.app_role not null default 'viewer',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_state (
  id bigint primary key check (id = 1),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.profiles enable row level security;
alter table public.app_state enable row level security;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select is_active from public.profiles where id = auth.uid()), false) $$;

create or replace function public.is_master()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select role = 'master' and is_active from public.profiles where id = auth.uid()), false) $$;

create policy "users read own profile" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_master());

create policy "masters update profiles" on public.profiles
for update to authenticated using (public.is_master()) with check (public.is_master());

create policy "active users read wms" on public.app_state
for select to authenticated using (public.is_active_user());

create policy "operational roles write wms" on public.app_state
for insert to authenticated
with check (
  public.is_active_user()
  and exists (select 1 from public.profiles where id = auth.uid() and role in ('master','manajer','purchasing','warehouse'))
);

create policy "operational roles update wms" on public.app_state
for update to authenticated
using (
  public.is_active_user()
  and exists (select 1 from public.profiles where id = auth.uid() and role in ('master','manajer','purchasing','warehouse'))
)
with check (
  public.is_active_user()
  and exists (select 1 from public.profiles where id = auth.uid() and role in ('master','manajer','purchasing','warehouse'))
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, full_name, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when first_user then 'master'::public.app_role else 'viewer'::public.app_role end,
    first_user
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_app_state_audit()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

create trigger app_state_audit
before insert or update on public.app_state
for each row execute function public.set_app_state_audit();

insert into public.app_state (id, payload)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

revoke all on function public.is_active_user() from public;
revoke all on function public.is_master() from public;
grant execute on function public.is_active_user() to authenticated;
grant execute on function public.is_master() to authenticated;
