-- Multi-warehouse user scope.
-- Existing operational snapshot rows without warehouseId remain assigned to Warehouse Aceh
-- by the application compatibility layer.
alter table public.profiles
  add column if not exists warehouse_ids text[] not null default array['wh-aceh']::text[];

update public.profiles
set warehouse_ids = array['wh-jkt','wh-aceh','wh-roti']::text[],
    updated_at = now()
where role in ('master','manajer','purchasing');

update public.profiles
set warehouse_ids = array['wh-aceh']::text[],
    updated_at = now()
where role in ('warehouse','viewer')
  and (warehouse_ids is null or cardinality(warehouse_ids) = 0);

comment on column public.profiles.warehouse_ids is
  'Warehouse IDs available to this user. Authorization remains protected by profiles RLS.';
