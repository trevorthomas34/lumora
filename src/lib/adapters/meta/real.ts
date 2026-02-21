import type { PlatformAdapter } from '../types';
import type { OAuthTokens, PlatformEntity, CampaignConfig, AdSetConfig, AdConfig, Metrics, DateRange } from '@/types';

const META_API_BASE = 'https://graph.facebook.com/v21.0';

// ── Error class for Meta API errors ──────────────────────────────────

export class MetaApiError extends Error {
  code: number;
  type: string;
  subcode?: number;

  constructor(message: string, code: number, type: string, subcode?: number) {
    super(message);
    this.name = 'MetaApiError';
    this.code = code;
    this.type = type;
    this.subcode = subcode;
  }
}

// ── Location normalizer (full names → ISO 3166-1 alpha-2 codes) ─────────────

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'united states': 'US', 'united states of america': 'US', 'usa': 'US', 'us': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'great britain': 'GB', 'england': 'GB',
  'canada': 'CA', 'australia': 'AU', 'new zealand': 'NZ',
  'germany': 'DE', 'france': 'FR', 'spain': 'ES', 'italy': 'IT',
  'netherlands': 'NL', 'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK',
  'ireland': 'IE', 'switzerland': 'CH', 'austria': 'AT', 'belgium': 'BE',
  'portugal': 'PT', 'finland': 'FI', 'poland': 'PL',
  'brazil': 'BR', 'mexico': 'MX', 'argentina': 'AR', 'colombia': 'CO',
  'japan': 'JP', 'south korea': 'KR', 'korea': 'KR', 'china': 'CN',
  'india': 'IN', 'singapore': 'SG', 'hong kong': 'HK',
  'south africa': 'ZA', 'nigeria': 'NG', 'kenya': 'KE',
  'uae': 'AE', 'united arab emirates': 'AE', 'saudi arabia': 'SA',
};

function normalizeCountryCodes(locations: string[]): string[] {
  return locations.map((loc) => {
    const key = loc.trim().toLowerCase();
    return COUNTRY_NAME_TO_CODE[key] || loc.trim().toUpperCase().slice(0, 2);
  });
}

// ── Optimization goal mapping (per ad set, based on campaign objective) ─────

function mapOptimizationGoal(campaignObjective: string): { optimization_goal: string; billing_event: string } {
  const o = campaignObjective.toUpperCase();
  if (o === 'REACH' || o === 'AWARENESS' || o === 'OUTCOME_AWARENESS') {
    return { optimization_goal: 'REACH', billing_event: 'IMPRESSIONS' };
  }
  if (o === 'TRAFFIC' || o === 'OUTCOME_TRAFFIC') {
    return { optimization_goal: 'LINK_CLICKS', billing_event: 'IMPRESSIONS' };
  }
  if (o === 'LEADS' || o === 'LEAD_GENERATION' || o === 'OUTCOME_LEADS') {
    return { optimization_goal: 'LEAD_GENERATION', billing_event: 'IMPRESSIONS' };
  }
  if (o === 'ENGAGEMENT' || o === 'OUTCOME_ENGAGEMENT') {
    return { optimization_goal: 'POST_ENGAGEMENT', billing_event: 'IMPRESSIONS' };
  }
  // CONVERSIONS / OUTCOME_SALES — use LINK_CLICKS as safe fallback (no pixel required)
  return { optimization_goal: 'LINK_CLICKS', billing_event: 'IMPRESSIONS' };
}

// ── CTA normalizer — maps AI-generated text to Meta's enum ──────────

const META_CTA_ENUM = new Set([
  'BOOK_TRAVEL','CONTACT_US','DONATE','DONATE_NOW','DOWNLOAD','GET_DIRECTIONS',
  'LEARN_MORE','SHOP_NOW','SIGN_UP','LIKE_PAGE','MESSAGE_PAGE','SEE_MORE',
  'WHATSAPP_LINK','GET_IN_TOUCH','BOOK_NOW','CHECK_AVAILABILITY','ORDER_NOW',
  'GET_OFFER','BUY_NOW','BUY_TICKETS','ADD_TO_CART','APPLY_NOW','GET_QUOTE',
  'SUBSCRIBE','CALL_NOW','WATCH_VIDEO','OPEN_LINK','NO_BUTTON','SEND_TIP',
  'MAKE_AN_APPOINTMENT','ASK_ABOUT_SERVICES','BOOK_A_CONSULTATION',
  'GET_A_QUOTE','INQUIRE_NOW','VIEW_PRODUCT','START_ORDER','SEARCH',
  'REGISTER_NOW','TRY_NOW','TRY_IT',
]);

