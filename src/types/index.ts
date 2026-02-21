// ============ Business ============
export interface Business {
  id: string;
  user_id: string;
  name: string;
  website_url: string | null;
  offer_description: string | null;
  target_locations: string[];
  daily_budget: number | null;
  monthly_budget: number | null;
  goal: BusinessGoal | null;
  brand_voice: string | null;
  competitors: string[];
  tone: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type BusinessGoal = 'leads' | 'purchases' | 'bookings' | 'traffic';

// ============ Connections ============
export interface Connection {
  id: string;
  business_id: string;
  platform: Platform;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  platform_account_id: string | null;
  platform_account_name: string | null;
  pixel_id: string | null;
  scopes: string[];
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
}

export type Platform = 'meta' | 'google_ads' | 'google_drive';
export type ConnectionStatus = 'active' | 'expired' | 'revoked' | 'pending';

// ============ Brand Brief ============
export interface BrandBrief {
  id: string;
  business_id: string;
  version: number;
  brief_data: BrandBriefData;
  status: 'draft' | 'approved' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface BrandBriefData {
  // Core (always present)
  company_summary: string;
  services_offered: string[];
  value_proposition: string;
  target_audience: TargetAudience;
  brand_voice: BrandVoice;
  key_messages: string[];
  competitive_positioning: string;
  recommended_angles: AdAngle[];

  // Performance marketing intelligence (added by new prompts)
  business_type?: 'local_service' | 'service' | 'ecommerce' | 'saas' | 'b2b' | 'marketplace';
  conversion_event?: string;      // e.g. "Book a free consultation call"
  offer_hook?: string;            // e.g. "Free 30-min strategy session — no pitch"
  objections?: string[];          // Real reasons people don't buy
  proof_points?: string[];        // Social proof available/needed
  sales_cycle?: 'impulse' | 'short' | 'medium' | 'long';
}

export interface TargetAudience {
  demographics: string;
  psychographics: string;
  pain_points: string[];
  desires: string[];
  precipitating_event?: string;   // What triggered them to start looking
}

export interface BrandVoice {
  tone: string;
  style: string;
  do_say: string[];
  dont_say: string[];
}

export interface AdAngle {
  name: string;
  framework: string;              // 'PAS' | 'Social Proof' | 'Before/After' | 'Direct Offer' | 'Curiosity'
  hook: string;                   // The opening line / interrupt
  description: string;
  draft_primary_text?: string;    // Full draft ad copy for this angle
}

// ============ Creative Assets ============
export interface CreativeAsset {
  id: string;
  business_id: string;
  drive_file_id: string | null;
  file_name: string;
  file_type: string;
  mime_type: string;
  thumbnail_url: string | null;
  file_url: string | null;
  file_size: number | null;
  selected: boolean;
  created_at: string;
}

// ============ Campaign Plans ============
export interface CampaignPlan {
  id: string;
  business_id: string;
  name: string;
  plan_data: CampaignPlanData;
  status: CampaignPlanStatus;
  created_at: string;
  updated_at: string;
}

export type CampaignPlanStatus = 'draft' | 'pending_approval' | 'approved' | 'launched' | 'archived';

export interface CampaignPlanData {
  campaigns: CampaignConfig[];
  strategy_summary: string;
  estimated_daily_spend: number;
  estimated_monthly_results: string;
}

export interface CampaignConfig {
  temp_id: string;
  name: string;
  objective: string;
  daily_budget: number;
  ad_sets: AdSetConfig[];
}

export interface AdSetConfig {
  temp_id: string;
  name: string;
  targeting: TargetingConfig;
  placements: string[];
  ads: AdConfig[];
}

export interface TargetingConfig {
  age_min: number;
  age_max: number;
  genders: string[];
  locations: string[];
  interests: string[];
  custom_audiences: string[];
}

export interface AdConfig {
  temp_id: string;
  name: string;
  format: 'image' | 'video' | 'carousel';
  primary_text: string;
  headline: string;
  description: string;
  call_to_action: string;
  creative_asset_id: string | null;
  variants: AdVariant[];
}

export interface AdVariant {
  primary_text: string;
  headline: string;
}

// ============ Campaign Entities ============
export interface CampaignEntity {
  id: string;
  business_id: string;
  campaign_plan_id: string;
  platform: Platform;
  entity_type: 'campaign' | 'ad_set' | 'ad';
  platform_entity_id: string | null;
  temp_id: string;
  parent_entity_id: string | null;
  config_snapshot: Record<string, unknown>;
  status: EntityStatus;
  created_at: string;
  updated_at: string;
}

export type EntityStatus = 'pending' | 'creating' | 'active' | 'paused' | 'error' | 'deleted';

// ============ Performance ============
export interface PerformanceSnapshot {
  id: string;
  business_id: string;
  entity_id: string;
  platform: Platform;
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  frequency: number;
  reach: number;
  created_at: string;
}

export interface AggregatedMetrics {
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;
  avg_ctr: number;
  avg_cpc: number;
  avg_cpa: number;
  avg_roas: number;
  avg_frequency: number;
  total_reach: number;
}

// ============ Recommendations ============
export interface Recommendation {
  id: string;
  business_id: string;
  entity_id: string | null;
  type: RecommendationType;
  title: string;
  description: string;
  action: string;
  rationale: string;
  estimated_impact: string;
  risk_level: 'low' | 'medium' | 'high';
  confidence: number;
  requires_approval: boolean;
  status: RecommendationStatus;
  created_at: string;
  resolved_at: string | null;
}

export type RecommendationType =
  | 'pause_campaign'
  | 'increase_budget'
  | 'decrease_budget'
  | 'reallocate_budget'
  | 'refresh_creative'
  | 'adjust_targeting'
  | 'hold_changes';

export type RecommendationStatus = 'pending' | 'approved' | 'denied' | 'dismissed' | 'auto_applied';

// ============ Approvals ============
export interface Approval {
  id: string;
  business_id: string;
  entity_type: 'campaign_plan' | 'recommendation' | 'campaign' | 'ad_set' | 'ad';
  entity_id: string;
  decision: 'approved' | 'denied' | 'modified';
  modifications: Record<string, unknown> | null;
  decided_at: string;
}

// ============ Action Log ============
export interface ActionLog {
  id: string;
  business_id: string;
  entity_id: string | null;
  actor: 'agent' | 'user';
  action_type: string;
  description: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  platform: Platform | null;
  platform_entity_id: string | null;
  created_at: string;
}

// ============ Platform Adapter Types ============
export interface OAuthTokens {
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
}

export interface PlatformEntity {
  platform_id: string;
  platform: Platform;
  entity_type: 'campaign' | 'ad_set' | 'ad';
  name: string;
  status: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface Metrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  frequency: number;
  reach: number;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailUrl: string | null;
  webViewLink: string | null;
  size: number;
  createdTime: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  path: string;
}
