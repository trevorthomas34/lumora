import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RecommendationsContent } from "@/components/dashboard/recommendations-content";

export default async function RecommendationsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!business) redirect("/onboarding");

  const { data: recommendations } = await supabase
    .from("recommendations")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <RecommendationsContent
      businessId={business.id}
      recommendations={recommendations || []}
    />
  );
}
