"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Loader } from "@/components/shared/loader";
import { FileText, Sparkles, RefreshCw, Check } from "lucide-react";
import type { Business, BrandBrief } from "@/types";

interface BrandBriefContentProps {
  business: Business;
  brandBrief: BrandBrief | null;
}

export function BrandBriefContent({ business, brandBrief }: BrandBriefContentProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/brand-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });
      if (!res.ok) throw new Error("Failed to generate brand brief");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!brandBrief) return;
    try {
      const res = await fetch("/api/brand-research", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefId: brandBrief.id, status: "approved" }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (generating) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader size="lg" text="Researching your brand and generating brief..." />
      </div>
    );
  }

  if (!brandBrief) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Brand Brief</h2>
        <EmptyState
          icon={FileText}
          title="No Brand Brief Yet"
          description="LumoraAI will research your website and business to create a detailed brand brief that guides all ad campaigns."
          actionLabel="Generate Brand Brief"
          onAction={handleGenerate}
        />
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
      </div>
    );
  }

  const brief = brandBrief.brief_data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Brand Brief</h2>
          <p className="text-sm text-muted-foreground">Version {brandBrief.version} &middot; {new Date(brandBrief.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerate}>
            <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
          </Button>
          {brandBrief.status !== "approved" && (
            <Button variant="lumora" size="sm" onClick={handleApprove}>
              <Check className="mr-2 h-4 w-4" /> Approve Brief
            </Button>
          )}
          {brandBrief.status === "approved" && (
            <Badge variant="success">Approved</Badge>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Company Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{brief.company_summary}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Services Offered</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {brief.services_offered.map((service, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">&#x2022;</span> {service}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Value Proposition</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{brief.value_proposition}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Competitive Positioning</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{brief.competitive_positioning}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Target Audience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Demographics:</span>
              <p className="text-muted-foreground">{brief.target_audience.demographics}</p>
            </div>
            <div>
              <span className="font-medium">Psychographics:</span>
              <p className="text-muted-foreground">{brief.target_audience.psychographics}</p>
            </div>
            <div>
              <span className="font-medium">Pain Points:</span>
              <ul className="list-disc list-inside text-muted-foreground">
                {brief.target_audience.pain_points.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
            <div>
              <span className="font-medium">Desires:</span>
              <ul className="list-disc list-inside text-muted-foreground">
                {brief.target_audience.desires.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brand Voice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Tone:</span>
              <span className="text-muted-foreground ml-1">{brief.brand_voice.tone}</span>
            </div>
            <div>
              <span className="font-medium">Style:</span>
              <p className="text-muted-foreground">{brief.brand_voice.style}</p>
            </div>
            <div>
              <span className="font-medium text-emerald-400">Do say:</span>
              <ul className="list-disc list-inside text-muted-foreground">
                {brief.brand_voice.do_say.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div>
              <span className="font-medium text-red-400">Don&apos;t say:</span>
              <ul className="list-disc list-inside text-muted-foreground">
                {brief.brand_voice.dont_say.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brief.key_messages.map((msg, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary font-bold">{i + 1}.</span> {msg}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommended Ad Angles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {brief.recommended_angles.map((angle, i) => (
              <div key={i} className="border-l-2 border-primary pl-3">
                <p className="font-medium text-sm">{angle.name}</p>
                <p className="text-sm text-primary italic">&ldquo;{angle.hook}&rdquo;</p>
                <p className="text-xs text-muted-foreground mt-1">{angle.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
