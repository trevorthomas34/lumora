import { getAnthropicClient } from './client';
import { BRAND_RESEARCH_SYSTEM_PROMPT, buildBrandResearchPrompt } from './prompts/brand-research';
import type { BrandBriefData, Business } from '@/types';
import * as cheerio from 'cheerio';

export async function scrapeWebsite(url: string): Promise<string> {
  try {
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const response = await fetch(normalizedUrl, {
      headers: { 'User-Agent': 'LumoraAI Bot/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await response.text();
    const $ = cheerio.load(html);

    $('script, style, nav, footer, header, iframe, noscript').remove();

    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const h1s = $('h1').map((_, el) => $(el).text().trim()).get().join(' | ');
    const h2s = $('h2').map((_, el) => $(el).text().trim()).get().join(' | ');
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);

    return `Title: ${title}\nDescription: ${metaDescription}\nHeadings: ${h1s}\nSubheadings: ${h2s}\nContent: ${bodyText}`;
  } catch (error) {
    console.error('Error scraping website:', error);
    return 'Website could not be scraped. Use business configuration only.';
  }
}

export async function generateBrandBrief(business: Business): Promise<BrandBriefData> {
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (isDemoMode) {
    return getDemoBrandBrief(business.name);
  }

  let websiteContent = '';
  if (business.website_url) {
    websiteContent = await scrapeWebsite(business.website_url);
  }

  const client = getAnthropicClient();
  const prompt = buildBrandResearchPrompt(websiteContent, {
    name: business.name,
    offer_description: business.offer_description,
    target_locations: business.target_locations,
    goal: business.goal,
    brand_voice: business.brand_voice,
    competitors: business.competitors,
    tone: business.tone,
  });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: BRAND_RESEARCH_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');

  const jsonStr = content.text.replace(/```json?\n?|\n?```/g, '').trim();
  return JSON.parse(jsonStr) as BrandBriefData;
}

function getDemoBrandBrief(businessName: string): BrandBriefData {
  return {
    company_summary: `${businessName} is an innovative small business delivering exceptional value to their customers through quality products and personalized service. They've built a loyal customer base by focusing on what matters most: results.`,
    services_offered: [
      'Custom consultation and strategy sessions',
      'Premium product packages with personalized recommendations',
      'Ongoing support and maintenance plans',
      'Express service for time-sensitive needs',
    ],
    value_proposition: `${businessName} provides a unique combination of quality, expertise, and personalized attention that larger competitors can't match.`,
    target_audience: {
      demographics: 'Adults 25-54, middle to upper-middle income, urban and suburban areas',
      psychographics: 'Value quality over price, research before buying, prefer brands with authentic stories',
      pain_points: [
        'Frustrated with impersonal service from big brands',
        'Tired of products that don\'t deliver on promises',
        'Overwhelmed by too many choices, want a trusted guide',
      ],
      desires: [
        'Want a reliable solution they can trust',
        'Looking for personalized experience and support',
        'Seeking quality that justifies the investment',
      ],
    },
    brand_voice: {
      tone: 'Confident yet approachable',
      style: 'Clear, direct, and benefit-focused with a warm undertone',
      do_say: [
        'Speak to specific outcomes and results',
        'Use customer success stories and social proof',
        'Highlight what makes us different',
      ],
      dont_say: [
        'Avoid generic claims like "best in class"',
        'Don\'t use overly salesy or pushy language',
        'Never make promises we can\'t back up',
      ],
    },
    key_messages: [
      'Experience the difference that personalized attention makes',
      'Trusted by hundreds of satisfied customers',
      'Quality and expertise you can count on',
    ],
    competitive_positioning: `Unlike larger competitors, ${businessName} offers a personalized, hands-on approach where every customer matters. Our expertise and attention to detail set us apart in a market full of one-size-fits-all solutions.`,
    recommended_angles: [
      {
        name: 'Social Proof — Customer Trust',
        framework: 'Social Proof',
        hook: 'See why hundreds of customers choose us over the big guys',
        description: 'Lead with customer testimonials and results to build trust',
        draft_primary_text: `Join 500+ customers who made the switch to ${businessName}. Real results, real people — see their stories.`,
      },
      {
        name: 'PAS — Common Pain Point',
        framework: 'PAS',
        hook: `Frustrated with impersonal service that doesn't deliver?`,
        description: 'Address the top pain point directly and position as the solution',
        draft_primary_text: `Tired of agencies that overpromise and underdeliver? ${businessName} is different. We guarantee results or you don't pay.`,
      },
      {
        name: 'Direct Offer — Free Consultation',
        framework: 'Direct Offer',
        hook: 'Get a free 30-min strategy session — no pitch, just clarity',
        description: 'Low-friction entry point that gets prospects on the phone',
        draft_primary_text: `Free 30-min call with our team. We'll audit your current situation and tell you exactly what we'd do differently. No obligation.`,
      },
      {
        name: 'Before/After — Transformation',
        framework: 'Before/After',
        hook: `Here's what changes when you work with ${businessName}`,
        description: 'Show the specific transformation this audience wants to experience',
        draft_primary_text: `Before: frustrated, stuck, paying for results that never come. After: clear strategy, consistent results, finally moving forward. That's ${businessName}.`,
      },
    ],
  };
}
