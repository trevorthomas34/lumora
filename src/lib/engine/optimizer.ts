import type { PerformanceSnapshot, Recommendation, CampaignEntity } from '@/types';
import { GUARDRAILS } from '../constants';

export function analyzePerformance(
  entity: CampaignEntity,
  snapshots: PerformanceSnapshot[],
  businessId: string
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  if (snapshots.length < 2) return recommendations;

  const recent = snapshots.slice(-3);
  const older = snapshots.slice(-7, -3);
  const recentAvg = averageMetrics(recent);
  const olderAvg = older.length > 0 ? averageMetrics(older) : null;

  // High spend, no conversions → pause
  if (recentAvg.spend > 0 && recentAvg.conversions === 0 && recent.length >= 3) {
    recommendations.push({
      id: '', business_id: businessId, entity_id: entity.id,
      type: 'pause_campaign', title: 'Consider Pausing — No Conversions',
      description: `This ${entity.entity_type.replace('_', ' ')} has spent $${recentAvg.spend.toFixed(2)}/day over ${recent.length} days with zero conversions.`,
      action: 'Pause this entity to stop spend', rationale: 'Continued spend without results wastes budget',
      estimated_impact: `Save ~$${(recentAvg.spend * 7).toFixed(2)}/week`, risk_level: 'low', confidence: 0.8,
      requires_approval: true, status: 'pending', created_at: new Date().toISOString(), resolved_at: null,
    });
  }

  // Creative fatigue: rising frequency + declining CTR
  if (olderAvg && recentAvg.frequency > GUARDRAILS.FREQUENCY_CAP_WARNING) {
    const ctrDecline = olderAvg.ctr > 0 ? ((olderAvg.ctr - recentAvg.ctr) / olderAvg.ctr) * 100 : 0;
    if (ctrDecline > GUARDRAILS.CTR_DECLINE_THRESHOLD_PERCENT) {
      recommendations.push({
        id: '', business_id: businessId, entity_id: entity.id,
        type: 'refresh_creative', title: 'Creative Fatigue Detected',
        description: `Frequency is ${recentAvg.frequency.toFixed(1)} and CTR declined ${ctrDecline.toFixed(0)}%.`,
        action: 'Refresh ad creative', rationale: 'Audience seeing same ads too often',
        estimated_impact: '15-30% CTR improvement potential', risk_level: 'low', confidence: 0.75,
        requires_approval: true, status: 'pending', created_at: new Date().toISOString(), resolved_at: null,
      });
    }
  }

  // Rising CPA → decrease budget
  if (olderAvg && recentAvg.cpa > 0 && olderAvg.cpa > 0) {
    const cpaIncrease = ((recentAvg.cpa - olderAvg.cpa) / olderAvg.cpa) * 100;
    if (cpaIncrease > 30) {
      recommendations.push({
        id: '', business_id: businessId, entity_id: entity.id,
        type: 'decrease_budget', title: 'Rising CPA — Consider Budget Reduction',
        description: `CPA increased ${cpaIncrease.toFixed(0)}% from $${olderAvg.cpa.toFixed(2)} to $${recentAvg.cpa.toFixed(2)}.`,
        action: 'Reduce daily budget by 20%', rationale: 'Performance declining; reduce to limit downside',
        estimated_impact: `Save ~$${(recentAvg.spend * 0.2 * 7).toFixed(2)}/week`, risk_level: 'medium', confidence: 0.65,
        requires_approval: true, status: 'pending', created_at: new Date().toISOString(), resolved_at: null,
      });
    }
  }

  return recommendations;
}

function averageMetrics(snapshots: PerformanceSnapshot[]) {
  const n = snapshots.length || 1;
  const t = snapshots.reduce((a, s) => ({
    spend: a.spend + s.spend, impressions: a.impressions + s.impressions, clicks: a.clicks + s.clicks,
    conversions: a.conversions + s.conversions, ctr: a.ctr + s.ctr, cpa: a.cpa + s.cpa, frequency: a.frequency + s.frequency,
  }), { spend: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpa: 0, frequency: 0 });
  return { spend: t.spend / n, impressions: t.impressions / n, clicks: t.clicks / n, conversions: t.conversions / n, ctr: t.ctr / n, cpa: t.cpa / n, frequency: t.frequency / n };
}
