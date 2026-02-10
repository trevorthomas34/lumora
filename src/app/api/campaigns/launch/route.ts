import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlatformAdapter } from "@/lib/adapters/types";
import { NextResponse } from "next/server";
import type { CampaignConfig } from "@/types";

export async function POST(request: Request) {
  try {
    const { planId, businessId } = await request.json();
    const supabase = createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: plan } = await supabase
      .from("campaign_plans")
      .select("*")
      .eq("id", planId)
      .eq("business_id", businessId)
      .single();

    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    if (plan.status !== "approved") {
      return NextResponse.json({ error: "Plan must be approved before launching" }, { status: 400 });
    }

    const adapter = getPlatformAdapter("meta");

    for (const campaign of plan.plan_data.campaigns as CampaignConfig[]) {
      const platformCampaign = await adapter.createCampaign(campaign);

      await supabase.from("campaign_entities").insert({
        business_id: businessId,
        campaign_plan_id: planId,
        platform: "meta",
        entity_type: "campaign",
        platform_entity_id: platformCampaign.platform_id,
        temp_id: campaign.temp_id,
        config_snapshot: campaign,
        status: "active",
      });

      for (const adSet of campaign.ad_sets) {
        const platformAdSet = await adapter.createAdSet(platformCampaign.platform_id, adSet);

        const { data: adSetEntity } = await supabase
          .from("campaign_entities")
          .insert({
            business_id: businessId,
            campaign_plan_id: planId,
            platform: "meta",
            entity_type: "ad_set",
            platform_entity_id: platformAdSet.platform_id,
            temp_id: adSet.temp_id,
            config_snapshot: adSet,
            status: "active",
          })
          .select()
          .single();

        for (const ad of adSet.ads) {
          const platformAd = await adapter.createAd(platformAdSet.platform_id, ad);

          await supabase.from("campaign_entities").insert({
            business_id: businessId,
            campaign_plan_id: planId,
            platform: "meta",
            entity_type: "ad",
            platform_entity_id: platformAd.platform_id,
            temp_id: ad.temp_id,
            parent_entity_id: adSetEntity?.id || null,
            config_snapshot: ad,
            status: "active",
          });
        }
      }
    }

    await supabase.from("campaign_plans").update({ status: "launched" }).eq("id", planId);

    await supabase.from("action_logs").insert({
      business_id: businessId,
      entity_id: planId,
      actor: "agent",
      action_type: "launch_campaigns",
      description: `Launched ${plan.plan_data.campaigns.length} campaigns to Meta`,
      platform: "meta",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Launch error:", error);
    return NextResponse.json({ error: "Failed to launch campaigns" }, { status: 500 });
  }
}
