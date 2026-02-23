import { createServiceRoleClient } from "@/lib/supabase/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { assetId, selected } = await request.json();
    if (!assetId || typeof selected !== "boolean") {
      return NextResponse.json({ error: "assetId and selected required" }, { status: 400 });
    }

    // Verify the requesting user owns this asset
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const serviceClient = createServiceRoleClient();

    // Confirm asset belongs to this user's business before updating
    const { data: asset } = await serviceClient
      .from("creative_assets")
      .select("id, business_id")
      .eq("id", assetId)
      .single();

    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

    const { data: business } = await serviceClient
      .from("businesses")
      .select("id")
      .eq("id", asset.business_id)
      .eq("user_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await serviceClient
      .from("creative_assets")
      .update({ selected })
      .eq("id", assetId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Asset select error:", error);
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}
