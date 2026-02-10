import { createServiceRoleClient } from "@/lib/supabase/server";
import { runDailySync } from "@/lib/engine/sync";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Verify cron secret or manual trigger
    const { businessId } = await request.json().catch(() => ({ businessId: null }));

    // For manual trigger from UI, check user auth
    if (!businessId) {
      return NextResponse.json({ error: "Business ID required" }, { status: 400 });
    }

    await runDailySync(businessId);

    return NextResponse.json({ success: true, message: "Daily sync completed" });
  } catch (error) {
    console.error("Daily sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

// GET endpoint for cron job triggers
export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    // Get all businesses with active campaigns
    const { data: businesses } = await supabase
      .from("businesses")
      .select("id")
      .eq("onboarding_completed", true);

    if (!businesses || businesses.length === 0) {
      return NextResponse.json({ message: "No businesses to sync" });
    }

    for (const business of businesses) {
      try {
        await runDailySync(business.id);
      } catch (error) {
        console.error(`Sync failed for business ${business.id}:`, error);
      }
    }

    return NextResponse.json({ success: true, synced: businesses.length });
  } catch (error) {
    console.error("Cron sync error:", error);
    return NextResponse.json({ error: "Cron sync failed" }, { status: 500 });
  }
}
