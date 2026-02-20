import { Suspense } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsContent } from "@/components/dashboard/settings-content";

export default async function SettingsPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!business) redirect("/onboarding");

  const { data: connections } = await supabase
    .from("connections")
    .select("id, platform, status, platform_account_id, platform_account_name, updated_at")
    .eq("business_id", business.id);

  return (
    <Suspense>
      <SettingsContent
        business={business}
        connections={connections || []}
      />
    </Suspense>
  );
}
