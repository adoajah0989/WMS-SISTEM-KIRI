-- Prevent one browser session from silently overwriting a newer WMS snapshot.
alter table public.app_state
  add column if not exists version bigint not null default 0;

alter table public.app_state
  drop constraint if exists app_state_version_nonnegative;

alter table public.app_state
  add constraint app_state_version_nonnegative check (version >= 0);

create or replace function public.save_app_state(
  p_expected_version bigint,
  p_payload jsonb
)
returns table(new_version bigint, saved_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  return query
  update public.app_state
  set payload = p_payload,
      version = public.app_state.version + 1
  where id = 1
    and version = p_expected_version
  returning public.app_state.version, public.app_state.updated_at;
end;
$$;

revoke all on function public.save_app_state(bigint, jsonb) from public, anon;
grant execute on function public.save_app_state(bigint, jsonb) to authenticated;

-- Trigger functions run through their triggers and do not need direct API access.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_app_state_audit() from public, anon, authenticated;
