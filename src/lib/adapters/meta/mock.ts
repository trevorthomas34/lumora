import type { PlatformAdapter } from '../types';
import type { OAuthTokens, PlatformEntity, CampaignConfig, AdSetConfig, AdConfig, Metrics, DateRange } from '@/types';

export class MockMetaAdapter implements PlatformAdapter {
  async connect(_credentials: OAuthTokens): Promise<void> {}

  async createCampaign(plan: CampaignConfig): Promise<PlatformEntity> {
    return { platform_id: `mock_meta_campaign_${Date.now()}`, platform: 'meta', entity_type: 'campaign', name: plan.name, status: 'ACTIVE' };
  }

  async createAdSet(_campaignId: string, plan: AdSetConfig): Promise<PlatformEntity> {
    return { platform_id: `mock_meta_adset_${Date.now()}`, platform: 'meta', entity_type: 'ad_set', name: plan.name, status: 'ACTIVE' };
  }

  async createAd(_adSetId: string, plan: AdConfig): Promise<PlatformEntity> {
    return { platform_id: `mock_meta_ad_${Date.now()}`, platform: 'meta', entity_type: 'ad', name: plan.name, status: 'ACTIVE' };
  }

  async getInsights(_entityId: string, dateRange: DateRange): Promise<Metrics> {
    const days = Math.max(1, Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24)));
    const spend = (45 + Math.random() * 20) * days;
    const impressions = Math.floor((2500 + Math.random() * 1500) * days);
    const clicks = Math.floor(impressions * (0.018 + Math.random() * 0.012));
    const conversions = Math.floor(clicks * (0.04 + Math.random() * 0.03));
    const revenue = conversions * (35 + Math.random() * 45);
    const reach = Math.floor(impressions * 0.7);

    return {
      spend: Math.round(spend * 100) / 100, impressions, clicks, conversions,
      revenue: Math.round(revenue * 100) / 100,
      ctr: clicks > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0,
      cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
      cpa: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0,
      roas: spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0,
      frequency: reach > 0 ? Math.round((impressions / reach) * 100) / 100 : 0,
      reach,
    };
  }

  async updateBudget(_entityId: string, _amount: number): Promise<void> {}
  async updateStatus(_entityId: string, _status: 'ACTIVE' | 'PAUSED'): Promise<void> {}
}
