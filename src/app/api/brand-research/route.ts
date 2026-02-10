import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateBrandBrief } from "@/lib/ai/brand-research";
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

    const briefData = await generateBrandBrief(business);

    const { data: existingBriefs } = await supabase
      .from("brand_briefs")
      .select("version")
      .eq("business_id", businessId)
      .order("version", { ascending: false })
      .limit(1);

    const nextVersion = (existingBriefs?.[0]?.version || 0) + 1;

    const { data: brief, error } = await supabase
      .from("brand_briefs")
      .insert({
        business_id: businessId,
        version: nextVersion,
        brief_data: briefData,
        status: "draft",
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from("action_logs").insert({
      business_id: businessId,
      actor: "agent",
      action_type: "generate_brand_brief",
      description: `Generated brand brief v${nextVersion}`,
    });

    return NextResponse.json(brief);
  } catch (error) {
    console.error("Brand research error:", error);
    return NextResponse.json({ error: "Failed to generate brand brief" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { briefId, status } = await request.json();
    const supabase = createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase
      .from("brand_briefs")
      .update({ status })
      .eq("id", briefId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update brief" }, { status: 500 });
  }
}
