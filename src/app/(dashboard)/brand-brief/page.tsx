import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BrandBriefContent } from "@/components/campaigns/brand-brief-content";

export default async function BrandBriefPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!business) redirect("/onboarding");

  const { data: brandBrief } = await supabase
    .from("brand_briefs")
    .select("*")
    .eq("business_id", business.id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  return <BrandBriefContent business={business} brandBrief={brandBrief} />;
}
