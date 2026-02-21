import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getPlatformAdapter } from "@/lib/adapters/types";
import { getValidTokens } from "@/lib/oauth/tokens";
import { NextResponse } from "next/server";
import type { AdConfig } from "@/types";
import type { RealMetaAdapter } from "@/lib/adapters/meta/real";

export async function POST(request: Request) {
  try {
    const { planId, businessId } = await request.json();
    const supabase = createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adapter = getPlatformAdapter("meta");
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

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
          { error: "Meta is not connected." },
          { status: 400 },
        );
      }

      const tokens = await getValidTokens(connection);

      if (connection.platform_account_id) {
        (adapter as RealMetaAdapter).selectedAdAccountId = connection.platform_account_id;
      }

      await adapter.connect(tokens);

      if (business?.website_url) {
        (adapter as RealMetaAdapter).businessWebsiteUrl = business.website_url;
      }
    }

    // Fetch all failed ad entities for this plan
    const { data: failedAds } = await supabase
      .from("campaign_entities")
      .select("id, parent_entity_id, config_snapshot, temp_id")
      .eq("campaign_plan_id", planId)
      .eq("business_id", businessId)
      .eq("entity_type", "ad")
      .eq("status", "error");

    if (!failedAds || failedAds.length === 0) {
      return NextResponse.json({ success: true, retried: 0, message: "No failed ads to retry" });
    }

    // Fetch parent ad set entities (need their Meta platform_entity_id)
    const adSetIds = Array.from(new Set(failedAds.map((a) => a.parent_entity_id).filter(Boolean)));
    const { data: adSetEntities } = await supabase
      .from("campaign_entities")
      .select("id, platform_entity_id")
      .in("id", adSetIds);

    const adSetMap = new Map(
      (adSetEntities || []).map((e) => [e.id, e.platform_entity_id as string]),
    );

    let succeeded = 0;
    let failed = 0;
    const failedDetails: { name: string; error_title: string; error_msg: string }[] = [];

    for (const failedAd of failedAds) {
      const platformAdSetId = adSetMap.get(failedAd.parent_entity_id);
      if (!platformAdSetId) {
        console.error(`[retry-ads] No platform ad set ID for parent ${failedAd.parent_entity_id}`);
        failed++;
        failedDetails.push({
          name: (failedAd.config_snapshot as AdConfig).name,
          error_title: "Missing ad set",
          error_msg: "Could not find the parent ad set for this ad.",
        });
        continue;
      }

      const adConfig = failedAd.config_snapshot as AdConfig;
      try {
        const platformAd = await adapter.createAd(platformAdSetId, adConfig);

        await supabase
          .from("campaign_entities")
          .update({
            platform_entity_id: platformAd.platform_id,
            status: "active",
          })
          .eq("id", failedAd.id);

        succeeded++;
      } catch (err) {
        console.error(`[retry-ads] Failed to create ad "${adConfig.name}":`, err);
        failed++;
        const metaErr = err as { code?: number; message?: string; error_user_title?: string; error_user_msg?: string };
        failedDetails.push({
          name: adConfig.name,
          error_title: metaErr.error_user_title || `Error ${metaErr.code || "unknown"}`,
          error_msg: metaErr.error_user_msg || metaErr.message || "An unknown error occurred.",
        });
      }
    }

    return NextResponse.json({ success: true, retried: succeeded, failed, failedDetails });
  } catch (error) {
    console.error("Retry ads error:", error);
    return NextResponse.json({ error: "Failed to retry ads" }, { status: 500 });
  }
}
