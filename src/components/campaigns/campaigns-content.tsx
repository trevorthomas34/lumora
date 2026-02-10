"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Loader } from "@/components/shared/loader";
import { Megaphone, ArrowRight, Sparkles } from "lucide-react";
import type { Business, CampaignPlan, CampaignPlanStatus } from "@/types";

interface CampaignsContentProps {
  business: Business;
  campaignPlans: CampaignPlan[];
  hasBrandBrief: boolean;
}

const statusColors: Record<CampaignPlanStatus, string> = {
  draft: "secondary",
  pending_approval: "warning",
  approved: "success",
  launched: "default",
  archived: "secondary",
};

export function CampaignsContent({ business, campaignPlans, hasBrandBrief }: CampaignsContentProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = async () => {
    if (!hasBrandBrief) {
      router.push("/brand-brief");
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });
      if (!res.ok) throw new Error("Failed to generate campaign plan");
      const data = await res.json();
      router.push(`/campaigns/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  };

  if (generating) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader size="lg" text="AI is crafting your campaign strategy..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Campaigns</h2>
        <Button variant="lumora" onClick={handleGenerate}>
          <Sparkles className="mr-2 h-4 w-4" />
          {hasBrandBrief ? "Generate New Plan" : "Create Brand Brief First"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {campaignPlans.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No Campaign Plans Yet"
          description={
            hasBrandBrief
              ? "Generate your first AI campaign plan based on your brand brief."
              : "Create a brand brief first, then generate your AI campaign strategy."
          }
          actionLabel={hasBrandBrief ? "Generate Campaign Plan" : "Create Brand Brief"}
          onAction={hasBrandBrief ? handleGenerate : () => router.push("/brand-brief")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaignPlans.map((plan) => (
            <Link key={plan.id} href={`/campaigns/${plan.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <Badge variant={statusColors[plan.status] as "default" | "secondary" | "destructive" | "outline" | "success" | "warning"}>
                      {plan.status.replace("_", " ")}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {plan.plan_data.strategy_summary}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{plan.plan_data.campaigns.length} campaigns</span>
                    <span>${plan.plan_data.estimated_daily_spend}/day</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>{new Date(plan.created_at).toLocaleDateString()}</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
