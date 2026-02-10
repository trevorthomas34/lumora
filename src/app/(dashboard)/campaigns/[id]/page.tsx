import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CampaignDetailContent } from "@/components/campaigns/campaign-detail-content";

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!business) redirect("/onboarding");

  const { data: plan } = await supabase
    .from("campaign_plans")
    .select("*")
    .eq("id", params.id)
    .eq("business_id", business.id)
    .single();

  if (!plan) notFound();

  return (
    <CampaignDetailContent
      plan={plan}
      businessId={business.id}
    />
  );
}
