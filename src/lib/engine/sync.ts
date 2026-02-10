import { createServiceRoleClient } from '../supabase/server';
import { getPlatformAdapter } from '../adapters/types';
import { analyzePerformance } from './optimizer';
import type { CampaignEntity, Platform } from '@/types';
import { format, subDays } from 'date-fns';

export async function runDailySync(businessId: string) {
  const supabase = createServiceRoleClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const { data: entities } = await supabase
    .from('campaign_entities')
    .select('*')
    .eq('business_id', businessId)
    .in('status', ['active', 'creating']);

  if (!entities || entities.length === 0) return;

  const byPlatform = entities.reduce<Record<string, CampaignEntity[]>>((acc, e) => {
    if (!acc[e.platform]) acc[e.platform] = [];
    acc[e.platform].push(e);
    return acc;
  }, {});

  for (const [platform, platformEntities] of Object.entries(byPlatform)) {
    const adapter = getPlatformAdapter(platform as 'meta' | 'google_ads');

    for (const entity of platformEntities) {
      if (!entity.platform_entity_id) continue;
      try {
        const metrics = await adapter.getInsights(entity.platform_entity_id, { start: yesterday, end: today });
        await supabase.from('performance_snapshots').upsert({
          business_id: businessId, entity_id: entity.id, platform: platform as Platform,
          date: yesterday, ...metrics,
        }, { onConflict: 'entity_id,date' });
      } catch (error) {
        console.error(`Error syncing entity ${entity.id}:`, error);
      }
    }
  }

  for (const entity of entities) {
    const { data: snapshots } = await supabase
      .from('performance_snapshots').select('*').eq('entity_id', entity.id)
      .order('date', { ascending: true }).limit(14);

    if (snapshots && snapshots.length > 0) {
      const recs = analyzePerformance(entity, snapshots, businessId);
      for (const rec of recs) {
        await supabase.from('recommendations').insert({ ...rec, id: undefined });
      }
    }
  }

  await supabase.from('action_logs').insert({
    business_id: businessId, actor: 'agent', action_type: 'daily_sync',
    description: `Daily sync completed. Processed ${entities.length} entities.`,
  });
}
