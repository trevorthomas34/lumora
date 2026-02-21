import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getValidTokens } from "@/lib/oauth/tokens";
import { NextResponse } from "next/server";

interface PreflightCheck {
  label: string;
  pass: boolean;
  action?: string;
}

export async function POST(request: Request) {
  try {
    const { businessId } = await request.json();
    if (!businessId) {
      return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

    // In demo mode, return all checks as passing
    if (isDemoMode) {
      return NextResponse.json({
        ready: true,
        checks: [
          { label: "Meta connected", pass: true },
          { label: "Ad account selected", pass: true },
          { label: "Facebook Page linked", pass: true },
          { label: "Payment method on file", pass: true },
          { label: "Budget configured", pass: true },
        ],
      });
    }

    const serviceClient = createServiceRoleClient();

    // Fetch business
    const { data: business } = await serviceClient
      .from("businesses")
      .select("daily_budget")
      .eq("id", businessId)
      .single();

    const checks: PreflightCheck[] = [];

    // Check 1: Meta connected
    const { data: connection } = await serviceClient
      .from("connections")
      .select("*")
      .eq("business_id", businessId)
      .eq("platform", "meta")
      .eq("status", "active")
      .single();

    const metaConnected = !!connection;
    checks.push({
      label: "Meta connected",
      pass: metaConnected,
      action: metaConnected ? undefined : "Connect Meta in Settings → Connected Accounts",
    });

    if (!metaConnected) {
      // Can't check further without a connection
      checks.push({ label: "Ad account selected", pass: false, action: "Connect Meta first" });
      checks.push({ label: "Facebook Page linked", pass: false, action: "Connect Meta first" });
      checks.push({ label: "Payment method on file", pass: false, action: "Connect Meta first" });
      checks.push({
        label: "Budget configured",
        pass: !!(business?.daily_budget && business.daily_budget > 0),
        action: "Set a daily budget in Settings → Business Settings",
      });
      return NextResponse.json({ ready: false, checks });
    }

    // Check 2: Ad account selected
    const adAccountSelected = !!connection.platform_account_id;
    checks.push({
      label: "Ad account selected",
      pass: adAccountSelected,
      action: adAccountSelected ? undefined : "Select an ad account in Settings → Connected Accounts",
    });

    // Check 3: Facebook Page linked
    let pageLinked = false;
    try {
      const tokens = await getValidTokens(connection);
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name&access_token=${tokens.access_token}`
      );
      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        pageLinked = Array.isArray(pagesData.data) && pagesData.data.length > 0;
      }
    } catch {
      // treat as not linked if fetch fails
    }
    checks.push({
      label: "Facebook Page linked",
      pass: pageLinked,
      action: pageLinked ? undefined : "Create or link a Facebook Page in Meta Business Manager",
    });

    // Check 4: Payment method on file
    let paymentOnFile = false;
    if (adAccountSelected) {
      try {
        const tokens = await getValidTokens(connection);
        const billingRes = await fetch(
          `https://graph.facebook.com/v21.0/${connection.platform_account_id}?fields=funding_source_details&access_token=${tokens.access_token}`
        );
        if (billingRes.ok) {
          const billingData = await billingRes.json();
          paymentOnFile = !!billingData.funding_source_details;
        }
      } catch {
        // treat as not on file if fetch fails
      }
    }
    checks.push({
      label: "Payment method on file",
      pass: paymentOnFile,
      action: paymentOnFile ? undefined : "Add a payment method in Meta Business Manager → Billing",
    });

    // Check 5: Budget configured
    const budgetSet = !!(business?.daily_budget && business.daily_budget > 0);
    checks.push({
      label: "Budget configured",
      pass: budgetSet,
      action: budgetSet ? undefined : "Set a daily budget in Settings → Business Settings",
    });

    const ready = checks.every((c) => c.pass);
    return NextResponse.json({ ready, checks });
  } catch (error) {
    console.error("Preflight check error:", error);
    return NextResponse.json({ error: "Preflight check failed" }, { status: 500 });
  }
}
