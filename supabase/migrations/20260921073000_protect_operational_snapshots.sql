-- Preserve every previous snapshot and reject accidental destructive replacements.
create table if not exists public.app_state_history (
  id bigint generated always as identity primary key,
  state_id bigint not null,
  payload jsonb not null,
  version bigint not null,
  archived_at timestamptz not null default now(),
  archived_by uuid null references auth.users(id)
);

create index if not exists app_state_history_archived_by_idx on public.app_state_history(archived_by);

alter table public.app_state_history enable row level security;
grant select on public.app_state_history to authenticated;

drop policy if exists "masters read app state history" on public.app_state_history;
create policy "masters read app state history"
on public.app_state_history for select
to authenticated
using ((select private.is_master()));

create or replace function private.archive_and_guard_app_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  collection_key text;
  old_count integer;
  new_count integer;
  protected_keys constant text[] := array[
    'kiri_warehouse_items', 'kiri_requisitions', 'kiri_purchase_orders',
    'kiri_goods_receipts', 'kiri_stock_movements', 'kiri_stock_opnames',
    'kiri_store_transfers', 'kiri_suppliers', 'kiri_warehouses',
    'kiri_inventory_categories'
  ];
begin
  foreach collection_key in array protected_keys loop
    if jsonb_typeof(coalesce(new.payload -> collection_key, 'null'::jsonb)) <> 'array' then
      raise exception 'Snapshot ditolak: koleksi % hilang atau bukan array', collection_key;
    end if;

    old_count := jsonb_array_length(coalesce(old.payload -> collection_key, '[]'::jsonb));
    new_count := jsonb_array_length(new.payload -> collection_key);

    if old_count >= 3 and new_count = 0 then
      raise exception 'Snapshot ditolak: koleksi % tidak boleh dikosongkan (% menjadi 0)', collection_key, old_count;
    end if;

    if old_count >= 10 and new_count * 2 < old_count then
      raise exception 'Snapshot ditolak: pengurangan massal koleksi % (% menjadi %)', collection_key, old_count, new_count;
    end if;
  end loop;

  insert into public.app_state_history(state_id, payload, version, archived_by)
  values (old.id, old.payload, old.version, auth.uid());
  return new;
end;
$$;

revoke all on function private.archive_and_guard_app_state() from public, anon, authenticated;

drop trigger if exists archive_and_guard_app_state_before_update on public.app_state;
create trigger archive_and_guard_app_state_before_update
before update of payload on public.app_state
for each row execute function private.archive_and_guard_app_state();

comment on table public.app_state_history is
  'Append-only backup of every app_state version before replacement. Used for disaster recovery.';
