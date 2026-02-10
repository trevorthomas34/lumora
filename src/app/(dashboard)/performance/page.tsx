import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PerformanceContent } from "@/components/dashboard/performance-content";

export default async function PerformancePage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!business) redirect("/onboarding");

  const { data: snapshots } = await supabase
    .from("performance_snapshots")
    .select("*")
    .eq("business_id", business.id)
    .order("date", { ascending: true })
    .limit(90);

  const { data: entities } = await supabase
    .from("campaign_entities")
    .select("*")
    .eq("business_id", business.id);

  return (
    <PerformanceContent
      snapshots={snapshots || []}
      entities={entities || []}
    />
  );
}
