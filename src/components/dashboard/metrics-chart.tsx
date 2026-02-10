"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { PerformanceSnapshot } from "@/types";
import { format } from "date-fns";

interface MetricsChartProps {
  snapshots: PerformanceSnapshot[];
}

export function MetricsChart({ snapshots }: MetricsChartProps) {
  const chartData = snapshots.map((s) => ({
    date: format(new Date(s.date), "MMM d"),
    spend: s.spend,
    conversions: s.conversions,
    clicks: s.clicks,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 25% 18%)" />
        <XAxis
          dataKey="date"
          stroke="hsl(220 15% 55%)"
          fontSize={12}
          tickLine={false}
        />
        <YAxis
          stroke="hsl(220 15% 55%)"
          fontSize={12}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(230 35% 9%)",
            border: "1px solid hsl(230 25% 18%)",
            borderRadius: "8px",
            color: "hsl(220 20% 90%)",
          }}
        />
        <Area
          type="monotone"
          dataKey="spend"
          stroke="#7c3aed"
          fillOpacity={1}
          fill="url(#colorSpend)"
          name="Spend ($)"
        />
        <Area
          type="monotone"
          dataKey="conversions"
          stroke="#10b981"
          fillOpacity={1}
          fill="url(#colorConversions)"
          name="Conversions"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
