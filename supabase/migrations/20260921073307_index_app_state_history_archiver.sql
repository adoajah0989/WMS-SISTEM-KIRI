create index if not exists app_state_history_archived_by_idx
  on public.app_state_history(archived_by);
