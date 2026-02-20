import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getValidTokens } from "@/lib/oauth/tokens";
import { NextResponse } from "next/server";

// GET /api/connections/meta/ad-accounts?businessId=xxx
// Returns all Meta ad accounts for the connected user
export async function GET(request: Request) {
  const url = new URL(request.url);
  const businessId = url.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "Missing businessId" }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceRoleClient();
  const { data: connection } = await serviceClient
    .from("connections")
    .select("*")
    .eq("business_id", businessId)
    .eq("platform", "meta")
    .eq("status", "active")
    .single();

  if (!connection) return NextResponse.json({ error: "Meta not connected" }, { status: 404 });

  const tokens = await getValidTokens(connection);
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status&access_token=${tokens.access_token}`
  );
  if (!res.ok) return NextResponse.json({ error: "Failed to fetch ad accounts" }, { status: 502 });

  const data = await res.json();
  return NextResponse.json({
    accounts: data.data || [],
    selectedId: connection.platform_account_id,
  });
}

// POST /api/connections/meta/ad-accounts
// Saves the selected ad account ID for this business
export async function POST(request: Request) {
  const { businessId, adAccountId, adAccountName } = await request.json();
  if (!businessId || !adAccountId) {
    return NextResponse.json({ error: "Missing businessId or adAccountId" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const serviceClient = createServiceRoleClient();
  const { error } = await serviceClient
    .from("connections")
    .update({
      platform_account_id: adAccountId,
      platform_account_name: adAccountName || null,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", businessId)
    .eq("platform", "meta");

  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });

  return NextResponse.json({ success: true });
}
