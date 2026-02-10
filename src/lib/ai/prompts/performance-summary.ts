export const PERFORMANCE_SUMMARY_SYSTEM_PROMPT = `You are an expert digital advertising analyst working for LumoraAI. Write a clear, plain-English performance summary for a small business owner who may not know advertising jargon. Be direct, actionable, and encouraging.`;

export function buildPerformanceSummaryPrompt(metrics: {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  ctr: number;
  cpa: number;
  roas: number;
  period: string;
}): string {
  return `Summarize this ad performance in 3-4 sentences for a small business owner:

**Period:** ${metrics.period}
**Spend:** $${metrics.spend.toFixed(2)}
**Impressions:** ${metrics.impressions.toLocaleString()}
**Clicks:** ${metrics.clicks.toLocaleString()}
**Conversions:** ${metrics.conversions}
**Revenue:** $${metrics.revenue.toFixed(2)}
**CTR:** ${metrics.ctr.toFixed(2)}%
**CPA:** $${metrics.cpa.toFixed(2)}
**ROAS:** ${metrics.roas.toFixed(2)}x

Write: 1) What happened (key results), 2) Why it matters (good or concerning), 3) What's next (one actionable suggestion). Keep it under 4 sentences. No jargon.`;
}
