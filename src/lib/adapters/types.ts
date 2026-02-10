import type {
  OAuthTokens,
  PlatformEntity,
  CampaignConfig,
  AdSetConfig,
  AdConfig,
  Metrics,
  DateRange,
  DriveFile,
  DriveFolder,
} from '@/types';

export interface PlatformAdapter {
  connect(credentials: OAuthTokens): Promise<void>;
  createCampaign(plan: CampaignConfig): Promise<PlatformEntity>;
  createAdSet(campaignId: string, plan: AdSetConfig): Promise<PlatformEntity>;
  createAd(adSetId: string, plan: AdConfig): Promise<PlatformEntity>;
  getInsights(entityId: string, dateRange: DateRange): Promise<Metrics>;
  updateBudget(entityId: string, amount: number): Promise<void>;
  updateStatus(entityId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void>;
}

export interface DriveAdapter {
  connect(credentials: OAuthTokens): Promise<void>;
  listFolders(parentId?: string): Promise<DriveFolder[]>;
  listFiles(folderId: string): Promise<DriveFile[]>;
  getFileUrl(fileId: string): Promise<string>;
  getThumbnailUrl(fileId: string): Promise<string>;
}

export function getPlatformAdapter(platform: 'meta' | 'google_ads'): PlatformAdapter {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (isDemoMode) {
    if (platform === 'meta') {
      const { MockMetaAdapter } = require('./meta/mock');
      return new MockMetaAdapter();
    } else {
      const { MockGoogleAdsAdapter } = require('./google-ads/mock');
      return new MockGoogleAdsAdapter();
    }
  } else {
    if (platform === 'meta') {
      const { RealMetaAdapter } = require('./meta/real');
      return new RealMetaAdapter();
    } else {
      const { MockGoogleAdsAdapter } = require('./google-ads/mock');
      return new MockGoogleAdsAdapter();
    }
  }
}

export function getDriveAdapter(): DriveAdapter {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (isDemoMode) {
    const { MockDriveAdapter } = require('./drive/mock');
    return new MockDriveAdapter();
  } else {
    const { RealDriveAdapter } = require('./drive/real');
    return new RealDriveAdapter();
  }
}