// Common AI-generated phrases → valid Meta CTA
const CTA_ALIAS: Record<string, string> = {
  'GET_STARTED':        'LEARN_MORE',
  'START_NOW':          'SIGN_UP',
  'CONTACT_NOW':        'CONTACT_US',
  'REACH_OUT':          'CONTACT_US',
  'FIND_OUT_MORE':      'LEARN_MORE',
  'DISCOVER_MORE':      'LEARN_MORE',
  'EXPLORE_NOW':        'LEARN_MORE',
  'GET_INFO':           'LEARN_MORE',
  'REQUEST_INFO':       'LEARN_MORE',
  'SCHEDULE_NOW':       'MAKE_AN_APPOINTMENT',
  'BOOK_CONSULTATION':  'BOOK_A_CONSULTATION',
  'GET_ESTIMATE':       'GET_A_QUOTE',
  'REQUEST_QUOTE':      'GET_A_QUOTE',
  'BUY':                'BUY_NOW',
  'PURCHASE':           'BUY_NOW',
  'ORDER':              'ORDER_NOW',
};

function normalizeCta(raw: string): string {
  const key = raw.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
  if (META_CTA_ENUM.has(key)) return key;
  if (CTA_ALIAS[key]) return CTA_ALIAS[key];
  return 'LEARN_MORE'; // safe universal fallback
}

// ── Objective mapping ────────────────────────────────────────────────

function mapObjective(objective: string, hasPixel = false): string {
  const map: Record<string, string> = {
    traffic: 'OUTCOME_TRAFFIC',
    // OUTCOME_SALES requires a Meta Pixel — use OUTCOME_TRAFFIC as fallback when no pixel
    conversions: hasPixel ? 'OUTCOME_SALES' : 'OUTCOME_TRAFFIC',
    sales: hasPixel ? 'OUTCOME_SALES' : 'OUTCOME_TRAFFIC',
    leads: 'OUTCOME_LEADS',
    lead_generation: 'OUTCOME_LEADS',
    awareness: 'OUTCOME_AWARENESS',
    brand_awareness: 'OUTCOME_AWARENESS',
    reach: 'OUTCOME_AWARENESS',
    engagement: 'OUTCOME_ENGAGEMENT',
    video_views: 'OUTCOME_ENGAGEMENT',
  };
  return map[objective.toLowerCase()] || 'OUTCOME_TRAFFIC';
}

// ── Adapter ──────────────────────────────────────────────────────────

export class RealMetaAdapter implements PlatformAdapter {
  private accessToken: string | null = null;
  private adAccountId: string | null = null;
  private pageId: string | null = null;

  /** URL used as the `link` in ad creatives – set by the launch route. */
  public businessWebsiteUrl: string | null = null;

  /** If set, skip the ad account API fetch and use this ID directly (act_XXXXX format). */
  public selectedAdAccountId: string | null = null;

  /** Meta Pixel ID — enables OUTCOME_SALES objective and pixel-based conversion tracking. */
  public pixelId: string | null = null;

  // ── Internal fetch helper ────────────────────────────────────────

