import type { PlatformAdapter } from '../types';
import type { OAuthTokens, PlatformEntity, CampaignConfig, AdSetConfig, AdConfig, Metrics, DateRange } from '@/types';

export class RealMetaAdapter implements PlatformAdapter {
  private accessToken: string | null = null;
  private adAccountId: string | null = null;

  async connect(credentials: OAuthTokens): Promise<void> {
    this.accessToken = credentials.access_token;
    const response = await fetch(`https://graph.facebook.com/v19.0/me/adaccounts?access_token=${this.accessToken}`);
    const data = await response.json();
    if (data.data?.[0]) this.adAccountId = data.data[0].id;
  }

  async createCampaign(plan: CampaignConfig): Promise<PlatformEntity> {
    const response = await fetch(`https://graph.facebook.com/v19.0/${this.adAccountId}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.accessToken}` },
      body: JSON.stringify({ name: plan.name, objective: plan.objective.toUpperCase(), status: 'PAUSED', daily_budget: Math.round(plan.daily_budget * 100), special_ad_categories: [] }),
    });
    const data = await response.json();
    return { platform_id: data.id, platform: 'meta', entity_type: 'campaign', name: plan.name, status: 'PAUSED' };
  }

  async createAdSet(campaignId: string, plan: AdSetConfig): Promise<PlatformEntity> {
    const response = await fetch(`https://graph.facebook.com/v19.0/${this.adAccountId}/adsets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.accessToken}` },
      body: JSON.stringify({
        name: plan.name, campaign_id: campaignId, status: 'PAUSED', billing_event: 'IMPRESSIONS', optimization_goal: 'CONVERSIONS',
        targeting: { age_min: plan.targeting.age_min, age_max: plan.targeting.age_max, geo_locations: { countries: plan.targeting.locations }, interests: plan.targeting.interests.map(i => ({ name: i })) },
      }),
    });
    const data = await response.json();
    return { platform_id: data.id, platform: 'meta', entity_type: 'ad_set', name: plan.name, status: 'PAUSED' };
  }

  async createAd(adSetId: string, plan: AdConfig): Promise<PlatformEntity> {
    const response = await fetch(`https://graph.facebook.com/v19.0/${this.adAccountId}/ads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.accessToken}` },
      body: JSON.stringify({ name: plan.name, adset_id: adSetId, creative: { body: plan.primary_text, title: plan.headline, description: plan.description, call_to_action_type: plan.call_to_action.toUpperCase().replace(/ /g, '_') }, status: 'PAUSED' }),
    });
    const data = await response.json();
    return { platform_id: data.id, platform: 'meta', entity_type: 'ad', name: plan.name, status: 'PAUSED' };
  }

  async getInsights(entityId: string, dateRange: DateRange): Promise<Metrics> {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${entityId}/insights?time_range={"since":"${dateRange.start}","until":"${dateRange.end}"}&fields=spend,impressions,clicks,actions,ctr,cpc,frequency,reach&access_token=${this.accessToken}`
    );
    const data = await response.json();
    const row = data.data?.[0] || {};
    const conversions = parseInt(row.actions?.find((a: { action_type: string }) => a.action_type === 'offsite_conversion')?.value || '0');
    const spend = parseFloat(row.spend || '0');

    return {
      spend, impressions: parseInt(row.impressions || '0'), clicks: parseInt(row.clicks || '0'), conversions,
      revenue: 0, ctr: parseFloat(row.ctr || '0'), cpc: parseFloat(row.cpc || '0'),
      cpa: conversions > 0 ? spend / conversions : 0, roas: 0,
      frequency: parseFloat(row.frequency || '0'), reach: parseInt(row.reach || '0'),
    };
  }

  async updateBudget(entityId: string, amount: number): Promise<void> {
    await fetch(`https://graph.facebook.com/v19.0/${entityId}`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_budget: Math.round(amount * 100) }),
    });
  }

  async updateStatus(entityId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void> {
    await fetch(`https://graph.facebook.com/v19.0/${entityId}`, {
      method: 'POST', headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  }
}
