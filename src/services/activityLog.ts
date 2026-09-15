import { supabase } from '../lib/supabase';

export type ActivityAction = 'create' | 'update' | 'delete' | 'status' | 'stock' | 'import' | 'system';

export const recordActivity = async (
  action: ActivityAction,
  entityType: string,
  entityId: string | null,
  description: string,
  metadata: Record<string, unknown> = {},
) => {
  if (!supabase) return;
  const { error } = await supabase.from('activity_log').insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    description,
    metadata,
  });
  if (error) console.error('Activity log failed', error);
};
