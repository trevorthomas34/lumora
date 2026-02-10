import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateCampaignPlan } from "@/lib/ai/campaign-generator";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { businessId } = await request.json();
    const supabase = createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .eq("user_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const { data: brandBrief } = await supabase
      .from("brand_briefs")
      .select("*")
      .eq("business_id", businessId)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (!brandBrief) {
      return NextResponse.json({ error: "No brand brief found. Generate one first." }, { status: 400 });
    }

    const { data: selectedAssets } = await supabase
      .from("creative_assets")
      .select("id")
      .eq("business_id", businessId)
      .eq("selected", true);

    const assetIds = selectedAssets?.map((a) => a.id) || [];

    const planData = await generateCampaignPlan(business, brandBrief.brief_data, assetIds);

    const { data: plan, error } = await supabase
      .from("campaign_plans")
      .insert({
        business_id: businessId,
        name: `Campaign Plan — ${new Date().toLocaleDateString()}`,
        plan_data: planData,
        status: "pending_approval",
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("action_logs").insert({
      business_id: businessId,
      actor: "agent",
      action_type: "generate_campaign_plan",
      description: `Generated campaign plan with ${planData.campaigns.length} campaigns`,
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Campaign generation error:", error);
    return NextResponse.json({ error: "Failed to generate campaign plan" }, { status: 500 });
  }
}
