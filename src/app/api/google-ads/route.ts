import { getPlatformAdapter } from "@/lib/adapters/types";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const entityId = url.searchParams.get("entityId");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    if (!entityId || !startDate || !endDate) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const adapter = getPlatformAdapter("google_ads");
    const insights = await adapter.getInsights(entityId, { start: startDate, end: endDate });

    return NextResponse.json(insights);
  } catch {
    return NextResponse.json({ error: "Failed to fetch Google Ads insights" }, { status: 500 });
  }
}
