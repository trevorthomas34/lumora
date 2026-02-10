"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { DollarSign, Eye, MousePointer, Target, TrendingUp, Activity, ArrowRight, Sparkles } from "lucide-react";
import type { Business, PerformanceSnapshot, Recommendation, ActionLog } from "@/types";
import { MetricsChart } from "./metrics-chart";
import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardContentProps {
  business: Business;
  snapshots: PerformanceSnapshot[];
  recommendations: Recommendation[];
  recentActions: ActionLog[];
}

function aggregateSnapshots(snapshots: PerformanceSnapshot[]) {
  if (snapshots.length === 0) {
    return { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, ctr: 0, cpa: 0, roas: 0 };
  }
  const totals = snapshots.reduce(
    (acc, s) => ({
      spend: acc.spend + s.spend,
      impressions: acc.impressions + s.impressions,
      clicks: acc.clicks + s.clicks,
      conversions: acc.conversions + s.conversions,
      revenue: acc.revenue + s.revenue,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
  );

  return {
    ...totals,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    cpa: totals.conversions > 0 ? totals.spend / totals.conversions : 0,
    roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
  };
}

export function DashboardContent({ business, snapshots, recommendations, recentActions }: DashboardContentProps) {
  const metrics = aggregateSnapshots(snapshots);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  useEffect(() => {
    if (snapshots.length > 0) {
      setAiSummary(
        `Over the last ${snapshots.length} days, your campaigns spent ${formatCurrency(metrics.spend)} and generated ${metrics.conversions} conversions at ${formatCurrency(metrics.cpa)} per conversion. ${
          metrics.roas > 1
            ? `Your return on ad spend is ${metrics.roas.toFixed(1)}x — your ads are profitable.`
            : metrics.conversions > 0
            ? "Focus on optimizing your best-performing ads to improve ROAS."
            : "Your campaigns are still gathering data. Give them a few more days."
        }`
      );
    }
  }, [snapshots.length, metrics.spend, metrics.conversions, metrics.cpa, metrics.roas]);

  const metricCards = [
    { label: "Total Spend", value: formatCurrency(metrics.spend), icon: DollarSign, color: "text-blue-400" },
    { label: "Impressions", value: formatNumber(metrics.impressions), icon: Eye, color: "text-purple-400" },
    { label: "Clicks", value: formatNumber(metrics.clicks), icon: MousePointer, color: "text-cyan-400" },
    { label: "Conversions", value: formatNumber(metrics.conversions), icon: Target, color: "text-emerald-400" },
    { label: "CPA", value: formatCurrency(metrics.cpa), icon: TrendingUp, color: "text-amber-400" },
    { label: "ROAS", value: `${metrics.roas.toFixed(2)}x`, icon: Activity, color: "text-pink-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold">
          Welcome back{business.name ? `, ${business.name}` : ""}
        </h2>
        <p className="text-muted-foreground">Here&apos;s how your campaigns are performing.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metricCards.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
                <span className="text-xs text-muted-foreground">{metric.label}</span>
              </div>
              <p className="text-xl font-bold">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex gap-3">
            <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">AI Summary</p>
              <p className="text-sm text-muted-foreground">{aiSummary}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {snapshots.length > 0 ? (
                <MetricsChart snapshots={snapshots} />
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  No performance data yet. Launch a campaign to start seeing results.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Recommendations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Recommendations</CardTitle>
              {recommendations.length > 0 && (
                <Badge variant="default">{recommendations.length}</Badge>
              )}
            </CardHeader>
            <CardContent>
              {recommendations.length > 0 ? (
                <div className="space-y-3">
                  {recommendations.slice(0, 3).map((rec) => (
                    <div key={rec.id} className="text-sm">
                      <p className="font-medium">{rec.title}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{rec.description}</p>
                    </div>
                  ))}
                  <Link href="/recommendations">
                    <Button variant="ghost" size="sm" className="w-full">
                      View all <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recommendations yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentActions.length > 0 ? (
                <div className="space-y-3">
                  {recentActions.slice(0, 5).map((action) => (
                    <div key={action.id} className="text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={action.actor === "agent" ? "default" : "secondary"} className="text-[10px]">
                          {action.actor}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {new Date(action.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-0.5">{action.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
