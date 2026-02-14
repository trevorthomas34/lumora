"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/campaigns": "Campaigns",
  "/brand-brief": "Brand Brief",
  "/assets": "Assets",
  "/performance": "Performance",
  "/recommendations": "Recommendations",
  "/action-log": "Action Log",
  "/settings": "Settings",
  "/onboarding": "Get Started",
};

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/campaigns/")) return "Campaign Detail";
  return pageTitles[pathname] || "LumoraAI";
}

interface TopNavProps {
  userEmail?: string;
  recommendationCount?: number;
}

export function TopNav({ userEmail, recommendationCount = 0 }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-6">
      <div className="flex items-center gap-4 md:pl-0 pl-12">
        <h1 className="text-lg font-semibold">{getPageTitle(pathname)}</h1>
      </div>

      <div className="flex items-center gap-3">
        {recommendationCount > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => router.push("/recommendations")}
          >
            <Bell className="h-4 w-4" />
            <Badge
              variant="default"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
            >
              {recommendationCount}
            </Badge>
          </Button>
        )}

        {userEmail && (
          <span className="hidden sm:block text-sm text-muted-foreground">
            {userEmail}
          </span>
        )}

        <Button variant="ghost" size="icon" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