  private async metaFetch<T = Record<string, unknown>>(
    path: string,
    options: { method?: string; body?: Record<string, unknown>; params?: Record<string, string> } = {},
  ): Promise<T> {
    const url = new URL(`${META_API_BASE}${path}`);
    if (options.params) {
      for (const [k, v] of Object.entries(options.params)) {
        url.searchParams.set(k, v);
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
    };

    let fetchBody: string | undefined;
    if (options.body) {
      headers['Content-Type'] = 'application/json';
      fetchBody = JSON.stringify(options.body);
    }

    const res = await fetch(url.toString(), {
      method: options.method || 'GET',
      headers,
      body: fetchBody,
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const err = data.error || {};
      console.error('[Meta] API error:', JSON.stringify(data, null, 2));
      throw new MetaApiError(
        err.message || `Meta API ${res.status}`,
        err.code ?? res.status,
        err.type ?? 'UnknownError',
        err.error_subcode,
      );
    }

    return data as T;
  }

  // ── Connect ──────────────────────────────────────────────────────

  async connect(credentials: OAuthTokens): Promise<void> {
    this.accessToken = credentials.access_token;

    if (this.selectedAdAccountId) {
      this.adAccountId = this.selectedAdAccountId;
    } else {
      // Fetch ad accounts and use the first one
      const accounts = await this.metaFetch<{ data: { id: string; name: string }[] }>(
        '/me/adaccounts',
        { params: { fields: 'id,name' } },
      );

      if (!accounts.data?.[0]) {
        throw new Error('No Meta ad account found for this user');
      }
      this.adAccountId = accounts.data[0].id; // format: "act_123456"
    }

    // Fetch Pages (needed for ad creatives)
    const pages = await this.metaFetch<{ data: { id: string; name: string }[] }>(
      '/me/accounts',
      { params: { fields: 'id,name' } },
    );

    if (!pages.data?.[0]) {
      throw new Error('No Facebook Page found — a Page is required to create ad creatives');
    }
    this.pageId = pages.data[0].id;
  }

  // ── Create Campaign (CBO) ───────────────────────────────────────

  async createCampaign(plan: CampaignConfig): Promise<PlatformEntity> {
    const campaignBody = {
      name: plan.name,
      objective: mapObjective(plan.objective, !!this.pixelId),
      status: 'PAUSED',
      special_ad_categories: [] as string[],
      is_campaign_budget_optimization: true,  // CBO — budget lives at campaign level, not ad set
      daily_budget: Math.round(plan.daily_budget * 100),
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    };
    console.log('[Meta] createCampaign body:', JSON.stringify(campaignBody, null, 2));

    const data = await this.metaFetch<{ id: string }>(
      `/${this.adAccountId}/campaigns`,
      { method: 'POST', body: campaignBody },
    );

    return {
      platform_id: data.id,
      platform: 'meta',
      entity_type: 'campaign',
      name: plan.name,
      status: 'PAUSED',
    };
  }

  // ── Create Ad Set ────────────────────────────────────────────────

  async createAdSet(campaignId: string, plan: AdSetConfig, campaignObjective?: string, _dailyBudgetCents?: number): Promise<PlatformEntity> {
    // Start time: tomorrow at midnight UTC
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    // Map genders: "male" → 1, "female" → 2, else omit (all genders)
    const genderCodes = plan.targeting.genders
      .map((g) => {
        if (g.toLowerCase() === 'male') return 1;
        if (g.toLowerCase() === 'female') return 2;
        return null;
      })
      .filter((g) => g !== null) as number[];

    const targeting: Record<string, unknown> = {
      age_min: plan.targeting.age_min,
      age_max: plan.targeting.age_max,
      geo_locations: { countries: normalizeCountryCodes(plan.targeting.locations) },
      targeting_automation: { advantage_audience: 0 }, // use our own targeting, not Meta's AI
    };

    if (genderCodes.length > 0) {
      targeting.genders = genderCodes;
    }

    // Note: interest targeting requires {id, name} pairs from Meta's search API.
    // Skipped for now — interests will be a follow-up.

    const { optimization_goal, billing_event } = mapOptimizationGoal(campaignObjective || 'TRAFFIC');

    const adSetBody: Record<string, unknown> = {
      name: plan.name,
      campaign_id: campaignId,
      status: 'PAUSED',
      billing_event,
      optimization_goal,
      targeting,
      start_time: tomorrow.toISOString(),
    };

    // Add pixel promoted_object for OUTCOME_SALES campaigns when pixel is configured
    const mappedObjective = mapObjective(campaignObjective || 'TRAFFIC', !!this.pixelId);
    if (this.pixelId && mappedObjective === 'OUTCOME_SALES') {
      adSetBody.promoted_object = {
        pixel_id: this.pixelId,
        custom_event_type: 'PURCHASE',
      };
    }

    // No ad set budget — campaign uses CBO (daily_budget + bid_strategy set at campaign level)
    console.log('[Meta] createAdSet body:', JSON.stringify(adSetBody, null, 2));

    const data = await this.metaFetch<{ id: string }>(
      `/${this.adAccountId}/adsets`,
      {
        method: 'POST',
        body: adSetBody,
      },
    );

    return {
      platform_id: data.id,
      platform: 'meta',
      entity_type: 'ad_set',
      name: plan.name,
      status: 'PAUSED',
    };
  }

  // ── Create Ad (two-step: creative + ad) ──────────────────────────

  async createAd(adSetId: string, plan: AdConfig): Promise<PlatformEntity> {
    const linkUrl = this.businessWebsiteUrl || 'https://example.com';

    // Resolve the creative image URL.
    // Priority: (1) creative_asset_id when it's a full URL (Google Drive / AI-generated content — future),
    //           (2) omit picture and let Meta scrape the link's OG image as a fallback.
    const imageUrl: string | null =
      plan.creative_asset_id && plan.creative_asset_id.startsWith('http')
        ? plan.creative_asset_id
        : null;

    const linkData: Record<string, unknown> = {
      message: plan.primary_text,
      name: plan.headline,
      description: plan.description,
      link: linkUrl,
      call_to_action: {
        type: normalizeCta(plan.call_to_action),
      },
    };

    if (imageUrl) {
      linkData.picture = imageUrl;
    }

    // Step 1: Create AdCreative
    const creative = await this.metaFetch<{ id: string }>(
      `/${this.adAccountId}/adcreatives`,
      {
        method: 'POST',
        body: {
          name: `Creative - ${plan.name}`,
          object_story_spec: {
            page_id: this.pageId,
            link_data: linkData,
          },
        },
      },
    );

    // Step 2: Create Ad referencing the creative
    const ad = await this.metaFetch<{ id: string }>(
      `/${this.adAccountId}/ads`,
      {
        method: 'POST',
        body: {
          name: plan.name,
          adset_id: adSetId,
          creative: { creative_id: creative.id },
          status: 'PAUSED',
        },
      },
    );

    return {
      platform_id: ad.id,
      platform: 'meta',
      entity_type: 'ad',
      name: plan.name,
      status: 'PAUSED',
    };
  }

  // ── Insights ─────────────────────────────────────────────────────

  async getInsights(entityId: string, dateRange: DateRange): Promise<Metrics> {
    const data = await this.metaFetch<{ data: Record<string, unknown>[] }>(
      `/${entityId}/insights`,
      {
        params: {
          time_range: JSON.stringify({ since: dateRange.start, until: dateRange.end }),
          fields: 'spend,impressions,clicks,actions,ctr,cpc,frequency,reach',
        },
      },
    );

    const row = (data.data?.[0] || {}) as Record<string, unknown>;
    const conversions = parseInt(
      (row.actions as { action_type: string; value: string }[] | undefined)
        ?.find((a) => a.action_type === 'offsite_conversion')?.value || '0',
    );
    const spend = parseFloat((row.spend as string) || '0');

    return {
      spend,
      impressions: parseInt((row.impressions as string) || '0'),
      clicks: parseInt((row.clicks as string) || '0'),
      conversions,
      revenue: 0,
      ctr: parseFloat((row.ctr as string) || '0'),
      cpc: parseFloat((row.cpc as string) || '0'),
      cpa: conversions > 0 ? spend / conversions : 0,
      roas: 0,
      frequency: parseFloat((row.frequency as string) || '0'),
      reach: parseInt((row.reach as string) || '0'),
    };
  }

  // ── Update Budget ────────────────────────────────────────────────

  async updateBudget(entityId: string, amount: number): Promise<void> {
    await this.metaFetch(`/${entityId}`, {
      method: 'POST',
      body: { daily_budget: Math.round(amount * 100) },
    });
  }

  // ── Update Status ────────────────────────────────────────────────

  async updateStatus(entityId: string, status: 'ACTIVE' | 'PAUSED'): Promise<void> {
    await this.metaFetch(`/${entityId}`, {
      method: 'POST',
      body: { status },
    });
  }
}
