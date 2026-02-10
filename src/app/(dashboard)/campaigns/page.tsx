import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CampaignsContent } from "@/components/campaigns/campaigns-content";

export default async function CampaignsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!business) redirect("/onboarding");

  const { data: campaignPlans } = await supabase
    .from("campaign_plans")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const { data: brandBrief } = await supabase
    .from("brand_briefs")
    .select("*")
    .eq("business_id", business.id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  return (
    <CampaignsContent
      business={business}
      campaignPlans={campaignPlans || []}
      hasBrandBrief={!!brandBrief}
    />
  );
}
