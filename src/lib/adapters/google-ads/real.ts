import type { PlatformAdapter } from '../types';
import type { OAuthTokens, PlatformEntity, CampaignConfig, AdSetConfig, AdConfig, Metrics, DateRange } from '@/types';

// Google Ads real adapter — stubbed for V1. Will be implemented when API developer access is approved.
export class RealGoogleAdsAdapter implements PlatformAdapter {
  async connect(_credentials: OAuthTokens): Promise<void> { throw new Error('Google Ads real adapter not yet implemented.'); }
  async createCampaign(_plan: CampaignConfig): Promise<PlatformEntity> { throw new Error('Not implemented'); }
  async createAdSet(_campaignId: string, _plan: AdSetConfig): Promise<PlatformEntity> { throw new Error('Not implemented'); }
  async createAd(_adSetId: string, _plan: AdConfig): Promise<PlatformEntity> { throw new Error('Not implemented'); }
  async getInsights(_entityId: string, _dateRange: DateRange): Promise<Metrics> { throw new Error('Not implemented'); }
  async updateBudget(_entityId: string, _amount: number): Promise<void> { throw new Error('Not implemented'); }
  async updateStatus(_entityId: string, _status: 'ACTIVE' | 'PAUSED'): Promise<void> { throw new Error('Not implemented'); }
}
