"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/shared/loader";
import { CheckCheck, ChevronDown, ChevronRight, Rocket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CampaignPlan, CampaignConfig, AdSetConfig, AdConfig } from "@/types";

interface CampaignDetailContentProps {
  plan: CampaignPlan;
  businessId: string;
}

export function CampaignDetailContent({ plan, businessId }: CampaignDetailContentProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const isApproved = plan.status === "approved" || plan.status === "launched";
  const isPendingApproval = plan.status === "draft" || plan.status === "pending_approval";

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  const handleApproveAll = async () => {
    try {
      await supabase.from("approvals").insert({
        business_id: businessId,
        entity_type: "campaign_plan",
        entity_id: plan.id,
        decision: "approved",
        decided_at: new Date().toISOString(),
      });

      await supabase.from("campaign_plans").update({ status: "approved" }).eq("id", plan.id);
      await supabase.from("action_logs").insert({
        business_id: businessId,
        entity_id: plan.id,
        actor: "user",
        action_type: "approve_campaign_plan",
        description: `Approved campaign plan: ${plan.name}`,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error approving");
    }
  };

  const handleLaunch = async () => {
    setLaunching(true);
    setError(null);
    try {
      const res = await fetch("/api/campaigns/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, businessId }),
      });
      if (!res.ok) throw new Error("Failed to launch");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch error");
    } finally {
      setLaunching(false);
    }
  };

  if (launching) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader size="lg" text="Launching campaigns to platforms..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{plan.name}</h2>
          <p className="text-sm text-muted-foreground">
            {plan.plan_data.strategy_summary}
          </p>
        </div>
        <div className="flex gap-2">
          {isPendingApproval && (
            <Button variant="lumora" onClick={handleApproveAll}>
              <CheckCheck className="mr-2 h-4 w-4" /> Approve All
            </Button>
          )}
          {isApproved && plan.status !== "launched" && (
            <Button variant="lumora" onClick={handleLaunch}>
              <Rocket className="mr-2 h-4 w-4" /> Launch Campaigns
            </Button>
          )}
          <Badge variant={plan.status === "launched" ? "success" : plan.status === "approved" ? "success" : "warning"}>
            {plan.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{plan.plan_data.campaigns.length}</p>
            <p className="text-xs text-muted-foreground">Campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">${plan.plan_data.estimated_daily_spend}</p>
            <p className="text-xs text-muted-foreground">Daily Spend</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm font-bold">{plan.plan_data.estimated_monthly_results}</p>
            <p className="text-xs text-muted-foreground">Est. Monthly Results</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Tree */}
      <div className="space-y-4">
        {plan.plan_data.campaigns.map((campaign: CampaignConfig) => (
          <Card key={campaign.temp_id}>
            <CardHeader
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => toggle(campaign.temp_id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {expanded.has(campaign.temp_id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <CardTitle className="text-base">{campaign.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{campaign.objective}</Badge>
                  <span className="text-sm text-muted-foreground">${campaign.daily_budget}/day</span>
                </div>
              </div>
            </CardHeader>

            {expanded.has(campaign.temp_id) && (
              <CardContent className="pt-0">
                {campaign.ad_sets.map((adSet: AdSetConfig) => (
                  <div key={adSet.temp_id} className="ml-6 border-l-2 border-border pl-4 mb-4">
                    <div
                      className="cursor-pointer py-2"
                      onClick={() => toggle(adSet.temp_id)}
                    >
                      <div className="flex items-center gap-2">
                        {expanded.has(adSet.temp_id) ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                        <span className="font-medium text-sm">{adSet.name}</span>
                      </div>
                      <div className="flex gap-2 mt-1 ml-5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                          Ages {adSet.targeting.age_min}-{adSet.targeting.age_max}
                        </Badge>
                        {adSet.targeting.interests.slice(0, 2).map((i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{i}</Badge>
                        ))}
                        <Badge variant="secondary" className="text-[10px]">
                          {adSet.placements.length} placements
                        </Badge>
                      </div>
                    </div>

                    {expanded.has(adSet.temp_id) && (
                      <div className="ml-5 space-y-3 mt-2">
                        {adSet.ads.map((ad: AdConfig) => (
                          <Card key={ad.temp_id} className="bg-muted/30">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{ad.name}</span>
                                <Badge variant="outline" className="text-[10px]">{ad.format}</Badge>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="bg-background rounded-md p-3">
                                  <p className="text-muted-foreground">{ad.primary_text}</p>
                                  <p className="font-semibold mt-2">{ad.headline}</p>
                                  <p className="text-xs text-muted-foreground">{ad.description}</p>
                                  <Badge variant="default" className="mt-2 text-[10px]">{ad.call_to_action}</Badge>
                                </div>
                                {ad.variants.length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Variants:</p>
                                    {ad.variants.map((v, vi) => (
                                      <div key={vi} className="bg-background rounded-md p-2 mt-1 text-xs">
                                        <p className="text-muted-foreground">{v.primary_text}</p>
                                        <p className="font-medium mt-1">{v.headline}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
