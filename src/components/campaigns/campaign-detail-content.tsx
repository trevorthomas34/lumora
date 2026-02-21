"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader } from "@/components/shared/loader";
import {
  ChevronDown, ChevronRight, RefreshCw, Rocket,
  Pencil, Check, X, AlertCircle, Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CampaignPlan, CampaignConfig, AdSetConfig, AdConfig } from "@/types";

interface PreflightCheck {
  label: string;
  pass: boolean;
  action?: string;
}

interface CampaignDetailContentProps {
  plan: CampaignPlan;
  businessId: string;
}

export function CampaignDetailContent({ plan: initialPlan, businessId }: CampaignDetailContentProps) {
  const [plan, setPlan] = useState(initialPlan);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [launching, setLaunching] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<string | null>(null);
  const [retryErrors, setRetryErrors] = useState<{ name: string; error_title: string; error_msg: string }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Preflight
  const [preflight, setPreflight] = useState<{ ready: boolean; checks: PreflightCheck[] } | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);

  // Inline editing
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<AdConfig>>({});
  const [savingAd, setSavingAd] = useState(false);

  // Budget editing
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editBudgetValue, setEditBudgetValue] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const isGenerated = searchParams.get("generated") === "true";
  const isApproved = plan.status === "approved" || plan.status === "launched";
  const isPendingApproval = plan.status === "draft" || plan.status === "pending_approval";

  // Auto-expand all campaigns when arrived via ?generated=true
  useEffect(() => {
    if (isGenerated) {
      const ids = new Set<string>();
      plan.plan_data.campaigns.forEach((c: CampaignConfig) => {
        ids.add(c.temp_id);
        c.ad_sets.forEach((s: AdSetConfig) => ids.add(s.temp_id));
      });
      setExpanded(ids);
    }
  }, [isGenerated]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPreflight = useCallback(async () => {
    if (plan.status === "launched") return;
    setPreflightLoading(true);
    try {
      const res = await fetch("/api/campaigns/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreflight(data);
      }
    } finally {
      setPreflightLoading(false);
    }
  }, [businessId, plan.status]);

  useEffect(() => {
    fetchPreflight();
  }, [fetchPreflight]);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  // ── Approve + Launch (merged) ─────────────────────────────────────

  const handleApproveAndLaunch = async () => {
    setLaunching(true);
    setError(null);
    try {
      // Step 1: Approve
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

      // Step 2: Launch
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

  // ── Standalone launch (for already-approved plans) ────────────────

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

  // ── Retry failed ads ─────────────────────────────────────────────

  const handleRetryAds = async () => {
    setRetrying(true);
    setError(null);
    setRetryResult(null);
    setRetryErrors([]);
    try {
      const res = await fetch("/api/campaigns/retry-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, businessId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Retry failed");
      setRetryResult(`Retried ${data.retried} ad${data.retried !== 1 ? "s" : ""}${data.failed > 0 ? ` — ${data.failed} still failed` : " successfully"}.`);
      if (data.failedDetails?.length > 0) {
        setRetryErrors(data.failedDetails);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry error");
    } finally {
      setRetrying(false);
    }
  };

  // ── Inline ad editing ────────────────────────────────────────────

  const startEditAd = (ad: AdConfig) => {
    setEditingAdId(ad.temp_id);
    setEditValues({
      primary_text: ad.primary_text,
      headline: ad.headline,
      description: ad.description,
      call_to_action: ad.call_to_action,
    });
  };

  const cancelEditAd = () => {
    setEditingAdId(null);
    setEditValues({});
  };

  const saveEditAd = async (campaignIdx: number, adSetIdx: number, adIdx: number) => {
    setSavingAd(true);
    try {
      const updatedPlanData = JSON.parse(JSON.stringify(plan.plan_data));
      const ad = updatedPlanData.campaigns[campaignIdx].ad_sets[adSetIdx].ads[adIdx];
      Object.assign(ad, editValues);

      await supabase
        .from("campaign_plans")
        .update({ plan_data: updatedPlanData })
        .eq("id", plan.id);

      setPlan((prev) => ({ ...prev, plan_data: updatedPlanData }));
      setEditingAdId(null);
      setEditValues({});
    } finally {
      setSavingAd(false);
    }
  };

  // ── Inline budget editing ─────────────────────────────────────────

  const startEditBudget = (campaign: CampaignConfig) => {
    setEditingBudgetId(campaign.temp_id);
    setEditBudgetValue(campaign.daily_budget.toString());
  };

  const cancelEditBudget = () => {
    setEditingBudgetId(null);
    setEditBudgetValue("");
  };

  const saveEditBudget = async (campaignIdx: number) => {
    setSavingBudget(true);
    try {
      const updatedPlanData = JSON.parse(JSON.stringify(plan.plan_data));
      updatedPlanData.campaigns[campaignIdx].daily_budget = parseFloat(editBudgetValue) || 0;

      await supabase
        .from("campaign_plans")
        .update({ plan_data: updatedPlanData })
        .eq("id", plan.id);

      setPlan((prev) => ({ ...prev, plan_data: updatedPlanData }));
      setEditingBudgetId(null);
      setEditBudgetValue("");
    } finally {
      setSavingBudget(false);
    }
  };

  if (launching) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader size="lg" text="Launching campaigns to platforms..." />
      </div>
    );
  }

  const launchDisabled = isPendingApproval && preflight !== null && !preflight.ready;

  return (
    <div className="space-y-6">
      {/* Generated banner */}
      {isGenerated && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary">Your AI-generated campaign is ready to review.</p>
            <p className="text-sm text-muted-foreground mt-0.5">Edit anything below, then click Approve &amp; Launch when you&apos;re ready.</p>
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{plan.name}</h2>
          <p className="text-sm text-muted-foreground">{plan.plan_data.strategy_summary}</p>
        </div>
        <div className="flex gap-2 items-center">
          {isPendingApproval && (
            <Button
              variant="lumora"
              onClick={handleApproveAndLaunch}
              disabled={launchDisabled}
            >
              <Rocket className="mr-2 h-4 w-4" /> Approve &amp; Launch
            </Button>
          )}
          {isApproved && plan.status !== "launched" && (
            <Button variant="lumora" onClick={handleLaunch}>
              <Rocket className="mr-2 h-4 w-4" /> Launch Campaigns
            </Button>
          )}
          {plan.status === "launched" && (
            <Button variant="outline" onClick={handleRetryAds} disabled={retrying}>
              <RefreshCw className={`mr-2 h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
              {retrying ? "Retrying..." : "Retry Failed Ads"}
            </Button>
          )}
          <Badge variant={plan.status === "launched" ? "success" : plan.status === "approved" ? "success" : "warning"}>
            {plan.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {retryResult && <p className="text-sm text-green-500">{retryResult}</p>}
      {retryErrors.length > 0 && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-2">
          <p className="text-sm font-medium text-red-400">Ads that still failed:</p>
          {retryErrors.map((e, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium text-red-400">{e.name}:</span>{" "}
              <span className="text-red-400/80">{e.error_title} — {e.error_msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Preflight check panel */}
      {plan.status !== "launched" && (
        <Card className={preflight?.ready === false ? "border-amber-500/30" : "border-border/50"}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Pre-flight Checks</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={fetchPreflight}
                disabled={preflightLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${preflightLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {preflightLoading && !preflight ? (
              <p className="text-sm text-muted-foreground">Checking...</p>
            ) : preflight ? (
              <div className="space-y-2">
                {preflight.checks.map((check) => (
                  <div key={check.label} className="flex items-start gap-2 text-sm">
                    {check.pass ? (
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className={check.pass ? "text-foreground" : "text-amber-400"}>{check.label}</span>
                      {!check.pass && check.action && (
                        <p className="text-xs text-muted-foreground mt-0.5">{check.action}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
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
        {plan.plan_data.campaigns.map((campaign: CampaignConfig, ci: number) => (
          <Card key={campaign.temp_id}>
            <CardHeader
              className="cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => {
                if (editingBudgetId !== campaign.temp_id) toggle(campaign.temp_id);
              }}
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
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Badge variant="outline">{campaign.objective}</Badge>
                  {editingBudgetId === campaign.temp_id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        className="h-7 w-20 text-sm"
                        type="number"
                        value={editBudgetValue}
                        onChange={(e) => setEditBudgetValue(e.target.value)}
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => saveEditBudget(ci)}
                        disabled={savingBudget}
                      >
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={cancelEditBudget}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground group"
                      onClick={() => startEditBudget(campaign)}
                    >
                      ${campaign.daily_budget}/day
                      <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>

            {expanded.has(campaign.temp_id) && (
              <CardContent className="pt-0">
                {campaign.ad_sets.map((adSet: AdSetConfig, si: number) => (
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
                        {adSet.ads.map((ad: AdConfig, ai: number) => (
                          <Card key={ad.temp_id} className="bg-muted/30">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{ad.name}</span>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-[10px]">{ad.format}</Badge>
                                  {editingAdId !== ad.temp_id && plan.status !== "launched" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0"
                                      onClick={() => startEditAd(ad)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {editingAdId === ad.temp_id ? (
                                <div className="space-y-2">
                                  <div>
                                    <label className="text-xs text-muted-foreground">Primary Text</label>
                                    <Textarea
                                      className="text-sm mt-1 min-h-[80px]"
                                      value={editValues.primary_text || ""}
                                      onChange={(e) => setEditValues((v) => ({ ...v, primary_text: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Headline</label>
                                    <Input
                                      className="text-sm mt-1"
                                      value={editValues.headline || ""}
                                      onChange={(e) => setEditValues((v) => ({ ...v, headline: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Description</label>
                                    <Input
                                      className="text-sm mt-1"
                                      value={editValues.description || ""}
                                      onChange={(e) => setEditValues((v) => ({ ...v, description: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground">Call to Action</label>
                                    <Input
                                      className="text-sm mt-1"
                                      value={editValues.call_to_action || ""}
                                      onChange={(e) => setEditValues((v) => ({ ...v, call_to_action: e.target.value }))}
                                    />
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <Button
                                      variant="lumora"
                                      size="sm"
                                      onClick={() => saveEditAd(ci, si, ai)}
                                      disabled={savingAd}
                                    >
                                      {savingAd ? "Saving..." : "Save"}
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={cancelEditAd}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
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
                              )}
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
