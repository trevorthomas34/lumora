import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AssetsContent } from "@/components/campaigns/assets-content";

export default async function AssetsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!business) redirect("/onboarding");

  const { data: assets } = await supabase
    .from("creative_assets")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  const { data: connection } = await supabase
    .from("connections")
    .select("id, status, platform_account_name")
    .eq("business_id", business.id)
    .eq("platform", "google_drive")
    .single();

  return (
    <AssetsContent
      businessId={business.id}
      assets={assets || []}
      driveConnected={connection?.status === "active"}
    />
  );
}
