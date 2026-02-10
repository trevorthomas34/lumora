import type { BrandBriefData, Business } from '@/types';

export const CAMPAIGN_GENERATOR_SYSTEM_PROMPT = `You are an expert digital advertising strategist working for LumoraAI, an autonomous AI ad agent.

Your task is to generate a complete campaign plan based on a brand brief and business configuration. Create exactly 3 campaigns forming a full-funnel strategy:
1. Awareness campaign (top of funnel)
2. Consideration campaign (middle of funnel)
3. Conversion campaign (bottom of funnel)

Return a valid JSON object with this structure:
{
  "strategy_summary": "2-3 sentence overview of the strategy",
  "estimated_daily_spend": number,
  "estimated_monthly_results": "Realistic projection based on industry benchmarks",
  "campaigns": [
    {
      "temp_id": "camp_1",
      "name": "Business Name — Awareness",
      "objective": "REACH",
      "daily_budget": number,
      "ad_sets": [
        {
          "temp_id": "adset_1_1",
          "name": "Descriptive targeting name",
          "targeting": {
            "age_min": number,
            "age_max": number,
            "genders": ["all"],
            "locations": ["US"],
            "interests": ["Interest 1", "Interest 2"],
            "custom_audiences": []
          },
          "placements": ["facebook_feed", "instagram_feed"],
          "ads": [
            {
              "temp_id": "ad_1_1_1",
              "name": "Ad angle name",
              "format": "image",
              "primary_text": "Full ad copy (125 chars ideal)",
              "headline": "Headline (40 chars max)",
              "description": "Description text",
              "call_to_action": "Learn More",
              "creative_asset_id": null,
              "variants": [
                {
                  "primary_text": "Alternative copy version",
                  "headline": "Alternative headline"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}

Write compelling, specific ad copy. Use the brand brief's angles and reference specific services/products from "services_offered" in the ad copy. Budget should match the business's daily budget. Return ONLY the JSON.`;

export function buildCampaignPrompt(
  business: Business,
  brandBrief: BrandBriefData,
  selectedAssetIds: string[]
): string {
  return `Generate a campaign plan for this business:

**Business:** ${business.name}
**Goal:** ${business.goal || 'leads'}
**Daily Budget:** $${business.daily_budget || 50}
**Target Locations:** ${business.target_locations.join(', ') || 'US'}

**Brand Brief:**
${JSON.stringify(brandBrief, null, 2)}

**Available Creative Assets:** ${selectedAssetIds.length} assets selected
**Asset IDs:** ${selectedAssetIds.join(', ') || 'None — use null for creative_asset_id'}

Create 3 campaigns (Awareness, Consideration, Conversion) with appropriate budget splits, targeting, and ad copy. Return ONLY the JSON.`;
}
