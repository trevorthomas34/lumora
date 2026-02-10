import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
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
    .limit(30);

  const { data: recommendations } = await supabase
    .from("recommendations")
    .select("*")
    .eq("business_id", business.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentActions } = await supabase
    .from("action_logs")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <DashboardContent
      business={business}
      snapshots={snapshots || []}
      recommendations={recommendations || []}
      recentActions={recentActions || []}
    />
  );
}
