import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getPlatformAdapter } from "@/lib/adapters/types";
import { getValidTokens } from "@/lib/oauth/tokens";
import { NextResponse } from "next/server";
import type { CampaignConfig } from "@/types";
import type { RealMetaAdapter } from "@/lib/adapters/meta/real";

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
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

    // In real mode, retrieve tokens and connect the adapter
    if (!isDemoMode) {
      const serviceClient = createServiceRoleClient();

      const { data: business } = await serviceClient
        .from("businesses")
        .select("website_url")
        .eq("id", businessId)
        .single();

      const { data: connection } = await serviceClient
        .from("connections")
        .select("*")
        .eq("business_id", businessId)
        .eq("platform", "meta")
        .eq("status", "active")
        .single();

      if (!connection) {
        return NextResponse.json(
          { error: "Meta is not connected. Please connect Meta in Settings first." },
          { status: 400 },
        );
      }

      const tokens = await getValidTokens(connection);

      // Use the stored ad account ID (set in Settings) so campaigns go to the right account
      if (connection.platform_account_id) {
        (adapter as RealMetaAdapter).selectedAdAccountId = connection.platform_account_id;
      }

      await adapter.connect(tokens);

      // Pass business website URL for ad creative links
      if (business?.website_url) {
        (adapter as RealMetaAdapter).businessWebsiteUrl = business.website_url;
      }
    }

    for (const campaign of plan.plan_data.campaigns as CampaignConfig[]) {
      let platformCampaignId: string;
      try {
        const platformCampaign = await adapter.createCampaign(campaign);
        platformCampaignId = platformCampaign.platform_id;

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
      } catch (err) {
        console.error(`Failed to create campaign "${campaign.name}":`, err);
        await supabase.from("campaign_entities").insert({
          business_id: businessId,
          campaign_plan_id: planId,
          platform: "meta",
          entity_type: "campaign",
          temp_id: campaign.temp_id,
          config_snapshot: campaign,
          status: "error",
        });
        continue;
      }

      for (const adSet of campaign.ad_sets) {
        let platformAdSetId: string;
        let adSetEntityId: string | null = null;
        try {
          const platformAdSet = await adapter.createAdSet(platformCampaignId, adSet, campaign.objective);
          platformAdSetId = platformAdSet.platform_id;

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

          adSetEntityId = adSetEntity?.id || null;
        } catch (err) {
          const metaErr = err as { code?: number; type?: string; subcode?: number; message?: string };
          console.error(`Failed to create ad set "${adSet.name}":`, {
            message: metaErr.message,
            code: metaErr.code,
            type: metaErr.type,
            subcode: metaErr.subcode,
            objective: campaign.objective,
            targeting: adSet.targeting,
          });
          await supabase.from("campaign_entities").insert({
            business_id: businessId,
            campaign_plan_id: planId,
            platform: "meta",
            entity_type: "ad_set",
            temp_id: adSet.temp_id,
            config_snapshot: adSet,
            status: "error",
          });
          continue;
        }

        for (const ad of adSet.ads) {
          try {
            const platformAd = await adapter.createAd(platformAdSetId, ad);

            await supabase.from("campaign_entities").insert({
              business_id: businessId,
              campaign_plan_id: planId,
              platform: "meta",
              entity_type: "ad",
              platform_entity_id: platformAd.platform_id,
              temp_id: ad.temp_id,
              parent_entity_id: adSetEntityId,
              config_snapshot: ad,
              status: "active",
            });
          } catch (err) {
            console.error(`Failed to create ad "${ad.name}":`, err);
            await supabase.from("campaign_entities").insert({
              business_id: businessId,
              campaign_plan_id: planId,
              platform: "meta",
              entity_type: "ad",
              temp_id: ad.temp_id,
              parent_entity_id: adSetEntityId,
              config_snapshot: ad,
              status: "error",
            });
          }
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
