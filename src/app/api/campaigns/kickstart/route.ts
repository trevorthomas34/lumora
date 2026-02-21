import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { generateBrandBrief } from "@/lib/ai/brand-research";
import { generateCampaignPlan } from "@/lib/ai/campaign-generator";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { businessId } = await request.json();
    if (!businessId) {
      return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const serviceClient = createServiceRoleClient();

    // Fetch the business record
    const { data: business, error: businessError } = await serviceClient
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .eq("user_id", user.id)
      .single();

    if (businessError || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Step 1: Generate brand brief
    const briefData = await generateBrandBrief(business);

    // Step 2: Upsert brand brief with status 'approved' (skip approval step)
    const { data: brief, error: briefError } = await serviceClient
      .from("brand_briefs")
      .insert({
        business_id: businessId,
        version: 1,
        brief_data: briefData,
        status: "approved",
      })
      .select()
      .single();

    if (briefError || !brief) {
      return NextResponse.json({ error: "Failed to save brand brief" }, { status: 500 });
    }

    // Step 3: Generate campaign plan
    const planData = await generateCampaignPlan(business, briefData, []);

    // Step 4: Insert campaign plan with status 'pending_approval'
    const { data: plan, error: planError } = await serviceClient
      .from("campaign_plans")
      .insert({
        business_id: businessId,
        name: `${business.name} — Launch Campaign`,
        plan_data: planData,
        status: "pending_approval",
      })
      .select()
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: "Failed to save campaign plan" }, { status: 500 });
    }

    return NextResponse.json({ planId: plan.id });
  } catch (error) {
    console.error("Kickstart error:", error);
    return NextResponse.json({ error: "Failed to generate campaign" }, { status: 500 });
  }
}
