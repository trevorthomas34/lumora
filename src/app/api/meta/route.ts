import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getPlatformAdapter } from "@/lib/adapters/types";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const businessId = url.searchParams.get("businessId");
    const entityId = url.searchParams.get("entityId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    if (!businessId || !entityId || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adapter = getPlatformAdapter("meta");
    const insights = await adapter.getInsights(entityId, { start: startDate, end: endDate });

    return NextResponse.json(insights);
  } catch {
    return NextResponse.json({ error: "Failed to fetch insights" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { businessId, action, entityId, value } = await request.json();
    const supabase = createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adapter = getPlatformAdapter("meta");

    if (action === "updateBudget") {
      await adapter.updateBudget(entityId, value);
    } else if (action === "updateStatus") {
      await adapter.updateStatus(entityId, value);
    }

    await supabase.from("action_logs").insert({
      business_id: businessId,
      entity_id: entityId,
      actor: "user",
      action_type: `meta_${action}`,
      description: `${action}: ${value}`,
      platform: "meta",
      platform_entity_id: entityId,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to execute action" }, { status: 500 });
  }
}
