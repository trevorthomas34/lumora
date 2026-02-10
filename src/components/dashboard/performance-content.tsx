"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricsChart } from "./metrics-chart";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import type { PerformanceSnapshot, CampaignEntity } from "@/types";
import { DollarSign, Eye, MousePointer, Target, TrendingUp, Activity } from "lucide-react";

interface PerformanceContentProps {
  snapshots: PerformanceSnapshot[];
  entities: CampaignEntity[];
}

export function PerformanceContent({ snapshots, entities }: PerformanceContentProps) {
  const [period, setPeriod] = useState("14");

  const filteredSnapshots = snapshots.slice(-parseInt(period));

  const totals = filteredSnapshots.reduce(
    (acc, s) => ({
      spend: acc.spend + s.spend,
      impressions: acc.impressions + s.impressions,
      clicks: acc.clicks + s.clicks,
      conversions: acc.conversions + s.conversions,
      revenue: acc.revenue + s.revenue,
    }),
    { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
  );

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
  const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;

  const metrics = [
    { label: "Spend", value: formatCurrency(totals.spend), icon: DollarSign, color: "text-blue-400" },
    { label: "Impressions", value: formatNumber(totals.impressions), icon: Eye, color: "text-purple-400" },
    { label: "Clicks", value: formatNumber(totals.clicks), icon: MousePointer, color: "text-cyan-400" },
    { label: "Conversions", value: formatNumber(totals.conversions), icon: Target, color: "text-emerald-400" },
    { label: "CTR", value: formatPercent(ctr), icon: TrendingUp, color: "text-amber-400" },
    { label: "CPA", value: formatCurrency(cpa), icon: DollarSign, color: "text-orange-400" },
    { label: "ROAS", value: roas.toFixed(2) + "x", icon: Activity, color: "text-pink-400" },
    { label: "Revenue", value: formatCurrency(totals.revenue), icon: DollarSign, color: "text-green-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Performance</h2>
        <Tabs defaultValue="14" onValueChange={setPeriod}>
          <TabsList>
            <TabsTrigger value="7">7d</TabsTrigger>
            <TabsTrigger value="14">14d</TabsTrigger>
            <TabsTrigger value="30">30d</TabsTrigger>
            <TabsTrigger value="90">90d</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <m.icon className={`h-4 w-4 ${m.color}`} />
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
              <p className="text-lg font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSnapshots.length > 0 ? (
            <MetricsChart snapshots={filteredSnapshots} />
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              No data for this period. Launch campaigns to start tracking.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign Entities</CardTitle>
        </CardHeader>
        <CardContent>
          {entities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Entity</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Type</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Platform</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.map((e) => (
                    <tr key={e.id} className="border-b border-border/50">
                      <td className="py-2">{e.temp_id}</td>
                      <td className="py-2 capitalize">{e.entity_type.replace("_", " ")}</td>
                      <td className="py-2 capitalize">{e.platform.replace("_", " ")}</td>
                      <td className="py-2 capitalize">{e.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No campaign entities yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
