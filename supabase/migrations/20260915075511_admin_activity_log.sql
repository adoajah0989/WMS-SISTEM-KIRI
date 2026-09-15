-- Admin monitoring foundation. Existing WMS data remains in app_state.
alter table public.profiles add column email text;

update public.profiles as profile
set email = users.email
from auth.users as users
where users.id = profile.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when first_user then 'master'::public.app_role else 'viewer'::public.app_role end,
    first_user
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create table public.activity_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  action text not null check (action in ('create', 'update', 'delete', 'status', 'stock', 'import', 'system')),
  entity_type text not null,
  entity_id text,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.activity_log enable row level security;

create policy "active users append own activity"
on public.activity_log for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_active
  )
);

create policy "masters read activity"
on public.activity_log for select to authenticated
using ((select public.is_master()));

grant select, insert on public.activity_log to authenticated;
grant usage, select on sequence public.activity_log_id_seq to authenticated;

create index activity_log_created_at_idx on public.activity_log (created_at desc);
create index activity_log_user_id_idx on public.activity_log (user_id);

-- Prevent an admin from accidentally disabling or demoting the final active Master.
create or replace function public.prevent_last_active_master()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'master'::public.app_role
     and old.is_active
     and (new.role <> 'master'::public.app_role or not new.is_active)
     and not exists (
       select 1 from public.profiles
       where id <> old.id
         and role = 'master'::public.app_role
         and is_active
     ) then
    raise exception 'Minimal satu akun Master aktif harus tersedia.';
  end if;
  return new;
end;
$$;

create trigger protect_last_active_master
before update of role, is_active on public.profiles
for each row execute function public.prevent_last_active_master();

revoke all on function public.prevent_last_active_master() from public, anon, authenticated;
