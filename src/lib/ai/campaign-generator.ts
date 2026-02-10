import { getAnthropicClient } from './client';
import { CAMPAIGN_GENERATOR_SYSTEM_PROMPT, buildCampaignPrompt } from './prompts/campaign-generator';
import type { BrandBriefData, Business, CampaignPlanData } from '@/types';

export async function generateCampaignPlan(
  business: Business,
  brandBrief: BrandBriefData,
  selectedAssetIds: string[]
): Promise<CampaignPlanData> {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (isDemoMode) {
    return getDemoCampaignPlan(business);
  }

  const client = getAnthropicClient();
  const prompt = buildCampaignPrompt(business, brandBrief, selectedAssetIds);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4000,
    system: CAMPAIGN_GENERATOR_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  const jsonStr = content.text.replace(/```json?\n?|\n?```/g, '').trim();
  return JSON.parse(jsonStr) as CampaignPlanData;
}

function getDemoCampaignPlan(business: Business): CampaignPlanData {
  const dailyBudget = business.daily_budget || 50;
  const locations = business.target_locations.length > 0 ? business.target_locations : ['US'];

  return {
    strategy_summary: `Three-pronged campaign strategy targeting awareness, consideration, and conversion. Budget split 30/40/30 across campaigns to maximize full-funnel performance for ${business.name}.`,
    estimated_daily_spend: dailyBudget,
    estimated_monthly_results: '150-300 leads based on industry benchmarks',
    campaigns: [
      {
        temp_id: 'camp_1',
        name: `${business.name} — Awareness`,
        objective: 'REACH',
        daily_budget: Math.round(dailyBudget * 0.3 * 100) / 100,
        ad_sets: [{
          temp_id: 'adset_1_1',
          name: 'Broad Interest — 25-54',
          targeting: { age_min: 25, age_max: 54, genders: ['all'], locations, interests: ['Small business', 'Entrepreneurship', 'Online shopping'], custom_audiences: [] },
          placements: ['facebook_feed', 'instagram_feed', 'instagram_stories'],
          ads: [{
            temp_id: 'ad_1_1_1',
            name: 'Social Proof Hook',
            format: 'image' as const,
            primary_text: `See why hundreds of customers trust ${business.name}. Real results, real people, real difference.`,
            headline: `Discover ${business.name}`,
            description: 'Join thousands of happy customers',
            call_to_action: 'Learn More',
            creative_asset_id: null,
            variants: [{ primary_text: `"Best decision I ever made" — that's what our customers keep telling us.`, headline: "See What You're Missing" }],
          }],
        }],
      },
      {
        temp_id: 'camp_2',
        name: `${business.name} — Consideration`,
        objective: 'TRAFFIC',
        daily_budget: Math.round(dailyBudget * 0.4 * 100) / 100,
        ad_sets: [{
          temp_id: 'adset_2_1',
          name: 'Engaged Shoppers — 28-50',
          targeting: { age_min: 28, age_max: 50, genders: ['all'], locations, interests: ['Online shopping', 'Reviews', 'Comparison shopping'], custom_audiences: [] },
          placements: ['facebook_feed', 'instagram_feed'],
          ads: [
            {
              temp_id: 'ad_2_1_1',
              name: 'Problem-Solution',
              format: 'image' as const,
              primary_text: `Tired of settling for less? ${business.name} delivers the quality and service you deserve.`,
              headline: "There's a Better Way",
              description: 'Quality you can count on',
              call_to_action: 'Shop Now',
              creative_asset_id: null,
              variants: [{ primary_text: `Stop wasting time on solutions that don't work. ${business.name} gets it right.`, headline: 'Get It Right the First Time' }],
            },
            {
              temp_id: 'ad_2_1_2',
              name: 'Behind the Scenes',
              format: 'image' as const,
              primary_text: `Here's what goes into everything we do at ${business.name}. Quality isn't just a word.`,
              headline: 'Quality You Can See',
              description: 'See our process',
              call_to_action: 'Learn More',
              creative_asset_id: null,
              variants: [],
            },
          ],
        }],
      },
      {
        temp_id: 'camp_3',
        name: `${business.name} — Conversion`,
        objective: 'CONVERSIONS',
        daily_budget: Math.round(dailyBudget * 0.3 * 100) / 100,
        ad_sets: [{
          temp_id: 'adset_3_1',
          name: 'High Intent — Retargeting',
          targeting: { age_min: 25, age_max: 54, genders: ['all'], locations, interests: [], custom_audiences: ['website_visitors_30d'] },
          placements: ['facebook_feed', 'instagram_feed', 'instagram_stories', 'audience_network'],
          ads: [{
            temp_id: 'ad_3_1_1',
            name: 'Urgency Offer',
            format: 'image' as const,
            primary_text: `You were checking us out — and for good reason. Take the next step with ${business.name} today.`,
            headline: 'Ready When You Are',
            description: 'Limited time offer',
            call_to_action: 'Sign Up',
            creative_asset_id: null,
            variants: [{ primary_text: `Don't let a great thing slip away. Come back to ${business.name}.`, headline: 'Come Back & Save' }],
          }],
        }],
      },
    ],
  };
}
