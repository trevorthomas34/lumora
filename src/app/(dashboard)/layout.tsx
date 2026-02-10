import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let recommendationCount = 0;
  if (user) {
    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (business) {
      const { count } = await supabase
        .from("recommendations")
        .select("*", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("status", "pending");

      recommendationCount = count || 0;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar recommendationCount={recommendationCount} />
      <div className="md:pl-64">
        <TopNav userEmail={user?.email} recommendationCount={recommendationCount} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
