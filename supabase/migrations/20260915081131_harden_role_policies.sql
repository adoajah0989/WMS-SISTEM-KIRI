-- Keep SECURITY DEFINER helpers outside the schemas exposed by the Data API.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.is_active_user() set schema private;
alter function public.is_master() set schema private;

alter function private.is_active_user() set search_path = '';
alter function private.is_master() set search_path = '';
revoke all on function private.is_active_user() from public, anon;
revoke all on function private.is_master() from public, anon;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.is_master() to authenticated;

-- Recreate policies with init-plan friendly auth/function calls.
drop policy "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select private.is_master()));

drop policy "masters update profiles" on public.profiles;
create policy "masters update profiles" on public.profiles
for update to authenticated
using ((select private.is_master()))
with check ((select private.is_master()));

drop policy "active users read wms" on public.app_state;
create policy "active users read wms" on public.app_state
for select to authenticated
using ((select private.is_active_user()));

drop policy "operational roles write wms" on public.app_state;
create policy "operational roles write wms" on public.app_state
for insert to authenticated
with check (
  (select private.is_active_user())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('master', 'manajer', 'purchasing', 'warehouse')
  )
);

drop policy "operational roles update wms" on public.app_state;
create policy "operational roles update wms" on public.app_state
for update to authenticated
using (
  (select private.is_active_user())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('master', 'manajer', 'purchasing', 'warehouse')
  )
)
with check (
  (select private.is_active_user())
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('master', 'manajer', 'purchasing', 'warehouse')
  )
);

drop policy "masters read activity" on public.activity_log;
create policy "masters read activity" on public.activity_log
for select to authenticated
using ((select private.is_master()));

create index if not exists app_state_updated_by_idx on public.app_state (updated_by);
