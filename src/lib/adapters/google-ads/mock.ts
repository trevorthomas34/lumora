import type { PlatformAdapter } from '../types';
import type { OAuthTokens, PlatformEntity, CampaignConfig, AdSetConfig, AdConfig, Metrics, DateRange } from '@/types';

export class MockGoogleAdsAdapter implements PlatformAdapter {
  async connect(_credentials: OAuthTokens): Promise<void> {}

  async createCampaign(plan: CampaignConfig): Promise<PlatformEntity> {
    return { platform_id: `mock_gads_campaign_${Date.now()}`, platform: 'google_ads', entity_type: 'campaign', name: plan.name, status: 'ACTIVE' };
  }

  async createAdSet(_campaignId: string, plan: AdSetConfig): Promise<PlatformEntity> {
    return { platform_id: `mock_gads_adgroup_${Date.now()}`, platform: 'google_ads', entity_type: 'ad_set', name: plan.name, status: 'ACTIVE' };
  }

  async createAd(_adSetId: string, plan: AdConfig): Promise<PlatformEntity> {
    return { platform_id: `mock_gads_ad_${Date.now()}`, platform: 'google_ads', entity_type: 'ad', name: plan.name, status: 'ACTIVE' };
  }

  async getInsights(_entityId: string, dateRange: DateRange): Promise<Metrics> {
    const days = Math.max(1, Math.ceil((new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24)));
    const spend = (35 + Math.random() * 15) * days;
    const impressions = Math.floor((3000 + Math.random() * 2000) * days);
    const clicks = Math.floor(impressions * (0.03 + Math.random() * 0.02));
    const conversions = Math.floor(clicks * (0.05 + Math.random() * 0.03));
    const revenue = conversions * (40 + Math.random() * 30);
    const reach = Math.floor(impressions * 0.8);

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
