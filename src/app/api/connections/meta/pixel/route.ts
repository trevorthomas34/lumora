import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/connections/meta/pixel
// Saves the Meta Pixel ID for a business's Meta connection
export async function POST(request: Request) {
  const { businessId, pixelId } = await request.json();
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient
    .from("connections")
    .update({
      pixel_id: pixelId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", businessId)
    .eq("platform", "meta");

  if (error) return NextResponse.json({ error: "Failed to update pixel ID" }, { status: 500 });

  return NextResponse.json({ success: true });
}
